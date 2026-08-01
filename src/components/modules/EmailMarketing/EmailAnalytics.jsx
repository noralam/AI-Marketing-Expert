/**
 * EmailAnalytics — the reporting surface for the Email Marketing room.
 *
 * Colour note: this page is inside `[data-module="email-marketing"]`, so every
 * surface around it resolves `--aime-primary` to crimson. Recharts writes
 * stroke/fill as SVG presentation attributes, where custom properties do not
 * resolve, so the room accent has to be repeated as a literal here. It is the
 * same crimson, not a second opinion about it.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, SelectControl } from '@aime/wp-components';
import {
	ResponsiveContainer, AreaChart, Area, BarChart, Bar,
	XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import EmptyState from '../../common/EmptyState';
import ArcGauge from '../../common/ArcGauge';
import { formatDateTime } from '../../../utils/datetime';

const EMAIL = '#BE123C';
// Opened is a subset of Sent, so Sent takes the lighter tint of the same hue.
// Two steps of one colour say "part of that" — two different colours would say
// "unrelated thing", which is the opposite of what these two bars mean.
const EMAIL_SOFT = '#E9A6B4';

// Chart chrome, tinted to the green canvas rather than a cool blue-grey.
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

const DAYS_OPTIONS = [
	{ label: __( 'Last 7 Days', 'ai-marketing-expert' ), value: '7' },
	{ label: __( 'Last 14 Days', 'ai-marketing-expert' ), value: '14' },
	{ label: __( 'Last 30 Days', 'ai-marketing-expert' ), value: '30' },
	{ label: __( 'Last 90 Days', 'ai-marketing-expert' ), value: '90' },
];

const ACTIVITY_PAGE_SIZE_OPTIONS = [
	{ label: '5', value: '5' },
	{ label: '10', value: '10' },
];

const EmailAnalytics = () => {
	const { get, loading, error, clearError } = useApi();
	const [ days, setDays ] = useState( '30' );
	const [ data, setData ] = useState( null );
	const [ activityLog, setActivityLog ] = useState( [] );
	const [ logPage, setLogPage ] = useState( 1 );
	const [ logPerPage, setLogPerPage ] = useState( '5' );
	const [ logTotal, setLogTotal ] = useState( 0 );

	const fetchOverview = useCallback( async () => {
		try {
			const res = await get( `/email/analytics/overview?days=${ days }` );
			setData( res );
		} catch ( e ) { /* */ }
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
	const sent = Number( totals.sent || 0 );
	const opened = Number( totals.opened || 0 );
	const notOpened = Math.max( 0, sent - opened );
	const openRate = Math.max( 0, Math.min( Number( totals.open_rate || 0 ), 100 ) );
	const openedPercent = sent > 0 ? ( opened / sent ) * 100 : 0;

	const kpis = [
		{ label: __( 'Total Subscribers', 'ai-marketing-expert' ), value: Number( totals.subscribers || 0 ).toLocaleString() },
		{ label: __( 'Emails Sent', 'ai-marketing-expert' ), value: sent.toLocaleString() },
		{ label: __( 'Open Rate', 'ai-marketing-expert' ), value: `${ totals.open_rate || 0 }%` },
		{ label: __( 'Click Rate', 'ai-marketing-expert' ), value: `${ totals.click_rate || 0 }%` },
		{ label: __( 'Unsubscribes', 'ai-marketing-expert' ), value: Number( totals.unsubscribes || 0 ).toLocaleString() },
	];

	const growth = ( data?.subscriber_growth || [] ).map( ( d ) => ( {
		...d,
		count: Number( d.count ) || 0,
	} ) );

	/*
	 * This series is new signups per day, not a running total, and the endpoint
	 * only returns days that had one — so a real, healthy list looks like a few
	 * points all equal to 1. Requiring the values to differ would throw that
	 * away. The only thing worth suppressing is a series with nothing in it.
	 *
	 * The old chart's real problem was the scale, not the data: `dataMax` on a
	 * flat series of 1s put the line on the ceiling and filled the whole plot,
	 * which reads as "pegged at maximum". Headroom below fixes that at source.
	 */
	const growthMax = growth.length > 0 ? Math.max( ...growth.map( ( d ) => d.count ) ) : 0;
	const growthHasShape = growthMax > 0;

	const activity = data?.email_activity || [];
	const hasActivity = activity.length > 0 && activity.some(
		( d ) => Number( d.sent || 0 ) > 0 || Number( d.opened || 0 ) > 0
	);

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

	return (
		<div className="aime-email-analytics">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<h2>{ __( 'Email Analytics', 'ai-marketing-expert' ) }</h2>
				<SelectControl value={ days } options={ DAYS_OPTIONS } onChange={ setDays } __nextHasNoMarginBottom />
			</div>

			{ /* KPIs */ }
			<div className="aime-kpi-grid aime-kpi-grid-5">
				{ kpis.map( ( k ) => (
					<div key={ k.label } className="aime-kpi-card">
						<span className="aime-kpi-value">{ k.value }</span>
						<span className="aime-kpi-label">{ k.label }</span>
					</div>
				) ) }
			</div>

			<div className="aime-charts-grid">
				{ /* Subscriber growth */ }
				<Card title={ __( 'Subscriber Growth', 'ai-marketing-expert' ) }>
					{ growthHasShape ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<AreaChart data={ growth } margin={ { top: 8, right: 8, bottom: 0, left: -16 } }>
								<defs>
									<linearGradient id="aimeGrowthFill" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor={ EMAIL } stopOpacity={ 0.28 } />
										<stop offset="100%" stopColor={ EMAIL } stopOpacity={ 0.04 } />
									</linearGradient>
								</defs>
								<CartesianGrid vertical={ false } stroke={ CHART_GRID } />
								<XAxis
									dataKey="date"
									tickLine={ false }
									axisLine={ false }
									tick={ { fontSize: 11, fill: CHART_TICK } }
									tickMargin={ 8 }
								/>
								<YAxis
									tickLine={ false }
									axisLine={ false }
									tick={ { fontSize: 11, fill: CHART_TICK } }
									allowDecimals={ false }
									width={ 40 }
									// Always a step of headroom above the peak, so a flat
									// series sits inside the plot instead of on its ceiling.
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
									dot={ { r: 2.5, strokeWidth: 0, fill: EMAIL } }
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
								Number( totals.subscribers || 0 ).toLocaleString()
							) }
						/>
					) }
				</Card>

				{ /* Email activity */ }
				<Card title={ __( 'Email Activity', 'ai-marketing-expert' ) }>
					{ hasActivity ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<BarChart data={ activity } margin={ { top: 8, right: 8, bottom: 0, left: -16 } }>
								<CartesianGrid vertical={ false } stroke={ CHART_GRID } />
								<XAxis
									dataKey="date"
									tickLine={ false }
									axisLine={ false }
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
								<Legend verticalAlign="top" align="left" height={ 28 } iconType="circle" iconSize={ 8 } wrapperStyle={ { fontSize: 11, fontWeight: 600, color: CHART_TICK } } />
								<Bar dataKey="sent" fill={ EMAIL_SOFT } radius={ [ 4, 4, 0, 0 ] } name={ __( 'Sent', 'ai-marketing-expert' ) } />
								<Bar dataKey="opened" fill={ EMAIL } radius={ [ 4, 4, 0, 0 ] } name={ __( 'Opened', 'ai-marketing-expert' ) } />
							</BarChart>
						</ResponsiveContainer>
					) : (
						<EmptyState
							title={ __( 'No email has gone out in this range.', 'ai-marketing-expert' ) }
							description={ __( 'Sends and opens are plotted per day once a campaign has run. Widen the range above if you sent one earlier.', 'ai-marketing-expert' ) }
						/>
					) }
				</Card>
			</div>

			<div className="aime-charts-grid">
				{ /* Open rate.
				     Was a two-slice pie. A pie with two slices is a bar drawn the
				     expensive way, and with nothing sent it drew an empty circle
				     with a legend under it — a chart of no data still looks like a
				     chart. The arc carries the same one bounded number, states it
				     as text in the middle, and has an honest empty state. */ }
				<Card title={ __( 'Open Rate', 'ai-marketing-expert' ) }>
					{ sent > 0 ? (
						<div className="aime-openrate">
							<ArcGauge value={ openRate } color={ EMAIL } size={ 176 } stroke={ 12 }>
								<span className="aime-arc__value-text">{ `${ openRate }%` }</span>
								<span className="aime-arc__caption">{ __( 'Opened', 'ai-marketing-expert' ) }</span>
							</ArcGauge>

							<div className="aime-module-share">
								<div className="aime-module-share__bar" aria-hidden="true">
									<span
										className="aime-module-share__fill"
										style={ { width: `${ openedPercent }%`, backgroundColor: EMAIL } }
									/>
								</div>
								<div className="aime-module-share__legend">
									<span className="aime-module-share__item">
										<span className="aime-module-share__dot" style={ { backgroundColor: EMAIL } } />
										{ sprintf(
											/* translators: %s: number of emails opened. */
											__( '%s opened', 'ai-marketing-expert' ),
											opened.toLocaleString()
										) }
									</span>
									<span className="aime-module-share__item">
										<span className="aime-module-share__dot aime-module-share__dot--rest" />
										{ sprintf(
											/* translators: %s: number of emails not opened. */
											__( '%s not opened', 'ai-marketing-expert' ),
											notOpened.toLocaleString()
										) }
									</span>
								</div>
							</div>
						</div>
					) : (
						<EmptyState
							title={ __( 'Nothing sent, nothing to open.', 'ai-marketing-expert' ) }
							description={ __( 'Open rate is the share of delivered email that got opened, so it starts reading after your first campaign goes out.', 'ai-marketing-expert' ) }
						/>
					) }
				</Card>

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
