/**
 * SEO Automation - toggle auto-audit, auto-meta, internal links; view activity log.
 */

import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, ToggleControl, SelectControl, Spinner, CheckboxControl } from '@aime/wp-components';
import { trash } from '@wordpress/icons';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ProLock from '../../../common/ProLock';
import UsageNotice from '../../../common/UsageNotice';
import { toast } from '../../../common/Toast';
import { DonutChart, SortArrow } from './SeoCharts';

const TASK_TYPE_OPTIONS = [
	{ label: __( 'All Tasks', 'ai-marketing-expert' ), value: '' },
	{ label: __( 'Auto Audit', 'ai-marketing-expert' ), value: 'auto_audit' },
	{ label: __( 'Auto Meta', 'ai-marketing-expert' ), value: 'auto_meta' },
	{ label: __( 'Internal Links', 'ai-marketing-expert' ), value: 'internal_links' },
	{ label: __( 'Internal Links (Batch)', 'ai-marketing-expert' ), value: 'internal_links_batch' },
];

const FREQUENCY_OPTIONS = [
	{ label: __( 'Daily', 'ai-marketing-expert' ), value: 'daily' },
	{ label: __( 'Weekly', 'ai-marketing-expert' ), value: 'weekly' },
];

const SUGGESTION_STATUS_OPTIONS = [
	{ label: __( 'Pending', 'ai-marketing-expert' ), value: 'pending' },
	{ label: __( 'Applied', 'ai-marketing-expert' ), value: 'applied' },
	{ label: __( 'Dismissed', 'ai-marketing-expert' ), value: 'dismissed' },
	{ label: __( 'All', 'ai-marketing-expert' ), value: 'all' },
];

// Posts per page, not suggestions per page. A post's suggestions are reviewed
// together, so the group is the unit that gets paginated; page sizes vary a
// little in suggestion count as a result, which is the correct trade.
const SUGGESTIONS_PER_PAGE = 10;

const STATUS_COLORS = {
	completed: '#4caf50',
	failed: '#f44336',
	running: '#ff9800',
};

