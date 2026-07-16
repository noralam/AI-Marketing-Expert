/**
 * Graph helpers — convert between the saved step list (parent_key tree)
 * and @xyflow/react nodes/edges. The canvas is the source of truth.
 */

const Y_GAP = 160;
const X_GAP = 240;

/** Generate a client-side step key (uuid-ish, backend re-keys on template apply only). */
export const newStepKey = () =>
	'k' + Date.now().toString( 36 ) + Math.random().toString( 36 ).slice( 2, 8 );

/**
 * Convert saved steps into React Flow nodes + edges.
 *
 * @param {Array}  steps    Saved steps (step_key/parent_key/branch/position_x/position_y…).
 * @param {Object} workflow Workflow row (for the trigger node data).
 * @return {{nodes: Array, edges: Array}}
 */
export const stepsToFlow = ( steps, workflow ) => {
	const roots = ( steps || [] ).filter( ( s ) => ! s.parent_key );
	const trigger = {
		id: 'trigger',
		type: 'trigger',
		deletable: false,
		position: {
			x: roots.length ? Number( roots[ 0 ].position_x ) || 0 : 0,
			y: roots.length ? ( Number( roots[ 0 ].position_y ) || 0 ) - Y_GAP : 0,
		},
		data: {},
	};

	const nodes = [ trigger ];
	const edges = [];

	( steps || [] ).forEach( ( s ) => {
		const key = s.step_key || newStepKey();
		nodes.push( {
			id: key,
			type: s.action_type === 'condition' ? 'condition' : 'action',
			position: { x: Number( s.position_x ) || 0, y: Number( s.position_y ) || 0 },
			data: {
				step: {
					id: s.id,
					action_type: s.action_type,
					config: s.config || {},
					tone_override: s.tone_override || '',
					run_condition: s.run_condition || 'always',
				},
			},
		} );
		const source = s.parent_key || 'trigger';
		const branch = s.branch === 'yes' || s.branch === 'no' ? s.branch : null;
		edges.push( {
			id: `e-${ source }-${ key }`,
			source,
			target: key,
			sourceHandle: branch,
			label: branch || undefined,
			animated: true,
		} );
	} );

	// Auto-layout only when every stored position is 0 (fresh/template graphs).
	const allZero = ( steps || [] ).length > 0 && ( steps || [] ).every(
		( s ) => ! Number( s.position_x ) && ! Number( s.position_y )
	);
	return { nodes: allZero ? autoLayout( nodes, edges ) : nodes, edges };
};

/**
 * Convert canvas nodes/edges back into the saved step shape.
 * Inbound edge → parent_key; edge sourceHandle 'yes'/'no' → branch;
 * step_order = sibling index sorted by y.
 */
export const flowToSteps = ( nodes, edges ) => {
	const inbound = {};
	( edges || [] ).forEach( ( e ) => {
		inbound[ e.target ] = e;
	} );

	const stepNodes = ( nodes || [] ).filter( ( n ) => n.id !== 'trigger' );

	// Group siblings by parent to compute step_order (sorted by y).
	const siblings = {};
	stepNodes.forEach( ( n ) => {
		const edge = inbound[ n.id ];
		const parent = edge && edge.source !== 'trigger' ? edge.source : '';
		( siblings[ parent ] = siblings[ parent ] || [] ).push( n );
	} );
	const orderOf = {};
	Object.values( siblings ).forEach( ( group ) => {
		group
			.slice()
			.sort( ( a, b ) => a.position.y - b.position.y || a.position.x - b.position.x )
			.forEach( ( n, i ) => {
				orderOf[ n.id ] = i;
			} );
	} );

	return stepNodes.map( ( n ) => {
		const edge = inbound[ n.id ];
		const step = n.data?.step || {};
		return {
			id: step.id || 0,
			step_key: n.id,
			parent_key: edge && edge.source !== 'trigger' ? edge.source : '',
			branch: edge && ( edge.sourceHandle === 'yes' || edge.sourceHandle === 'no' ) ? edge.sourceHandle : 'default',
			step_order: orderOf[ n.id ] || 0,
			position_x: Math.round( n.position.x ),
			position_y: Math.round( n.position.y ),
			action_type: step.action_type,
			config: step.config || {},
			tone_override: step.tone_override || '',
			run_condition: step.run_condition || 'always',
		};
	} );
};

