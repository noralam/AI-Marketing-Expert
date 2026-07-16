/**
 * WorkflowCanvas — the @xyflow/react canvas for the workflow builder.
 * Nodes/edges live in the parent (WorkflowBuilder); this component wires
 * the flow surface, drag-from-palette drops, and delete keys.
 */

import { useCallback, useRef } from '@wordpress/element';
import {
	ReactFlow, Background, Controls, MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import ConditionNode from './nodes/ConditionNode';

const nodeTypes = { trigger: TriggerNode, action: ActionNode, condition: ConditionNode };

export const PALETTE_MIME = 'application/aime-wf-action';

const WorkflowCanvas = ( {
	nodes,
	edges,
	onNodesChange,
	onEdgesChange,
	onConnect,
	onSelectionChange,
	onDropAction,
} ) => {
	const rfInstance = useRef( null );

	const onDragOver = useCallback( ( event ) => {
		if ( event.dataTransfer.types.includes( PALETTE_MIME ) ) {
			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';
		}
	}, [] );

	const onDrop = useCallback( ( event ) => {
		const actionType = event.dataTransfer.getData( PALETTE_MIME );
		if ( ! actionType ) {
			return;
		}
		event.preventDefault();
		const position = rfInstance.current
			? rfInstance.current.screenToFlowPosition( { x: event.clientX, y: event.clientY } )
			: { x: 0, y: 0 };
		onDropAction( actionType, position );
	}, [ onDropAction ] );

	return (
		<div className="aime-wf-canvas">
			<ReactFlow
				nodes={ nodes }
				edges={ edges }
				onNodesChange={ onNodesChange }
				onEdgesChange={ onEdgesChange }
				onConnect={ onConnect }
				onSelectionChange={ onSelectionChange }
				nodeTypes={ nodeTypes }
				deleteKeyCode={ [ 'Backspace', 'Delete' ] }
				fitView
				onInit={ ( instance ) => {
					rfInstance.current = instance;
				} }
				onDragOver={ onDragOver }
				onDrop={ onDrop }
				proOptions={ { hideAttribution: true } }
			>
				<Background gap={ 16 } size={ 1 } />
				<Controls />
				<MiniMap nodeStrokeWidth={ 3 } pannable zoomable />
			</ReactFlow>
		</div>
	);
};

export default WorkflowCanvas;
