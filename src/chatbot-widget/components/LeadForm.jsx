/**
 * LeadForm — inline lead capture within chat window.
 */
import { useState, useId } from '@wordpress/element';

const LeadForm = ( { config, onSubmit, onDismiss } ) => {
	const fields = config?.fields || [ 'email' ];
	const heading = config?.heading || "We'd love to stay in touch!";
	const uid = useId();

	const [ form, setForm ] = useState( {
		email: '',
		name: '',
		phone: '',
		company: '',
	} );
	const [ submitting, setSubmitting ] = useState( false );

	const set = ( key, val ) => setForm( ( p ) => ( { ...p, [ key ]: val } ) );

	const handleSubmit = async ( e ) => {
		e.preventDefault();
		if ( fields.includes( 'email' ) && ! form.email ) return;
		setSubmitting( true );
		try {
			await onSubmit( form );
		} finally {
			setSubmitting( false );
		}
	};

	return (
		<div className="aime-chat-lead">
			<p className="aime-chat-lead-heading">{ heading }</p>
			<form className="aime-chat-lead-form" onSubmit={ handleSubmit }>
				{ fields.includes( 'name' ) && (
					<input
						id={ `aime-lead-name-${ uid }` }
						name="aime_lead_name"
						autoComplete="name"
						className="aime-chat-lead-input"
						type="text"
						placeholder="Your name"
						value={ form.name }
						onChange={ ( e ) => set( 'name', e.target.value ) }
					/>
				) }
				{ fields.includes( 'email' ) && (
					<input
						id={ `aime-lead-email-${ uid }` }
						name="aime_lead_email"
						autoComplete="email"
						className="aime-chat-lead-input"
						type="email"
						placeholder="Your email *"
						required
						value={ form.email }
						onChange={ ( e ) => set( 'email', e.target.value ) }
					/>
				) }
				{ fields.includes( 'phone' ) && (
					<input
						id={ `aime-lead-phone-${ uid }` }
						name="aime_lead_phone"
						autoComplete="tel"
						className="aime-chat-lead-input"
						type="tel"
						placeholder="Phone number"
						value={ form.phone }
						onChange={ ( e ) => set( 'phone', e.target.value ) }
					/>
				) }
				{ fields.includes( 'company' ) && (
					<input
						id={ `aime-lead-company-${ uid }` }
						name="aime_lead_company"
						autoComplete="organization"
						className="aime-chat-lead-input"
						type="text"
						placeholder="Company"
						value={ form.company }
						onChange={ ( e ) => set( 'company', e.target.value ) }
					/>
				) }
				<div className="aime-chat-lead-actions">
					<button
						type="submit"
						className="aime-chat-lead-submit"
						disabled={ submitting }
					>
						{ submitting ? 'Sending…' : 'Submit' }
					</button>
					{ onDismiss && (
						<button
							type="button"
							className="aime-chat-lead-dismiss"
							onClick={ onDismiss }
						>
							No thanks
						</button>
					) }
				</div>
			</form>
		</div>
	);
};

export default LeadForm;
