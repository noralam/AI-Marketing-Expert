/**
 * WorkflowBuilder — n8n-style visual workflow editor.
 * Palette (left) → Canvas (center) → Config panel (right).
 * The canvas nodes/edges are the source of truth for steps.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import { apiGet, apiPost, apiPut } from '../../../utils/api';
import apiFetch from '@wordpress/api-fetch';
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
import AiWorkflowModal from './AiWorkflowModal';
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
			if (
				f.key === 'wp_post_id' &&
				( v === -1 ||
					v === '-1' ||
					( typeof v === 'string' && ( v.startsWith( '{' ) || v.includes( 'post_id' ) ) ) )
			) {
				parts.push( `${ f.label || f.key }: ${ __( 'Previous step', 'ai-marketing-expert' ) }` );
				return;
			}
			if ( f.type === 'select' && Array.isArray( f.options ) ) {
				const opt = f.options.find( ( o ) => String( o.value ) === String( v ) );
				if ( opt ) {
					parts.push( `${ f.label || f.key }: ${ opt.label }` );
					return;
				}
				if ( f.key === 'funnel_id' || f.key === 'account_id' ) {
					return;
				}
			}
			parts.push( `${ f.label || f.key }: ${ String( v ).slice( 0, 30 ) }` );
		}
	} );
	return parts.join( ' · ' );
};

/** Short weekday labels keyed by JS getDay numbers (0=Sun … 6=Sat). */
const DAY_LABELS = {
	0: __( 'Sun', 'ai-marketing-expert' ),
	1: __( 'Mon', 'ai-marketing-expert' ),
	2: __( 'Tue', 'ai-marketing-expert' ),
	3: __( 'Wed', 'ai-marketing-expert' ),
	4: __( 'Thu', 'ai-marketing-expert' ),
	5: __( 'Fri', 'ai-marketing-expert' ),
	6: __( 'Sat', 'ai-marketing-expert' ),
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
		case 'weekly': {
			const days = ( wf.schedule_days || '' )
				.split( ',' )
				.map( Number )
				.filter( ( d ) => d >= 0 && d <= 6 )
				.sort( ( a, b ) => a - b )
				.map( ( d ) => DAY_LABELS[ d ] );
			const daysLabel = days.length ? ` · ${ days.join( ', ' ) }` : '';
			return `${ __( 'Weekly', 'ai-marketing-expert' ) } · ${ wf.schedule_time }${ daysLabel }`;
		}
		case 'monthly':
			return `${ __( 'Monthly', 'ai-marketing-expert' ) } · ${ __( 'day', 'ai-marketing-expert' ) } ${ wf.schedule_day_of_month }`;
		case 'custom':
			return `${ __( 'Every', 'ai-marketing-expert' ) } ${ wf.interval_value } ${ wf.interval_unit }`;
		default:
			return __( 'Schedule', 'ai-marketing-expert' );
	}
};

