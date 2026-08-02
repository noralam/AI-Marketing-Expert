/**
 * EmailAnalytics — the reporting surface for the Email Marketing room.
 *
 * Was five equal KPI cards over four half-width charts. Equal cards rank
 * nothing, and the page's one bounded, actionable rate — how much of what you
 * sent got opened — was printed as flat text in slot three while a gauge for it
 * sat two rows further down. This adopts the band the other four analytics
 * rooms already use: rates on arcs at the top, counts underneath them, and the
 * time series below, so the page has a first thing to read.
 *
 * Colour note: this page is inside `[data-module="email-marketing"]`, so every
 * surface around it resolves `--aime-primary` to crimson and the gauges light
 * with it unaided. Recharts writes stroke/fill as SVG presentation attributes,
 * where custom properties do not resolve, so the accent has to be repeated as a
 * literal for the charts alone. It is the same crimson, not a second opinion
 * about it, and must stay in step with global.scss.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, SelectControl } from '@aime/wp-components';
import {
	ResponsiveContainer, AreaChart, Area, BarChart, Bar,
	XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import useApi from '../../../hooks/useApi';
import useEmailUsage from '../../../hooks/useEmailUsage';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import EmptyState from '../../common/EmptyState';
import ArcGauge from '../../common/ArcGauge';
import QuotaMeters from '../../common/QuotaMeters';
import { RankRow } from '../../common/RankBar';
import { formatDateTime } from '../../../utils/datetime';

const RANGES = [ 7, 30, 90 ];

const EMAIL = '#BE123C';
/*
 * Sent, opened and clicked are the same people at three depths, so they take
 * three steps of one hue. Three unrelated colours would claim they were
 * unrelated things, which is the opposite of what a funnel means. Unsubscribed
 * is not a deeper step — it is the leak out the side — so it drops out of the
 * ramp entirely and takes the muted grey.
 */
const EMAIL_SOFT = '#E9A6B4';
const EMAIL_MID = '#D35C78';
const LEAK = '#8fa893';

const CHART_GRID = '#eaf2ea';
const CHART_TICK = '#5f7562';

// Recharts' default tooltip is a white box with a 1px grey edge belonging to no
// system. These props hand it the card language instead, without the cost of a
// bespoke tooltip component on every chart.
const TOOLTIP_STYLE = {
	borderRadius: 8,
	border: '1px solid var(--aime-border-light, #e3ece4)',
	boxShadow: '0 8px 24px rgba(20, 45, 22, 0.12)',
	fontSize: 13,
};

const ACTIVITY_PAGE_SIZE_OPTIONS = [
	{ label: '5', value: '5' },
	{ label: '10', value: '10' },
];

const isoDay = ( date ) => {
	const y = date.getFullYear();
	const m = String( date.getMonth() + 1 ).padStart( 2, '0' );
	const d = String( date.getDate() ).padStart( 2, '0' );
	return `${ y }-${ m }-${ d }`;
};

/*
 * Both series group by date and return only the days that had a row, so a
 * 30-day window with four busy days comes back as four points. Plotted raw,
 * those four sit shoulder to shoulder and three silent weeks between two of
 * them render exactly as wide as one overnight gap — the axis lies about the
 * shape of the sending. Scaffolding every day back in at zero is what makes the
 * spacing true.
 *
 * Dates outside the scaffold are kept rather than dropped: a timezone
 * difference between PHP's gmdate and the browser can put a real row one day
 * either side of the window, and silently losing a send is worse than one extra
 * tick.
 */
const buildSeries = ( days, rows, fields ) => {
	const blank = ( date ) => {
		const point = { date };
		fields.forEach( ( field ) => { point[ field ] = 0; } );
		return point;
	};

	const byDate = {};
	const cursor = new Date();
	cursor.setHours( 0, 0, 0, 0 );
	for ( let i = days - 1; i >= 0; i-- ) {
		const day = new Date( cursor );
		day.setDate( day.getDate() - i );
		byDate[ isoDay( day ) ] = blank( isoDay( day ) );
	}

	( rows || [] ).forEach( ( row ) => {
		const key = String( row.date || '' ).slice( 0, 10 );
		if ( ! key ) {
			return;
		}
		if ( ! byDate[ key ] ) {
			byDate[ key ] = blank( key );
		}
		fields.forEach( ( field ) => {
			byDate[ key ][ field ] = Number( row[ field ] ) || 0;
		} );
	} );

	return Object.values( byDate )
		.sort( ( a, b ) => a.date.localeCompare( b.date ) )
		.map( ( point ) => ( { ...point, label: point.date.slice( 5 ) } ) );
};

