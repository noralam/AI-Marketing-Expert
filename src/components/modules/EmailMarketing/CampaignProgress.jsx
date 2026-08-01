/**
 * Campaign Progress - live stats for a sending/sent campaign.
 */

import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, Spinner } from '@aime/wp-components';
import {
	ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import ProLock, { isProActive, ProLabel } from '../../common/ProLock';
import { toSiteInput, siteInputToUtc } from '../../../utils/datetime';

const COLORS = [ '#3858e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6' ];

const formatDuration = ( seconds ) => {
	const total = Math.max( 0, Number( seconds ) || 0 );
	const days = Math.floor( total / 86400 );
	const hours = Math.floor( ( total % 86400 ) / 3600 );
	const minutes = Math.floor( ( total % 3600 ) / 60 );
	const secs = total % 60;
	return { days, hours, minutes, seconds: secs };
};

const toLocalInputValue = ( value ) => toSiteInput( value );

const toUtcMysqlValue = ( value ) => siteInputToUtc( value );

const getLinkLabel = ( url ) => {
	if ( ! url ) return __( 'Unknown link', 'ai-marketing-expert' );
	try {
		const parsed = new URL( url, window.location.origin );

		// Strip the campaign tracking prefix we add when wrapping links for
		// click tracking (e.g. /?aime_track=click&hash=...&token=...&url=...
		// &sig=...). The original destination is in the `url` param and
		// reading it is more useful than displaying the opaque tracking
		// query string.
		if ( parsed.searchParams && parsed.searchParams.get( 'aime_track' ) ) {
			const original = parsed.searchParams.get( 'url' );
			if ( original ) {
				return getLinkLabel( original );
			}
		}

		const path = `${ parsed.pathname }${ parsed.search }`.replace( /\/$/, '' );

		// If the URL is the site root (or any URL where the only meaningful
		// information is the host), the path is just "/" or empty. Show the
		// host without scheme or "www." prefix so the label reads naturally
		// (e.g. "wpcolors.net" instead of "https://www.wpcolors.net/").
		if ( ! path || '/' === path ) {
			const host = ( parsed.host || '' ).replace( /^www\./, '' );
			return host || url;
		}

		return path.length > 50 ? `${ path.slice( 0, 47 ) }...` : path;
	} catch ( e ) {
		return url.length > 50 ? `${ url.slice( 0, 47 ) }...` : url;
	}
};

const MIN_PROGRESS_VISIBLE_MS = 2000;
const LIVE_PROGRESS_INTERVAL_MS = 15000;
const RECIPIENTS_PER_PAGE = 25;

const CampaignProgress = ( { id, sendStartedAt = 0, onBack, onNavigate } ) => {
	const hasPro = isProActive();
	const { get, post, loading, error, clearError } = useApi();
	const [ data, setData ] = useState( null );
	const [ report, setReport ] = useState( null );
	const [ scheduleValue, setScheduleValue ] = useState( '' );
	const [ savingSchedule, setSavingSchedule ] = useState( false );
	const [ scheduleNotice, setScheduleNotice ] = useState( null );
	const [ togglingQueue, setTogglingQueue ] = useState( false );
	const [ endingQueue, setEndingQueue ] = useState( false );
	const [ creatingCopy, setCreatingCopy ] = useState( false );
	const [ recentProcessed, setRecentProcessed ] = useState( 0 );
	const [ activeRecipientTab, setActiveRecipientTab ] = useState( 'sent' );
	const [ recipientPage, setRecipientPage ] = useState( 1 );
	const [ nowTick, setNowTick ] = useState( Date.now() );
	const [ loadFailed, setLoadFailed ] = useState( false );
	const pollRef = useRef();
	const processRef = useRef( false );
	const lastCompletedRef = useRef( null );

	const applyProgressData = useCallback( ( nextData ) => {
		const completed = ( nextData?.sent || 0 ) + ( nextData?.failed || 0 );
		const backendProcessed = Number( nextData?.processed_now ) || 0;

		if ( lastCompletedRef.current !== null ) {
			const delta = Math.max( 0, completed - lastCompletedRef.current );
			setRecentProcessed( backendProcessed || delta );
		} else {
			setRecentProcessed( backendProcessed );
		}

		lastCompletedRef.current = completed;
		setData( nextData );
	}, [] );

	const fetchProgress = useCallback( async () => {
		try {
			const res = await get( `/email/campaigns/${ id }/progress` );
			applyProgressData( res );
			setLoadFailed( false );
		} catch ( e ) {
			setLoadFailed( true );
		}
	}, [ get, id, applyProgressData ] );

	const fetchReport = useCallback( async () => {
		try {
			const res = await get( `/email/analytics/campaigns/${ id }` );
			setReport( res );
		} catch ( e ) { /* */ }
	}, [ get, id ] );

	const processAndRefresh = useCallback( async () => {
		if ( processRef.current ) return;

		processRef.current = true;
		try {
			const res = await post( `/email/campaigns/${ id }/process` );
			applyProgressData( res );
			fetchReport();
		} catch ( e ) {
			fetchProgress();
		} finally {
			processRef.current = false;
		}
	}, [ post, id, fetchProgress, fetchReport ] );

	const handleQueueToggle = async () => {
		if ( processRef.current || togglingQueue ) return;

		const action = effectiveStatus === 'paused' ? 'resume' : 'pause';
		setTogglingQueue( true );
		try {
			const res = await post( `/email/campaigns/${ id }/process`, { action } );
			applyProgressData( res );
			fetchReport();
		} catch ( e ) { /* error surfaced via useApi's error state */ } finally {
			setTogglingQueue( false );
		}
	};

	const handleEndCampaign = async () => {
		if ( processRef.current || togglingQueue || endingQueue ) return;

		// eslint-disable-next-line no-alert
		if ( ! window.confirm( __( 'End this campaign now? Remaining unsent emails will be cancelled and cannot be resumed.', 'ai-marketing-expert' ) ) ) {
			return;
		}

		setEndingQueue( true );
		try {
			const res = await post( `/email/campaigns/${ id }/process`, { action: 'end' } );
			applyProgressData( res );
			fetchReport();
		} catch ( e ) { /* error surfaced via useApi's error state */ } finally {
			setEndingQueue( false );
		}
	};

	const handleUseForNewCampaign = async () => {
		if ( creatingCopy ) return;

		setCreatingCopy( true );
		try {
			// Reuse the existing duplicate endpoint: it clones the campaign as a
			// draft ("<title> (Copy)") without touching this campaign's stats.
			const res = await post( `/email/campaigns/${ id }/duplicate` );
			if ( res?.id ) {
				onNavigate?.( 'campaign-editor', { id: res.id } );
				return;
			}
		} catch ( e ) { /* error surfaced via useApi's error state */ }
		setCreatingCopy( false );
	};

	useEffect( () => {
		// Fetch immediately on mount — the interval alone would leave the
		// page empty (and show a false "not found") for the first 15s.
		fetchProgress();
		fetchReport();
		pollRef.current = setInterval( () => {
			fetchProgress();
			fetchReport();
		}, LIVE_PROGRESS_INTERVAL_MS );
		return () => clearInterval( pollRef.current );
	}, [ fetchProgress, fetchReport ] );

	useEffect( () => {
		if ( ! data || ! [ 'working', 'sending' ].includes( data.status ) ) return;

		// Kick the first processing tick immediately so sending begins within a
		// second or two of landing here, then keep ticking on the live interval.
		processAndRefresh();
		const timer = setInterval( processAndRefresh, LIVE_PROGRESS_INTERVAL_MS );
		return () => clearInterval( timer );
	}, [ data?.status, processAndRefresh ] );

	/* Stop polling once campaign is fully sent or failed. */
	useEffect( () => {
		if ( data && ( data.status === 'sent' || data.status === 'failed' ) ) {
			clearInterval( pollRef.current );
		}
	}, [ data ] );

	useEffect( () => {
		if ( data?.scheduled_at ) {
			setScheduleValue( toLocalInputValue( data.scheduled_at ) );
		}
	}, [ data?.scheduled_at ] );

	useEffect( () => {
		const timer = setInterval( () => setNowTick( Date.now() ), 1000 );
		return () => clearInterval( timer );
	}, [] );

	useEffect( () => {
		if ( ! sendStartedAt ) return;

		window.requestAnimationFrame( () => {
			window.scrollTo( { top: 0, behavior: 'smooth' } );
			document.getElementById( 'wpbody-content' )?.scrollIntoView( { behavior: 'smooth', block: 'start' } );
		} );
	}, [ sendStartedAt ] );

	if ( loading && ! data ) {
		return <Loader variant="dashboard" text={ __( 'Loading campaign progress...', 'ai-marketing-expert' ) } />;
	}

	if ( ! data ) {
		if ( loadFailed ) {
			return <Notice type="error" message={ __( 'Campaign not found.', 'ai-marketing-expert' ) } />;
		}
		return <Loader variant="dashboard" text={ __( 'Loading campaign progress...', 'ai-marketing-expert' ) } />;
	}

	const kpis = [
		{ label: __( 'Sent', 'ai-marketing-expert' ), value: data.sent || 0 },
		{ label: __( 'Opened', 'ai-marketing-expert' ), value: data.opened || 0 },
		{ label: __( 'Clicks', 'ai-marketing-expert' ), value: data.clicks || 0 },
		{ label: __( 'Failed', 'ai-marketing-expert' ), value: data.failed || 0 },
		{ label: __( 'Unsubscribes', 'ai-marketing-expert' ), value: data.unsubscribes || 0 },
	];

	const pieData = [
		{ name: __( 'Opened', 'ai-marketing-expert' ), value: data.opened || 0 },
		{ name: __( 'Not Opened', 'ai-marketing-expert' ), value: Math.max( 0, ( data.sent || 0 ) - ( data.opened || 0 ) ) },
	];
	const totalRecipients = Math.max( data.total || 0, ( data.sent || 0 ) + ( data.pending || 0 ) + ( data.failed || 0 ) );
	const remaining = Math.max( 0, totalRecipients - ( data.sent || 0 ) - ( data.failed || 0 ) );
	const sendingNow = Math.max( 0, Math.min( remaining, data.pending || 0 ) );
	const rawProgressPercent = totalRecipients > 0 ? Math.round( ( ( ( data.sent || 0 ) + ( data.failed || 0 ) ) / totalRecipients ) * 100 ) : 0;
	const completedCount = ( data.sent || 0 ) + ( data.failed || 0 );
	const activeBatch = totalRecipients > 0 ? Math.max( 0, Math.min( recentProcessed || Number( data.processed_now ) || 0, remaining + ( recentProcessed || 0 ) ) ) : 0;
	const effectiveStatus = data.status || data.campaign?.status || '';
	const scheduledTimeRemaining = effectiveStatus === 'scheduled' && data.scheduled_at
		? Math.max( 0, Math.floor( ( new Date( `${ data.scheduled_at.replace( ' ', 'T' ) }Z` ).getTime() - nowTick ) / 1000 ) )
		: 0;
	const isScheduled = effectiveStatus === 'scheduled';
	const isSending = [ 'working', 'sending' ].includes( effectiveStatus );
	const isPaused = effectiveStatus === 'paused';
	const canToggleQueue = ( isSending || isPaused ) && ! togglingQueue && ! processRef.current;
	const isMinimumProgressVisible = Boolean( ! isScheduled && ! isSending && ! isPaused && sendStartedAt && ( nowTick - sendStartedAt ) < MIN_PROGRESS_VISIBLE_MS );
	const showSendingPanel = isSending || isPaused || isMinimumProgressVisible;
	const displayStatus = isMinimumProgressVisible ? 'sending' : effectiveStatus;
	const progressPercent = showSendingPanel && rawProgressPercent === 0 && totalRecipients > 0 ? 3 : rawProgressPercent;
	const showReports = ! isScheduled && ! showSendingPanel;
	const clickToOpenRate = data.opened > 0 ? Math.round( ( ( data.clicks || 0 ) / data.opened ) * 1000 ) / 10 : 0;
	const topLinks = report?.top_links?.slice( 0, 5 ) || [];
	const maxLinkClicks = Math.max( 1, ...topLinks.map( ( link ) => Number( link.clicks ) || 0 ) );
	const countdown = formatDuration( scheduledTimeRemaining );
	const countdownItems = [
		{ label: __( 'Days', 'ai-marketing-expert' ), value: countdown.days, color: '#3858e9' },
		{ label: __( 'Hours', 'ai-marketing-expert' ), value: countdown.hours, color: '#18864b' },
		{ label: __( 'Minutes', 'ai-marketing-expert' ), value: countdown.minutes, color: '#125f8d' },
		{ label: __( 'Seconds', 'ai-marketing-expert' ), value: countdown.seconds, color: '#6b1839' },
	];
	const recipientTabs = [
		{ key: 'sent', label: __( 'Sent', 'ai-marketing-expert' ) },
		{ key: 'opened', label: __( 'Opened', 'ai-marketing-expert' ) },
		{ key: 'clicked', label: __( 'Clicked', 'ai-marketing-expert' ) },
		{ key: 'unsubscribed', label: __( 'Unsubscribed', 'ai-marketing-expert' ) },
		{ key: 'complained', label: __( 'Complained', 'ai-marketing-expert' ) },
		{ key: 'bounced', label: __( 'Bounced', 'ai-marketing-expert' ) },
	];
	const recipientLists = report?.recipients || {};
	const activeRecipients = recipientLists[ activeRecipientTab ] || [];
	const activeRecipientTotal = recipientLists.counts?.[ activeRecipientTab ] ?? activeRecipients.length;
	const recipientTotalPages = Math.max( 1, Math.ceil( activeRecipientTotal / RECIPIENTS_PER_PAGE ) );
	const safeRecipientPage = Math.min( recipientPage, recipientTotalPages );
	const paginatedRecipients = activeRecipients.slice( ( safeRecipientPage - 1 ) * RECIPIENTS_PER_PAGE, safeRecipientPage * RECIPIENTS_PER_PAGE );

	const handleScheduleSave = async () => {
		setSavingSchedule( true );
		setScheduleNotice( null );
		try {
			await post( `/email/campaigns/${ id }/send`, { scheduled_at: toUtcMysqlValue( scheduleValue ) } );
			setScheduleNotice( { type: 'success', message: __( 'Schedule updated.', 'ai-marketing-expert' ) } );
			fetchProgress();
		} catch ( e ) {
			setScheduleNotice( { type: 'error', message: e.message } );
		}
		setSavingSchedule( false );
	};

	return (
		<div className="aime-campaign-progress">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			<div className="aime-page-header">
				<div>
					<Button variant="link" onClick={ onBack }>{ __( '\u2190 Back to Campaigns', 'ai-marketing-expert' ) }</Button>
					<h2>{ data.campaign?.title || __( 'Campaign Progress', 'ai-marketing-expert' ) }</h2>
					<span className={ `aime-badge aime-badge-${ displayStatus === 'sent' ? 'success' : 'info' }` }>{ displayStatus }</span>
				</div>
			</div>

			{ scheduleNotice && <Notice type={ scheduleNotice.type } message={ scheduleNotice.message } onDismiss={ () => setScheduleNotice( null ) } /> }

			{ isScheduled && (
				<Card title={ __( 'Scheduled Send', 'ai-marketing-expert' ) }>
					<div className="aime-campaign-countdown">
						<div className="aime-countdown-rings" aria-label={ __( 'Time left until scheduled send', 'ai-marketing-expert' ) }>
							{ countdownItems.map( ( item ) => (
								<div key={ item.label } className="aime-countdown-ring" style={ { '--aime-countdown-color': item.color } }>
									<svg viewBox="0 0 84 84" aria-hidden="true" focusable="false">
										<circle className="aime-countdown-ring-bg" cx="42" cy="42" r="36" />
										<circle className="aime-countdown-ring-fg" cx="42" cy="42" r="36" />
									</svg>
									<strong className="aime-countdown-ring-value">{ String( item.value ).padStart( 2, '0' ) }</strong>
									<span className="aime-countdown-ring-label">{ item.label }</span>
								</div>
							) ) }
						</div>
						<div className="aime-schedule-edit">
							<TextControl
								label={ __( 'Scheduled time', 'ai-marketing-expert' ) }
								type="datetime-local"
								value={ scheduleValue }
								onChange={ setScheduleValue }
								__nextHasNoMarginBottom
							/>
							<Button variant="primary" onClick={ handleScheduleSave } isBusy={ savingSchedule } disabled={ savingSchedule || ! scheduleValue }>
								{ savingSchedule ? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</> : __( 'Update Schedule', 'ai-marketing-expert' ) }
							</Button>
						</div>
					</div>
				</Card>
			) }

			{ showSendingPanel && (
				<Card>
					<div className="aime-send-progress-panel">
						<div className="aime-send-progress-head">
							<div>
								<h3>{ __( 'Your emails are sending right now', 'ai-marketing-expert' ) }</h3>
								<p>
									{ totalRecipients > 0
										? __( 'Progress updates automatically as WordPress cron completes each batch.', 'ai-marketing-expert' )
										: __( 'Preparing the recipient queue. Counts will appear as soon as the audience is resolved.', 'ai-marketing-expert' )
									}
								</p>
							</div>
							<div className="aime-send-progress-actions">
								<Button
									variant="secondary"
									size="small"
									onClick={ handleQueueToggle }
									isBusy={ togglingQueue }
									disabled={ ! canToggleQueue }
								>
									{ togglingQueue
										? ( isPaused ? __( 'Resuming...', 'ai-marketing-expert' ) : __( 'Pausing...', 'ai-marketing-expert' ) )
										: ( isPaused ? __( 'Resume', 'ai-marketing-expert' ) : __( 'Pause', 'ai-marketing-expert' ) ) }
								</Button>
								<Button
									variant="secondary"
									size="small"
									isDestructive
									onClick={ handleEndCampaign }
									isBusy={ endingQueue }
									disabled={ endingQueue || ( ! isSending && ! isPaused ) }
								>
									{ endingQueue ? __( 'Ending...', 'ai-marketing-expert' ) : __( 'End Campaign', 'ai-marketing-expert' ) }
								</Button>
								<span className="aime-send-status-pill">{ isPaused ? __( 'Paused', 'ai-marketing-expert' ) : __( 'Sending', 'ai-marketing-expert' ) }</span>
							</div>
						</div>

						<div className={ `aime-send-progress-track${ showSendingPanel ? ' is-animating' : '' }` } aria-label={ __( 'Campaign send progress', 'ai-marketing-expert' ) }>
							<div className="aime-send-progress-fill" style={ { width: `${ progressPercent }%` } } />
							<span>{ rawProgressPercent }%</span>
						</div>

						<div className="aime-send-stats-grid">
							<div className="aime-send-stat-card">
								<strong>{ totalRecipients }</strong>
								<span>{ __( 'Total Emails', 'ai-marketing-expert' ) }</span>
							</div>
							<div className="aime-send-stat-card is-active">
								<strong>{ activeBatch }</strong>
								<span>{ __( 'Sending Now', 'ai-marketing-expert' ) }</span>
							</div>
							<div className="aime-send-stat-card is-success">
								<strong>{ data.sent || 0 }</strong>
								<span>{ __( 'Total Sent', 'ai-marketing-expert' ) }</span>
							</div>
							<div className="aime-send-stat-card">
								<strong>{ remaining }</strong>
								<span>{ __( 'Remaining', 'ai-marketing-expert' ) }</span>
							</div>
							<div className="aime-send-stat-card">
								<strong>{ completedCount }</strong>
								<span>{ __( 'Processed', 'ai-marketing-expert' ) }</span>
							</div>
							<div className="aime-send-stat-card is-danger">
								<strong>{ data.failed || 0 }</strong>
								<span>{ __( 'Failed', 'ai-marketing-expert' ) }</span>
							</div>
						</div>
					</div>
				</Card>
			) }

			{ showReports && (
				<>
				<div className="aime-campaign-report-grid">
					<Card title={ __( 'Campaign Performance', 'ai-marketing-expert' ) }>
						<div className="aime-report-metric-list">
							<div><span>{ __( 'Sent Emails', 'ai-marketing-expert' ) }</span><strong>{ data.sent || 0 }</strong></div>
							<div><span>{ __( 'Open Rate', 'ai-marketing-expert' ) } ({ data.opened || 0 })</span><strong>{ data.open_rate || 0 }%</strong></div>
							<div><span>{ __( 'Click Rate', 'ai-marketing-expert' ) } ({ data.clicks || 0 })</span><strong>{ data.click_rate || 0 }%</strong></div>
							<div><span>{ __( 'Click To Open Rate', 'ai-marketing-expert' ) }</span><strong>{ clickToOpenRate }%</strong></div>
							<div><span>{ __( 'Unsubscribes', 'ai-marketing-expert' ) } ({ data.unsubscribes || 0 })</span><strong>{ data.sent > 0 ? Math.round( ( ( data.unsubscribes || 0 ) / data.sent ) * 1000 ) / 10 : 0 }%</strong></div>
						</div>
					</Card>

					<Card title={ __( 'Email Stats', 'ai-marketing-expert' ) }>
						<ResponsiveContainer width="100%" height={ 260 }>
							<PieChart>
								<Pie data={ pieData } dataKey="value" cx="50%" cy="50%" outerRadius={ 90 }>
									{ pieData.map( ( _, i ) => <Cell key={ i } fill={ COLORS[ i ] } /> ) }
								</Pie>
								<Legend />
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					</Card>

					<ProLock locked={ ! hasPro }><Card title={ <span className="aime-pro-card-header">{ __( 'Link Activity', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span> }>
						{ topLinks.length > 0 ? (
							<div className="aime-link-activity-list">
								{ topLinks.map( ( link, index ) => {
									const clicks = Number( link.clicks ) || 0;
									return (
										<div className="aime-link-activity-item" key={ `${ link.url }-${ index }` }>
											<div className="aime-link-activity-row">
												<span className="aime-link-activity-rank">#{ index + 1 }</span>
												<a href={ link.url } target="_blank" rel="noopener noreferrer" className="aime-link-activity-url" title={ link.url }>
													{ getLinkLabel( link.url ) }
												</a>
												<strong className="aime-link-activity-clicks">{ clicks }</strong>
											</div>
											<div className="aime-link-activity-bar" aria-hidden="true">
												<span style={ { width: `${ Math.max( 8, Math.round( ( clicks / maxLinkClicks ) * 100 ) ) }%` } } />
											</div>
										</div>
									);
								} ) }
							</div>
						) : (
							<div className="aime-report-empty">
								<strong>{ __( 'No link clicks yet', 'ai-marketing-expert' ) }</strong>
								<p>{ __( 'Tracked links will appear here after recipients click campaign links.', 'ai-marketing-expert' ) }</p>
							</div>
						) }
					</Card></ProLock>
				</div>

				<ProLock locked={ ! hasPro }><Card title={ <span className="aime-pro-card-header">{ __( 'Recipient Activity', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span> }>
					<div className="aime-recipient-tabs" role="tablist" aria-label={ __( 'Campaign recipient activity', 'ai-marketing-expert' ) }>
						{ recipientTabs.map( ( tab ) => {
							const count = recipientLists.counts?.[ tab.key ] ?? ( recipientLists[ tab.key ] || [] ).length;
							return (
								<button
									key={ tab.key }
									type="button"
									className={ `aime-recipient-tab${ activeRecipientTab === tab.key ? ' is-active' : '' }` }
									onClick={ () => { setActiveRecipientTab( tab.key ); setRecipientPage( 1 ); } }
								>
									<span>{ tab.label }</span>
									<strong>{ count }</strong>
								</button>
							);
						} ) }
					</div>

					{ activeRecipients.length > 0 ? (
						<div className="aime-recipient-list">
							<div className="aime-recipient-list-head">
								<span>{ __( 'Recipient', 'ai-marketing-expert' ) }</span>
								<span>{ __( 'Opens', 'ai-marketing-expert' ) }</span>
								<span>{ __( 'Clicks', 'ai-marketing-expert' ) }</span>
								<span>{ __( 'Status', 'ai-marketing-expert' ) }</span>
							</div>
							{ paginatedRecipients.map( ( recipient ) => (
								<div className="aime-recipient-row" key={ recipient.id }>
									<div>
										<strong>{ recipient.name || recipient.email || __( 'Unknown recipient', 'ai-marketing-expert' ) }</strong>
										{ recipient.email && <span>{ recipient.email }</span> }
										{ recipient.note && activeRecipientTab === 'bounced' && <small>{ recipient.note }</small> }
									</div>
									<strong>{ recipient.open_count || 0 }</strong>
									<strong>{ recipient.click_count || 0 }</strong>
									<span className={ `aime-badge aime-badge-${ recipient.status === 'failed' ? 'danger' : 'success' }` }>{ recipient.status }</span>
								</div>
							) ) }
							{ activeRecipientTotal > RECIPIENTS_PER_PAGE && (
								<div className="aime-recipient-pagination">
									<Button variant="secondary" size="small" disabled={ safeRecipientPage <= 1 } onClick={ () => setRecipientPage( safeRecipientPage - 1 ) }>
										{ __( 'Previous', 'ai-marketing-expert' ) }
									</Button>
									<span>{ safeRecipientPage } / { recipientTotalPages }</span>
									<Button variant="secondary" size="small" disabled={ safeRecipientPage >= recipientTotalPages } onClick={ () => setRecipientPage( safeRecipientPage + 1 ) }>
										{ __( 'Next', 'ai-marketing-expert' ) }
									</Button>
								</div>
							) }
						</div>
					) : (
						<div className="aime-report-empty">
							<strong>{ __( 'No recipients in this list yet', 'ai-marketing-expert' ) }</strong>
							<p>{ __( 'Recipient activity will appear here as opens, clicks, unsubscribes, or bounces are recorded.', 'ai-marketing-expert' ) }</p>
						</div>
					) }
				</Card></ProLock>
				</>
			) }

			{ /* Opens timeline */ }
			{ Boolean( showReports && report?.opens_timeline?.length > 0 ) && (
				<Card title={ __( 'Opens Over Time', 'ai-marketing-expert' ) }>
					<ResponsiveContainer width="100%" height={ 200 }>
						<BarChart data={ report.opens_timeline }>
							<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
							<XAxis dataKey="date" tick={ { fontSize: 11 } } />
							<YAxis tick={ { fontSize: 11 } } />
							<Tooltip />
							<Bar dataKey="count" fill="#10b981" radius={ [ 4, 4, 0, 0 ] } name={ __( 'Opens', 'ai-marketing-expert' ) } />
						</BarChart>
					</ResponsiveContainer>
				</Card>
			) }

			{ /* Email template preview + reuse action */ }
			{ Boolean( data.campaign?.email_body ) && (
				<Card
					title={
						<span className="aime-pro-card-header" style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12, flexWrap: 'wrap' } }>
							<span>
								{ __( 'Email Template', 'ai-marketing-expert' ) }
								{ data.campaign?.email_subject && (
									<span style={ { display: 'block', fontSize: 13, fontWeight: 400, color: '#6b7280', marginTop: 2 } }>
										{ __( 'Subject:', 'ai-marketing-expert' ) } { data.campaign.email_subject }
									</span>
								) }
							</span>
							<span style={ { display: 'inline-flex', alignItems: 'center', gap: 8 } }>
								{ ! hasPro && <ProLabel /> }
								<Button
									variant="primary"
									size="small"
									onClick={ handleUseForNewCampaign }
									isBusy={ creatingCopy }
									disabled={ ! hasPro || creatingCopy }
								>
									{ creatingCopy ? __( 'Creating draft...', 'ai-marketing-expert' ) : __( 'Use for New Campaign', 'ai-marketing-expert' ) }
								</Button>
							</span>
						</span>
					}
				>
					{ /* Sandboxed iframe: keeps the email's own styles from leaking into
					     the admin UI and blocks any scripts inside stored email HTML. */ }
					<iframe
						title={ __( 'Sent email preview', 'ai-marketing-expert' ) }
						sandbox=""
						srcDoc={ data.campaign.email_body }
						style={ { width: '100%', height: 600, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff' } }
					/>
				</Card>
			) }
		</div>
	);
};

export default CampaignProgress;
