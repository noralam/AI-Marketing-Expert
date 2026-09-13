/**
 * Automations - list view for funnels/automations.
 */

import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SearchControl, SelectControl } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import useEmailUsage from '../../../hooks/useEmailUsage';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import QuotaMeters from '../../common/QuotaMeters';
import { menuUrl } from '../../../utils/menuUrl';
import { formatDate } from '../../../utils/datetime';

const STATUS_OPTIONS = [
	{ label: __( 'All Statuses', 'ai-marketing-expert' ), value: '' },
	{ label: __( 'Draft', 'ai-marketing-expert' ), value: 'draft' },
	{ label: __( 'Published', 'ai-marketing-expert' ), value: 'published' },
];

const BADGE = { draft: 'warning', published: 'success' };

const TRIGGER_LABELS = {
	subscriber_created: __( 'New Subscriber', 'ai-marketing-expert' ),
	subscriber_updated: __( 'Subscriber Updated', 'ai-marketing-expert' ),
	tag_added: __( 'Tag Added', 'ai-marketing-expert' ),
	tag_removed: __( 'Tag Removed', 'ai-marketing-expert' ),
	list_subscribed: __( 'List Subscribed', 'ai-marketing-expert' ),
	list_unsubscribed: __( 'List Unsubscribed', 'ai-marketing-expert' ),
	form_submitted: __( 'Form Submitted', 'ai-marketing-expert' ),
	order_created: __( 'Order Placed', 'ai-marketing-expert' ),
	order_completed: __( 'Order Completed', 'ai-marketing-expert' ),
	cart_abandoned: __( 'Cart Abandoned', 'ai-marketing-expert' ),
	b2b_lead_captured: __( 'B2B Lead Captured', 'ai-marketing-expert' ),
	lead_captured: __( 'Lead Captured', 'ai-marketing-expert' ),
	webhook_event: __( 'Webhook Event', 'ai-marketing-expert' ),
};

const formatTriggerName = ( trigger ) => {
	if ( ! trigger ) return __( 'Manual / Custom', 'ai-marketing-expert' );
	if ( TRIGGER_LABELS[ trigger ] ) return TRIGGER_LABELS[ trigger ];
	return trigger.replace( /_/g, ' ' ).replace( /\b\w/g, ( c ) => c.toUpperCase() );
};

const DEFAULT_COLUMNS = {
	trigger: false,      // Embedded cleanly under Title
	steps: false,        // Embedded cleanly under Title
	performance: true,   // Consolidated performance
	enrolled: false,
	active: false,
	completed: false,
	completion: false,
	updated: true,
};

const COLUMN_DEFINITIONS = [
	{ key: 'title', label: __( 'Title & Trigger', 'ai-marketing-expert' ), required: true },
	{ key: 'status', label: __( 'Status', 'ai-marketing-expert' ), required: true },
	{ key: 'performance', label: __( 'Performance (Enrolled & Progress)', 'ai-marketing-expert' ) },
	{ key: 'trigger', label: __( 'Separate Trigger Column', 'ai-marketing-expert' ) },
	{ key: 'steps', label: __( 'Steps Column', 'ai-marketing-expert' ) },
	{ key: 'enrolled', label: __( 'Enrolled Count', 'ai-marketing-expert' ) },
	{ key: 'active', label: __( 'Active in Funnel', 'ai-marketing-expert' ) },
	{ key: 'completed', label: __( 'Completed Count', 'ai-marketing-expert' ) },
	{ key: 'completion', label: __( 'Completion Bar', 'ai-marketing-expert' ) },
	{ key: 'updated', label: __( 'Last Updated', 'ai-marketing-expert' ) },
	{ key: 'actions', label: __( 'Actions', 'ai-marketing-expert' ), required: true },
];