const clampRate = ( value ) => Math.max( 0, Math.min( Number( value ) || 0, 100 ) );

const EmailAnalytics = ( { onNavigate } ) => {
	const { get, loading, error, clearError } = useApi();
	const { usage } = useEmailUsage();
	const [ days, setDays ] = useState( 30 );
	const [ data, setData ] = useState( null );
	const [ activityLog, setActivityLog ] = useState( [] );
	const [ logPage, setLogPage ] = useState( 1 );
	const [ logPerPage, setLogPerPage ] = useState( '5' );
	const [ logTotal, setLogTotal ] = useState( 0 );

	const fetchOverview = useCallback( async () => {
		try {
			const res = await get( `/email/analytics/overview?days=${ days }` );
			setData( res );
		} catch ( e ) { /* The Notice above renders whatever useApi captured. */ }
	}, [ get, days ] );

	const fetchActivity = useCallback( async () => {
		try {
			const res = await get( `/email/analytics/activity-log?page=${ logPage }&per_page=${ logPerPage }` );
			setActivityLog( res.items || [] );
			setLogTotal( res.total || 0 );
		} catch ( e ) { /* */ }
	}, [ get, logPage, logPerPage ] );

	useEffect( () => { fetchOverview(); }, [ fetchOverview ] );
	useEffect( () => { fetchActivity(); }, [ fetchActivity ] );

	if ( loading && ! data ) {
		return <Loader variant="dashboard" text={ __( 'Loading analytics…', 'ai-marketing-expert' ) } />;
	}

	const totals = data?.totals || {};
	const subscribers = Number( totals.subscribers || 0 );
	const sent = Number( totals.sent || 0 );
	const opened = Number( totals.opened || 0 );
	const clicks = Number( totals.clicks || 0 );
	const unsubs = Number( totals.unsubscribes || 0 );

	const openRate = clampRate( totals.open_rate );
	const clickRate = clampRate( totals.click_rate );
	/*
	 * Click-to-open, the third gauge, and the only one of the three that is
	 * about the email rather than the inbox. Open rate grades the subject line;
	 * this grades what was inside once someone was already looking. Both sides
	 * are counted once per subscriber server-side, so the ratio cannot exceed
	 * 100% for an honest reason — it is still clamped for a dishonest one.
	 */
	const clickToOpen = opened > 0 ? clampRate( ( clicks / opened ) * 100 ) : 0;

	const growth = buildSeries( days, data?.subscriber_growth, [ 'count' ] );
	const growthMax = Math.max( 0, ...growth.map( ( d ) => d.count ) );
	const growthHasShape = growthMax > 0;

	const activity = buildSeries( days, data?.email_activity, [ 'sent', 'opened' ] );
	const activityHasShape = activity.some( ( d ) => d.sent > 0 || d.opened > 0 );

	// Roughly ten ticks whatever the range, so 90 days does not print 90 dates.
	const tickInterval = Math.max( 0, Math.ceil( growth.length / 10 ) - 1 );

	/*
	 * The funnel, scaled to what was delivered rather than to the biggest row —
	 * unlike a ranking, these four rows are nested inside each other, and every
	 * one of them is honestly a share of the first.
	 */
	const funnel = [
		{ key: 'sent', label: __( 'Delivered', 'ai-marketing-expert' ), count: sent, color: EMAIL_SOFT },
		{ key: 'opened', label: __( 'Opened', 'ai-marketing-expert' ), count: opened, color: EMAIL_MID },
		{ key: 'clicked', label: __( 'Clicked a link', 'ai-marketing-expert' ), count: clicks, color: EMAIL },
		{ key: 'unsubscribed', label: __( 'Unsubscribed', 'ai-marketing-expert' ), count: unsubs, color: LEAK },
	].map( ( row ) => ( {
		...row,
		percent: sent > 0 ? ( row.count / sent ) * 100 : 0,
	} ) );

	// Opened and went no further is the one number on this card worth acting on
	// this week, so it takes the headline instead of a total that the band above
	// has already said twice.
	const stalled = Math.max( 0, opened - clicks );

	const logPages = Math.ceil( logTotal / parseInt( logPerPage, 10 ) );

	const rowsControl = (
		<SelectControl
			label={ __( 'Rows', 'ai-marketing-expert' ) }
			hideLabelFromVision
			value={ logPerPage }
			options={ ACTIVITY_PAGE_SIZE_OPTIONS }
			onChange={ ( value ) => { setLogPerPage( value ); setLogPage( 1 ); } }
			__nextHasNoMarginBottom
		/>
	);

	const rangeToggle = (
		<div
			className="aime-range-toggle"
			role="group"
			aria-label={ __( 'Analytics date range', 'ai-marketing-expert' ) }
		>
			{ RANGES.map( ( option ) => (
				<button
					key={ option }
					type="button"
					className={ `aime-range-toggle__btn${ days === option ? ' is-active' : '' }` }
					aria-pressed={ days === option }
					onClick={ () => setDays( option ) }
				>
					{ sprintf(
						/* translators: %d: number of days. */
						__( '%dd', 'ai-marketing-expert' ),
						option
					) }
				</button>
			) ) }
		</div>
	);

	const header = (
		<div className="aime-page-header">
			<h2>{ __( 'Email Analytics', 'ai-marketing-expert' ) }</h2>
			<div className="aime-page-header-actions">
				{ rangeToggle }
				<Button variant="primary" onClick={ () => onNavigate?.( 'campaign-editor', { id: 'new' } ) }>
					{ __( 'New Campaign', 'ai-marketing-expert' ) }
				</Button>
			</div>
		</div>
	);

	const quota = (
		<QuotaMeters
			items={ [
				{
					key: 'campaigns',
					label: __( 'Campaigns this month', 'ai-marketing-expert' ),
					usage: usage?.campaigns_per_month,
				},
				{
					key: 'scheduled',
					label: __( 'Scheduled at once', 'ai-marketing-expert' ),
					usage: usage?.scheduled_campaigns,
				},
				{
					key: 'automations',
					label: __( 'Automations', 'ai-marketing-expert' ),
					usage: usage?.automations,
					note: __( 'total, not monthly', 'ai-marketing-expert' ),
				},
			] }
		/>
	);

	const growthCard = (
		<Card title={ __( 'Subscriber Growth', 'ai-marketing-expert' ) }>
			{ growthHasShape ? (
				<ResponsiveContainer width="100%" height={ 260 }>
					<AreaChart data={ growth } margin={ { top: 8, right: 8, bottom: 0, left: -12 } }>
						<defs>
							<linearGradient id="aimeGrowthFill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={ EMAIL } stopOpacity={ 0.28 } />
								<stop offset="100%" stopColor={ EMAIL } stopOpacity={ 0.04 } />
							</linearGradient>
						</defs>
						<CartesianGrid vertical={ false } stroke={ CHART_GRID } />
						<XAxis
							dataKey="label"
							tickLine={ false }
							axisLine={ false }
							interval={ tickInterval }
							tick={ { fontSize: 11, fill: CHART_TICK } }
							tickMargin={ 8 }
						/>
						<YAxis
							tickLine={ false }
							axisLine={ false }
							tick={ { fontSize: 11, fill: CHART_TICK } }
							allowDecimals={ false }
							width={ 40 }
							// Always a step of headroom above the peak, so a run of
							// single signups sits inside the plot rather than on its
							// ceiling, where it would read as "pegged at maximum".
							domain={ [ 0, Math.max( 2, growthMax + 1 ) ] }
						/>
						<Tooltip contentStyle={ TOOLTIP_STYLE } cursor={ { stroke: CHART_GRID } } />
						<Area
							type="monotone"
							dataKey="count"
							name={ __( 'New subscribers', 'ai-marketing-expert' ) }
							stroke={ EMAIL }
							strokeWidth={ 1.5 }
							fill="url(#aimeGrowthFill)"
							// Signups are sparse — often a handful of days across the
							// range. Without a visible dot a single day plots as nothing.
							dot={ growth.length <= 31 ? { r: 2.5, strokeWidth: 0, fill: EMAIL } : false }
							activeDot={ { r: 4, strokeWidth: 0 } }
						/>
					</AreaChart>
				</ResponsiveContainer>
			) : (
				<EmptyState
					title={ __( 'No sign-ups in this range.', 'ai-marketing-expert' ) }
					description={ sprintf(
						/* translators: %s: subscriber count. */
						__( 'You have %s on the list, but nobody joined inside the selected window. Widen the range above to see when they did.', 'ai-marketing-expert' ),
						subscribers.toLocaleString()
					) }
				/>
			) }
		</Card>
	);

	/*
	 * Two kinds of empty, and they need different words. An empty list means
	 * nothing on this page *can* have a value, so measuring is the wrong thing
	 * to show — the list is the blocker. A list with no send is a real, working,
	 * unused module: the growth chart is live and worth keeping, but three rate
	 * gauges would spend the page's largest type printing three dashes.
	 */
	if ( subscribers === 0 ) {
		return (
			<div className="aime-email-analytics">
				{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
				{ header }
				<Card>
					<EmptyState
						title={ __( 'Nobody on the list yet.', 'ai-marketing-expert' ) }
						description={ __( 'Email Marketing measures what happens to the mail you send. Add or import your first subscribers and every send, open and click lands here.', 'ai-marketing-expert' ) }
					/>
					<div className="aime-quick-actions">
						<Button variant="primary" onClick={ () => onNavigate?.( 'subscribers' ) }>
							{ __( 'Add Subscribers', 'ai-marketing-expert' ) }
						</Button>
						<Button variant="secondary" onClick={ () => onNavigate?.( 'import-export' ) }>
							{ __( 'Import a List', 'ai-marketing-expert' ) }
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	if ( sent === 0 ) {
		return (
			<div className="aime-email-analytics">
				{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
				{ header }
				{ quota }
				<Card>
					<EmptyState
						title={ __( 'No email has gone out in this range.', 'ai-marketing-expert' ) }
						description={ sprintf(
							/* translators: %s: subscriber count. */
							__( 'Open and click rates start reading after your first campaign is delivered. %s people are waiting to hear from you.', 'ai-marketing-expert' ),
							subscribers.toLocaleString()
						) }
					/>
					<div className="aime-quick-actions">
						<Button variant="primary" onClick={ () => onNavigate?.( 'campaign-editor', { id: 'new' } ) }>
							{ __( 'Write a Campaign', 'ai-marketing-expert' ) }
						</Button>
					</div>
				</Card>
				{ growthCard }
			</div>
		);
	}

	return (
		<div className="aime-email-analytics">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			{ header }

			{ /* Free-plan headroom, above the numbers it constrains. */ }
			{ quota }

			{ /*
			  * Three gauges instead of five flat KPI cards. Each is a bounded share
			  * with a real full, which is what an arc can honestly draw, and they
			  * read left to right as the journey itself: it arrived, it was opened,
			  * it was worth clicking. The counts those rates came from sit in the
			  * chips underneath, where a count belongs.
			  */ }
			<div className="aime-overview-band">
				<Card className="aime-band-card aime-band-card--lead">
					<span className="aime-band-card__label">{ __( 'Opens', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ openRate } size={ 176 } stroke={ 12 }>
						<span className="aime-arc__value-text">{ `${ Math.round( openRate ) }%` }</span>
						<span className="aime-arc__caption">{ __( 'Of delivered mail', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<div className="aime-band-chips">
						<div className="aime-band-chip">
							<span className="aime-band-chip__label">{ __( 'Delivered', 'ai-marketing-expert' ) }</span>
							<span className="aime-band-chip__value">{ sent.toLocaleString() }</span>
						</div>
						<div className="aime-band-chip">
							<span className="aime-band-chip__label">{ __( 'Subscribers', 'ai-marketing-expert' ) }</span>
							<span className="aime-band-chip__value">{ subscribers.toLocaleString() }</span>
						</div>
					</div>
				</Card>

				<Card className="aime-band-card">
					<span className="aime-band-card__label">{ __( 'Clicks', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ clickRate }>
						<span className="aime-arc__value-text">{ `${ Math.round( clickRate ) }%` }</span>
						<span className="aime-arc__caption">{ __( 'Of delivered mail', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<p className="aime-band-card__hint">
						{ clicks > 0
							? sprintf(
								/* translators: 1: number of people who clicked, 2: number of emails delivered. */
								__( '%1$s people followed a link out of %2$s who received one.', 'ai-marketing-expert' ),
								clicks.toLocaleString(),
								sent.toLocaleString()
							)
							: __( 'Nobody has followed a link yet. Links are only counted once per person.', 'ai-marketing-expert' ) }
					</p>
				</Card>

				<Card className="aime-band-card">
					<span className="aime-band-card__label">{ __( 'Engagement', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ clickToOpen }>
						<span className="aime-arc__value-text">
							{ opened > 0 ? `${ Math.round( clickToOpen ) }%` : '—' }
						</span>
						<span className="aime-arc__caption">{ __( 'Clicked after opening', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<p className="aime-band-card__hint">
						{ opened > 0
							? __( 'Your subject line earns the open; this is what the email itself earned once it was read.', 'ai-marketing-expert' )
							: __( 'Nothing has been opened in this range, so there is no reading to measure yet.', 'ai-marketing-expert' ) }
					</p>
				</Card>
			</div>

			<div className="aime-charts-grid aime-charts-grid--wide-first">
				<Card title={ __( 'Sent vs Opened', 'ai-marketing-expert' ) }>
					{ activityHasShape ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<BarChart data={ activity } margin={ { top: 8, right: 8, bottom: 0, left: -12 } }>
								<CartesianGrid vertical={ false } stroke={ CHART_GRID } />
								<XAxis
									dataKey="label"
									tickLine={ false }
									axisLine={ false }
									interval={ tickInterval }
									tick={ { fontSize: 11, fill: CHART_TICK } }
									tickMargin={ 8 }
								/>
								<YAxis
									tickLine={ false }
									axisLine={ false }
									tick={ { fontSize: 11, fill: CHART_TICK } }
									allowDecimals={ false }
									width={ 40 }
								/>
								<Tooltip contentStyle={ TOOLTIP_STYLE } cursor={ { fill: 'rgba(190, 18, 60, 0.06)' } } />
								{ /* Legend above the plot: a key you read after the thing
								     it unlocks is a key you read twice. */ }
								<Legend
									verticalAlign="top"
									align="left"
									height={ 28 }
									iconType="circle"
									iconSize={ 8 }
									wrapperStyle={ { fontSize: 11, fontWeight: 600, color: CHART_TICK } }
								/>
								{ /* Opened is a subset of Sent, so Sent takes the lighter
								     tint of the same hue — two steps of one colour say
								     "part of that". Stacking them would say the opposite. */ }
								<Bar dataKey="sent" fill={ EMAIL_SOFT } radius={ [ 3, 3, 0, 0 ] } maxBarSize={ 28 } name={ __( 'Sent', 'ai-marketing-expert' ) } />
								<Bar dataKey="opened" fill={ EMAIL } radius={ [ 3, 3, 0, 0 ] } maxBarSize={ 28 } name={ __( 'Opened', 'ai-marketing-expert' ) } />
							</BarChart>
						</ResponsiveContainer>
					) : (
						<EmptyState
							title={ __( 'Nothing plotted in this range.', 'ai-marketing-expert' ) }
							description={ __( 'Sends and opens are drawn per day. Widen the range above if your last campaign ran earlier.', 'ai-marketing-expert' ) }
						/>
					) }
				</Card>

				{ /* The funnel replaces the old two-slice open-rate pie. A pie with
				     two slices is a bar drawn the expensive way, and it could only
				     ever show one of these four steps at a time. */ }
				<Card title={ __( 'What Happened Next', 'ai-marketing-expert' ) }>
					<div className="aime-pipeline">
						<div className="aime-pipeline__headline">
							<span className="aime-pipeline__value">{ stalled.toLocaleString() }</span>
							<span className="aime-pipeline__caption">{ __( 'Opened but never clicked', 'ai-marketing-expert' ) }</span>
						</div>
						<ul className="aime-rankbar">
							{ funnel.map( ( step ) => (
								<RankRow
									key={ step.key }
									label={ step.label }
									count={ step.count }
									percent={ step.percent }
									color={ step.color }
								/>
							) ) }
						</ul>
						<p className="aime-pipeline__foot">
							{ sprintf(
								/* translators: %d: number of days in the selected range. */
								__( 'Every bar is a share of what was delivered in the last %d days.', 'ai-marketing-expert' ),
								days
							) }
						</p>
					</div>
				</Card>
			</div>

			<div className="aime-charts-grid">
				{ growthCard }

				{ /* Recent activity log.
				     The row-count control belongs in the card header with the
				     title it governs, not floating in the body above the list. */ }
				<Card title={ __( 'Recent Activity', 'ai-marketing-expert' ) } actions={ rowsControl }>
					{ activityLog.length === 0 ? (
						<EmptyState
							title={ __( 'No recent activity.', 'ai-marketing-expert' ) }
							description={ __( 'Subscriber sign-ups, updates, and campaign events land here as they happen.', 'ai-marketing-expert' ) }
						/>
					) : (
						<>
							<div className="aime-activity-timeline">
								{ activityLog.map( ( a, i ) => (
									<div key={ i } className="aime-activity-item">
										<span className="aime-activity-dot" />
										<div>
											<span>{ a.description || a.action }</span>
											<span className="aime-muted">{ formatDateTime( a.created_at, '' ) }</span>
										</div>
									</div>
								) ) }
							</div>
							{ logPages > 1 && (
								<div className="aime-pagination">
									<Button variant="secondary" disabled={ logPage <= 1 } onClick={ () => setLogPage( logPage - 1 ) }>{ __( '← Prev', 'ai-marketing-expert' ) }</Button>
									<span>{ logPage } / { logPages }</span>
									<Button variant="secondary" disabled={ logPage >= logPages } onClick={ () => setLogPage( logPage + 1 ) }>{ __( 'Next →', 'ai-marketing-expert' ) }</Button>
								</div>
							) }
						</>
					) }
				</Card>
			</div>
		</div>
	);
};

export default EmailAnalytics;
