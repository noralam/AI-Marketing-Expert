/**
 * Workflow History — execution log for a single workflow, with per-run
 * step outputs (incl. branch context and artifact deep links) and a
 * queued re-run action that polls while the run is in flight.
 */

import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { apiGet, apiPost } from '../../../utils/api';
import { toast } from '../../common/Toast';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import LoadingBtn from '../../common/LoadingBtn';
import { formatDateTime } from '../../../utils/datetime';
import { Button } from '../../common/WpComponents';

// Stored as UTC; rendered in the site timezone and format (Settings → General).
const formatDate = ( value ) => formatDateTime( value );

const STATUS_COLOR = {
	success: '#2e7d32',
	partial: '#ed6c02',
	failed: '#c62828',
	running: '#0073aa',
	queued: '#787c82',
	skipped: '#8fa893',
};

const WorkflowHistory = ( { id, onBack } ) => {
	const [ loading, setLoading ] = useState( true );
	const [ executions, setExecutions ] = useState( [] );
	const [ expanded, setExpanded ] = useState( null );
	const [ detail, setDetail ] = useState( {} );
	const [ running, setRunning ] = useState( false );
	const pollRef = useRef( null );

	const load = useCallback( async ( { silent = false } = {} ) => {
		if ( ! silent ) {
			setLoading( true );
		}
		try {
			const res = await apiGet( `/workflow-automation/workflows/${ id }/history` );
			setExecutions( res?.executions || [] );
		} catch ( e ) {
			if ( ! silent ) {
				toast( e?.message || __( 'Failed to load history.', 'ai-marketing-expert' ), 'error' );
			}
		} finally {
			if ( ! silent ) {
				setLoading( false );
			}
		}
	}, [ id ] );

	useEffect( () => {
		load();
	}, [ load ] );

	// Poll every 3s while the newest execution is queued or running.
	useEffect( () => {
		const newest = executions[ 0 ];
		const inFlight = newest && [ 'queued', 'running' ].includes( newest.status );
		setRunning( !! inFlight );
		if ( inFlight && ! pollRef.current ) {
			pollRef.current = setInterval( () => load( { silent: true } ), 3000 );
		}
		if ( ! inFlight && pollRef.current ) {
			clearInterval( pollRef.current );
			pollRef.current = null;
			// Refresh the expanded detail once the run settles.
			setDetail( {} );
		}
		return () => {
			if ( pollRef.current ) {
				clearInterval( pollRef.current );
				pollRef.current = null;
			}
		};
	}, [ executions, load ] );

	const toggle = async ( execId ) => {
		if ( expanded === execId ) {
			setExpanded( null );
			return;
		}
		setExpanded( execId );
		if ( ! detail[ execId ] ) {
			try {
				const res = await apiGet( `/workflow-automation/executions/${ execId }` );
				setDetail( ( prev ) => ( { ...prev, [ execId ]: res?.execution } ) );
			} catch ( e ) {
				toast( e?.message || __( 'Failed to load run details.', 'ai-marketing-expert' ), 'error' );
			}
		}
	};

	const reRun = async () => {
		setRunning( true );
		try {
			const res = await apiPost( `/workflow-automation/workflows/${ id }/run` );
			if ( res?.queued ) {
				toast( __( 'Run queued…', 'ai-marketing-expert' ), 'info' );
			}
			load( { silent: true } );
		} catch ( e ) {
			toast( e?.message || __( 'Run failed.', 'ai-marketing-expert' ), 'error' );
			setRunning( false );
		}
	};

	if ( loading ) {
		return <Loader variant="table" />;
	}

	return (
		<div className="aime-workflow-history">
			<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } }>
				<h2 style={ { margin: 0 } }>{ __( 'Run History', 'ai-marketing-expert' ) }</h2>
				<div style={ { display: 'flex', gap: 8 } }>
					<Button variant="tertiary" onClick={ onBack }>{ __( 'Back', 'ai-marketing-expert' ) }</Button>
					{ running ? (
						<LoadingBtn primary>{ __( 'Running…', 'ai-marketing-expert' ) }</LoadingBtn>
					) : (
						<Button variant="primary" onClick={ reRun }>{ __( 'Run now', 'ai-marketing-expert' ) }</Button>
					) }
				</div>
			</div>

			{ executions.length === 0 ? (
				<Card><p>{ __( 'This workflow has not run yet.', 'ai-marketing-expert' ) }</p></Card>
			) : (
				executions.map( ( exec ) => (
					<Card key={ exec.id } className="aime-mb-2">
						<div
							style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' } }
							onClick={ () => toggle( exec.id ) }
						>
							<div>
								<span style={ { fontWeight: 600, color: STATUS_COLOR[ exec.status ] || '#1e1e1e' } }>
									{ exec.status }
								</span>
								<span style={ { color: '#787c82', marginLeft: 10 } }>{ formatDate( exec.started_at ) }</span>
							</div>
							<div style={ { color: '#787c82', fontSize: 13 } }>
								{ exec.steps_succeeded }/{ exec.steps_total } { __( 'ok', 'ai-marketing-expert' ) }
								{ exec.steps_failed > 0 && ` · ${ exec.steps_failed } ${ __( 'failed', 'ai-marketing-expert' ) }` }
								{ exec.steps_skipped > 0 && ` · ${ exec.steps_skipped } ${ __( 'skipped', 'ai-marketing-expert' ) }` }
							</div>
						</div>

						{ exec.error && (
							<p style={ { color: '#c62828', marginTop: 8, fontSize: 13 } }>{ exec.error }</p>
						) }

						{ expanded === exec.id && (
							<div style={ { marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 } }>
								{ ! detail[ exec.id ] ? (
									<Loader variant="lines" />
								) : (
									( detail[ exec.id ].outputs || [] ).map( ( out ) => (
										<div key={ out.id } style={ { padding: '8px 0', borderBottom: '1px dashed #eee' } }>
											<div style={ { fontWeight: 600 } }>
												{ out.action_type }
												<span style={ { color: STATUS_COLOR[ out.status ] || '#787c82', marginLeft: 8, fontWeight: 400 } }>
													({ out.status })
												</span>
												{ out.branch && out.branch !== 'default' && (
													<span className="aime-wf-branch-chip">
														{ __( 'branch:', 'ai-marketing-expert' ) } { out.branch }
													</span>
												) }
												{ out.step_key && (
													<span style={ { color: '#8fa893', marginLeft: 8, fontWeight: 400, fontSize: 11 } }>
														{ out.step_key }
													</span>
												) }
											</div>
											{ out.preview && (
												<div style={ { color: '#50575e', fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' } }>
													{ out.preview }
												</div>
											) }
											{ out.reference?.link && (
												<a
													href={ out.reference.link }
													target="_blank"
													rel="noopener noreferrer"
													style={ { fontSize: 13, display: 'inline-block', marginTop: 4 } }
												>
													{ __( 'View result →', 'ai-marketing-expert' ) }
												</a>
											) }
											{ out.error && (
												<div style={ { color: '#c62828', fontSize: 13, marginTop: 4 } }>{ out.error }</div>
											) }
										</div>
									) )
								) }
							</div>
						) }
					</Card>
				) )
			) }
		</div>
	);
};

export default WorkflowHistory;
