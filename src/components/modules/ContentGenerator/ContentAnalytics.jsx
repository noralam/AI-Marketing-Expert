/**
 * Content Analytics — the Content Generator landing page.
 *
 * Five equal KPI cards, a hand-rolled div bar chart and a row of status chips
 * floating in an empty card is what this was. Nothing on it outranked anything
 * else, and the one number worth acting on — how much finished content is
 * sitting unpublished — was not on the page at all.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import {
	ResponsiveContainer,
	ComposedChart,
	Bar,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	Legend,
} from 'recharts';
import useApi from '../../../hooks/useApi';
import usePro from '../../../hooks/usePro';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import EmptyState from '../../common/EmptyState';
import ArcGauge from '../../common/ArcGauge';
import { ARTICLE_STATUS_LABELS, ARTICLE_STATUS_COLORS } from '../../../utils/constants';

const RANGES = [ 7, 30, 90 ];

/*
 * Recharts writes stroke and fill as SVG presentation attributes, where a
 * `var()` never resolves — so the Content Generator accent has to be repeated
 * as a literal here. This is the one documented exception to the cascade rule,
 * and these must stay in step with `[data-module="content-generator"]` in
 * global.scss.
 *
 * Published is a lighter step of the same indigo, not a second colour: the two
 * series are the same articles at two moments in their life, and two unrelated
 * hues would claim they were unrelated things.
 */
const CONTENT = '#4338CA';
const CONTENT_SOFT = '#A5B4FC';
const CHART_GRID = '#eaf2ea';
const CHART_TICK = '#5f7562';

const TOOLTIP_STYLE = {
	borderRadius: 8,
	border: '1px solid var(--aime-border-light, #e3ece4)',
	boxShadow: '0 8px 24px rgba(20, 45, 22, 0.12)',
	fontSize: 13,
};

/*
 * Pipeline order — not alphabetical, and deliberately not sorted by count. Read
 * in count order a status list tells you which pile is biggest. Read in stage
 * order it tells you *where the work stopped*, which is the only thing this
 * card can say that the totals above it cannot.
 */
const PIPELINE_ORDER = [
	'draft',
	'generating',
	'ready',
	'review',
	'scheduled',
	'published',
	'archived',
];

const isoDay = ( date ) => {
	const y = date.getFullYear();
	const m = String( date.getMonth() + 1 ).padStart( 2, '0' );
	const d = String( date.getDate() ).padStart( 2, '0' );
	return `${ y }-${ m }-${ d }`;
};

/*
 * The endpoint groups by date and returns only the days that had a row, so a
 * 30-day window with four busy days comes back as four points. Plotted raw,
 * those four sit shoulder to shoulder and three weeks of silence between two of
 * them renders exactly as wide as a single overnight gap — the axis lies about
 * the shape of the work. Scaffolding every day in the range back in at zero is
 * what makes the spacing true.
 *
 * Dates the API returns that fall outside the scaffold are kept rather than
 * dropped: a timezone difference between PHP's gmdate and the browser can put a
 * real row one day either side of the window, and silently losing it would be
 * worse than one extra tick.
 */
const buildSeries = ( days, created, published ) => {
	const byDate = {};

	const cursor = new Date();
	cursor.setHours( 0, 0, 0, 0 );
	for ( let i = days - 1; i >= 0; i-- ) {
		const day = new Date( cursor );
		day.setDate( day.getDate() - i );
		const key = isoDay( day );
		byDate[ key ] = { date: key, created: 0, published: 0 };
	}

	const apply = ( rows, field ) => {
		( rows || [] ).forEach( ( row ) => {
			const key = String( row.date || '' ).slice( 0, 10 );
			if ( ! key ) {
				return;
			}
			if ( ! byDate[ key ] ) {
				byDate[ key ] = { date: key, created: 0, published: 0 };
			}
			byDate[ key ][ field ] = Number( row.count ) || 0;
		} );
	};

	apply( created, 'created' );
	apply( published, 'published' );

	return Object.values( byDate )
		.sort( ( a, b ) => a.date.localeCompare( b.date ) )
		.map( ( point ) => ( { ...point, label: point.date.slice( 5 ) } ) );
};

/*
 * One row of a ranked bar list: label, a bar on a common baseline, and the
 * count. This is the shape both the pipeline and the tone list want.
 *
 * It is also the answer to "should this be a pie". A pie compares angles, which
 * is the least accurate comparison the eye can make; these rows compare lengths
 * from a shared left edge, which is the most accurate. And a pie has no order —
 * draft → ready → published is a sequence, and scattering it around a circle
 * throws away the only structure the data has.
 */