/**
 * Validate the graph. Returns an array of { nodeId, message } issues
 * (empty array = valid).
 *
 * @param {Array}  nodes         Canvas nodes.
 * @param {Array}  edges         Canvas edges.
 * @param {Object} actionsByType Optional map of action type → action def (for required fields).
 */
export const validate = ( nodes, edges, actionsByType = {} ) => {
	const issues = [];
	const triggers = ( nodes || [] ).filter( ( n ) => n.id === 'trigger' || n.type === 'trigger' );
	if ( triggers.length !== 1 ) {
		issues.push( { nodeId: null, message: 'The workflow must have exactly one trigger.' } );
	}

	// Max one inbound edge per node (tree constraint).
	const inCount = {};
	( edges || [] ).forEach( ( e ) => {
		inCount[ e.target ] = ( inCount[ e.target ] || 0 ) + 1;
	} );
	Object.keys( inCount ).forEach( ( id ) => {
		if ( inCount[ id ] > 1 ) {
			issues.push( { nodeId: id, message: 'A step can only have one incoming connection.' } );
		}
	} );
	if ( inCount.trigger ) {
		issues.push( { nodeId: 'trigger', message: 'The trigger cannot have incoming connections.' } );
	}

	// Cycle check + reachability from the trigger.
	const children = {};
	( edges || [] ).forEach( ( e ) => {
		( children[ e.source ] = children[ e.source ] || [] ).push( e.target );
	} );
	const visited = new Set();
	const stack = new Set();
	let hasCycle = false;
	const dfs = ( id ) => {
		if ( stack.has( id ) ) {
			hasCycle = true;
			return;
		}
		if ( visited.has( id ) ) {
			return;
		}
		visited.add( id );
		stack.add( id );
		( children[ id ] || [] ).forEach( dfs );
		stack.delete( id );
	};
	dfs( 'trigger' );
	if ( hasCycle ) {
		issues.push( { nodeId: null, message: 'The workflow contains a loop. Remove the circular connection.' } );
	}

	( nodes || [] ).forEach( ( n ) => {
		if ( n.id === 'trigger' ) {
			return;
		}
		if ( ! visited.has( n.id ) ) {
			issues.push( { nodeId: n.id, message: 'This step is not connected to the trigger.' } );
		}
		// Required config fields.
		const step = n.data?.step;
		const def = step ? actionsByType[ step.action_type ] : null;
		( def?.fields || [] ).forEach( ( f ) => {
			if ( ! f.required ) {
				return;
			}
			const v = step.config?.[ f.key ] ?? f.default ?? '';
			// 0/'0' count as empty: required selects (funnel, account) use 0 for "none chosen".
			if ( v === '' || v === null || v === undefined || v === 0 || v === '0' ) {
				issues.push( { nodeId: n.id, message: `Missing required field: ${ f.label || f.key }.` } );
			}
		} );
	} );

	return issues;
};

/**
 * Simple tree layout: y = depth * Y_GAP, siblings spread by subtree width.
 * Returns a new nodes array with updated positions.
 */
export const autoLayout = ( nodes, edges ) => {
	const children = {};
	( edges || [] ).forEach( ( e ) => {
		( children[ e.source ] = children[ e.source ] || [] ).push( e.target );
	} );

	const width = ( id ) => {
		const kids = children[ id ] || [];
		if ( ! kids.length ) {
			return 1;
		}
		return kids.reduce( ( sum, k ) => sum + width( k ), 0 );
	};

	const positions = {};
	const place = ( id, depth, left ) => {
		const w = width( id );
		positions[ id ] = { x: ( left + w / 2 ) * X_GAP, y: depth * Y_GAP };
		let offset = left;
		( children[ id ] || [] ).forEach( ( k ) => {
			place( k, depth + 1, offset );
			offset += width( k );
		} );
	};
	place( 'trigger', 0, 0 );

	return ( nodes || [] ).map( ( n ) =>
		positions[ n.id ] ? { ...n, position: positions[ n.id ] } : n
	);
};