const SeoAutomation = ( { onNavigate } ) => {
	const { get, put, post, loading, error, clearError } = useApi();
	const { hasPro, proUrl } = usePro();

	const [ settings, setSettings ] = useState( null );
	const [ usage, setUsage ] = useState( null );
	const [ cronToggles, setCronToggles ] = useState( [] );
	const [ saving, setSaving ] = useState( false );
	const [ log, setLog ] = useState( [] );
	const [ logTotal, setLogTotal ] = useState( 0 );
	const [ logPage, setLogPage ] = useState( 1 );
	const [ logFilter, setLogFilter ] = useState( '' );
	const [ postTypes, setPostTypes ] = useState( [] );
	const [ loadingLog, setLoadingLog ] = useState( false );
	const [ runningTask, setRunningTask ] = useState( '' );
	const [ logSortKey, setLogSortKey ] = useState( null );
	const [ logSortDir, setLogSortDir ] = useState( 'desc' );
	const [ linkSuggestions, setLinkSuggestions ] = useState( [] );
	const [ linkSuggestionTotal, setLinkSuggestionTotal ] = useState( 0 );
	const [ suggestionStatus, setSuggestionStatus ] = useState( 'pending' );
	const [ suggestionPage, setSuggestionPage ] = useState( 1 );
	const [ suggestionPages, setSuggestionPages ] = useState( 0 );
	const [ suggestionPostTotal, setSuggestionPostTotal ] = useState( 0 );
	const [ suggestionsTruncated, setSuggestionsTruncated ] = useState( false );
	const [ suggestionCeiling, setSuggestionCeiling ] = useState( 0 );
	const [ suggestionsFailed, setSuggestionsFailed ] = useState( false );
	const [ loadingSuggestions, setLoadingSuggestions ] = useState( false );
	const [ suggestionAction, setSuggestionAction ] = useState( '' );

	const handleLogSort = ( key ) => {
		if ( logSortKey === key ) { setLogSortDir( logSortDir === 'asc' ? 'desc' : 'asc' ); }
		else { setLogSortKey( key ); setLogSortDir( 'desc' ); }
	};

	const perPage = 15;

	/* Fetch settings */

	const fetchSettings = useCallback( async () => {
		try {
			const [ res, typeRes ] = await Promise.all( [
				get( '/seo/automation/settings' ),
				get( '/seo/audits/post-types' ),
			] );
			setSettings( res.data || res );
			setUsage( res.usage || null );
			setCronToggles( res.cron_toggles || [] );
			setPostTypes( typeRes.items || [] );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	/* Fetch log */

	const fetchLog = useCallback( async () => {
		setLoadingLog( true );
		try {
			const params = { page: logPage, per_page: perPage };
			if ( logFilter ) params.task_type = logFilter;
			const res = await get( '/seo/automation/log', params );
			setLog( res.items || [] );
			setLogTotal( res.total || 0 );
		} catch ( e ) {
			// silent
		} finally {
			setLoadingLog( false );
		}
	}, [ get, logPage, logFilter ] );

	useEffect( () => { fetchSettings(); }, [ fetchSettings ] );
	useEffect( () => { fetchLog(); }, [ fetchLog ] );

	const fetchInternalLinkSuggestions = useCallback( async () => {
		setLoadingSuggestions( true );
		try {
			const res = await get( '/seo/automation/internal-links', {
				status: suggestionStatus,
				page: suggestionPage,
				per_page: SUGGESTIONS_PER_PAGE,
			} );
			setLinkSuggestions( res.items || [] );
			setLinkSuggestionTotal( res.total || 0 );
			setSuggestionPages( res.total_pages || 0 );
			setSuggestionPostTotal( res.total_posts || 0 );
			setSuggestionsTruncated( !! res.truncated );
			setSuggestionCeiling( res.index_ceiling || 0 );
			setSuggestionsFailed( false );
			// The server clamps the page to the last one that exists, so mirror
			// what it actually served rather than what we asked for.
			if ( res.page && res.page !== suggestionPage ) {
				setSuggestionPage( res.page );
			}
		} catch ( e ) {
			// An empty list and a failed request look identical downstream, and
			// the empty state below makes a claim about the user's scans. Do not
			// make that claim without an answer.
			setSuggestionsFailed( true );
		} finally {
			setLoadingSuggestions( false );
		}
	}, [ get, suggestionStatus, suggestionPage ] );

	useEffect( () => { fetchInternalLinkSuggestions(); }, [ fetchInternalLinkSuggestions ] );

	/* Save settings */

	const handleSave = async () => {
		setSaving( true );
		try {
			const res = await put( '/seo/automation/settings', settings );
			setSettings( res.data || settings );
			if ( res.usage ) setUsage( res.usage );
			toast( __( 'Automation settings saved.', 'ai-marketing-expert' ) );
			fetchSettings();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSaving( false );
		}
	};

	/* Clear log */

	const handleClearLog = async () => {
		if ( ! window.confirm( __( 'Clear all automation log entries?', 'ai-marketing-expert' ) ) ) return;
		try {
			await post( '/seo/automation/log/clear' );
			toast( __( 'Log cleared.', 'ai-marketing-expert' ) );
			setLog( [] );
			setLogTotal( 0 );
			setLogPage( 1 );
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	/* Run task manually */

	const handleRunTask = async ( taskName ) => {
		setRunningTask( taskName );
		try {
			const res = await post( '/seo/automation/run', { task: taskName } );
			toast( res.message || __( 'Task started.', 'ai-marketing-expert' ) );
			fetchLog();
			fetchSettings();
			// A fresh scan reorders the list by modified date, so whatever page
			// the user was on no longer refers to the same posts. Go back to
			// the top rather than land them mid-list on unrelated results.
			if ( taskName === 'internal_links' ) {
				setSuggestionPage( 1 );
				fetchInternalLinkSuggestions();
			}
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setRunningTask( '' );
		}
	};

	const handleSuggestionAction = async ( action, postId, suggestionId ) => {
		const actionKey = `${ action }-${ postId }-${ suggestionId }`;
		setSuggestionAction( actionKey );
		try {
			const res = await post( `/seo/automation/internal-links/${ action }`, {
				post_id: postId,
				suggestion_id: suggestionId,
			} );
			toast( res.message || __( 'Suggestion updated.', 'ai-marketing-expert' ) );

			// Mark the row resolved in place instead of refetching the list.
			// Triage is a run of clicks down one page; refetching rebuilt the
			// list from the top and — under the Pending filter — pulled every
			// row below the click upward, so the next Apply button landed
			// somewhere else. Leaving the row visible with its new status keeps
			// the page anchored and is still true: it is applied, it just no
			// longer matches the filter until the next load.
			const newStatus = action === 'apply' ? 'applied' : 'dismissed';

			setLinkSuggestions( ( prev ) => prev.map( ( item ) => (
				item.post_id !== postId ? item : {
					...item,
					suggestions: item.suggestions.map( ( suggestion ) => (
						suggestion.id !== suggestionId ? suggestion : { ...suggestion, status: newStatus }
					) ),
				}
			) ) );

			// The headline counts what matches the filter. Under 'all' nothing
			// left the set, so nothing is subtracted.
			if ( suggestionStatus !== 'all' ) {
				setLinkSuggestionTotal( ( prev ) => Math.max( 0, prev - 1 ) );
			}

			fetchLog();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSuggestionAction( '' );
		}
	};

	const setField = ( key, value ) => {
		setSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const togglePostType = ( field, postType, checked ) => {
		setSettings( ( prev ) => {
			const current = Array.isArray( prev?.[ field ] ) ? prev[ field ] : [];
			return {
				...prev,
				[ field ]: checked
					? [ ...new Set( [ ...current, postType ] ) ]
					: current.filter( ( item ) => item !== postType ),
			};
		} );
	};

	/* Pagination helpers */

	const totalPages = Math.ceil( logTotal / perPage );

	const sortedLog = useMemo( () => {
		if ( ! logSortKey ) return log;
		return [ ...log ].sort( ( a, b ) => {
			let aVal = ( a[ logSortKey ] || '' ).toString().toLowerCase();
			let bVal = ( b[ logSortKey ] || '' ).toString().toLowerCase();
			if ( aVal < bVal ) return logSortDir === 'asc' ? -1 : 1;
			if ( aVal > bVal ) return logSortDir === 'asc' ? 1 : -1;
			return 0;
		} );
	}, [ log, logSortKey, logSortDir ] );

	const logStatusCounts = useMemo( () => {
		const c = { completed: 0, failed: 0, running: 0 };
		log.forEach( ( entry ) => { if ( c[ entry.status ] !== undefined ) c[ entry.status ]++; } );
		return c;
	}, [ log ] );

	const hasPendingSuggestions = linkSuggestions.some( ( item ) => item.suggestions?.some( ( suggestion ) => suggestion.status === 'pending' ) );

	// The old copy read "suggestions found by recent scans" regardless of the
	// Status filter, so a filtered subset was presented as the grand total.
	// Name the filter the number actually belongs to.
	const SUGGESTION_COUNT_COPY = {
		pending: __( 'pending suggestions', 'ai-marketing-expert' ),
		applied: __( 'applied suggestions', 'ai-marketing-expert' ),
		dismissed: __( 'dismissed suggestions', 'ai-marketing-expert' ),
		all: __( 'suggestions found by recent scans', 'ai-marketing-expert' ),
	};

	/* Render */

	if ( loading && ! settings ) {
		return <Loader variant="form" text={ __( 'Loading automation settings\u2026', 'ai-marketing-expert' ) } />;
	}

	if ( ! settings ) return null;

	const isCronLocked = ( key ) => ! hasPro && cronToggles.includes( key );
	const runsExhausted = !! usage?.runs && usage.runs.limit != null
		&& usage.runs.used >= usage.runs.limit;
	const tasksFull = !! usage?.tasks && usage.tasks.limit != null
		&& usage.tasks.used >= usage.tasks.limit;

	// Free plan caps how many publish-hook rules can be on at once; block turning
	// on a new one when the cap is already met, but always allow turning one off.
	const canEnableTask = ( key ) => !! settings[ key ] || ! tasksFull;

	return (
		<>
			<div className="aime-seo-automation">
				{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

				<div className="aime-page-header">
					<h2>{ __( 'SEO Automation', 'ai-marketing-expert' ) }</h2>
				</div>

				<UsageNotice
					usage={ usage?.tasks }
					featureLabel={ __( 'automation rules', 'ai-marketing-expert' ) }
					proUrl={ proUrl }
					kind="storage"
				/>

				{ /* Automation toggles */ }
				<Card title={ __( 'Automation Rules', 'ai-marketing-expert' ) }>
					<div className="aime-settings-form">
						<ToggleControl
							label={ __( 'Auto On-Page Audit on Publish', 'ai-marketing-expert' ) }
							help={ __( 'Automatically run an on-page SEO audit whenever a post or page is published.', 'ai-marketing-expert' ) }
							checked={ !! settings.auto_audit_on_publish }
							onChange={ ( v ) => setField( 'auto_audit_on_publish', v ) }
							disabled={ ! canEnableTask( 'auto_audit_on_publish' ) }
						/>
						{ settings.auto_audit_on_publish && postTypes.length > 0 && (
							<div className="aime-settings-subgroup">
								<strong>{ __( 'Auto Audit Post Types', 'ai-marketing-expert' ) }</strong>
								{ postTypes.map( ( type ) => (
									<CheckboxControl
										key={ `audit-${ type.name }` }
										label={ type.label }
										checked={ ( settings.auto_audit_post_types || [] ).includes( type.name ) }
										onChange={ ( checked ) => togglePostType( 'auto_audit_post_types', type.name, checked ) }
									/>
								) ) }
							</div>
						) }
						<ToggleControl
							label={ __( 'Auto Meta Generation on Publish', 'ai-marketing-expert' ) }
							help={ __( 'Automatically generate meta title and description using AI when a post is published (only if empty).', 'ai-marketing-expert' ) }
							checked={ !! settings.auto_meta_on_publish }
							onChange={ ( v ) => setField( 'auto_meta_on_publish', v ) }
							disabled={ ! canEnableTask( 'auto_meta_on_publish' ) }
						/>
						{ settings.auto_meta_on_publish && postTypes.length > 0 && (
							<div className="aime-settings-subgroup">
								<strong>{ __( 'Auto Meta Post Types', 'ai-marketing-expert' ) }</strong>
								{ postTypes.map( ( type ) => (
									<CheckboxControl
										key={ `meta-${ type.name }` }
										label={ type.label }
										checked={ ( settings.auto_meta_post_types || [] ).includes( type.name ) }
										onChange={ ( checked ) => togglePostType( 'auto_meta_post_types', type.name, checked ) }
									/>
								) ) }
							</div>
						) }
						<ProLock locked={ isCronLocked( 'auto_internal_links' ) }>
							<ToggleControl
								label={ __( 'Auto Internal Link Suggestions', 'ai-marketing-expert' ) }
								help={ isCronLocked( 'auto_internal_links' )
									? __( 'Scheduled scanning is a Pro feature. On the free plan you can still run a scan manually below.', 'ai-marketing-expert' )
									: __( 'Periodically scan recent posts and suggest internal links via AI.', 'ai-marketing-expert' )
								}
								checked={ !! settings.auto_internal_links }
								onChange={ ( v ) => setField( 'auto_internal_links', v ) }
								disabled={ isCronLocked( 'auto_internal_links' ) }
							/>
						</ProLock>
						{ settings.auto_internal_links && ! isCronLocked( 'auto_internal_links' ) && (
							<SelectControl
								label={ __( 'Internal Link Scan Frequency', 'ai-marketing-expert' ) }
								value={ settings.internal_link_frequency || 'weekly' }
								options={ FREQUENCY_OPTIONS }
								onChange={ ( v ) => setField( 'internal_link_frequency', v ) }
								__nextHasNoMarginBottom
							/>
						) }
						<div style={ { marginTop: 16 } }>
							<UsageNotice
								usage={ usage?.runs }
								featureLabel={ __( 'manual automation', 'ai-marketing-expert' ) }
								proUrl={ proUrl }
							/>
						</div>
						<div style={ { marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' } }>
							<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving }>
								{ saving
									? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving\u2026', 'ai-marketing-expert' ) }</>
									: __( 'Save Settings', 'ai-marketing-expert' )
								}
							</Button>
							<Button
								variant="secondary"
								onClick={ () => handleRunTask( 'internal_links' ) }
								isBusy={ runningTask === 'internal_links' }
								disabled={ !! runningTask || runsExhausted }
							>
								{ runningTask === 'internal_links'
									? <><Spinner style={ { marginRight: 4 } } />{ __( 'Scanning\u2026', 'ai-marketing-expert' ) }</>
									: __( 'Run Internal Link Scan Now', 'ai-marketing-expert' )
								}
							</Button>
						</div>
					</div>
				</Card>

				<Card title={ __( 'Internal Link Suggestions', 'ai-marketing-expert' ) }>
					<div className="aime-table-toolbar aime-table-toolbar--between">
						<div className="aime-toolbar-copy">
							<strong>{ linkSuggestionTotal }</strong>
							<span>{ SUGGESTION_COUNT_COPY[ suggestionStatus ] || SUGGESTION_COUNT_COPY.all }</span>
						</div>
						<SelectControl
							label={ __( 'Status', 'ai-marketing-expert' ) }
							value={ suggestionStatus }
							options={ SUGGESTION_STATUS_OPTIONS }
							onChange={ ( value ) => {
								setSuggestionStatus( value );
								setSuggestionPage( 1 );
							} }
							__nextHasNoMarginBottom
						/>
						<Button variant="secondary" onClick={ fetchInternalLinkSuggestions } disabled={ loadingSuggestions }>
							{ loadingSuggestions ? __( 'Refreshing\u2026', 'ai-marketing-expert' ) : __( 'Refresh', 'ai-marketing-expert' ) }
						</Button>
					</div>

					{ suggestionsTruncated && (
						<Notice
							type="warning"
							dismissible={ false }
							message={ sprintf(
								/* translators: %d: maximum number of posts indexed per request */
								__( 'Only the %d most recently updated posts with suggestions are listed. Older posts are not shown here \u2014 open them in the editor to review their suggestions.', 'ai-marketing-expert' ),
								suggestionCeiling
							) }
						/>
					) }

					{ loadingSuggestions && ! linkSuggestions.length ? (
						<Loader variant="lines" text={ __( 'Loading internal link suggestions\u2026', 'ai-marketing-expert' ) } />
					) : suggestionsFailed ? (
						<p className="aime-empty-text">
							{ __( 'Could not load internal link suggestions. Nothing has changed \u2014 use Refresh to try again.', 'ai-marketing-expert' ) }
						</p>
					) : linkSuggestions.length === 0 ? (
						<p className="aime-empty-text">
							{ __( 'No internal link suggestions match this status yet. Run a scan to generate suggestions.', 'ai-marketing-expert' ) }
						</p>
					) : (
						<div className="aime-link-suggestions-list">
							{ linkSuggestions.map( ( item ) => (
								<div className="aime-link-suggestion-group" key={ item.post_id }>
									<div className="aime-link-suggestion-post">
										<div>
											<strong>{ item.post_title || __( '(Untitled)', 'ai-marketing-expert' ) }</strong>
											<span>{ item.post_status }</span>
										</div>
										<div className="aime-link-suggestion-post-actions">
											{ item.view_link && <Button variant="tertiary" href={ item.view_link } target="_blank" rel="noreferrer">{ __( 'View', 'ai-marketing-expert' ) }</Button> }
											{ item.edit_link && <Button variant="tertiary" href={ item.edit_link } target="_blank" rel="noreferrer">{ __( 'Edit', 'ai-marketing-expert' ) }</Button> }
										</div>
									</div>

									{ item.suggestions.map( ( suggestion ) => {
										const applyKey = `apply-${ item.post_id }-${ suggestion.id }`;
										const dismissKey = `dismiss-${ item.post_id }-${ suggestion.id }`;
										const isPending = suggestion.status === 'pending';

										return (
											<div className="aime-link-suggestion" key={ suggestion.id }>
												<div className="aime-link-suggestion-main">
													<div className="aime-link-suggestion-route">
														<span className="aime-link-anchor">{ suggestion.anchor_text }</span>
														<span className="aime-link-arrow" aria-hidden="true">{ '\u2192' }</span>
														<a href={ suggestion.target_url } target="_blank" rel="noreferrer">
															{ suggestion.target_title || suggestion.target_url }
														</a>
													</div>
													{ suggestion.reason && <p>{ suggestion.reason }</p> }
												</div>
												<div className="aime-link-suggestion-actions">
													<span className={ `aime-link-suggestion-status is-${ suggestion.status || 'pending' }` }>
														{ suggestion.status || 'pending' }
													</span>
													{ isPending && (
														<>
															<Button
																variant="primary"
																onClick={ () => handleSuggestionAction( 'apply', item.post_id, suggestion.id ) }
																isBusy={ suggestionAction === applyKey }
																disabled={ !! suggestionAction }
															>
																{ __( 'Apply', 'ai-marketing-expert' ) }
															</Button>
															<Button
																variant="secondary"
																onClick={ () => handleSuggestionAction( 'dismiss', item.post_id, suggestion.id ) }
																isBusy={ suggestionAction === dismissKey }
																disabled={ !! suggestionAction }
															>
																{ __( 'Dismiss', 'ai-marketing-expert' ) }
															</Button>
														</>
													) }
												</div>
											</div>
										);
									} ) }
								</div>
							) ) }
						</div>
					) }

					{ suggestionPages > 1 && (
						<div className="aime-pagination">
							<Button
								variant="secondary"
								disabled={ suggestionPage <= 1 || loadingSuggestions }
								onClick={ () => setSuggestionPage( ( p ) => p - 1 ) }
								isSmall
							>
								{ __( '← Previous', 'ai-marketing-expert' ) }
							</Button>
							<span className="aime-pagination-info">
								{ sprintf(
									/* translators: 1: first post shown, 2: last post shown, 3: total posts with suggestions */
									__( 'Posts %1$d–%2$d of %3$d', 'ai-marketing-expert' ),
									( ( suggestionPage - 1 ) * SUGGESTIONS_PER_PAGE ) + 1,
									Math.min( suggestionPage * SUGGESTIONS_PER_PAGE, suggestionPostTotal ),
									suggestionPostTotal
								) }
							</span>
							<Button
								variant="secondary"
								disabled={ suggestionPage >= suggestionPages || loadingSuggestions }
								onClick={ () => setSuggestionPage( ( p ) => p + 1 ) }
								isSmall
							>
								{ __( 'Next →', 'ai-marketing-expert' ) }
							</Button>
						</div>
					) }

					{ hasPendingSuggestions && (
						<Notice
							type="info"
							message={ __( 'Apply updates the first safe plain-text anchor match and creates a WordPress revision before saving. If the anchor cannot be safely found, open the editor and place the link manually.', 'ai-marketing-expert' ) }
						/>
					) }
				</Card>

				{ /* Activity log */ }
				{ log.length > 0 && (
					<div className="aime-kw-summary-row">
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val">{ logTotal }</span>
							<span className="aime-kw-stat-label">{ __( 'Total Tasks', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val" style={ { color: '#4caf50' } }>{ logStatusCounts.completed }</span>
							<span className="aime-kw-stat-label">{ __( 'Completed', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val" style={ { color: '#f44336' } }>{ logStatusCounts.failed }</span>
							<span className="aime-kw-stat-label">{ __( 'Failed', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val" style={ { color: '#ff9800' } }>{ logStatusCounts.running }</span>
							<span className="aime-kw-stat-label">{ __( 'Running', 'ai-marketing-expert' ) }</span>
						</div>
					</div>
				) }

				{ log.length > 0 && (
					<div className="aime-analytics-charts-row aime-analytics-charts-row--1">
						<Card title={ __( 'Task Status', 'ai-marketing-expert' ) }>
							<DonutChart
								data={ [
									{ label: __( 'Completed', 'ai-marketing-expert' ), value: logStatusCounts.completed, color: '#4caf50' },
									{ label: __( 'Failed', 'ai-marketing-expert' ), value: logStatusCounts.failed, color: '#f44336' },
									{ label: __( 'Running', 'ai-marketing-expert' ), value: logStatusCounts.running, color: '#ff9800' },
								] }
							/>
						</Card>
					</div>
				) }

				<Card title={ __( 'Activity Log', 'ai-marketing-expert' ) }>
					<div className="aime-table-toolbar">
						<SelectControl
							label={ __( 'Filter by Task', 'ai-marketing-expert' ) }
							value={ logFilter }
							options={ TASK_TYPE_OPTIONS }
							onChange={ ( v ) => { setLogFilter( v ); setLogPage( 1 ); } }
							__nextHasNoMarginBottom
						/>
						{ log.length > 0 && (
							<Button
								variant="tertiary"
								icon={ trash }
								isDestructive
								onClick={ handleClearLog }
								style={ { marginLeft: 'auto' } }
							>
								{ __( 'Clear Log', 'ai-marketing-expert' ) }
							</Button>
						) }
					</div>

					{ loadingLog && ! log.length ? (
						<Loader variant="table" text={ __( 'Loading log\u2026', 'ai-marketing-expert' ) } />
					) : log.length === 0 ? (
						<p className="aime-empty-text">
							{ __( 'No automation activity yet. Enable automations above and publish a post to get started.', 'ai-marketing-expert' ) }
						</p>
					) : (
						<>
							<table className="aime-kw-table">
								<thead>
									<tr>
										<th onClick={ () => handleLogSort( 'task_type' ) } style={ { cursor: 'pointer' } }>{ __( 'Task', 'ai-marketing-expert' ) } <SortArrow active={ logSortKey === 'task_type' } dir={ logSortDir } /></th>
										<th onClick={ () => handleLogSort( 'trigger_type' ) } style={ { cursor: 'pointer' } }>{ __( 'Trigger', 'ai-marketing-expert' ) } <SortArrow active={ logSortKey === 'trigger_type' } dir={ logSortDir } /></th>
										<th onClick={ () => handleLogSort( 'status' ) } style={ { cursor: 'pointer' } }>{ __( 'Status', 'ai-marketing-expert' ) } <SortArrow active={ logSortKey === 'status' } dir={ logSortDir } /></th>
										<th>{ __( 'Summary', 'ai-marketing-expert' ) }</th>
										<th onClick={ () => handleLogSort( 'created_at' ) } style={ { cursor: 'pointer' } }>{ __( 'Date', 'ai-marketing-expert' ) } <SortArrow active={ logSortKey === 'created_at' } dir={ logSortDir } /></th>
									</tr>
								</thead>
								<tbody>
									{ sortedLog.map( ( entry ) => (
										<tr key={ entry.id }>
											<td><strong>{ ( entry.task_type || '' ).replace( /_/g, ' ' ) }</strong></td>
											<td>{ entry.trigger_type || '\u2014' }</td>
											<td>
												<span
													className="aime-status-badge"
													style={ {
														color: '#fff',
														backgroundColor: STATUS_COLORS[ entry.status ] || '#999',
														padding: '2px 8px',
														borderRadius: 3,
														fontSize: 12,
													} }
												>
													{ entry.status }
												</span>
											</td>
											<td style={ { maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }>
												{ entry.summary || '\u2014' }
											</td>
											<td>{ entry.created_at?.split( ' ' )[ 0 ] || '\u2014' }</td>
										</tr>
									) ) }
								</tbody>
							</table>

							{ totalPages > 1 && (
								<div className="aime-pagination">
									<Button
										variant="secondary"
										disabled={ logPage <= 1 }
										onClick={ () => setLogPage( ( p ) => p - 1 ) }
										isSmall
									>
										{ __( '\u2190 Previous', 'ai-marketing-expert' ) }
									</Button>
									<span className="aime-pagination-info">
										{ logPage } / { totalPages }
									</span>
									<Button
										variant="secondary"
										disabled={ logPage >= totalPages }
										onClick={ () => setLogPage( ( p ) => p + 1 ) }
										isSmall
									>
										{ __( 'Next \u2192', 'ai-marketing-expert' ) }
									</Button>
								</div>
							) }
						</>
					) }
				</Card>
			</div>
		</>
	);
};

export default SeoAutomation;
