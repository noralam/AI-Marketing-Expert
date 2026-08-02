/**
 * Social Analytics — the Social Media landing page.
 *
 * What this replaced: six equal centered stat cards in six unrelated Material
 * colours, an area chart drawn in the lobby's forest green inside the teal room,
 * and a donut of two or three platforms. Nothing outranked anything else, the
 * page never said whether posting was actually working, and `status_breakdown`
 * was computed on every render and never drawn.
 *
 * Every number here comes from the same `/social/analytics/overview` payload the
 * old screen already fetched. Nothing new is instrumented; it was all being
 * returned and most of it was not being read.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
} from 'recharts';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import EmptyState from '../../common/EmptyState';
import ArcGauge from '../../common/ArcGauge';
import { RankRow } from '../../common/RankBar';
import { formatDateTime } from '../../../utils/datetime';

const RANGES = [ 7, 30, 90 ];

/*
 * Recharts writes stroke and fill as SVG presentation attributes, where a
 * `var()` never resolves — so the Social Media accent is repeated as a literal.
 * This is the documented exception to the cascade rule, and these must stay in
 * step with `[data-module="social-media"]` in global.scss.
 */
const SOCIAL = '#0E7490';
const CHART_GRID = '#eaf2ea';
const CHART_TICK = '#5f7562';

const TOOLTIP_STYLE = {
	borderRadius: 8,
	border: '1px solid var(--aime-border-light, #e3ece4)',
	boxShadow: '0 8px 24px rgba(20, 45, 22, 0.12)',
	fontSize: 13,
};

/*
 * Statuses are the system's signal palette, not a decorative scale, and the
 * teal room light is deliberately absent here — a post's state is the same
 * fact in every module, so it is coloured like a status and not like Social
 * Media. Draft is muted rather than warned about: an unfinished draft is a
 * choice, and colouring it like damage would call the user's own queue a fault.
 */
const POST_STATUS = {
	draft: '#8fa893',
	scheduled: '#1565C0',
	publishing: '#F9A825',
	published: '#2E7D32',
	failed: '#D32F2F',
};

const POST_STATUS_LABELS = {
	draft: __( 'Draft', 'ai-marketing-expert' ),
	scheduled: __( 'Scheduled', 'ai-marketing-expert' ),
	publishing: __( 'Publishing', 'ai-marketing-expert' ),
	published: __( 'Published', 'ai-marketing-expert' ),
	failed: __( 'Failed', 'ai-marketing-expert' ),
};

/*
 * Pipeline order — not sorted by count. Read in count order a status list tells
 * you which pile is biggest; read in stage order it tells you *where the work
 * stopped*, which is the only thing this card can say that the gauges cannot.
 */
const PIPELINE_ORDER = [ 'draft', 'scheduled', 'publishing', 'published', 'failed' ];

const titleCase = ( value ) => {
	const str = String( value || '' );
	return str.charAt( 0 ).toUpperCase() + str.slice( 1 );
};

const isoDay = ( date ) => {
	const y = date.getFullYear();
	const m = String( date.getMonth() + 1 ).padStart( 2, '0' );
	const d = String( date.getDate() ).padStart( 2, '0' );
	return `${ y }-${ m }-${ d }`;
};

/*
 * The endpoint groups by day and returns only days that had a post, so a 30-day
 * window with four busy days comes back as four points. Plotted raw, three weeks
 * of silence between two of them renders exactly as wide as a single overnight
 * gap and the axis lies about the shape of the work. Scaffolding every day back
 * in at zero is what makes the spacing true — and for a scheduling module the
 * gaps are the finding.
 *
 * Days the API returns outside the scaffold are kept rather than dropped: a
 * timezone difference between PHP's gmdate and the browser can put a real post
 * one day either side of the window, and silently losing it is worse than one
 * extra tick.
 */
const buildSeries = ( days, rows ) => {
	const byDate = {};

	const cursor = new Date();
	cursor.setHours( 0, 0, 0, 0 );
	for ( let i = days - 1; i >= 0; i-- ) {
		const day = new Date( cursor );
		day.setDate( day.getDate() - i );
		byDate[ isoDay( day ) ] = { date: isoDay( day ), total: 0 };
	}

	( rows || [] ).forEach( ( row ) => {
		const key = String( row.day || '' ).slice( 0, 10 );
		if ( ! key ) {
			return;
		}
		if ( ! byDate[ key ] ) {
			byDate[ key ] = { date: key, total: 0 };
		}
		byDate[ key ].total = Number( row.total ) || 0;
	} );

	return Object.values( byDate )
		.sort( ( a, b ) => a.date.localeCompare( b.date ) )
		.map( ( point ) => ( { ...point, label: point.date.slice( 5 ) } ) );
};

