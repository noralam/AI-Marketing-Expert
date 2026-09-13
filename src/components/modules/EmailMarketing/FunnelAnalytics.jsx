/**
 * FunnelAnalytics - in-depth automation performance, step-by-step drop-off,
 * and contact execution queue tracking.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import {
	ResponsiveContainer, AreaChart, Area,
	XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import EmptyState from '../../common/EmptyState';
import { formatDateTime, formatDate } from '../../../utils/datetime';

const ICON_MAP = {
	send_email: '\u2709\uFE0F',
	add_tag: '\uD83C\uDFF7\uFE0F',
	remove_tag: '\uD83C\uDFF7\uFE0F',
	add_to_list: '\uD83D\uDCCB',
	remove_from_list: '\uD83D\uDCCB',
	update_contact: '\uD83D\uDC64',
	webhook: '\uD83C\uDF10',
	condition: '\u2753',
	wait: '\u23F3',
};

const STATUS_BADGES = {
	active: 'info',
	waiting: 'warning',
	completed: 'success',
	cancelled: 'danger',
	failed: 'danger',
};

const FunnelAnalytics = ( { funnelId, onNavigate } ) => {
	const { get, loading, error, clearError } = useApi();
	const [ data, setData ] = useState( null );

	const fetchReport = useCallback( async () => {
		if ( ! funnelId ) return;
		try {
			const res = await get( `/email/analytics/automations/${ funnelId }` );
			setData( res );
		} catch ( e ) {
			/* Handled by useApi */
		}
	}, [ get, funnelId ] );

	useEffect( () => {
		fetchReport();
	}, [ fetchReport ] );

	if ( loading && ! data ) {
		return <Loader variant="dashboard" text={ __( 'Loading funnel analytics...', 'ai-marketing-expert' ) } />;
	}

	if ( ! data ) {
		return (
			<Card>
				{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
				<EmptyState
					title={ __( 'No Analytics Available', 'ai-marketing-expert' ) }
					message={ __( 'Could not retrieve performance statistics for this automation.', 'ai-marketing-expert' ) }
				/>
			</Card>
		);
	}

	const {
		funnel,
		sequences = [],
		total_subscribers = 0,
		active = 0,
		waiting = 0,
		completed = 0,
		cancelled = 0,
		completion_rate = 0,
		recent_subscribers = [],
		trend = [],
	} = data;

	return (
		<div className="aime-funnel-analytics" style={ { display: 'flex', flexDirection: 'column', gap: '20px' } }>
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			{ /* Top KPI Metrics Grid */ }
			<div className="aime-stats-grid" style={ { gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', margin: 0 } }>
				<div className="aime-stat-card-modern">
					<div className="aime-stat-card-icon" style={ { background: '#3b82f6' } }>
						<span style={ { fontSize: '20px' } }>👥</span>
					</div>
					<div className="aime-stat-card-data">
						<div className="aime-stat-card-value">{ total_subscribers }</div>
						<div className="aime-stat-card-label">{ __( 'Total Enrolled', 'ai-marketing-expert' ) }</div>
					</div>
				</div>

				<div className="aime-stat-card-modern">
					<div className="aime-stat-card-icon" style={ { background: '#f59e0b' } }>
						<span style={ { fontSize: '20px' } }>⚡</span>
					</div>
					<div className="aime-stat-card-data">
						<div className="aime-stat-card-value">{ active }</div>
						<div className="aime-stat-card-label">{ __( 'In Progress', 'ai-marketing-expert' ) }</div>
					</div>
				</div>

				<div className="aime-stat-card-modern">
					<div className="aime-stat-card-icon" style={ { background: '#8b5cf6' } }>
						<span style={ { fontSize: '20px' } }>⏳</span>
					</div>
					<div className="aime-stat-card-data">
						<div className="aime-stat-card-value">{ waiting }</div>
						<div className="aime-stat-card-label">{ __( 'Scheduled / Waiting', 'ai-marketing-expert' ) }</div>
					</div>
				</div>

				<div className="aime-stat-card-modern">
					<div className="aime-stat-card-icon" style={ { background: '#10b981' } }>
						<span style={ { fontSize: '20px' } }>🎯</span>
					</div>
					<div className="aime-stat-card-data">
						<div className="aime-stat-card-value">
							{ completed }
							<span style={ { fontSize: '13px', fontWeight: 500, color: '#10b981', marginLeft: '6px' } }>
								({ completion_rate }%)
							</span>
						</div>
						<div className="aime-stat-card-label">{ __( 'Completed Funnels', 'ai-marketing-expert' ) }</div>
					</div>
				</div>

				<div className="aime-stat-card-modern">
					<div className="aime-stat-card-icon" style={ { background: '#ef4444' } }>
						<span style={ { fontSize: '20px' } }>🛑</span>
					</div>
					<div className="aime-stat-card-data">
						<div className="aime-stat-card-value">{ cancelled }</div>
						<div className="aime-stat-card-label">{ __( 'Dropped Out / Failed', 'ai-marketing-expert' ) }</div>
					</div>
				</div>
			</div>

			{ /* Step-by-Step Drop-Off Analysis */ }
			<Card
				title={ __( 'Step-by-Step Funnel Drop-off Analysis', 'ai-marketing-expert' ) }
				subtitle={ __( 'Track subscriber retention and drop-off points at each sequence step.', 'ai-marketing-expert' ) }
			>
				{ sequences.length === 0 ? (
					<p className="aime-empty-msg">{ __( 'This automation has no steps configured.', 'ai-marketing-expert' ) }</p>
				) : (
					<div className="aime-funnel-steps-analysis">
						<table className="aime-table">
							<thead>
								<tr>
									<th style={ { width: '48px' } }>#</th>
									<th>{ __( 'Step & Action', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Delay', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Completed', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Open Rate', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Click Rate', 'ai-marketing-expert' ) }</th>
									<th style={ { minWidth: '170px' } }>{ __( 'Retention Rate', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Step Drop-off', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ sequences.map( ( seq, idx ) => {
									const icon = ICON_MAP[ seq.action_name ] || '\u26A1';
									const retentionPct = Math.min( 100, Math.max( 0, seq.retention_rate || 0 ) );
									const dropoffPct = Math.min( 100, Math.max( 0, seq.step_dropoff_pct || 0 ) );

									return (
										<tr key={ seq.id || idx }>
											<td style={ { fontWeight: 600, color: '#64748b' } }>{ idx + 1 }</td>
											<td>
												<div style={ { display: 'flex', alignItems: 'center', gap: '8px' } }>
													<span style={ { fontSize: '18px' } }>{ icon }</span>
													<div>
														<strong style={ { display: 'block', color: '#1e293b' } }>
															{ seq.title || seq.action_name }
														</strong>
														<span className="aime-muted" style={ { fontSize: '12px' } }>
															{ seq.action_name }
														</span>
													</div>
												</div>
											</td>
											<td>
												{ seq.delay_value > 0
													? `${ seq.delay_value } ${ seq.delay_unit || 'minutes' }`
													: __( 'Immediate', 'ai-marketing-expert' ) }
											</td>
											<td>
												<strong style={ { color: '#0f172a' } }>{ seq.completed || 0 }</strong>
											</td>
											<td>
												{ seq.open_rate !== null ? (
													<div>
														<strong style={ { color: '#2563eb' } }>{ seq.open_rate }%</strong>
														<span className="aime-muted" style={ { display: 'block', fontSize: '11px' } }>
															({ seq.opens || 0 })
														</span>
													</div>
												) : (
													<span className="aime-muted">{ '\u2014' }</span>
												) }
											</td>
											<td>
												{ seq.click_rate !== null ? (
													<div>
														<strong style={ { color: '#7c3aed' } }>{ seq.click_rate }%</strong>
														<span className="aime-muted" style={ { display: 'block', fontSize: '11px' } }>
															({ seq.clicks || 0 })
														</span>
													</div>
												) : (
													<span className="aime-muted">{ '\u2014' }</span>
												) }
											</td>
											<td>
												<div style={ { display: 'flex', alignItems: 'center', gap: '8px' } }>
													<div style={ { flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' } }>
														<div
															style={ {
																width: `${ retentionPct }%`,
																height: '100%',
																background: retentionPct > 50 ? '#10b981' : retentionPct > 20 ? '#f59e0b' : '#ef4444',
																borderRadius: '4px',
																transition: 'width 0.3s ease',
															} }
														/>
													</div>
													<span style={ { fontSize: '12px', fontWeight: 600, minWidth: '42px', textAlign: 'right' } }>
														{ retentionPct }%
													</span>
												</div>
											</td>
											<td>
												{ idx === 0 ? (
													<span className="aime-muted" style={ { fontSize: '12px' } }>{ __( 'Entry point', 'ai-marketing-expert' ) }</span>
												) : dropoffPct > 0 ? (
													<span
														className="aime-badge aime-badge-warning"
														style={ {
															background: dropoffPct > 30 ? '#fee2e2' : '#fef3c7',
															color: dropoffPct > 30 ? '#dc2626' : '#d97706',
															border: 'none',
															fontWeight: 600,
														} }
													>
														-{ dropoffPct }%
													</span>
												) : (
													<span className="aime-badge aime-badge-success" style={ { border: 'none' } }>0%</span>
												) }
											</td>
										</tr>
									);
								} ) }
							</tbody>
						</table>
					</div>
				) }
			</Card>

			{ /* Trend Chart (14-Day Activity) */ }
			{ trend && trend.length > 0 && (
				<Card
					title={ __( '14-Day Funnel Completions', 'ai-marketing-expert' ) }
					subtitle={ __( 'Daily volume of subscribers who successfully finished this funnel.', 'ai-marketing-expert' ) }
				>
					<div style={ { height: 240, width: '100%', marginTop: '12px' } }>
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={ trend } margin={ { top: 10, right: 20, left: -20, bottom: 0 } }>
								<defs>
									<linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#10b981" stopOpacity={ 0.3 } />
										<stop offset="95%" stopColor="#10b981" stopOpacity={ 0 } />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
								<XAxis dataKey="date" tickLine={ false } stroke="#94a3b8" fontSize={ 12 } />
								<YAxis allowDecimals={ false } tickLine={ false } stroke="#94a3b8" fontSize={ 12 } />
								<Tooltip
									contentStyle={ {
										borderRadius: 8,
										border: '1px solid #e2e8f0',
										boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
									} }
									formatter={ ( val ) => [ val, __( 'Completed Contacts', 'ai-marketing-expert' ) ] }
									labelFormatter={ ( label ) => `${ __( 'Date:', 'ai-marketing-expert' ) } ${ label }` }
								/>
								<Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={ 2 } fillOpacity={ 1 } fill="url(#colorCompletions)" />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</Card>
			) }

			{ /* Recent Enrolled Subscribers Activity Log */ }
			<Card
				title={ __( 'Enrolled Contacts Activity Queue (Latest 50)', 'ai-marketing-expert' ) }
				subtitle={ __( 'Real-time visibility into contact execution status, current step, and scheduled run times.', 'ai-marketing-expert' ) }
				actions={
					<Button variant="secondary" size="small" onClick={ fetchReport }>
						{ __( 'Refresh', 'ai-marketing-expert' ) }
					</Button>
				}
			>
				{ recent_subscribers.length === 0 ? (
					<p className="aime-empty-msg">{ __( 'No contacts have enrolled into this automation yet.', 'ai-marketing-expert' ) }</p>
				) : (
					<table className="aime-table">
						<thead>
							<tr>
								<th>{ __( 'Contact', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Last Step', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Next Step', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Next Run / Status Time', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Enrolled', 'ai-marketing-expert' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ recent_subscribers.map( ( sub ) => {
								const contactName = [ sub.first_name, sub.last_name ].filter( Boolean ).join( ' ' );
								const badgeClass = STATUS_BADGES[ sub.status ] || 'default';

								return (
									<tr key={ sub.id }>
										<td>
											{ onNavigate ? (
												<button
													type="button"
													className="aime-link-btn"
													onClick={ () => onNavigate( 'subscriber-profile', { id: sub.subscriber_id } ) }
													style={ { textAlign: 'left', display: 'block' } }
												>
													<strong>{ contactName || sub.email }</strong>
													{ contactName && (
														<span className="aime-muted" style={ { display: 'block', fontSize: '12px' } }>
															{ sub.email }
														</span>
													) }
												</button>
											) : (
												<div>
													<strong>{ contactName || sub.email }</strong>
													{ contactName && (
														<span className="aime-muted" style={ { display: 'block', fontSize: '12px' } }>
															{ sub.email }
														</span>
													) }
												</div>
											)}
										</td>
										<td>
											<span className={ `aime-badge aime-badge-${ badgeClass }` }>
												{ sub.status }
											</span>
										</td>
										<td>
											{ sub.last_step_title ? (
												<div>
													<span>{ sub.last_step_title }</span>
													{ sub.last_sequence_status && (
														<span
															className="aime-muted"
															style={ { fontSize: '11px', display: 'block', textTransform: 'capitalize' } }
														>
															({ sub.last_sequence_status })
														</span>
													) }
												</div>
											) : (
												<span className="aime-muted">{ '\u2014' }</span>
											) }
										</td>
										<td>
											{ sub.next_step_title ? (
												<span>{ sub.next_step_title }</span>
											) : sub.status === 'completed' ? (
												<span className="aime-badge aime-badge-success" style={ { fontSize: '11px' } }>
													{ __( 'Finished', 'ai-marketing-expert' ) }
												</span>
											) : (
												<span className="aime-muted">{ '\u2014' }</span>
											) }
										</td>
										<td>
											{ sub.status === 'waiting' && sub.next_execution_time ? (
												<span style={ { color: '#d97706', fontWeight: 500 } }>
													{ formatDateTime( sub.next_execution_time, '\u2014' ) }
												</span>
											) : sub.last_executed_time ? (
												<span className="aime-muted">
													{ formatDateTime( sub.last_executed_time, '\u2014' ) }
												</span>
											) : (
												<span className="aime-muted">{ '\u2014' }</span>
											) }
										</td>
										<td>{ formatDate( sub.created_at, '\u2014' ) }</td>
									</tr>
								);
							} ) }
						</tbody>
					</table>
				) }
			</Card>
		</div>
	);
};

export default FunnelAnalytics;
