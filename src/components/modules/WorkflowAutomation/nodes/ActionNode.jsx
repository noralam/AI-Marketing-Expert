/**
 * ActionNode — a regular workflow step: icon, label, config summary,
 * validation badge, and a run-status ring during execution overlays.
 */

import { __ } from '@wordpress/i18n';
import { Handle, Position } from '@xyflow/react';
import { actionIcon } from '../utils/icons';

const ActionNode = ( { data, selected } ) => {
	const type = data.step?.action_type;
	const classes = [
		'aime-wf-node',
		'aime-wf-node--action',
		selected ? 'is-selected' : '',
		data.runStatus ? `aime-wf-node--run-${ data.runStatus }` : '',
	].filter( Boolean ).join( ' ' );

	return (
		<div className={ classes }>
			<Handle type="target" position={ Position.Top } />
			<div className="aime-wf-node__icon">{ actionIcon( type ) }</div>
			<div className="aime-wf-node__body">
				<strong>{ data.label || type }</strong>
				<span className="aime-wf-node__summary">{ data.summary || '—' }</span>
			</div>
			{ data.invalid && (
				<span className="aime-wf-node__badge aime-wf-node__badge--invalid" title={ __( 'This step has configuration issues.', 'ai-marketing-expert' ) }>!</span>
			) }
			<Handle type="source" position={ Position.Bottom } />
		</div>
	);
};

export default ActionNode;