const Automations = ( { onNavigate } ) => {
	const { get, post, put, del, loading, error, clearError } = useApi();
	const { usage, refresh: refreshUsage } = useEmailUsage();
	const [ automations, setAutomations ] = useState( [] );
	const [ search, setSearch ] = useState( '' );
	const [ status, setStatus ] = useState( '' );
	const [ page, setPage ] = useState( 1 );
	const [ total, setTotal ] = useState( 0 );
	const [ overview, setOverview ] = useState( null );
	const [ cronStatus, setCronStatus ] = useState( null );

	// Column customizer state
	const [ showColMenu, setShowColMenu ] = useState( false );
	const colMenuRef = useRef( null );
	const [ visibleCols, setVisibleCols ] = useState( () => {
		try {
			const saved = localStorage.getItem( 'aime_automations_table_cols_v2' );
			if ( saved ) {
				return { ...DEFAULT_COLUMNS, ...JSON.parse( saved ) };
			}
		} catch ( e ) { /* fallback */ }
		return DEFAULT_COLUMNS;
	} );

	const toggleColumn = ( colKey ) => {
		setVisibleCols( ( prev ) => {
			const updated = { ...prev, [ colKey ]: ! prev[ colKey ] };
			try {
				localStorage.setItem( 'aime_automations_table_cols_v2', JSON.stringify( updated ) );
			} catch ( e ) { /* */ }
			return updated;
		} );
	};

	const resetColumnsToDefault = () => {
		setVisibleCols( DEFAULT_COLUMNS );
		try {
			localStorage.removeItem( 'aime_automations_table_cols_v2' );
		} catch ( e ) { /* */ }
	};

	useEffect( () => {
		const handleClickOutside = ( event ) => {
			if ( colMenuRef.current && ! colMenuRef.current.contains( event.target ) ) {
				setShowColMenu( false );
			}
		};
		if ( showColMenu ) {
			document.addEventListener( 'mousedown', handleClickOutside );
		}
		return () => {
			document.removeEventListener( 'mousedown', handleClickOutside );
		};
	}, [ showColMenu ] );

	const fetchList = useCallback( async () => {
		const params = new URLSearchParams( { page, per_page: 20 } );
		if ( search ) params.set( 'search', search );
		if ( status ) params.set( 'status', status );
		try {
			const res = await get( `/email/automations?${ params }` );
			setAutomations( res.items || [] );
			setTotal( res.total || 0 );
			if ( res.overview ) {
				setOverview( res.overview );
			}
		} catch ( e ) { /* */ }
	}, [ get, page, search, status ] );

	useEffect( () => { fetchList(); }, [ fetchList ] );

	useEffect( () => {
		const fetchCronStatus = async () => {
			try {
				const res = await get( '/system/cron-status' );
				setCronStatus( res || null );
			} catch ( e ) { /* Keep automations usable if status check fails. */ }
		};

		fetchCronStatus();
	}, [ get ] );

	const handleDuplicate = async ( aid ) => {
		try {
			await post( `/email/automations/${ aid }/duplicate` );
			fetchList();
			refreshUsage();
		} catch ( e ) { /* */ }
	};

	const handleDelete = async ( aid ) => {
		if ( ! window.confirm( __( 'Delete this automation?', 'ai-marketing-expert' ) ) ) return;
		try {
			await del( `/email/automations/${ aid }` );
			fetchList();
			refreshUsage();
		} catch ( e ) { /* */ }
	};

	const handleToggleStatus = async ( a ) => {
		const newStatus = a.status === 'published' ? 'draft' : 'published';
		try {
			await put( `/email/automations/${ a.id }`, { status: newStatus } );
			fetchList();
		} catch ( e ) { /* */ }
	};

	const totalPages = Math.ceil( total / 20 );

	return (
		<Card
			title={ __( 'Automations', 'ai-marketing-expert' ) }
			actions={
				<Button variant="primary" onClick={ () => onNavigate( 'automation-editor' ) }>
					{ __( '+ New Automation', 'ai-marketing-expert' ) }
				</Button>
			}
		>
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ cronStatus?.has_overdue && (
				<Notice
					type="warning"
					message={ <>
						{ __( 'Automations may run late because WordPress cron is overdue or missing.', 'ai-marketing-expert' ) }{ ' ' }
						<a href={ `${ menuUrl( 'settings' ) }&tab=system` }>{ __( 'View System Status', 'ai-marketing-expert' ) }</a>
					</> }
					dismissible={ false }
				/>
			) }

			<QuotaMeters
				items={ [
					{
						key: 'automations',
						label: __( 'Automations', 'ai-marketing-expert' ),
						usage: usage?.automations,
						note: __( 'total, not monthly', 'ai-marketing-expert' ),
					},
				] }
			/>

			<div className="aime-stats-grid" style={ { gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 } }>
				<div className="aime-stat-card-modern">
					<div className="aime-stat-card-icon" style={ { background: '#6366f1' } }>
						<span style={ { fontSize: '20px' } }>⚡</span>
					</div>
					<div className="aime-stat-card-data">
						<div className="aime-stat-card-value">{ overview?.total_automations ?? total }</div>
						<div className="aime-stat-card-label">{ __( 'Total Automations', 'ai-marketing-expert' ) }</div>
					</div>
				</div>
				<div className="aime-stat-card-modern">
					<div className="aime-stat-card-icon" style={ { background: '#3b82f6' } }>
						<span style={ { fontSize: '20px' } }>👥</span>
					</div>
					<div className="aime-stat-card-data">
						<div className="aime-stat-card-value">{ overview?.total_enrolled ?? 0 }</div>
						<div className="aime-stat-card-label">{ __( 'Total Enrolled', 'ai-marketing-expert' ) }</div>
					</div>
				</div>
				<div className="aime-stat-card-modern">
					<div className="aime-stat-card-icon" style={ { background: '#f59e0b' } }>
						<span style={ { fontSize: '20px' } }>⏳</span>
					</div>
					<div className="aime-stat-card-data">
						<div className="aime-stat-card-value">{ overview?.total_active ?? 0 }</div>
						<div className="aime-stat-card-label">{ __( 'Active in Funnel', 'ai-marketing-expert' ) }</div>
					</div>
				</div>
				<div className="aime-stat-card-modern">
					<div className="aime-stat-card-icon" style={ { background: '#10b981' } }>
						<span style={ { fontSize: '20px' } }>🎯</span>
					</div>
					<div className="aime-stat-card-data">
						<div className="aime-stat-card-value">{ overview?.total_completed ?? 0 }</div>
						<div className="aime-stat-card-label">{ __( 'Completed Funnels', 'ai-marketing-expert' ) }</div>
					</div>
				</div>
			</div>

			<div className="aime-table-toolbar" style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' } }>
				<div style={ { display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px', flexWrap: 'wrap' } }>
					<SearchControl value={ search } onChange={ ( v ) => { setSearch( v ); setPage( 1 ); } } placeholder={ __( 'Search automations...', 'ai-marketing-expert' ) } />
					<SelectControl value={ status } options={ STATUS_OPTIONS } onChange={ ( v ) => { setStatus( v ); setPage( 1 ); } } __nextHasNoMarginBottom />
				</div>

				{ /* Column Settings Dropdown */ }
				<div style={ { position: 'relative' } } ref={ colMenuRef }>
					<Button
						variant="secondary"
						onClick={ () => setShowColMenu( ( prev ) => ! prev ) }
						style={ { display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px' } }
						title={ __( 'Customize table columns', 'ai-marketing-expert' ) }
					>
						<span className="dashicons dashicons-admin-generic" style={ { fontSize: '15px', width: '15px', height: '15px', lineHeight: '15px' } }></span>
						{ __( 'Columns', 'ai-marketing-expert' ) }
					</Button>

					{ showColMenu && (
						<div
							style={ {
								position: 'absolute',
								top: 'calc(100% + 6px)',
								right: 0,
								width: '275px',
								background: '#ffffff',
								border: '1px solid #e2e8f0',
								borderRadius: '8px',
								boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
								padding: '14px',
								zIndex: 999,
								textAlign: 'left',
							} }
						>
							<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' } }>
								<span style={ { fontWeight: 600, fontSize: '13px', color: '#1e293b' } }>
									{ __( 'Customize Columns', 'ai-marketing-expert' ) }
								</span>
								<button
									type="button"
									onClick={ () => setShowColMenu( false ) }
									style={ { border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', lineHeight: 1, padding: 0 } }
									aria-label={ __( 'Close', 'ai-marketing-expert' ) }
								>
									&times;
								</button>
							</div>
							<p style={ { fontSize: '11px', color: '#64748b', margin: '0 0 10px 0', lineHeight: 1.4 } }>
								{ __( 'Select fields to display in this table:', 'ai-marketing-expert' ) }
							</p>
							<div style={ { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' } }>
								{ COLUMN_DEFINITIONS.map( ( col ) => {
									const isChecked = col.required ? true : !! visibleCols[ col.key ];
									return (
										<label
											key={ col.key }
											style={ {
												display: 'flex',
												alignItems: 'center',
												gap: '8px',
												fontSize: '12px',
												cursor: col.required ? 'not-allowed' : 'pointer',
												color: col.required ? '#64748b' : '#334155',
												userSelect: 'none',
											} }
										>
											<input
												type="checkbox"
												checked={ isChecked }
												disabled={ col.required }
												onChange={ () => ! col.required && toggleColumn( col.key ) }
												style={ { margin: 0, cursor: col.required ? 'not-allowed' : 'pointer' } }
											/>
											<span style={ { flex: 1 } }>{ col.label }</span>
											{ col.required && (
												<span style={ { fontSize: '10px', color: '#94a3b8' } }>
													{ __( 'Required', 'ai-marketing-expert' ) }
												</span>
											) }
										</label>
									);
								} ) }
							</div>
							<div style={ { marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
								<button
									type="button"
									onClick={ resetColumnsToDefault }
									style={ { border: 'none', background: 'transparent', color: '#6366f1', fontSize: '11px', cursor: 'pointer', padding: 0, fontWeight: 500 } }
								>
									{ __( 'Reset to Default', 'ai-marketing-expert' ) }
								</button>
								<span style={ { fontSize: '10px', color: '#94a3b8' } }>
									{ __( 'Auto-saved', 'ai-marketing-expert' ) }
								</span>
							</div>
						</div>
					) }
				</div>
			</div>

			{ loading && <Loader variant="table" /> }

			{ ! loading && automations.length === 0 && (
				<p className="aime-empty-msg">{ __( 'No automations found. Create your first automation!', 'ai-marketing-expert' ) }</p>
			) }

			{ ! loading && automations.length > 0 && (
				<div className="aime-table-wrap" style={ { overflowX: 'auto' } }>
					<table className="aime-table" style={ { width: '100%', minWidth: '650px' } }>
						<thead>
							<tr>
								<th style={ { minWidth: '220px', width: '32%' } }>{ __( 'Automation', 'ai-marketing-expert' ) }</th>
								{ visibleCols.trigger && <th>{ __( 'Trigger', 'ai-marketing-expert' ) }</th> }
								<th style={ { width: '100px' } }>{ __( 'Status', 'ai-marketing-expert' ) }</th>
								{ visibleCols.steps && <th className="is-numeric">{ __( 'Steps', 'ai-marketing-expert' ) }</th> }
								{ visibleCols.performance && <th style={ { minWidth: '180px' } }>{ __( 'Performance', 'ai-marketing-expert' ) }</th> }
								{ visibleCols.enrolled && <th className="is-numeric">{ __( 'Enrolled', 'ai-marketing-expert' ) }</th> }
								{ visibleCols.active && <th className="is-numeric">{ __( 'Active', 'ai-marketing-expert' ) }</th> }
								{ visibleCols.completed && <th className="is-numeric">{ __( 'Completed', 'ai-marketing-expert' ) }</th> }
								{ visibleCols.completion && <th style={ { minWidth: '110px' } }>{ __( 'Completion', 'ai-marketing-expert' ) }</th> }
								{ visibleCols.updated && <th style={ { width: '110px' } }>{ __( 'Updated', 'ai-marketing-expert' ) }</th> }
								<th style={ { textAlign: 'right', minWidth: '200px' } }>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ automations.map( ( a ) => (
								<tr key={ a.id }>
									<td>
										<div style={ { display: 'flex', flexDirection: 'column', gap: '5px' } }>
											<button
												className="aime-link-btn"
												onClick={ () => onNavigate( 'automation-editor', { id: a.id } ) }
												style={ {
													fontWeight: 600,
													fontSize: '14px',
													color: '#0f172a',
													textAlign: 'left',
													padding: 0,
													textDecoration: 'none',
													whiteSpace: 'normal',
													wordBreak: 'break-word',
												} }
											>
												{ a.title }
											</button>
											<div style={ { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '11px' } }>
												<span style={ { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569', fontWeight: 500 } }>
													<span className="dashicons dashicons-controls-play" style={ { fontSize: '11px', width: '11px', height: '11px', lineHeight: '11px', color: '#6366f1' } }></span>
													{ formatTriggerName( a.trigger_name ) }
												</span>
												{ a.sequences_count !== undefined && a.sequences_count !== null && (
													<span style={ { color: '#94a3b8' } }>
														• { a.sequences_count } { a.sequences_count === 1 ? __( 'step', 'ai-marketing-expert' ) : __( 'steps', 'ai-marketing-expert' ) }
													</span>
												) }
											</div>
										</div>
									</td>

									{ visibleCols.trigger && (
										<td>
											<span className="aime-badge aime-badge-default" style={ { fontSize: '11px', fontWeight: 500 } }>
												{ formatTriggerName( a.trigger_name ) }
											</span>
										</td>
									) }

									<td>
										<span className={ `aime-badge aime-badge-${ BADGE[ a.status ] || 'default' }` }>{ a.status }</span>
									</td>

									{ visibleCols.steps && (
										<td className="is-numeric">{ a.sequences_count ?? '\u2014' }</td>
									) }

									{ visibleCols.performance && (
										<td>
											<div style={ { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' } }>
												<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' } }>
													<span style={ { fontWeight: 600, color: '#0f172a' } }>
														{ a.enrolled_count ?? a.subscribers_count ?? 0 } { __( 'enrolled', 'ai-marketing-expert' ) }
													</span>
													<span style={ { fontSize: '11px', fontWeight: 600, color: '#10b981' } }>
														{ a.completion_rate ?? 0 }%
													</span>
												</div>
												<div style={ { width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' } }>
													<div
														style={ {
															width: `${ Math.min( 100, Math.max( 0, a.completion_rate || 0 ) ) }%`,
															height: '100%',
															background: '#10b981',
															borderRadius: '3px',
															transition: 'width 0.3s ease',
														} }
													/>
												</div>
												<div style={ { display: 'flex', gap: '6px', fontSize: '11px', color: '#64748b' } }>
													<span><strong style={ { color: '#d97706' } }>{ a.active_count ?? 0 }</strong> { __( 'active', 'ai-marketing-expert' ) }</span>
													<span>•</span>
													<span><strong style={ { color: '#10b981' } }>{ a.completed_count ?? 0 }</strong> { __( 'completed', 'ai-marketing-expert' ) }</span>
												</div>
											</div>
										</td>
									) }

									{ visibleCols.enrolled && (
										<td className="is-numeric"><strong>{ a.enrolled_count ?? a.subscribers_count ?? 0 }</strong></td>
									) }

									{ visibleCols.active && (
										<td><span className="aime-badge aime-badge-warning">{ a.active_count ?? 0 }</span></td>
									) }

									{ visibleCols.completed && (
										<td><span className="aime-badge aime-badge-success">{ a.completed_count ?? 0 }</span></td>
									) }

									{ visibleCols.completion && (
										<td>
											<div style={ { display: 'flex', alignItems: 'center', gap: '8px', minWidth: '90px' } }>
												<div style={ { flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' } }>
													<div style={ { width: `${ Math.min( 100, Math.max( 0, a.completion_rate || 0 ) ) }%`, height: '100%', background: '#10b981', borderRadius: '3px' } } />
												</div>
												<span style={ { fontSize: '11px', fontWeight: 600, color: '#475569', minWidth: '32px', textAlign: 'right' } }>
													{ a.completion_rate ?? 0 }%
												</span>
											</div>
										</td>
									) }

									{ visibleCols.updated && (
										<td style={ { fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' } }>{ formatDate( a.updated_at, '\u2014' ) }</td>
									) }

									<td className="aime-actions" style={ { whiteSpace: 'nowrap', textAlign: 'right' } }>
										<Button variant="tertiary" size="small" onClick={ () => onNavigate( 'automation-editor', { id: a.id, tab: 'analytics' } ) } title={ __( 'View funnel analytics', 'ai-marketing-expert' ) }>
											{ __( 'Analytics', 'ai-marketing-expert' ) }
										</Button>
										<Button variant="tertiary" size="small" onClick={ () => handleToggleStatus( a ) }>
											{ a.status === 'published' ? __( 'Pause', 'ai-marketing-expert' ) : __( 'Activate', 'ai-marketing-expert' ) }
										</Button>
										<Button variant="tertiary" size="small" onClick={ () => onNavigate( 'automation-editor', { id: a.id } ) }>
											{ __( 'Edit', 'ai-marketing-expert' ) }
										</Button>
										<Button variant="tertiary" size="small" onClick={ () => handleDuplicate( a.id ) } title={ __( 'Duplicate', 'ai-marketing-expert' ) }>
											{ __( 'Duplicate', 'ai-marketing-expert' ) }
										</Button>
										<Button isDestructive variant="tertiary" size="small" onClick={ () => handleDelete( a.id ) } title={ __( 'Delete', 'ai-marketing-expert' ) }>
											{ __( 'Delete', 'ai-marketing-expert' ) }
										</Button>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</div>
			) }

			{ totalPages > 1 && (
				<div className="aime-pagination">
					<Button variant="secondary" disabled={ page <= 1 } onClick={ () => setPage( page - 1 ) }>
						<span className="dashicons dashicons-arrow-left-alt2" style={ { fontSize: '14px', width: '14px', height: '14px', lineHeight: '14px', verticalAlign: 'middle', marginRight: '4px' } }></span>
						{ __( 'Prev', 'ai-marketing-expert' ) }
					</Button>
					<span>{ page } / { totalPages }</span>
					<Button variant="secondary" disabled={ page >= totalPages } onClick={ () => setPage( page + 1 ) }>
						{ __( 'Next', 'ai-marketing-expert' ) }
						<span className="dashicons dashicons-arrow-right-alt2" style={ { fontSize: '14px', width: '14px', height: '14px', lineHeight: '14px', verticalAlign: 'middle', marginLeft: '4px' } }></span>
					</Button>
				</div>
			) }
		</Card>
	);
};

export default Automations;
