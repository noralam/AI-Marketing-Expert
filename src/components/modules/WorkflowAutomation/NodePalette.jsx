/**
 * NodePalette — horizontal draggable/clickable action bar above the canvas,
 * grouped by module. Unavailable actions are greyed with a tooltip; Pro
 * actions are locked on the free plan.
 */

import { __ } from '@wordpress/i18n';
import ProBadge from '../../Layout/ProBadge';
import { openProUpgrade, proFeatureMessage } from '../../common/ProLock';
import { toast } from '../../common/Toast';
import { actionIcon } from './utils/icons';
import { PALETTE_MIME } from './WorkflowCanvas';

const NodePalette = ( { actions, hasPro, onAdd } ) => {
	const groups = {};
	( actions || [] ).forEach( ( a ) => {
		const mod = a.module || __( 'General', 'ai-marketing-expert' );
		( groups[ mod ] = groups[ mod ] || [] ).push( a );
	} );

	const handleClick = ( a ) => {
		if ( a.is_pro && ! hasPro ) {
			toast( proFeatureMessage(), 'warning' );
			openProUpgrade();
			return;
		}
		if ( a.available === false ) {
			return;
		}
		onAdd( a.type );
	};

	return (
		<div className="aime-wf-palette">
			<div className="aime-wf-palette__intro">
				<h3 className="aime-wf-palette__title">{ __( 'Steps', 'ai-marketing-expert' ) }</h3>
				<p className="aime-wf-palette__hint">{ __( 'Drag onto the canvas or click to add.', 'ai-marketing-expert' ) }</p>
			</div>
			<div className="aime-wf-palette__groups">
				{ Object.entries( groups ).map( ( [ mod, items ] ) => (
					<div key={ mod } className="aime-wf-palette__group">
						<div className="aime-wf-palette__group-label">{ mod }</div>
						<div className="aime-wf-palette__group-items">
							{ items.map( ( a ) => {
								const locked = a.is_pro && ! hasPro;
								const unavailable = a.available === false;
								const draggable = ! locked && ! unavailable;
								return (
									<button
										key={ a.type }
										type="button"
										className={ `aime-wf-palette__item${ unavailable ? ' is-unavailable' : '' }${ locked ? ' is-locked' : '' }` }
										title={
											unavailable
												? __( 'The module for this action is not active.', 'ai-marketing-expert' )
												: a.description || a.label
										}
										draggable={ draggable }
										onDragStart={ ( e ) => {
											e.dataTransfer.setData( PALETTE_MIME, a.type );
											e.dataTransfer.effectAllowed = 'move';
										} }
										onClick={ () => handleClick( a ) }
									>
										<span className="aime-wf-palette__icon">{ actionIcon( a.type ) }</span>
										<span className="aime-wf-palette__label">{ a.label }</span>
										{ locked && <ProBadge /> }
									</button>
								);
							} ) }
						</div>
					</div>
				) ) }
			</div>
		</div>
	);
};

export default NodePalette;
