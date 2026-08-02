/**
 * TemplatePicker — card grid shown for "New Workflow": a blank workflow
 * card first, then the templates library (some free, most Pro).
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { apiGet, apiPost } from '../../../utils/api';
import { toast } from '../../common/Toast';
import Loader from '../../common/Loader';
import ProBadge from '../../Layout/ProBadge';
import { isProActive } from '../../common/ProLock';
import { Button } from '../../common/WpComponents';
import { triggerIcon } from './utils/icons';

const TemplatePicker = ( { onBack, onNavigate } ) => {
	const hasPro = isProActive();
	const [ loading, setLoading ] = useState( true );
	const [ templates, setTemplates ] = useState( [] );
	const [ applyingId, setApplyingId ] = useState( null );

	const load = useCallback( async () => {
		setLoading( true );
		try {
			const res = await apiGet( '/workflow-automation/templates' );
			setTemplates( res?.templates || [] );
		} catch ( e ) {
			toast( e?.message || __( 'Failed to load templates.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setLoading( false );
		}
	}, [] );

	useEffect( () => {
		load();
	}, [ load ] );

	const apply = async ( tpl ) => {
		setApplyingId( tpl.id );
		try {
			const res = await apiPost( `/workflow-automation/templates/${ tpl.id }/apply` );
			if ( res?.workflow_id ) {
				onNavigate( 'edit-workflow', { id: res.workflow_id } );
			}
		} catch ( e ) {
			toast( e?.message || __( 'Could not apply this template.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setApplyingId( null );
		}
	};

	if ( loading ) {
		return <Loader />;
	}

	return (
		<div className="aime-wf-templates">
			<div className="aime-page-header" style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } }>
				<h2 style={ { margin: 0 } }>{ __( 'New Workflow', 'ai-marketing-expert' ) }</h2>
				<Button variant="tertiary" onClick={ onBack }>{ __( 'Back', 'ai-marketing-expert' ) }</Button>
			</div>

			<div className="aime-wf-template-grid">
				<button
					type="button"
					className="aime-wf-template-card aime-wf-template-card--blank"
					onClick={ () => onNavigate( 'edit-workflow' ) }
				>
					<span className="aime-wf-template-card__icon">➕</span>
					<strong>{ __( 'Blank workflow', 'ai-marketing-expert' ) }</strong>
					<span className="aime-wf-template-card__desc">
						{ __( 'Start from scratch on an empty canvas.', 'ai-marketing-expert' ) }
					</span>
				</button>

				{ templates.map( ( tpl ) => {
					const locked = tpl.is_pro && ! hasPro;
					const unavailable = tpl.available === false;
					return (
						<button
							key={ tpl.id }
							type="button"
							className={ `aime-wf-template-card${ unavailable ? ' is-unavailable' : '' }` }
							title={ unavailable ? __( 'Requires modules that are not active.', 'ai-marketing-expert' ) : tpl.description }
							disabled={ applyingId === tpl.id }
							onClick={ () => apply( tpl ) }
						>
							<span className="aime-wf-template-card__icon">{ triggerIcon( tpl.trigger_event || tpl.trigger_type ) }</span>
							<strong>
								{ tpl.name }
								{ locked && <ProBadge /> }
							</strong>
							<span className="aime-wf-template-card__desc">{ tpl.description }</span>
							<span className="aime-wf-template-card__meta">
								{ sprintf(
									/* translators: %d: number of steps */
									__( '%d steps', 'ai-marketing-expert' ),
									tpl.steps_count
								) }
								{ applyingId === tpl.id && ` · ${ __( 'Creating…', 'ai-marketing-expert' ) }` }
								{ locked && ` · ${ __( 'Pro', 'ai-marketing-expert' ) }` }
							</span>
						</button>
					);
				} ) }
			</div>
		</div>
	);
};

export default TemplatePicker;
