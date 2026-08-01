/**
 * Workflow Analytics — the Workflow Automation landing page.
 *
 * The module had no analytics at all. The list answered "did it run" with a
 * date and a lifetime counter, and the error log answered "what broke" one
 * incident at a time. Neither answers the question that actually matters for
 * unattended automation: *is this working*. A workflow that has run 24 times
 * and failed 24 times looks identical, on the list, to one that has never
 * missed.
 *
 * Every number here comes from rows the engine already wrote — execution
 * outcomes, step tallies, timestamps, and per-step output statuses. Nothing
 * new is instrumented; it was all being recorded and none of it was read.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	Legend,
} from 'recharts';
import { apiGet } from '../../../utils/api';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import EmptyState from '../../common/EmptyState';
import ArcGauge from '../../common/ArcGauge';
import { RankRow } from '../../common/RankBar';
import { formatDateTime } from '../../../utils/datetime';
import { Button } from '../../common/WpComponents';

const RANGES = [ 7, 30, 90 ];

/*
 * Recharts writes stroke and fill as SVG presentation attributes, where a
 * `var()` never resolves — so these are literals. Workflow Automation takes no
 * room light: it is house forest green, like the lobby, because it is the room
 * that operates all the others rather than one of them.
 *
 * The outcome ramp is the system's own status palette, not a decorative scale.
 * Success is leaf green, partial is the warning amber, failed is the error red,
 * and skipped is deliberately desaturated — a skipped run is not a failure, it
 * is the free-plan cap refusing to start one, and colouring it like damage
 * would blame the workflow for the plan.
 */
const OUTCOME = {
	success: '#2E7D32',
	partial: '#F9A825',
	failed: '#D32F2F',
	skipped: '#cbd8cc',
};

const HOUSE = '#1B5E20';
const CHART_GRID = '#eaf2ea';
const CHART_TICK = '#5f7562';

const TOOLTIP_STYLE = {
	borderRadius: 8,
	border: '1px solid var(--aime-border-light, #e3ece4)',
	boxShadow: '0 8px 24px rgba(20, 45, 22, 0.12)',
	fontSize: 13,
};

const WF_STATUS_COLORS = {
	active: '#2E7D32',
	paused: '#F9A825',
	draft: '#8fa893',
};

const WF_STATUS_LABELS = {
	active: __( 'Active', 'ai-marketing-expert' ),
	paused: __( 'Paused', 'ai-marketing-expert' ),
	draft: __( 'Draft', 'ai-marketing-expert' ),
};

const isoDay = ( date ) => {
	const y = date.getFullYear();
	const m = String( date.getMonth() + 1 ).padStart( 2, '0' );
	const d = String( date.getDate() ).padStart( 2, '0' );
	return `${ y }-${ m }-${ d }`;
};

/*
 * The endpoint groups by date and returns only days that had a run, so a
 * 30-day window with four busy days comes back as four points. Plotted raw,
 * three weeks of silence between two of them renders exactly as wide as a
 * single overnight gap and the axis lies about the shape of the work.
 * Scaffolding every day back in at zero is what makes the spacing true — and
 * for a schedule-driven module the *gaps* are the finding, so this matters more
 * here than anywhere else in the plugin.
 *
 * Rows outside the scaffold are kept rather than dropped: a timezone difference
 * between PHP's gmdate and the browser can put a real run one day either side
 * of the window, and silently losing it is worse than one extra tick.
 */
const buildSeries = ( days, rows ) => {
	const byDate = {};
	const blank = () => ( { success: 0, partial: 0, failed: 0, skipped: 0 } );

	const cursor = new Date();
	cursor.setHours( 0, 0, 0, 0 );
	for ( let i = days - 1; i >= 0; i-- ) {
		const day = new Date( cursor );
		day.setDate( day.getDate() - i );
		const key = isoDay( day );
		byDate[ key ] = { date: key, ...blank() };
	}

	( rows || [] ).forEach( ( row ) => {
		const key = String( row.date || '' ).slice( 0, 10 );
		if ( ! key ) {
			return;
		}
		if ( ! byDate[ key ] ) {
			byDate[ key ] = { date: key, ...blank() };
		}
		if ( byDate[ key ][ row.status ] !== undefined ) {
			byDate[ key ][ row.status ] = Number( row.count ) || 0;
		}
	} );

	return Object.values( byDate )
		.sort( ( a, b ) => a.date.localeCompare( b.date ) )
		.map( ( point ) => ( { ...point, label: point.date.slice( 5 ) } ) );
};

