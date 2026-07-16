/**
 * TriggerNode — the single, non-deletable entry node (id 'trigger').
 * Shows the trigger label plus a schedule/event summary.
 */

import { __ } from '@wordpress/i18n';
import { Handle, Position } from '@xyflow/react';
import { triggerIcon } from '../utils/icons';

const TriggerNode = ( { data, selected } ) => (
	<div className={ `aime-wf-node aime-wf-node--trigger${ selected ? ' is-selected' : '' }` }>
		<div className="aime-wf-node__icon">{ triggerIcon( data.triggerKey ) }</div>
		<div className="aime-wf-node__body">
			<strong>{ data.label || __( 'Trigger', 'ai-marketing-expert' ) }</strong>
			<span className="aime-wf-node__summary">{ data.summary || '—' }</span>
		</div>
		<Handle type="source" position={ Position.Bottom } />
	</div>
);

export default TriggerNode;