const RankRow = ( { label, count, percent, color, suffix } ) => (
	<li className="aime-rankbar__row">
		<span className="aime-rankbar__label">
			<span className="aime-rankbar__dot" style={ { background: color } } />
			{ label }
		</span>
		<span className="aime-rankbar__track">
			<span
				className="aime-rankbar__fill"
				style={ { width: `${ Math.max( percent, percent > 0 ? 2 : 0 ) }%`, background: color } }
			/>
		</span>
		<span className="aime-rankbar__count">
			{ count.toLocaleString() }
			{ suffix && <em className="aime-rankbar__suffix">{ suffix }</em> }
		</span>
	</li>
);

const ContentAnalytics = ( { onNavigate } ) => {
	const { get, loading, error, clearError } = useApi();
	const { hasPro, freeLimits } = usePro();
	const [ stats, setStats ] = useState( null );
	const [ days, setDays ] = useState( 30 );

	const load = useCallback( async ( range ) => {
		try {
			const res = await get( `/content/analytics/overview?days=${ range }` );
			setStats( res );
		} catch ( e ) {
			// The Notice above renders whatever useApi captured.
		}
	}, [ get ] );

	useEffect( () => {
		load( days );
	}, [ load, days ] );

	if ( loading && ! stats ) {
		return <Loader variant="dashboard" text={ __( 'Loading analytics…', 'ai-marketing-expert' ) } />;
	}

	const totals = stats?.totals || {};
	const monthlyCount = totals.articles_this_month || 0;
	const monthlyLimit = freeLimits?.content_articles_per_month || 10;
	const monthlyPercent = monthlyLimit > 0
		? Math.min( 100, ( monthlyCount / monthlyLimit ) * 100 )
		: 0;

	const totalArticles = Number( totals.total_articles || 0 );
	const totalPublished = Number( totals.total_published || 0 );
	const totalWords = Number( totals.total_words || 0 );
	const avgWords = Number( totals.avg_word_count || 0 );
	const avgSeo = Math.max( 0, Math.min( Number( totals.avg_seo_score || 0 ), 100 ) );
	const avgReadability = Math.max( 0, Math.min( Number( totals.avg_readability || 0 ), 100 ) );

	const publishedPercent = totalArticles > 0 ? ( totalPublished / totalArticles ) * 100 : 0;

	/* ── Pipeline ─────────────────────────────────────────── */

	const statusCounts = {};
	( stats?.status_breakdown || [] ).forEach( ( row ) => {
		statusCounts[ row.status ] = Number( row.count ) || 0;
	} );

	// A status the constants file has never heard of still has articles in it,
	// so unknown keys are appended rather than filtered away.
	const orderedKeys = [
		...PIPELINE_ORDER,
		...Object.keys( statusCounts ).filter( ( key ) => ! PIPELINE_ORDER.includes( key ) ),
	];

	const pipelineTotal = Object.values( statusCounts ).reduce( ( sum, n ) => sum + n, 0 );
	const pipelinePeak = Math.max( 0, ...Object.values( statusCounts ) );

	const pipeline = orderedKeys
		.filter( ( key ) => ( statusCounts[ key ] || 0 ) > 0 )
		.map( ( key ) => ( {
			key,
			label: ARTICLE_STATUS_LABELS[ key ] || key,
			count: statusCounts[ key ],
			color: ARTICLE_STATUS_COLORS[ key ] || '#9e9e9e',
			// Scaled to the biggest stage, not to the total. Against the total a
			// seven-stage pipeline draws seven slivers and nothing is comparable;
			// against the peak the longest bar fills the track and every other one
			// is read as a fraction of it.
			percent: pipelinePeak > 0 ? ( statusCounts[ key ] / pipelinePeak ) * 100 : 0,
		} ) );

	/*
	 * Finished work that is not live is the one thing on this page worth acting
	 * on today, so it is the headline rather than a chip. When there is none, the
	 * headline falls back to the share that did make it out — a card that leads
	 * with a zero has spent its largest type on nothing.
	 */
	const readyCount = Number( statusCounts.ready || 0 );
	const headlineValue = readyCount > 0 ? readyCount.toLocaleString() : `${ Math.round( publishedPercent ) }%`;
	const headlineCaption = readyCount > 0
		? __( 'Finished, not published yet', 'ai-marketing-expert' )
		: __( 'Of the library is published', 'ai-marketing-expert' );

	/* ── Tones ────────────────────────────────────────────── */

	const tones = stats?.top_tones || [];
	const tonePeak = Math.max( 0, ...tones.map( ( t ) => Number( t.count ) || 0 ) );

	/* ── Time series ──────────────────────────────────────── */

	const series = buildSeries( days, stats?.articles_over_time, stats?.published_over_time );
	const seriesHasData = series.some( ( p ) => p.created > 0 || p.published > 0 );
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

	return (
		<div className="aime-content-analytics">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<h2>{ __( 'Content Generator', 'ai-marketing-expert' ) }</h2>
				<div className="aime-page-header-actions">
					{ rangeToggle }
					<Button variant="primary" onClick={ () => onNavigate( 'new-article' ) }>
						{ __( 'New Article', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</div>

			{ /*
			  * Three gauges instead of five flat KPI cards. Each one is a bounded
			  * number with a full — a share and two scores — which is what an arc
			  * can honestly draw. The counts those rates came from sit in the chips
			  * underneath, where a count belongs.
			  */ }
			<div className="aime-overview-band">
				<Card className="aime-band-card aime-band-card--lead">
					<span className="aime-band-card__label">{ __( 'Library', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ publishedPercent } size={ 176 } stroke={ 12 }>
						<span className="aime-arc__value-text">{ `${ Math.round( publishedPercent ) }%` }</span>
						<span className="aime-arc__caption">{ __( 'Published', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<div className="aime-band-chips">
						<div className="aime-band-chip">
							<span className="aime-band-chip__label">{ __( 'Articles', 'ai-marketing-expert' ) }</span>
							<span className="aime-band-chip__value">{ totalArticles.toLocaleString() }</span>
						</div>
						<div className="aime-band-chip">
							<span className="aime-band-chip__label">{ __( 'Words written', 'ai-marketing-expert' ) }</span>
							<span className="aime-band-chip__value">{ totalWords.toLocaleString() }</span>
						</div>
					</div>
				</Card>

				<Card className="aime-band-card">
					<span className="aime-band-card__label">{ __( 'SEO', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ avgSeo }>
						<span className="aime-arc__value-text">{ avgSeo || '—' }</span>
						<span className="aime-arc__caption">{ __( 'Avg SEO score', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<p className="aime-band-card__hint">
						{ avgSeo > 0
							? __( 'Averaged across every article that has been scored.', 'ai-marketing-expert' )
							: __( 'Nothing scored yet — generate an article to get a score.', 'ai-marketing-expert' ) }
					</p>
				</Card>

				<Card className="aime-band-card">
					<span className="aime-band-card__label">{ __( 'Readability', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ avgReadability }>
						<span className="aime-arc__value-text">{ avgReadability || '—' }</span>
						<span className="aime-arc__caption">{ __( 'Avg readability', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<p className="aime-band-card__hint">
						{ avgWords > 0
							? sprintf(
								/* translators: %s: average word count per article. */
								__( 'Across articles averaging %s words each.', 'ai-marketing-expert' ),
								avgWords.toLocaleString()
							)
							: __( 'No finished articles to measure yet.', 'ai-marketing-expert' ) }
					</p>
				</Card>
			</div>

			{ /*
			  * The only hard limit on this page, so it stays a card of its own
			  * rather than becoming a fourth gauge. A quota is a warning, and a
			  * warning parked in a row of statistics reads as a statistic.
			  */ }
			{ ! hasPro && (
				<Card title={ __( 'Monthly Usage', 'ai-marketing-expert' ) }>
					<div className="aime-usage-bar-wrap">
						<div className="aime-usage-labels">
							<span>
								{ sprintf(
									/* translators: 1: articles used this month, 2: monthly limit. */
									__( '%1$s of %2$s articles this month', 'ai-marketing-expert' ),
									monthlyCount.toLocaleString(),
									monthlyLimit.toLocaleString()
								) }
							</span>
							<span>
								{ sprintf(
									/* translators: %s: number of articles left this month. */
									__( '%s left', 'ai-marketing-expert' ),
									Math.max( 0, monthlyLimit - monthlyCount ).toLocaleString()
								) }
							</span>
						</div>
						<div className="aime-usage-bar">
							<div className="aime-usage-bar-fill" style={ { width: `${ monthlyPercent }%` } } />
						</div>
					</div>
				</Card>
			) }

			<div className="aime-charts-grid aime-charts-grid--wide-first">
				<Card title={ __( 'Created vs Published', 'ai-marketing-expert' ) }>
					{ seriesHasData ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<ComposedChart data={ series } margin={ { top: 8, right: 8, bottom: 0, left: -12 } }>
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
								<Tooltip contentStyle={ TOOLTIP_STYLE } cursor={ { fill: 'rgba(67, 56, 202, 0.06)' } } />
								<Legend iconType="circle" iconSize={ 8 } />
								<Bar
									dataKey="created"
									name={ __( 'Created', 'ai-marketing-expert' ) }
									fill={ CONTENT_SOFT }
									radius={ [ 3, 3, 0, 0 ] }
									maxBarSize={ 28 }
								/>
								{ /*
								  * Published is a line, not a second bar. Grouped bars over
								  * 90 days are two pixels wide each; and these are not two
								  * things measured the same way — one is output, the other
								  * is what got out the door.
								  */ }
								<Line
									type="monotone"
									dataKey="published"
									name={ __( 'Published', 'ai-marketing-expert' ) }
									stroke={ CONTENT }
									strokeWidth={ 2 }
									dot={ series.length <= 31 ? { r: 2.5, strokeWidth: 0, fill: CONTENT } : false }
									activeDot={ { r: 4, strokeWidth: 0 } }
								/>
							</ComposedChart>
						</ResponsiveContainer>
					) : (
						<EmptyState
							title={ __( 'Nothing written in this window.', 'ai-marketing-expert' ) }
							description={ __( 'No articles were created or published in the selected range. Widen it above, or start a new article.', 'ai-marketing-expert' ) }
						/>
					) }
				</Card>

				<Card title={ __( 'Pipeline', 'ai-marketing-expert' ) }>
					{ pipeline.length > 0 ? (
						<div className="aime-pipeline">
							<div className="aime-pipeline__headline">
								<span className="aime-pipeline__value">{ headlineValue }</span>
								<span className="aime-pipeline__caption">{ headlineCaption }</span>
							</div>
							<ul className="aime-rankbar">
								{ pipeline.map( ( stage ) => (
									<RankRow
										key={ stage.key }
										label={ stage.label }
										count={ stage.count }
										percent={ stage.percent }
										color={ stage.color }
									/>
								) ) }
							</ul>
							<p className="aime-pipeline__foot">
								{ sprintf(
									/* translators: %s: total number of articles. */
									__( '%s articles, every status, all time.', 'ai-marketing-expert' ),
									pipelineTotal.toLocaleString()
								) }
							</p>
						</div>
					) : (
						<EmptyState
							title={ __( 'No articles yet.', 'ai-marketing-expert' ) }
							description={ __( 'Once you generate something, this shows where each article is between draft and published.', 'ai-marketing-expert' ) }
						/>
					) }
				</Card>
			</div>

			<div className="aime-content-split">
				<Card title={ __( 'Popular Tones', 'ai-marketing-expert' ) }>
					{ tones.length > 0 ? (
						<ul className="aime-rankbar aime-rankbar--tones">
							{ tones.map( ( tone ) => (
								<RankRow
									key={ tone.tone }
									label={ tone.tone }
									count={ Number( tone.count ) || 0 }
									percent={ tonePeak > 0 ? ( ( Number( tone.count ) || 0 ) / tonePeak ) * 100 : 0 }
									color={ CONTENT }
								/>
							) ) }
						</ul>
					) : (
						<EmptyState
							title={ __( 'No tones recorded.', 'ai-marketing-expert' ) }
							description={ __( 'The tone you pick when generating an article is counted here.', 'ai-marketing-expert' ) }
						/>
					) }
				</Card>

				<Card
					title={ __( 'Recent Articles', 'ai-marketing-expert' ) }
					actions={
						<Button variant="link" onClick={ () => onNavigate( 'articles' ) }>
							{ __( 'View All', 'ai-marketing-expert' ) }
						</Button>
					}
				>
					{ stats?.recent_articles?.length > 0 ? (
						<table className="aime-table">
							<thead>
								<tr>
									<th>{ __( 'Title', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
									<th className="aime-num">{ __( 'Words', 'ai-marketing-expert' ) }</th>
									<th className="aime-num">{ __( 'SEO', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ stats.recent_articles.map( ( a ) => (
									<tr
										key={ a.id }
										className="aime-clickable-row"
										onClick={ () => onNavigate( 'edit-article', { id: a.id } ) }
									>
										<td>{ a.title || __( 'Untitled', 'ai-marketing-expert' ) }</td>
										<td>
											<span
												className="aime-status-badge"
												style={ { background: ARTICLE_STATUS_COLORS[ a.status ] || '#9e9e9e' } }
											>
												{ ARTICLE_STATUS_LABELS[ a.status ] || a.status }
											</span>
										</td>
										<td className="aime-num">{ ( Number( a.actual_word_count ) || 0 ).toLocaleString() }</td>
										<td className="aime-num">{ a.seo_score || '—' }</td>
									</tr>
								) ) }
							</tbody>
						</table>
					) : (
						/*
						 * The endpoint filters this list by the same window as the
						 * chart, so an established site with a quiet month lands here
						 * with a full library. The copy has to say that rather than
						 * claim there are no articles.
						 */
						<EmptyState
							title={ __( 'Nothing in this window.', 'ai-marketing-expert' ) }
							description={ totalArticles > 0
								? __( 'No articles were created in the selected range. Widen it above, or open the full list.', 'ai-marketing-expert' )
								: __( 'Generate your first article and it will appear here.', 'ai-marketing-expert' ) }
						/>
					) }
				</Card>
			</div>
		</div>
	);
};

export default ContentAnalytics;