const SocialDashboard = ( { onNavigate } ) => {
	const { get, loading, error, clearError } = useApi();
	const [ data, setData ] = useState( null );
	const [ days, setDays ] = useState( 30 );

	const fetchData = useCallback( async () => {
		try {
			const res = await get( '/social/analytics/overview', { days } );
			setData( res );
		} catch ( e ) {
			// The Notice below renders whatever useApi captured.
		}
	}, [ get, days ] );

	useEffect( () => {
		fetchData();
	}, [ fetchData ] );

	if ( loading && ! data ) {
		return <Loader variant="dashboard" text={ __( 'Loading analytics…', 'ai-marketing-expert' ) } />;
	}

	const totals = data?.totals || {};
	const accounts = Number( data?.accounts || 0 );
	const totalPosts = Number( totals.total_posts || 0 );
	const published = Number( totals.published || 0 );
	const scheduled = Number( totals.scheduled || 0 );
	const failed = Number( totals.failed || 0 );
	const drafts = Number( totals.drafts || 0 );
	const aiGenerated = Number( totals.ai_generated || 0 );

	const attempted = published + failed;
	const deliveryRate = attempted > 0 ? ( published / attempted ) * 100 : 0;
	const outRate = totalPosts > 0 ? ( published / totalPosts ) * 100 : 0;
	const aiRate = totalPosts > 0 ? ( aiGenerated / totalPosts ) * 100 : 0;
	const waiting = drafts + scheduled;

	const statusCounts = {};
	( data?.status_breakdown || [] ).forEach( ( row ) => {
		statusCounts[ row.status ] = Number( row.count ) || 0;
	} );
	/*
	 * Ordered stages first, then anything the API returned that this list does
	 * not know about — a status added server-side should appear as itself rather
	 * than vanish from the page that is supposed to account for every post.
	 */
	const pipeline = [
		...PIPELINE_ORDER.filter( ( key ) => statusCounts[ key ] !== undefined ),
		...Object.keys( statusCounts ).filter( ( key ) => ! PIPELINE_ORDER.includes( key ) ),
	].map( ( key ) => ( {
		key,
		label: POST_STATUS_LABELS[ key ] || titleCase( key ),
		count: statusCounts[ key ],
		color: POST_STATUS[ key ] || '#8fa893',
	} ) );
	const pipelinePeak = Math.max( 0, ...pipeline.map( ( row ) => row.count ) );

	const platforms = ( data?.platform_breakdown || [] )
		.map( ( row ) => ( { name: titleCase( row.platform ), count: Number( row.count ) || 0 } ) )
		.sort( ( a, b ) => b.count - a.count );
	const platformPeak = Math.max( 0, ...platforms.map( ( row ) => row.count ) );

	const failures = data?.recent_failures || [];

	const series = buildSeries( days, data?.posts_over_time );
	const seriesHasData = series.some( ( point ) => point.total > 0 );
	// Roughly ten ticks whatever the range, so 90 days does not print 90 dates.
	const tickInterval = Math.max( 0, Math.ceil( series.length / 10 ) - 1 );

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
			<h2>{ __( 'Social Media', 'ai-marketing-expert' ) }</h2>
			<div className="aime-page-header-actions">
				{ rangeToggle }
				<Button variant="primary" onClick={ () => onNavigate( 'new-post' ) }>
					{ __( 'New Post', 'ai-marketing-expert' ) }
				</Button>
			</div>
		</div>
	);

	/*
	 * Two different kinds of empty, and they need different words. No connected
	 * account means nothing on this page *can* have a value, so measuring is the
	 * wrong thing to show — the account is the blocker. Accounts but no posts is
	 * a real, working, unused module, and the gauges below would spend their
	 * largest type printing three zeros.
	 */
	if ( accounts === 0 ) {
		return (
			<div className="aime-social-analytics">
				{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
				{ header }
				<Card>
					<EmptyState
						title={ __( 'No account is connected yet.', 'ai-marketing-expert' ) }
						description={ __( 'Social Media publishes through an account you own. Connect one and every post you schedule or publish is measured here.', 'ai-marketing-expert' ) }
					/>
					<div className="aime-quick-actions">
						<Button variant="primary" onClick={ () => onNavigate( 'accounts' ) }>
							{ __( 'Connect Account', 'ai-marketing-expert' ) }
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	if ( totalPosts === 0 ) {
		return (
			<div className="aime-social-analytics">
				{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
				{ header }
				<Card>
					<EmptyState
						title={ __( 'Nothing was posted in this window.', 'ai-marketing-expert' ) }
						description={ sprintf(
							/* translators: %s: number of connected accounts. */
							__( 'You have %s connected accounts and no posts in the selected range. Widen the range above, or write the first one.', 'ai-marketing-expert' ),
							accounts.toLocaleString()
						) }
					/>
					<div className="aime-quick-actions">
						<Button variant="primary" onClick={ () => onNavigate( 'new-post' ) }>
							{ __( 'Write a Post', 'ai-marketing-expert' ) }
						</Button>
						<Button variant="secondary" onClick={ () => onNavigate( 'calendar' ) }>
							{ __( 'Open Calendar', 'ai-marketing-expert' ) }
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	return (
		<div className="aime-social-analytics">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			{ header }

			{ /*
			  * Three gauges, each a bounded rate with a real full. Delivery leads
			  * because it is the module's whole promise — a post that never left is
			  * the only failure here the user cannot see from the calendar. The
			  * second gauge exists because delivery alone flatters a queue that
			  * never ships: a hundred drafts and one published post is 100%
			  * delivery, and only the published share tells you the work is stuck.
			  */ }
			<div className="aime-overview-band">
				<Card className="aime-band-card aime-band-card--lead">
					<span className="aime-band-card__label">{ __( 'Delivery', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ deliveryRate } size={ 176 } stroke={ 12 }>
						<span className="aime-arc__value-text">
							{ attempted > 0 ? `${ Math.round( deliveryRate ) }%` : '—' }
						</span>
						<span className="aime-arc__caption">{ __( 'Reached the platform', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<div className="aime-band-chips">
						<div className="aime-band-chip">
							<span className="aime-band-chip__label">{ __( 'Published', 'ai-marketing-expert' ) }</span>
							<span className="aime-band-chip__value">{ published.toLocaleString() }</span>
						</div>
						<div className="aime-band-chip">
							<span className="aime-band-chip__label">{ __( 'Failed', 'ai-marketing-expert' ) }</span>
							<span className="aime-band-chip__value">{ failed.toLocaleString() }</span>
						</div>
					</div>
				</Card>

				<Card className="aime-band-card">
					<span className="aime-band-card__label">{ __( 'Shipped', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ outRate }>
						<span className="aime-arc__value-text">{ `${ Math.round( outRate ) }%` }</span>
						<span className="aime-arc__caption">{ __( 'Of posts made', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<p className="aime-band-card__hint">
						{ waiting > 0
							? sprintf(
								/* translators: 1: number of drafts, 2: number of scheduled posts. */
								__( '%1$s drafts and %2$s scheduled posts are still waiting.', 'ai-marketing-expert' ),
								drafts.toLocaleString(),
								scheduled.toLocaleString()
							)
							: __( 'Nothing is sitting in the queue — every post you wrote went out.', 'ai-marketing-expert' ) }
					</p>
				</Card>

				<Card className="aime-band-card">
					<span className="aime-band-card__label">{ __( 'AI assist', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ aiRate }>
						<span className="aime-arc__value-text">{ `${ Math.round( aiRate ) }%` }</span>
						<span className="aime-arc__caption">{ __( 'Written with AI', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<p className="aime-band-card__hint">
						{ aiGenerated > 0
							? sprintf(
								/* translators: 1: AI-written posts, 2: total posts. */
								__( '%1$s of %2$s posts in this window were composed by AI.', 'ai-marketing-expert' ),
								aiGenerated.toLocaleString(),
								totalPosts.toLocaleString()
							)
							: __( 'Every post here was written by hand. The composer can draft one for you.', 'ai-marketing-expert' ) }
					</p>
				</Card>
			</div>

			<div className="aime-charts-grid aime-charts-grid--wide-first">
				<Card title={ __( 'Posts Over Time', 'ai-marketing-expert' ) }>
					{ seriesHasData ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<BarChart data={ series } margin={ { top: 8, right: 8, bottom: 0, left: -12 } }>
								<CartesianGrid stroke={ CHART_GRID } vertical={ false } />
								<XAxis
									dataKey="label"
									tickLine={ false }
									axisLine={ false }
									interval={ tickInterval }
									tick={ { fontSize: 11, fill: CHART_TICK } }
								/>
								<YAxis
									tickLine={ false }
									axisLine={ false }
									allowDecimals={ false }
									width={ 40 }
									tick={ { fontSize: 11, fill: CHART_TICK } }
								/>
								<Tooltip contentStyle={ TOOLTIP_STYLE } cursor={ { fill: 'rgba(14, 116, 144, 0.06)' } } />
								<Bar
									dataKey="total"
									name={ __( 'Posts', 'ai-marketing-expert' ) }
									fill={ SOCIAL }
									radius={ [ 3, 3, 0, 0 ] }
									maxBarSize={ 28 }
								/>
							</BarChart>
						</ResponsiveContainer>
					) : (
						<EmptyState
							title={ __( 'No posts in this window.', 'ai-marketing-expert' ) }
							description={ __( 'Widen the range above, or schedule a post and it will chart here.', 'ai-marketing-expert' ) }
						/>
					) }
				</Card>

				{ /*
				  * Stage order, not count order. The gauges above say how much got
				  * out; this says where the rest stopped, and that is only legible
				  * if the rows stay in the order a post actually travels.
				  */ }
				<Card title={ __( 'Post Pipeline', 'ai-marketing-expert' ) }>
					{ pipeline.length > 0 ? (
						<div className="aime-pipeline">
							<div className="aime-pipeline__headline">
								<span className="aime-pipeline__value">{ totalPosts.toLocaleString() }</span>
								<span className="aime-pipeline__caption">
									{ __( 'Posts in this window', 'ai-marketing-expert' ) }
								</span>
							</div>
							<ul className="aime-rankbar">
								{ pipeline.map( ( row ) => (
									<RankRow
										key={ row.key }
										label={ row.label }
										count={ row.count }
										percent={ pipelinePeak > 0 ? ( row.count / pipelinePeak ) * 100 : 0 }
										color={ row.color }
									/>
								) ) }
							</ul>
						</div>
					) : (
						<EmptyState title={ __( 'No posts to account for yet.', 'ai-marketing-expert' ) } />
					) }
				</Card>
			</div>

			{ /*
			  * A ranked list, not the donut this was. A donut asks the eye to
			  * compare angles — the least accurate comparison it can make — and
			  * with two or three platforms it spends a whole card saying "mostly
			  * this one". Every row is the room's teal because a platform is not a
			  * status and five hues here would put five lights in one room.
			  */ }
			<Card
				title={ __( 'By Platform', 'ai-marketing-expert' ) }
				actions={
					<button type="button" className="aime-link-btn" onClick={ () => onNavigate( 'accounts' ) }>
						{ __( 'Manage accounts', 'ai-marketing-expert' ) }
					</button>
				}
			>
				{ platforms.length > 0 ? (
					<div className="aime-pipeline">
						<div className="aime-pipeline__headline">
							<span className="aime-pipeline__value">{ accounts.toLocaleString() }</span>
							<span className="aime-pipeline__caption">
								{ __( 'Connected accounts', 'ai-marketing-expert' ) }
							</span>
						</div>
						<ul className="aime-rankbar">
							{ platforms.map( ( row ) => (
								<RankRow
									key={ row.name }
									label={ row.name }
									count={ row.count }
									percent={ platformPeak > 0 ? ( row.count / platformPeak ) * 100 : 0 }
									color={ SOCIAL }
								/>
							) ) }
						</ul>
					</div>
				) : (
					<EmptyState
						title={ __( 'No posts are attributed to a platform yet.', 'ai-marketing-expert' ) }
						description={ __( 'A post counts here once it is attached to a connected account.', 'ai-marketing-expert' ) }
					/>
				) }
			</Card>

			{ /*
			  * Only rendered when something broke. A permanently present "Recent
			  * Failures" card teaches the eye to skip it, and the delivery gauge
			  * above already says the window is clean.
			  */ }
			{ failures.length > 0 && (
				<Card title={ __( 'Recent Failures', 'ai-marketing-expert' ) }>
					<div className="aime-table-wrap">
						<table className="aime-table">
							<thead>
								<tr>
									<th>{ __( 'Platform', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Account', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Post', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Why it failed', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'When', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ failures.map( ( row ) => (
									<tr key={ row.id }>
										<td>{ titleCase( row.platform ) }</td>
										<td>{ row.account_name || '—' }</td>
										<td>
											{ ( row.content || '' ).length > 60
												? `${ row.content.substring( 0, 60 ) }…`
												: row.content || '—' }
										</td>
										<td>
											<span
												className="aime-status-badge"
												style={ { background: POST_STATUS.failed } }
											>
												{ row.error_message || __( 'Unknown error', 'ai-marketing-expert' ) }
											</span>
										</td>
										<td className="is-muted">{ formatDateTime( row.created_at ) }</td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
					<p className="aime-pipeline__foot">
						{ __( 'The ten most recent failures in this window. Fixing the account connection usually clears a repeated error.', 'ai-marketing-expert' ) }
					</p>
				</Card>
			) }
		</div>
	);
};

export default SocialDashboard;
