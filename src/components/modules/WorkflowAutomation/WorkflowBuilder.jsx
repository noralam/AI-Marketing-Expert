/**
 * WorkflowBuilder — n8n-style visual workflow editor.
 * Palette (left) → Canvas (center) → Config panel (right).
 * The canvas nodes/edges are the source of truth for steps.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import { apiGet, apiPost, apiPut } from '../../../utils/api';
import { toast } from '../../common/Toast';
import Loader from '../../common/Loader';
import LoadingBtn from '../../common/LoadingBtn';
import ConfirmModal from '../../common/ConfirmModal';
import { isProActive } from '../../common/ProLock';
import { Button, SelectControl } from '../../common/WpComponents';
import WorkflowCanvas from './WorkflowCanvas';
import NodePalette from './NodePalette';
import ConfigPanel from './ConfigPanel';
import TestRunModal from './TestRunModal';
import { stepsToFlow, flowToSteps, validate, autoLayout, newStepKey } from './utils/graph';

const blankWorkflow = () => ( {
	name: '',
	description: '',
	status: 'draft',
	trigger_type: 'schedule',
	trigger_event: '',
	trigger_config: {},
	schedule_type: 'weekly',
	schedule_time: '09:00',
	schedule_days: '1',
	schedule_day_of_month: 1,
	interval_value: 1,
	interval_unit: 'days',
	run_at: '',
	topic: '',
	tone: '',
	brand_voice_id: 0,
	failure_policy: 'stop',
} );

/** One-line human summary of a step's config. */
const configSummary = ( step, def ) => {
	const parts = [];
	( def?.fields || [] ).forEach( ( f ) => {
		const v = step.config?.[ f.key ];
		if ( v !== undefined && v !== null && v !== '' && parts.length < 2 ) {
			parts.push( `${ f.label || f.key }: ${ String( v ).slice( 0, 30 ) }` );
		}
	} );
	return parts.join( ' · ' );
};

/** One-line summary of the trigger settings. */
const triggerSummary = ( wf, triggers ) => {
	if ( wf.trigger_type !== 'schedule' && wf.trigger_event ) {
		const def = ( triggers || [] ).find( ( t ) => t.key === wf.trigger_event );
		return def?.label || wf.trigger_event;
	}
	switch ( wf.schedule_type ) {
		case 'once':
			return `${ __( 'Once', 'ai-marketing-expert' ) }${ wf.run_at ? ` · ${ wf.run_at }` : '' }`;
		case 'daily':
			return `${ __( 'Daily', 'ai-marketing-expert' ) } · ${ wf.schedule_time }`;
		case 'weekly':
			return `${ __( 'Weekly', 'ai-marketing-expert' ) } · ${ wf.schedule_time }`;
		case 'monthly':
			return `${ __( 'Monthly', 'ai-marketing-expert' ) } · ${ __( 'day', 'ai-marketing-expert' ) } ${ wf.schedule_day_of_month }`;
		case 'custom':
			return `${ __( 'Every', 'ai-marketing-expert' ) } ${ wf.interval_value } ${ wf.interval_unit }`;
		default:
			return __( 'Schedule', 'ai-marketing-expert' );
	}
};