/**
 * Seconds as something a person reads at a glance. Runs here span a two-second
 * notification and a six-minute article generation, so a raw seconds column
 * would make the reader do the division on every row.
 *
 * @param {number} seconds Duration in seconds.
 * @return {string} Formatted duration.
 */
const formatDuration = ( seconds ) => {
	const total = Math.max( 0, Math.round( Number( seconds ) || 0 ) );
	if ( total === 0 ) {
		return '—';
	}
	if ( total < 60 ) {
		/* translators: %d: seconds. */
		return sprintf( __( '%ds', 'ai-marketing-expert' ), total );
	}
	const mins = Math.floor( total / 60 );
	const secs = total % 60;
	if ( mins < 60 ) {
		return secs
			/* translators: 1: minutes, 2: seconds. */
			? sprintf( __( '%1$dm %2$ds', 'ai-marketing-expert' ), mins, secs )
			/* translators: %d: minutes. */
			: sprintf( __( '%dm', 'ai-marketing-expert' ), mins );
	}
	/* translators: 1: hours, 2: minutes. */
	return sprintf( __( '%1$dh %2$dm', 'ai-marketing-expert' ), Math.floor( mins / 60 ), mins % 60 );
};

const WorkflowAnalytics = ( { onNavigate } ) => {
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( '' );
	const [ stats, setStats ] = useState( null );
	const [ days, setDays ] = useState( 30 );

	const load = useCallback( async ( range ) => {
		setLoading( true );
		try {
			const res = await apiGet( `/workflow-automation/analytics?days=${ range }` );
			setStats( res );
			setError( '' );
		} catch ( e ) {
			setError( e?.message || __( 'Failed to load analytics.', 'ai-marketing-expert' ) );
		} finally {
			setLoading( false );
		}
	}, [] );

	useEffect( () => {
		load( days );
	}, [ load, days ] );

	if ( loading && ! stats ) {
		return <Loader variant="dashboard" text={ __( 'Loading analytics…', 'ai-marketing-expert' ) } />;
	}

	const totals = stats?.totals || {};
	const runsFinished = Number( totals.runs_finished || 0 );
	const failedRuns = Number( totals.failed || 0 );
	const partialRuns = Number( totals.partial || 0 );
	const skippedRuns = Number( totals.skipped || 0 );
	const successRate = Math.max( 0, Math.min( Number( totals.success_rate || 0 ), 100 ) );
	const stepRate = Math.max( 0, Math.min( Number( totals.step_rate || 0 ), 100 ) );
	const handsOff = Math.max( 0, Math.min( Number( totals.hands_off_rate || 0 ), 100 ) );
	const stepsFailed = Number( totals.steps_failed || 0 );
	const stepsSucceeded = Number( totals.steps_succeeded || 0 );
	const manualRuns = Number( totals.manual_runs || 0 );
	const unattendedRuns = Number( totals.unattended_runs || 0 );
	const avgSeconds = Number( totals.avg_seconds || 0 );
	const maxSeconds = Number( totals.max_seconds || 0 );
	const idleActive = Number( totals.idle_active || 0 );

	const wfStatus = stats?.workflow_status || {};
	const totalWorkflows = Object.values( wfStatus ).reduce( ( sum, n ) => sum + Number( n || 0 ), 0 );

	const failures = stats?.action_failures || [];
	const failurePeak = Math.max( 0, ...failures.map( ( f ) => Number( f.failures ) || 0 ) );

	const workflows = stats?.workflows || [];

	const series = buildSeries( days, stats?.runs_by_day );
	const seriesHasData = series.some(
		( p ) => p.success > 0 || p.partial > 0 || p.failed > 0 || p.skipped > 0
	);
	// Roughly ten ticks whatever the range, so 90 days does not print 90 dates.
	const tickInterval = Math.max( 0, Math.ceil( series.length / 10 ) - 1 );

	const usage = stats?.runs_usage || {};
	const usageLimit = Number( usage.limit || 0 );
	const usageUsed = Number( usage.used || 0 );
	const usagePercent = usageLimit > 0 ? Math.min( 100, ( usageUsed / usageLimit ) * 100 ) : 0;

	/*
	 * The one number on this page worth acting on today. A failure count leads
	 * when there is one, because that is the thing to go and fix; with a clean
	 * window the headline falls back to throughput, since a card that spends its
	 * largest type on a zero has said nothing.
	 */
	const headlineValue = stepsFailed > 0
		? stepsFailed.toLocaleString()
		: stepsSucceeded.toLocaleString();
	const headlineCaption = stepsFailed > 0
		? __( 'Steps failed in this window', 'ai-marketing-expert' )
		: __( 'Steps completed, none failed', 'ai-marketing-expert' );

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
		<div className="aime-wf-analytics">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ () => setError( '' ) } /> }

			<div className="aime-page-header">
				<h2>{ __( 'Workflow Automation', 'ai-marketing-expert' ) }</h2>
				<div className="aime-page-header-actions">
					{ rangeToggle }
					<Button variant="primary" onClick={ () => onNavigate( 'new-workflow' ) }>
						{ __( 'New Workflow', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</div>

			{ /*
			  * Three gauges, each a bounded rate with a real full. Reliability leads
			  * because it is the module's whole promise; step completion sits beside
			  * it because the two disagree in the useful case — a run that died on
			  * its first step and a run that lost one step of eight both count as a
			  * single failure at run level, and only the step rate tells them apart.
			  */ }
			<div className="aime-overview-band">
				<Card className="aime-band-card aime-band-card--lead">
					<span className="aime-band-card__label">{ __( 'Reliability', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ successRate } size={ 176 } stroke={ 12 }>
						<span className="aime-arc__value-text">
							{ runsFinished > 0 ? `${ Math.round( successRate ) }%` : '—' }
						</span>
						<span className="aime-arc__caption">{ __( 'Clean runs', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<div className="aime-band-chips">
						<div className="aime-band-chip">
							<span className="aime-band-chip__label">{ __( 'Runs', 'ai-marketing-expert' ) }</span>
							<span className="aime-band-chip__value">{ runsFinished.toLocaleString() }</span>
						</div>
						<div className="aime-band-chip">
							<span className="aime-band-chip__label">{ __( 'Failed', 'ai-marketing-expert' ) }</span>
							<span className="aime-band-chip__value">{ failedRuns.toLocaleString() }</span>
						</div>
					</div>
				</Card>

				<Card className="aime-band-card">
					<span className="aime-band-card__label">{ __( 'Steps', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ stepRate }>
						<span className="aime-arc__value-text">
							{ stepsSucceeded + stepsFailed > 0 ? `${ Math.round( stepRate ) }%` : '—' }
						</span>
						<span className="aime-arc__caption">{ __( 'Steps completed', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<p className="aime-band-card__hint">
						{ partialRuns > 0
							? sprintf(
								/* translators: %s: number of partly failed runs. */
								__( '%s runs finished with some steps missing.', 'ai-marketing-expert' ),
								partialRuns.toLocaleString()
							)
							: __( 'Every run that started got all the way through its steps.', 'ai-marketing-expert' ) }
					</p>
				</Card>

				{ /*
				  * The module's actual value proposition, and nothing else on the page
				  * measures it: automation you have to press a button for is not
				  * automation. A low number here with a high reliability score means
				  * the workflows work and nobody has switched them on.
				  */ }
				<Card className="aime-band-card">
					<span className="aime-band-card__label">{ __( 'Hands off', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ handsOff }>
						<span className="aime-arc__value-text">
							{ runsFinished > 0 ? `${ Math.round( handsOff ) }%` : '—' }
						</span>
						<span className="aime-arc__caption">{ __( 'Ran on their own', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					<p className="aime-band-card__hint">
						{ runsFinished > 0
							? sprintf(
								/* translators: 1: unattended runs, 2: manual runs. */
								__( '%1$s fired from a schedule or trigger, %2$s from Run now.', 'ai-marketing-expert' ),
								unattendedRuns.toLocaleString(),
								manualRuns.toLocaleString()
							)
							: __( 'No finished runs in this window yet.', 'ai-marketing-expert' ) }
					</p>
				</Card>
			</div>

			{ /*
			  * A quota is a warning, and a warning parked in a row of statistics
			  * reads as a statistic — so it keeps its own card rather than becoming
			  * a fourth gauge. It also explains the grey bars in the chart below,
			  * which is the only reason a skipped run ever appears.
			  */ }
			{ ! stats?.is_pro && usageLimit > 0 && (
				<Card title={ __( 'Monthly Runs', 'ai-marketing-expert' ) }>
					<div className="aime-usage-bar-wrap">
						<div className="aime-usage-labels">
							<span>
								{ sprintf(
									/* translators: 1: runs used this month, 2: monthly limit. */
									__( '%1$s of %2$s runs this month', 'ai-marketing-expert' ),
									usageUsed.toLocaleString(),
									usageLimit.toLocaleString()
								) }
							</span>
							<span>
								{ sprintf(
									/* translators: %s: number of runs left this month. */
									__( '%s left', 'ai-marketing-expert' ),
									Math.max( 0, usageLimit - usageUsed ).toLocaleString()
								) }
							</span>
						</div>
						<div className="aime-usage-bar">
							<div className="aime-usage-bar-fill" style={ { width: `${ usagePercent }%` } } />
						</div>
						{ skippedRuns > 0 && (
							<p className="aime-usage-note">
								{ sprintf(
									/* translators: %s: number of skipped runs. */
									__( '%s runs were skipped in this window because the cap was already reached.', 'ai-marketing-expert' ),
									skippedRuns.toLocaleString()
								) }
							</p>
						) }
					</div>
				</Card>
			) }

			<div className="aime-charts-grid aime-charts-grid--wide-first">
				<Card title={ __( 'Runs Over Time', 'ai-marketing-expert' ) }>
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
								<Tooltip contentStyle={ TOOLTIP_STYLE } cursor={ { fill: 'rgba(27, 94, 32, 0.06)' } } />
								<Legend iconType="circle" iconSize={ 8 } />
								{ /*
								  * Stacked, not grouped. A day's runs are one quantity split
								  * by how they ended, so the bar's full height has to stay
								  * readable as "runs that day" — grouping would make the eye
								  * add four columns to recover a number it should just see.
								  * Stacked bottom-up in order of severity so the failures sit
								  * on the baseline, where they are compared against a
								  * straight edge instead of a ragged one.
								  */ }
								<Bar
									dataKey="failed"
									stackId="runs"
									name={ __( 'Failed', 'ai-marketing-expert' ) }
									fill={ OUTCOME.failed }
									maxBarSize={ 28 }
								/>
								<Bar
									dataKey="partial"
									stackId="runs"
									name={ __( 'Partial', 'ai-marketing-expert' ) }
									fill={ OUTCOME.partial }
									maxBarSize={ 28 }
								/>
								<Bar
									dataKey="success"
									stackId="runs"
									name={ __( 'Success', 'ai-marketing-expert' ) }
									fill={ OUTCOME.success }
									maxBarSize={ 28 }
								/>
								<Bar
									dataKey="skipped"
									stackId="runs"
									name={ __( 'Skipped', 'ai-marketing-expert' ) }
									fill={ OUTCOME.skipped }
									radius={ [ 3, 3, 0, 0 ] }
									maxBarSize={ 28 }
								/>
							</BarChart>
						</ResponsiveContainer>
					) : (
						<EmptyState
							title={ __( 'Nothing ran in this window.', 'ai-marketing-expert' ) }
							description={ totalWorkflows > 0
								? __( 'No workflow finished a run in the selected range. Widen it above, or check that your workflows are active.', 'ai-marketing-expert' )
								: __( 'Create a workflow and its runs will chart here.', 'ai-marketing-expert' ) }
						/>
					) }
					{ seriesHasData && avgSeconds > 0 && (
						<p className="aime-pipeline__foot">
							{ sprintf(
								/* translators: 1: average run duration, 2: slowest run duration. */
								__( 'Runs take %1$s on average; the slowest took %2$s.', 'ai-marketing-expert' ),
								formatDuration( avgSeconds ),
								formatDuration( maxSeconds )
							) }
						</p>
					) }
				</Card>

				{ /*
				  * Which action breaks, not which run broke — the error log already
				  * lists incidents one at a time, and a list of incidents never adds
				  * up to a cause. Ranked by failure count with the rate beside it,
				  * because five failures out of nine hundred attempts and two out of
				  * two are different problems and only one of them is the action's
				  * fault.
				  */ }
				<Card title={ __( 'Where Runs Break', 'ai-marketing-expert' ) }>
					<div className="aime-pipeline">
						<div className="aime-pipeline__headline">
							<span className="aime-pipeline__value">{ headlineValue }</span>
							<span className="aime-pipeline__caption">{ headlineCaption }</span>
						</div>

						{ failures.length > 0 ? (
							<>
								<ul className="aime-rankbar">
									{ failures.map( ( f ) => (
										<RankRow
											key={ f.action_type }
											label={ f.action_label }
											count={ Number( f.failures ) || 0 }
											percent={ failurePeak > 0 ? ( ( Number( f.failures ) || 0 ) / failurePeak ) * 100 : 0 }
											color={ OUTCOME.failed }
											suffix={ sprintf(
												/* translators: %s: failure rate as a percentage. */
												__( '%s%%', 'ai-marketing-expert' ),
												Math.round( Number( f.failure_rate ) || 0 )
											) }
										/>
									) ) }
								</ul>
								<p className="aime-pipeline__foot">
									{ __( 'Failures per action, with the share of its attempts that failed.', 'ai-marketing-expert' ) }
									{ ' ' }
									<button
										type="button"
										className="aime-link-btn"
										onClick={ () => onNavigate( 'error-log' ) }
									>
										{ __( 'See the reasons', 'ai-marketing-expert' ) }
									</button>
								</p>
							</>
						) : (
							<p className="aime-pipeline__foot">
								{ stepsSucceeded > 0
									? __( 'No step failed in this window. Nothing here needs your attention.', 'ai-marketing-expert' )
									: __( 'No steps have run in this window, so there is nothing to diagnose yet.', 'ai-marketing-expert' ) }
							</p>
						) }
					</div>
				</Card>
			</div>

			{ /*
			  * Full width, because it is the only place on the page that names a
			  * workflow — everything above is the module in aggregate, and an
			  * aggregate never tells you which one to open.
			  */ }
			<Card title={ __( 'Workflow Reliability', 'ai-marketing-expert' ) }>
				{ workflows.length > 0 ? (
					<>
						<div className="aime-table-wrap">
							<table className="aime-table">
								<thead>
									<tr>
										<th>{ __( 'Workflow', 'ai-marketing-expert' ) }</th>
										<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
										<th className="aime-num">{ __( 'Runs', 'ai-marketing-expert' ) }</th>
										<th>{ __( 'Clean', 'ai-marketing-expert' ) }</th>
										<th className="aime-num">{ __( 'Avg time', 'ai-marketing-expert' ) }</th>
										<th>{ __( 'Last run', 'ai-marketing-expert' ) }</th>
									</tr>
								</thead>
								<tbody>
									{ workflows.map( ( wf ) => (
										<tr
											key={ wf.id }
											className="aime-clickable-row"
											onClick={ () => onNavigate( 'history', { id: wf.id } ) }
										>
											<td>{ wf.name || __( '(untitled)', 'ai-marketing-expert' ) }</td>
											<td>
												<span
													className="aime-status-badge"
													style={ { background: WF_STATUS_COLORS[ wf.status ] || '#8fa893' } }
												>
													{ WF_STATUS_LABELS[ wf.status ] || wf.status }
												</span>
											</td>
											<td className="aime-num">{ Number( wf.runs || 0 ).toLocaleString() }</td>
											{ /*
											  * A bar, not another percentage column. Nine rows of
											  * "94.2%" is nine numbers to read in sequence; nine
											  * bars on a shared baseline is one shape, and the
											  * odd one out is visible before it is read.
											  */ }
											<td>
												<span className="aime-minibar" title={ `${ Math.round( wf.success_rate ) }%` }>
													<span
														className="aime-minibar__fill"
														style={ {
															width: `${ Math.max( 0, Math.min( Number( wf.success_rate ) || 0, 100 ) ) }%`,
															background: wf.failed > 0 ? OUTCOME.failed : OUTCOME.success,
														} }
													/>
												</span>
												<span className="aime-minibar__value">
													{ `${ Math.round( Number( wf.success_rate ) || 0 ) }%` }
												</span>
											</td>
											<td className="aime-num">{ formatDuration( wf.avg_seconds ) }</td>
											<td className="is-muted">{ formatDateTime( wf.last_run_at ) }</td>
										</tr>
									) ) }
								</tbody>
							</table>
						</div>
						{ idleActive > 0 && (
							<p className="aime-pipeline__foot">
								{ sprintf(
									/* translators: %s: number of active workflows with no runs. */
									__( '%s active workflows did not run at all in this window — check their schedule or trigger.', 'ai-marketing-expert' ),
									idleActive.toLocaleString()
								) }
							</p>
						) }
					</>
				) : (
					<EmptyState
						title={ __( 'No workflow ran in this window.', 'ai-marketing-expert' ) }
						description={ totalWorkflows > 0
							? sprintf(
								/* translators: %s: number of workflows. */
								__( 'You have %s workflows, and none of them finished a run in the selected range. A workflow only fires while it is active.', 'ai-marketing-expert' ),
								totalWorkflows.toLocaleString()
							)
							: __( 'Build a workflow and its run history will be measured here.', 'ai-marketing-expert' ) }
					/>
				) }
			</Card>
		</div>
	);
};

export default WorkflowAnalytics;
