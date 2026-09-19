/**
 * TriggerNode — the single, non-deletable entry node (id 'trigger').
 * Shows the trigger label plus a schedule/event summary.
 */

import { __, sprintf } from '@wordpress/i18n';
import { Handle, Position } from '@xyflow/react';
import { triggerIcon } from '../utils/icons';

const TriggerNode = ( { data, selected } ) => {
	const isInvalid = data.available === false || data.invalid;
	const classes = [
		'aime-wf-node',
		'aime-wf-node--trigger',
		selected ? 'is-selected' : '',
		isInvalid ? 'aime-wf-node--invalid' : '',
	].filter( Boolean ).join( ' ' );

	const summaryText = data.available === false && data.requires_label
		? sprintf( __( '⚠️ Requires %s (not installed)', 'ai-marketing-expert' ), data.requires_label )
		: ( data.summary || '—' );

	return (
		<div className={ classes }>
			<div className="aime-wf-node__icon">{ triggerIcon( data.triggerKey ) }</div>
			<div className="aime-wf-node__body">
				<strong>{ data.label || __( 'Trigger', 'ai-marketing-expert' ) }</strong>
				<span className="aime-wf-node__summary" title={ summaryText }>
					{ summaryText }
				</span>
			</div>
			{ isInvalid && (
				<span
					className="aime-wf-node__badge aime-wf-node__badge--invalid"
					title={
						data.available === false && data.requires_label
							? sprintf( __( 'Requires %s which is not installed or active on this site.', 'ai-marketing-expert' ), data.requires_label )
							: __( 'This trigger has configuration or dependency issues.', 'ai-marketing-expert' )
					}
				>
					!
				</span>
			) }
			<Handle type="source" position={ Position.Bottom } />
		</div>
	);
};

export default TriggerNode;