const WorkflowBuilder = ( { id, onBack, onNavigate } ) => {
	const hasPro = isProActive();

	const [ loading, setLoading ] = useState( true );
	const [ saving, setSaving ] = useState( false );
	const [ actions, setActions ] = useState( [] );
	const [ triggers, setTriggers ] = useState( [] );
	const [ wf, setWf ] = useState( blankWorkflow() );
	const [ dirty, setDirty ] = useState( false );
	const [ selectedId, setSelectedId ] = useState( null );
	const [ confirmBack, setConfirmBack ] = useState( false );
	const [ testRunOpen, setTestRunOpen ] = useState( false );
	const [ runState, setRunState ] = useState( null ); // { executionId, status, outputs }
	const [ vaultKeywords, setVaultKeywords ] = useState( [] );
	const [ brandVoices, setBrandVoices ] = useState( [] );

	const [ nodes, setNodes, onNodesChange ] = useNodesState( [] );
	const [ edges, setEdges, onEdgesChange ] = useEdgesState( [] );
	const pollRef = useRef( null );

	const actionsByType = useMemo( () => {
		const map = {};
		actions.forEach( ( a ) => {
			map[ a.type ] = a;
		} );
		return map;
	}, [ actions ] );

	/* ------------------------------------------------------------- load */
	const load = useCallback( async () => {
		setLoading( true );
		try {
			const [ actRes, trigRes ] = await Promise.all( [
				apiGet( '/workflow-automation/actions' ),
				apiGet( '/workflow-automation/triggers' ),
			] );
			setActions( actRes?.actions || [] );
			setTriggers( trigRes?.triggers || [] );

			// Optional cross-module data — each may be unavailable (module off).
			try {
				const kwRes = await apiGet( '/seo/keywords', { per_page: 200 } );
				const items = kwRes?.items || kwRes?.data || [];
				setVaultKeywords( items.map( ( k ) => k.keyword ).filter( Boolean ) );
			} catch ( e ) {
				// SEO module inactive — no suggestions.
			}
			try {
				const bvRes = await apiGet( '/content/brand-voices' );
				setBrandVoices( bvRes?.items || [] );
			} catch ( e ) {
				// Content module inactive — hide the brand-voice select.
			}

			if ( id ) {
				const res = await apiGet( `/workflow-automation/workflows/${ id }` );
				const data = res?.workflow;
				if ( data ) {
					const { steps, ...meta } = data;
					setWf( { ...blankWorkflow(), ...meta, trigger_config: meta.trigger_config || {} } );
					const flow = stepsToFlow( steps || [], data );
					setNodes( flow.nodes );
					setEdges( flow.edges );
				}
			} else {
				setNodes( stepsToFlow( [], null ).nodes );
				setEdges( [] );
			}
			setDirty( false );
		} catch ( e ) {
			toast( e?.message || __( 'Failed to load.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setLoading( false );
		}
	}, [ id, setNodes, setEdges ] );

	useEffect( () => {
		load();
	}, [ load ] );

	/* --------------------------------------------------- dirty tracking */
	useEffect( () => {
		const handler = ( e ) => {
			if ( dirty ) {
				e.preventDefault();
				e.returnValue = '';
			}
		};
		window.addEventListener( 'beforeunload', handler );
		return () => window.removeEventListener( 'beforeunload', handler );
	}, [ dirty ] );

	useEffect( () => () => {
		if ( pollRef.current ) {
			clearInterval( pollRef.current );
		}
	}, [] );

	const setWorkflowField = useCallback( ( patch ) => {
		setWf( ( prev ) => ( { ...prev, ...patch } ) );
		setDirty( true );
	}, [] );

	/* -------------------------------------------------- graph mutations */
	const handleNodesChange = useCallback( ( changes ) => {
		if ( changes.some( ( c ) => c.type === 'position' || c.type === 'remove' ) ) {
			setDirty( true );
		}
		onNodesChange( changes );
	}, [ onNodesChange ] );

	const handleEdgesChange = useCallback( ( changes ) => {
		if ( changes.some( ( c ) => c.type === 'remove' ) ) {
			setDirty( true );
		}
		onEdgesChange( changes );
	}, [ onEdgesChange ] );

	const onConnect = useCallback( ( conn ) => {
		if ( conn.target === 'trigger' ) {
			return;
		}
		setEdges( ( eds ) => {
			if ( eds.some( ( e ) => e.target === conn.target ) ) {
				toast( __( 'A step can only have one incoming connection.', 'ai-marketing-expert' ), 'warning' );
				return eds;
			}
			setDirty( true );
			const branch = conn.sourceHandle === 'yes' || conn.sourceHandle === 'no' ? conn.sourceHandle : null;
			return addEdge( { ...conn, animated: true, label: branch || undefined }, eds );
		} );
	}, [ setEdges ] );

	const addAction = useCallback( ( type, position = null ) => {
		const def = actionsByType[ type ];
		if ( def?.is_pro && ! hasPro ) {
			toast( __( 'This step type requires Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		setNodes( ( nds ) => {
			const pos = position || {
				x: nds.length ? Math.max( ...nds.map( ( n ) => n.position.x ) ) : 0,
				y: ( nds.length ? Math.max( ...nds.map( ( n ) => n.position.y ) ) : 0 ) + 160,
			};
			return [
				...nds,
				{
					id: newStepKey(),
					type: type === 'condition' ? 'condition' : 'action',
					position: pos,
					data: { step: { action_type: type, config: {}, tone_override: '', run_condition: 'always' } },
				},
			];
		} );
		setDirty( true );
	}, [ actionsByType, hasPro, setNodes ] );

	const updateStep = useCallback( ( nodeId, patch ) => {
		setNodes( ( nds ) =>
			nds.map( ( n ) =>
				n.id === nodeId ? { ...n, data: { ...n.data, step: { ...n.data.step, ...patch } } } : n
			)
		);
		setDirty( true );
	}, [ setNodes ] );

	const updateStepConfig = useCallback( ( nodeId, key, value ) => {
		setNodes( ( nds ) =>
			nds.map( ( n ) =>
				n.id === nodeId
					? { ...n, data: { ...n.data, step: { ...n.data.step, config: { ...n.data.step.config, [ key ]: value } } } }
					: n
			)
		);
		setDirty( true );
	}, [ setNodes ] );

	const deleteNode = useCallback( ( nodeId ) => {
		if ( nodeId === 'trigger' ) {
			return;
		}
		setNodes( ( nds ) => nds.filter( ( n ) => n.id !== nodeId ) );
		setEdges( ( eds ) => eds.filter( ( e ) => e.source !== nodeId && e.target !== nodeId ) );
		setSelectedId( null );
		setDirty( true );
	}, [ setNodes, setEdges ] );

	const onSelectionChange = useCallback( ( { nodes: selected } ) => {
		setSelectedId( selected?.length === 1 ? selected[ 0 ].id : null );
	}, [] );

	const deselect = useCallback( () => {
		setNodes( ( nds ) => nds.map( ( n ) => ( n.selected ? { ...n, selected: false } : n ) ) );
		setSelectedId( null );
	}, [ setNodes ] );

	const relayout = useCallback( () => {
		setNodes( ( nds ) => autoLayout( nds, edges ) );
		setDirty( true );
	}, [ edges, setNodes ] );

	/* --------------------------------------------------------- validate */
	const issues = useMemo( () => validate( nodes, edges, actionsByType ), [ nodes, edges, actionsByType ] );
	const invalidNodeIds = useMemo( () => new Set( issues.filter( ( i ) => i.nodeId ).map( ( i ) => i.nodeId ) ), [ issues ] );

	/* -------------------------------------------------------------- save */
	const save = async () => {
		if ( ! wf.name.trim() ) {
			toast( __( 'Please give the workflow a name.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		// Missing-required-field issues only block saving when activating;
		// drafts can be saved incomplete. Structural issues always block.
		const blocking = wf.status === 'active'
			? issues
			: issues.filter( ( i ) => ! i.nodeId || ! i.message.startsWith( 'Missing required field' ) );
		if ( blocking.length ) {
			toast( blocking[ 0 ].message, 'warning' );
			return;
		}
		setSaving( true );
		try {
			const payload = { ...wf, steps: flowToSteps( nodes, edges ) };
			const res = id
				? await apiPut( `/workflow-automation/workflows/${ id }`, payload )
				: await apiPost( '/workflow-automation/workflows', payload );
			toast( __( 'Workflow saved.', 'ai-marketing-expert' ), 'success' );
			setDirty( false );
			const savedId = res?.workflow?.id || id;
			if ( ! id && savedId ) {
				onNavigate( 'edit-workflow', { id: savedId } );
			}
		} catch ( e ) {
			toast( e?.message || __( 'Save failed.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setSaving( false );
		}
	};

	/* ----------------------------------------------------------- run now */
	const pollExecution = useCallback( ( executionId ) => {
		if ( pollRef.current ) {
			clearInterval( pollRef.current );
		}
		pollRef.current = setInterval( async () => {
			try {
				const res = await apiGet( `/workflow-automation/executions/${ executionId }` );
				const exec = res?.execution;
				if ( ! exec ) {
					return;
				}
				setRunState( { executionId, status: exec.status, outputs: exec.outputs || [] } );
				if ( ! [ 'queued', 'running' ].includes( exec.status ) ) {
					clearInterval( pollRef.current );
					pollRef.current = null;
					toast(
						exec.status === 'success'
							? __( 'Workflow run finished successfully.', 'ai-marketing-expert' )
							: `${ __( 'Workflow run finished:', 'ai-marketing-expert' ) } ${ exec.status }`,
						exec.status === 'success' ? 'success' : 'warning'
					);
				}
			} catch ( e ) { /* transient poll errors are ignored */ }
		}, 3000 );
	}, [] );

	const queueRun = useCallback( async ( event = null ) => {
		try {
			const res = await apiPost(
				`/workflow-automation/workflows/${ id }/run`,
				event && Object.keys( event ).length ? { event } : {}
			);
			if ( res?.execution_id ) {
				toast( __( 'Run queued…', 'ai-marketing-expert' ), 'info' );
				setRunState( { executionId: res.execution_id, status: 'queued', outputs: [] } );
				pollExecution( res.execution_id );
			}
		} catch ( e ) {
			toast( e?.message || __( 'Run failed.', 'ai-marketing-expert' ), 'error' );
		}
	}, [ id, pollExecution ] );

	const runNow = async () => {
		if ( ! id ) {
			toast( __( 'Save the workflow before running it.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		if ( dirty ) {
			toast( __( 'Save your changes before running.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		if ( issues.length ) {
			toast( issues[ 0 ].message, 'warning' );
			return;
		}
		// Event workflows get their data from the trigger; a manual run needs
		// a sample payload or steps reading event data will fail.
		if ( wf.trigger_type === 'event' ) {
			setTestRunOpen( true );
			return;
		}
		await queueRun();
	};

	/* ---------------------------------------------------------- display */
	const runStatusByKey = useMemo( () => {
		const map = {};
		( runState?.outputs || [] ).forEach( ( o ) => {
			if ( o.step_key ) {
				map[ o.step_key ] = o.status;
			}
		} );
		return map;
	}, [ runState ] );

	const displayNodes = useMemo( () => nodes.map( ( n ) => {
		if ( n.id === 'trigger' ) {
			const triggerKey = wf.trigger_type === 'schedule' ? 'schedule' : wf.trigger_event;
			const def = triggers.find( ( t ) => t.key === triggerKey );
			return {
				...n,
				deletable: false,
				data: {
					...n.data,
					triggerKey,
					label: def?.label || __( 'Trigger', 'ai-marketing-expert' ),
					summary: triggerSummary( wf, triggers ),
				},
			};
		}
		const step = n.data?.step || {};
		const def = actionsByType[ step.action_type ];
		const runStatus = runState
			? runStatusByKey[ n.id ] || ( [ 'queued', 'running' ].includes( runState.status ) ? 'pending' : null )
			: null;
		return {
			...n,
			data: {
				...n.data,
				label: def?.label || step.action_type,
				summary: configSummary( step, def ),
				invalid: invalidNodeIds.has( n.id ),
				locked: n.type === 'condition' && ! hasPro,
				runStatus: runState ? runStatus : null,
			},
		};
	} ), [ nodes, wf, triggers, actionsByType, invalidNodeIds, hasPro, runState, runStatusByKey ] );

	const goBack = () => {
		if ( dirty ) {
			setConfirmBack( true );
		} else {
			onBack();
		}
	};

	if ( loading ) {
		return <Loader />;
	}

	const selectedNode = selectedId ? displayNodes.find( ( n ) => n.id === selectedId ) : null;
	const running = runState && [ 'queued', 'running' ].includes( runState.status );

	return (
		<div className="aime-wf-builder">
			<div className="aime-wf-topbar">
				<div className="aime-wf-topbar__left">
					<Button variant="tertiary" onClick={ goBack }>{ __( '← Back', 'ai-marketing-expert' ) }</Button>
					<input
						className="aime-wf-name-input"
						value={ wf.name }
						placeholder={ __( 'Untitled workflow', 'ai-marketing-expert' ) }
						onChange={ ( e ) => setWorkflowField( { name: e.target.value } ) }
					/>
					{ dirty && <span className="aime-wf-dirty-dot" title={ __( 'Unsaved changes', 'ai-marketing-expert' ) }>●</span> }
				</div>
				<div className="aime-wf-topbar__right">
					<SelectControl
						value={ wf.status }
						options={ [
							{ value: 'draft', label: __( 'Draft', 'ai-marketing-expert' ) },
							{ value: 'active', label: __( 'Active', 'ai-marketing-expert' ) },
							{ value: 'paused', label: __( 'Paused', 'ai-marketing-expert' ) },
						] }
						onChange={ ( v ) => setWorkflowField( { status: v } ) }
					/>
					<Button variant="secondary" onClick={ relayout }>{ __( 'Auto layout', 'ai-marketing-expert' ) }</Button>
					{ running ? (
						<LoadingBtn>{ __( 'Running…', 'ai-marketing-expert' ) }</LoadingBtn>
					) : (
						<Button variant="secondary" onClick={ runNow } disabled={ ! id }>
							{ __( 'Run now', 'ai-marketing-expert' ) }
						</Button>
					) }
					{ saving ? (
						<LoadingBtn primary>{ __( 'Saving…', 'ai-marketing-expert' ) }</LoadingBtn>
					) : (
						<Button variant="primary" onClick={ save }>{ __( 'Save', 'ai-marketing-expert' ) }</Button>
					) }
				</div>
			</div>

			<NodePalette actions={ actions } hasPro={ hasPro } onAdd={ addAction } />

			<div className="aime-wf-layout">
				<WorkflowCanvas
					nodes={ displayNodes }
					edges={ edges }
					onNodesChange={ handleNodesChange }
					onEdgesChange={ handleEdgesChange }
					onConnect={ onConnect }
					onSelectionChange={ onSelectionChange }
					onDropAction={ ( type, position ) => addAction( type, position ) }
				/>
				<ConfigPanel
					selectedNode={ selectedNode }
					workflow={ wf }
					setWorkflowField={ setWorkflowField }
					triggers={ triggers }
					actionsByType={ actionsByType }
					onUpdateStep={ updateStep }
					onUpdateStepConfig={ updateStepConfig }
					onDeleteNode={ deleteNode }
					onDeselect={ deselect }
					hasPro={ hasPro }
					keywordSuggestions={ vaultKeywords }
					brandVoices={ brandVoices }
				/>
			</div>

			{ testRunOpen && (
				<TestRunModal
					trigger={ triggers.find( ( t ) => t.key === wf.trigger_event ) }
					workflowName={ wf.name }
					onRun={ ( event ) => {
						setTestRunOpen( false );
						queueRun( event );
					} }
					onCancel={ () => setTestRunOpen( false ) }
				/>
			) }

			{ confirmBack && (
				<ConfirmModal
					title={ __( 'Unsaved changes', 'ai-marketing-expert' ) }
					message={ __( 'You have unsaved changes. Leave without saving?', 'ai-marketing-expert' ) }
					confirmLabel={ __( 'Leave', 'ai-marketing-expert' ) }
					isDestructive
					onConfirm={ () => {
						setConfirmBack( false );
						onBack();
					} }
					onCancel={ () => setConfirmBack( false ) }
				/>
			) }
		</div>
	);
};

export default WorkflowBuilder;
