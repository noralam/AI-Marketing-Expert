/**
 * Workflow List — shows all workflows with status, next run, and quick actions.
 */

import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../utils/api';
import { toast } from '../../common/Toast';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import ConfirmModal from '../../common/ConfirmModal';
import LoadingBtn from '../../common/LoadingBtn';
import TestRunModal from './TestRunModal';
import { Button } from '../../common/WpComponents';

const STATUS_LABELS = {
	active: __( 'Active', 'ai-marketing-expert' ),
	paused: __( 'Paused', 'ai-marketing-expert' ),
	draft: __( 'Draft', 'ai-marketing-expert' ),
};

const formatDate = ( value ) => {
	if ( ! value ) {
		return '—';
	}
	// Stored as UTC MySQL datetime; append Z so the browser localizes it.
	const d = new Date( value.replace( ' ', 'T' ) + 'Z' );
	if ( isNaN( d.getTime() ) ) {
		return value;
	}
	return d.toLocaleString();
};

const WorkflowList = ( { onNavigate } ) => {
	const [ loading, setLoading ] = useState( true );
	const [ workflows, setWorkflows ] = useState( [] );
	const [ runningId, setRunningId ] = useState( null );
	const [ runStatuses, setRunStatuses ] = useState( {} ); // wfId → queued|running|success|partial|failed
	const [ togglingId, setTogglingId ] = useState( null );
	const [ confirmDelete, setConfirmDelete ] = useState( null );
	const [ testRunWf, setTestRunWf ] = useState( null );
	const [ triggers, setTriggers ] = useState( [] );
	const pollsRef = useRef( {} );

	useEffect( () => () => {
		Object.values( pollsRef.current ).forEach( clearInterval );
	}, [] );

	const load = useCallback( async () => {
		setLoading( true );
		try {
			const res = await apiGet( '/workflow-automation/workflows' );
			setWorkflows( res?.workflows || [] );
		} catch ( e ) {
			toast( e?.message || __( 'Failed to load workflows.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setLoading( false );
		}
	}, [] );

	useEffect( () => {
		load();
		// Trigger definitions provide the sample-payload fields for test runs.
		apiGet( '/workflow-automation/triggers' )
			.then( ( res ) => setTriggers( res?.triggers || [] ) )
			.catch( () => {} );
	}, [ load ] );

	const pollExecution = useCallback( ( wfId, executionId ) => {
		if ( pollsRef.current[ wfId ] ) {
			clearInterval( pollsRef.current[ wfId ] );
		}
		pollsRef.current[ wfId ] = setInterval( async () => {
			try {
				const res = await apiGet( `/workflow-automation/executions/${ executionId }` );
				const status = res?.execution?.status;
				if ( ! status ) {
					return;
				}
				setRunStatuses( ( prev ) => ( { ...prev, [ wfId ]: status } ) );
				if ( ! [ 'queued', 'running' ].includes( status ) ) {
					clearInterval( pollsRef.current[ wfId ] );
					delete pollsRef.current[ wfId ];
					toast(
						status === 'success'
							? __( 'Workflow run finished successfully.', 'ai-marketing-expert' )
							: `${ __( 'Workflow run finished:', 'ai-marketing-expert' ) } ${ status }`,
						status === 'success' ? 'success' : 'warning'
					);
					load();
				}
			} catch ( e ) { /* ignore transient poll errors */ }
		}, 3000 );
	}, [ load ] );

	const queueRun = async ( wf, event = null ) => {
		setRunningId( wf.id );
		try {
			const res = await apiPost(
				`/workflow-automation/workflows/${ wf.id }/run`,
				event && Object.keys( event ).length ? { event } : {}
			);
			if ( res?.queued && res?.execution_id ) {
				toast( __( 'Run queued…', 'ai-marketing-expert' ), 'info' );
				setRunStatuses( ( prev ) => ( { ...prev, [ wf.id ]: 'queued' } ) );
				pollExecution( wf.id, res.execution_id );
			}
		} catch ( e ) {
			toast( e?.message || __( 'Run failed.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setRunningId( null );
		}
	};

	const runNow = ( wf ) => {
		// Event workflows get their data from the trigger; ask for a sample
		// payload so a manual run behaves like a real one.
		if ( wf.trigger_type === 'event' ) {
			setTestRunWf( wf );
			return;
		}
		queueRun( wf );
	};

	const toggleStatus = async ( wf ) => {
		const next = wf.status === 'active' ? 'paused' : 'active';
		setTogglingId( wf.id );
		try {
			await apiPut( `/workflow-automation/workflows/${ wf.id }`, { status: next } );
			toast(
				next === 'active'
					? __( 'Workflow activated.', 'ai-marketing-expert' )
					: __( 'Workflow paused.', 'ai-marketing-expert' ),
				'success'
			);
			load();
		} catch ( e ) {
			toast( e?.message || __( 'Could not update status.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setTogglingId( null );
		}
	};

	const doDelete = async () => {
		const wf = confirmDelete;
		setConfirmDelete( null );
		try {
			await apiDelete( `/workflow-automation/workflows/${ wf.id }` );
			toast( __( 'Workflow deleted.', 'ai-marketing-expert' ), 'success' );
			load();
		} catch ( e ) {
			toast( e?.message || __( 'Delete failed.', 'ai-marketing-expert' ), 'error' );
		}
	};

	if ( loading ) {
		return <Loader />;
	}

	return (
		<div className="aime-workflow-list">
			<div className="aime-page-header" style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } }>
				<h2 style={ { margin: 0 } }>{ __( 'Workflows', 'ai-marketing-expert' ) }</h2>
				<Button variant="primary" onClick={ () => onNavigate( 'new-workflow' ) }>
					{ __( 'New Workflow', 'ai-marketing-expert' ) }
				</Button>
			</div>

			{ workflows.length === 0 ? (
				<Card>
					<p>{ __( 'No workflows yet. Create one to automate content, SEO, email, and social tasks on a schedule.', 'ai-marketing-expert' ) }</p>
					<Button variant="primary" onClick={ () => onNavigate( 'new-workflow' ) }>
						{ __( 'Create your first workflow', 'ai-marketing-expert' ) }
					</Button>
				</Card>
			) : (
				<table className="aime-table widefat striped" style={ { width: '100%' } }>
					<thead>
						<tr>
							<th>{ __( 'Name', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Next run', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Last run', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Runs', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
						</tr>
					</thead>
					<tbody>
						{ workflows.map( ( wf ) => (
							<tr key={ wf.id }>
								<td>
									<button
										type="button"
										className="aime-link-btn"
										style={ { background: 'none', border: 0, padding: 0, color: 'var(--aime-primary)', cursor: 'pointer', fontWeight: 600 } }
										onClick={ () => onNavigate( 'edit-workflow', { id: wf.id } ) }
									>
										{ wf.name || __( '(untitled)', 'ai-marketing-expert' ) }
									</button>
									{ wf.description && (
										<div style={ { color: '#787c82', fontSize: 12 } }>{ wf.description }</div>
									) }
								</td>
								<td>
									<span className={ `aime-badge aime-badge--${ wf.status }` }>
										{ STATUS_LABELS[ wf.status ] || wf.status }
									</span>
								</td>
								<td>{ formatDate( wf.next_run_at ) }</td>
								<td>{ formatDate( wf.last_run_at ) }</td>
								<td>{ wf.run_count }</td>
								<td>
									<div style={ { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } }>
										{ runStatuses[ wf.id ] && (
											<span className={ `aime-wf-run-chip aime-wf-run-chip--${ runStatuses[ wf.id ] }` }>
												{ runStatuses[ wf.id ] }
											</span>
										) }
										{ runningId === wf.id || [ 'queued', 'running' ].includes( runStatuses[ wf.id ] ) ? (
											<LoadingBtn>{ __( 'Running…', 'ai-marketing-expert' ) }</LoadingBtn>
										) : (
											<Button variant="secondary" size="small" onClick={ () => runNow( wf ) }>
												{ __( 'Run now', 'ai-marketing-expert' ) }
											</Button>
										) }
										{ togglingId === wf.id ? (
											<LoadingBtn>{ __( 'Saving…', 'ai-marketing-expert' ) }</LoadingBtn>
										) : (
											wf.status !== 'draft' && (
												<Button variant="secondary" size="small" onClick={ () => toggleStatus( wf ) }>
													{ wf.status === 'active' ? __( 'Pause', 'ai-marketing-expert' ) : __( 'Activate', 'ai-marketing-expert' ) }
												</Button>
											)
										) }
										<Button variant="tertiary" size="small" onClick={ () => onNavigate( 'history', { id: wf.id } ) }>
											{ __( 'History', 'ai-marketing-expert' ) }
										</Button>
										<Button variant="tertiary" size="small" isDestructive onClick={ () => setConfirmDelete( wf ) }>
											{ __( 'Delete', 'ai-marketing-expert' ) }
										</Button>
									</div>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			) }

			{ testRunWf && (
				<TestRunModal
					trigger={ triggers.find( ( t ) => t.key === testRunWf.trigger_event ) }
					workflowName={ testRunWf.name }
					onRun={ ( event ) => {
						const wf = testRunWf;
						setTestRunWf( null );
						queueRun( wf, event );
					} }
					onCancel={ () => setTestRunWf( null ) }
				/>
			) }

			{ confirmDelete && (
				<ConfirmModal
					title={ __( 'Delete workflow', 'ai-marketing-expert' ) }
					message={ sprintf(
						/* translators: %s: workflow name */
						__( 'Delete "%s"? Its steps and run history will be removed. This cannot be undone.', 'ai-marketing-expert' ),
						confirmDelete.name || __( '(untitled)', 'ai-marketing-expert' )
					) }
					confirmLabel={ __( 'Delete', 'ai-marketing-expert' ) }
					isDestructive
					onConfirm={ doDelete }
					onCancel={ () => setConfirmDelete( null ) }
				/>
			) }
		</div>
	);
};

export default WorkflowList;
