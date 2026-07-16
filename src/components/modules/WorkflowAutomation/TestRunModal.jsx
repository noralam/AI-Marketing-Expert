/**
 * TestRunModal — collects a sample event payload before manually running
 * an event-triggered workflow. Real runs get this data from the trigger;
 * manual runs would otherwise execute with an empty event and fail steps
 * that read from it (e.g. subscriber email).
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const TestRunModal = ( { trigger, workflowName, onRun, onCancel } ) => {
	const fields = trigger?.payload_fields || [];
	const [ values, setValues ] = useState( {} );

	const submit = () => {
		const event = {};
		fields.forEach( ( f ) => {
			const v = ( values[ f.key ] || '' ).trim();
			if ( v !== '' ) {
				event[ f.key ] = v;
			}
		} );
		onRun( event );
	};

	return (
		<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) onCancel(); } }>
			<div className="aime-premium-modal" style={ { width: '480px' } }>
				<div className="aime-premium-modal-header">
					<h3>
						<span className="aime-premium-modal-icon">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
						</span>
						{ __( 'Test run', 'ai-marketing-expert' ) }
					</h3>
					<button className="aime-modal-close" onClick={ onCancel }>&times;</button>
				</div>
				<div className="aime-premium-modal-body">
					<p style={ { marginTop: 0, fontSize: 13, color: 'var(--aime-text)', lineHeight: 1.6 } }>
						{ __( 'This workflow normally runs when its trigger event fires and receives data from that event. Enter sample values below so the test run behaves like a real one — steps that rely on missing values may fail or be skipped.', 'ai-marketing-expert' ) }
						{ trigger?.label ? ` (${ __( 'Trigger:', 'ai-marketing-expert' ) } ${ trigger.label })` : '' }
					</p>
					{ fields.map( ( f ) => (
						<div key={ f.key } style={ { marginBottom: 12 } }>
							<label style={ { display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 4 } } htmlFor={ `aime-test-run-${ f.key }` }>
								{ f.label || f.key }
							</label>
							<input
								id={ `aime-test-run-${ f.key }` }
								type="text"
								style={ { width: '100%' } }
								value={ values[ f.key ] || '' }
								onChange={ ( e ) => setValues( ( prev ) => ( { ...prev, [ f.key ]: e.target.value } ) ) }
							/>
						</div>
					) ) }
					{ fields.length === 0 && (
						<p style={ { fontSize: 13, color: '#787c82' } }>
							{ __( 'This trigger has no sample fields; the workflow will run with an empty event payload.', 'ai-marketing-expert' ) }
						</p>
					) }
				</div>
				<div className="aime-premium-modal-footer">
					<button className="aime-btn-cancel" onClick={ onCancel }>{ __( 'Cancel', 'ai-marketing-expert' ) }</button>
					<button className="aime-btn-primary" onClick={ submit }>
						{ workflowName
							? `${ __( 'Run', 'ai-marketing-expert' ) } "${ workflowName }"`
							: __( 'Run now', 'ai-marketing-expert' ) }
					</button>
				</div>
			</div>
		</div>
	);
};

export default TestRunModal;