const WorkflowBuilder = ( { id, initialWorkflow, onBack, onNavigate } ) => {
	const hasPro = isProActive();
	// Free-plan step cap, mirrored from the server so the builder shows the
	// limit before a save is rejected for exceeding it.
	const stepLimit = window.aimeData?.freeLimits?.workflow_steps || 3;

	const [ loading, setLoading ] = useState( true );
	const [ saving, setSaving ] = useState( false );
	const [ actions, setActions ] = useState( [] );
	const [ triggers, setTriggers ] = useState( [] );
	const [ wf, setWf ] = useState( blankWorkflow() );
	const [ dirty, setDirty ] = useState( false );
	const [ selectedId, setSelectedId ] = useState( null );
	const [ confirmBack, setConfirmBack ] = useState( false );
	const [ testRunOpen, setTestRunOpen ] = useState( false );
	const [ aiModalOpen, setAiModalOpen ] = useState( false );
	const [ queuing, setQueuing ] = useState( false ); // click → server ack window
	const [ runState, setRunState ] = useState( null ); // { executionId, status, outputs }
	const [ vaultKeywords, setVaultKeywords ] = useState( [] );
	const [ wpTags, setWpTags ] = useState( [] );
	const [ brandVoices, setBrandVoices ] = useState( [] );

	const [ nodes, setNodes, onNodesChange ] = useNodesState( [] );
	const [ edges, setEdges, onEdgesChange ] = useEdgesState( [] );
	const pollRef = useRef( null );
	// Guards the finish toast: setInterval callbacks can overlap on a slow
	// request, and each would otherwise fire its own notice for the same run.
	const finishedRef = useRef( null );

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
				const tags = await apiFetch( { path: '/wp/v2/tags?per_page=100&hide_empty=false&_fields=id,name' } );
				setWpTags( ( tags || [] ).map( ( t ) => t.name ).filter( Boolean ) );
			} catch ( e ) {
				// Tags REST unavailable — field stays free-form.
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

					// Templates ship intentionally unconfigured picks (e.g. the
					// funnel). Auto-open the first step still missing a required
					// setting so the user lands directly on the work to do.
					const defMap = {};
					( actRes?.actions || [] ).forEach( ( a ) => { defMap[ a.type ] = a; } );
					const needsSetup = ( steps || [] ).find( ( s ) => {
						const def = defMap[ s.action_type ];
						if ( ! def ) {
							return false;
						}
						return ( def.fields || [] ).some( ( f ) => {
							if ( ! f.required ) {
								return false;
							}
							const v = ( s.config || {} )[ f.key ] ?? f.default ?? '';
							return v === '' || v === null || v === 0 || v === '0';
						} );
					} );
					if ( needsSetup && flow.nodes.some( ( n ) => n.id === needsSetup.step_key ) ) {
						setSelectedId( needsSetup.step_key );
						toast(
							__( 'Template applied — configure the highlighted step, then activate.', 'ai-marketing-expert' ),
							'warning'
						);
					}
				}
			} else if ( initialWorkflow ) {
				const { steps, ...meta } = initialWorkflow;
				setWf( { ...blankWorkflow(), ...meta, trigger_config: meta.trigger_config || {} } );
				const flow = stepsToFlow( steps || [], initialWorkflow );
				const layoutedNodes = autoLayout( flow.nodes, flow.edges );
				setNodes( Array.isArray( layoutedNodes ) ? layoutedNodes : ( layoutedNodes?.nodes || flow.nodes ) );
				setEdges( flow.edges || [] );
			} else {
				setNodes( stepsToFlow( [], null ).nodes );
				setEdges( [] );
			}
			setDirty( !! initialWorkflow );
		} catch ( e ) {
			toast( e?.message || __( 'Failed to load.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setLoading( false );
		}
	}, [ id, initialWorkflow, setNodes, setEdges ] );

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

	const handleAiGenerated = useCallback( ( generatedWf ) => {
		if ( ! generatedWf ) {
			return;
		}
		const { steps, ...meta } = generatedWf;
		setWf( ( prev ) => ( {
			...prev,
			...meta,
			status: 'draft', // Always draft until user reviews & configures
			trigger_config: meta.trigger_config || {},
		} ) );
		const flow = stepsToFlow( steps || [], generatedWf );
		const layoutedNodes = autoLayout( flow.nodes, flow.edges );
		setNodes( Array.isArray( layoutedNodes ) ? layoutedNodes : ( layoutedNodes?.nodes || flow.nodes ) );
		setEdges( flow.edges || [] );
		setDirty( true );

		const triggerKey = generatedWf.trigger_type === 'schedule' ? 'schedule' : generatedWf.trigger_event;
		const trigDef = triggers.find( ( t ) => t.key === triggerKey );
		if ( trigDef && trigDef.available === false ) {
			const req = trigDef.requires_label || trigDef.requires_plugin || __( 'Plugin', 'ai-marketing-expert' );
			toast(
				sprintf(
					__( 'Workflow generated as Draft! ⚠️ Note: %s is not installed or active on this site. Please install %s to activate.', 'ai-marketing-expert' ),
					req,
					req
				),
				'warning'
			);
		} else {
			toast(
				__( 'Workflow successfully generated by AI! Review your steps and click Save.', 'ai-marketing-expert' ),
				'success'
			);
		}
	}, [ triggers, setNodes, setEdges ] );

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
	const issues = useMemo(
		() => validate( nodes || [], edges || [], actionsByType, triggers, wf ),
		[ nodes, edges, actionsByType, triggers, wf ]
	);
	const invalidNodeIds = useMemo(
		() => new Set( ( issues || [] ).filter( ( i ) => i.nodeId ).map( ( i ) => i.nodeId ) ),
		[ issues ]
	);

	/* -------------------------------------------------------------- save */
	const save = async () => {
		if ( ! wf.name.trim() ) {
			toast( __( 'Please give the workflow a name.', 'ai-marketing-expert' ), 'warning' );
			return;
		}

		const isActivating = wf.status === 'active';
		const dependencyIssues = issues.filter(
			( i ) => i.message.includes( 'requires' ) || i.message.includes( 'not installed' )
		);

		// If activating, any dependency issues strictly block activation!
		if ( isActivating && dependencyIssues.length ) {
			toast( dependencyIssues[ 0 ].message, 'error' );
			return;
		}

		// Missing-required-field or dependency issues only block saving when activating;
		// drafts can be saved incomplete. Structural issues always block.
		const blocking = isActivating
			? issues
			: issues.filter(
				( i ) => ! i.nodeId || ( ! i.message.startsWith( 'Missing required field' ) && ! i.message.includes( 'not installed' ) && ! i.message.includes( 'requires' ) )
			);

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

			if ( ! isActivating && dependencyIssues.length ) {
				toast(
					__( 'Saved as draft. ⚠️ Note: Required plugin must be activated before activating this workflow.', 'ai-marketing-expert' ),
					'warning'
				);
			} else {
				toast( __( 'Workflow saved.', 'ai-marketing-expert' ), 'success' );
			}
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
		finishedRef.current = null;
		let inFlight = false;
		pollRef.current = setInterval( async () => {
			if ( inFlight ) {
				return; // Previous tick still waiting; don't stack requests.
			}
			inFlight = true;
			try {
				const res = await apiGet( `/workflow-automation/executions/${ executionId }` );
				const exec = res?.execution;
				if ( ! exec ) {
					return;
				}
				setRunState( { executionId, status: exec.status, outputs: exec.outputs || [] } );
				if ( ! [ 'queued', 'running' ].includes( exec.status ) ) {
					if ( pollRef.current ) {
						clearInterval( pollRef.current );
						pollRef.current = null;
					}
					// One finish notice per execution, whichever tick gets here first.
					if ( finishedRef.current !== executionId ) {
						finishedRef.current = executionId;
						toast(
							exec.status === 'success'
								? __( 'Workflow run finished successfully.', 'ai-marketing-expert' )
								: `${ __( 'Workflow run finished:', 'ai-marketing-expert' ) } ${ exec.status }`,
							exec.status === 'success' ? 'success' : 'warning'
						);
					}
				}
			} catch ( e ) { /* transient poll errors are ignored */ } finally {
				inFlight = false;
			}
		}, 3000 );
	}, [] );

	const queueRun = useCallback( async ( event = null ) => {
		setQueuing( true );
		setRunState( null ); // Drop the previous run's result so the UI reads as "starting".
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
		} finally {
			setQueuing( false );
		}
	}, [ id, pollExecution ] );

	const runNow = async () => {
		if ( queuing || ( runState && [ 'queued', 'running' ].includes( runState.status ) ) ) {
			return; // Already starting or in progress.
		}
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

	const displayNodes = useMemo( () => ( nodes || [] ).map( ( n ) => {
		if ( n.id === 'trigger' ) {
			const triggerKey = wf.trigger_type === 'schedule' ? 'schedule' : wf.trigger_event;
			const def = triggers.find( ( t ) => t.key === triggerKey );
			const isAvailable = def?.available !== false;
			return {
				...n,
				deletable: false,
				data: {
					...n.data,
					triggerKey,
					available: isAvailable,
					requires_label: def?.requires_label || '',
					label: def?.label || __( 'Trigger', 'ai-marketing-expert' ),
					summary: triggerSummary( wf, triggers ),
					invalid: ! isAvailable || invalidNodeIds.has( 'trigger' ),
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
		return <Loader variant="form" />;
	}

	const selectedNode = selectedId ? displayNodes.find( ( n ) => n.id === selectedId ) : null;
	const running = queuing || ( runState && [ 'queued', 'running' ].includes( runState.status ) );

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
					{ ! hasPro && (
						<span
							className="aime-wf-step-meter"
							title={ __( 'Free plan step limit per workflow. Upgrade to Pro for unlimited steps.', 'ai-marketing-expert' ) }
						>
							{ sprintf(
								/* translators: 1: steps used, 2: free step limit */
								__( 'Free plan: %1$d of %2$d steps used', 'ai-marketing-expert' ),
								( nodes || [] ).filter( ( n ) => n.id !== 'trigger' ).length,
								stepLimit
							) }
						</span>
					) }
				</div>
				<div className="aime-wf-topbar__right">
					<Button
						variant="secondary"
						className="aime-btn-ai-autopilot"
						onClick={ () => setAiModalOpen( true ) }
					>
						{ __( '✨ Create with AI', 'ai-marketing-expert' ) }
					</Button>
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
						<LoadingBtn>
							{ queuing && ! runState
								? __( 'Starting…', 'ai-marketing-expert' )
								: __( 'Running…', 'ai-marketing-expert' ) }
						</LoadingBtn>
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

			<div className="aime-wf-layout">
				<NodePalette actions={ actions } hasPro={ hasPro } onAdd={ addAction } />
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
					tagSuggestions={ wpTags }
					brandVoices={ brandVoices }
					nodes={ nodes }
					edges={ edges }
				/>
			</div>

			<AiWorkflowModal
				open={ aiModalOpen }
				onClose={ () => setAiModalOpen( false ) }
				onGenerate={ handleAiGenerated }
				brandVoices={ brandVoices }
			/>

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
