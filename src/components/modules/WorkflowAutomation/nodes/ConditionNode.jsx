/**
 * ConditionNode — Pro branching step with two labeled source handles
 * (id "yes" / id "no").
 */

import { __ } from '@wordpress/i18n';
import { Handle, Position } from '@xyflow/react';
import ProBadge from '../../../Layout/ProBadge';
import { actionIcon } from '../utils/icons';

const ConditionNode = ( { data, selected } ) => {
	const classes = [
		'aime-wf-node',
		'aime-wf-node--condition',
		selected ? 'is-selected' : '',
		data.runStatus ? `aime-wf-node--run-${ data.runStatus }` : '',
	].filter( Boolean ).join( ' ' );

	return (
		<div className={ classes }>
			<Handle type="target" position={ Position.Top } />
			<div className="aime-wf-node__icon">{ actionIcon( 'condition' ) }</div>
			<div className="aime-wf-node__body">
				<strong>{ data.label || __( 'Condition', 'ai-marketing-expert' ) }</strong>
				<span className="aime-wf-node__summary">{ data.summary || '—' }</span>
			</div>
			{ data.locked && <ProBadge /> }
			{ data.invalid && (
				<span className="aime-wf-node__badge aime-wf-node__badge--invalid" title={ __( 'This step has configuration issues.', 'ai-marketing-expert' ) }>!</span>
			) }
			<Handle id="yes" type="source" position={ Position.Bottom } className="aime-wf-handle-yes" style={ { left: '30%' } } />
			<Handle id="no" type="source" position={ Position.Bottom } className="aime-wf-handle-no" style={ { left: '70%' } } />
			<span className="aime-wf-branch-label aime-wf-branch-label--yes">{ __( 'Yes', 'ai-marketing-expert' ) }</span>
			<span className="aime-wf-branch-label aime-wf-branch-label--no">{ __( 'No', 'ai-marketing-expert' ) }</span>
		</div>
	);
};

export default ConditionNode;
