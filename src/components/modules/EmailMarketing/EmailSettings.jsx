/**
 * EmailSettings - general settings, custom fields management.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button, TextControl, TextareaControl, CheckboxControl, ToggleControl, TabPanel, Spinner,
} from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';

const EmailSettings = () => {
	const { get, post, del, loading, error, clearError } = useApi();
	const [ settings, setSettings ] = useState( {} );
	const [ customFields, setCustomFields ] = useState( [] );
	const [ saving, setSaving ] = useState( false );
	const [ success, setSuccess ] = useState( '' );

	/* Sending & Tracking (from global plugin settings) */
	const [ pluginSettings, setPluginSettings ] = useState( {} );
	const [ savingPlugin, setSavingPlugin ] = useState( false );

	/* Custom field modal */
	const [ showCfModal, setShowCfModal ] = useState( false );
	const [ cfForm, setCfForm ] = useState( { label: '', field_key: '', field_type: 'text', options: '' } );
	const [ cfEditId, setCfEditId ] = useState( null );

	const fetchAll = useCallback( async () => {
		try {
			const [ s, cf, ps ] = await Promise.all( [
				get( '/email/settings' ),
				get( '/email/custom-fields' ),
				get( '/settings' ),
			] );
			setSettings( s || {} );
			setCustomFields( cf.data || cf || [] );
			setPluginSettings( ps.settings || {} );
		} catch ( e ) { /* */ }
	}, [ get ] );

	useEffect( () => { fetchAll(); }, [ fetchAll ] );

	/* General settings */
	const handleSaveSettings = async () => {
		setSaving( true );
		setSuccess( '' );
		try {
			await post( '/email/settings', settings );
			setPluginSettings( ( prev ) => ( { ...prev, double_optin: !! settings.double_optin } ) );
			setSuccess( __( 'Settings saved.', 'ai-marketing-expert' ) );
		} catch ( e ) { /* */ }
		setSaving( false );
	};

	/* Sending & Tracking (plugin-level settings) */
	const handlePluginChange = ( key, value ) => {
		setPluginSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};
	const isEnabledByDefault = ( key ) => pluginSettings[ key ] === undefined ? true : !! pluginSettings[ key ];

	const handleSavePluginSettings = async () => {
		setSavingPlugin( true );
		setSuccess( '' );
		try {
			await post( '/settings', pluginSettings );
			setSettings( ( prev ) => ( { ...prev, double_optin: !! pluginSettings.double_optin } ) );
			setSuccess( __( 'Sending & tracking settings saved.', 'ai-marketing-expert' ) );
		} catch ( e ) { /* */ }
		setSavingPlugin( false );
	};

	/* Custom fields */
	const openCfCreate = () => {
		setCfEditId( null );
		setCfForm( { label: '', field_key: '', field_type: 'text', options: '' } );
		setShowCfModal( true );
	};
	const openCfEdit = ( cf ) => {
		setCfEditId( cf.id );
		let opts = cf.options || [];
		if ( typeof opts === 'string' ) {
			try { opts = JSON.parse( opts ); } catch ( e ) { opts = []; }
		}
		setCfForm( { label: cf.label, field_key: cf.field_key, field_type: cf.field_type, options: Array.isArray( opts ) ? opts.join( ', ' ) : '' } );
		setShowCfModal( true );
	};
	const handleSaveCf = async () => {
		try {
			const payload = { ...cfForm, options: cfForm.options ? cfForm.options.split( ',' ).map( ( o ) => o.trim() ) : [] };
			if ( cfEditId ) {
				payload.id = cfEditId;
			}
			await post( '/email/custom-fields', payload );
			setShowCfModal( false );
			fetchAll();
		} catch ( e ) { /* */ }
	};
	const handleDeleteCf = async ( cfId ) => {
		if ( ! window.confirm( __( 'Delete this custom field?', 'ai-marketing-expert' ) ) ) return;
		try {
			await del( `/email/custom-fields/${ cfId }` );
			fetchAll();
		} catch ( e ) { /* */ }
	};

	const TABS = [
		{ name: 'general', title: __( 'General', 'ai-marketing-expert' ) },
		{ name: 'sending', title: __( 'Sending & Tracking', 'ai-marketing-expert' ) },
		{ name: 'custom-fields', title: __( 'Custom Fields', 'ai-marketing-expert' ) },
	];

	return (
		<div className="aime-email-settings">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ success && <Notice type="success" message={ success } dismissible onDismiss={ () => setSuccess( '' ) } /> }

			<h2>{ __( 'Email Settings', 'ai-marketing-expert' ) }</h2>

			<Card>
				{ loading ? <Loader /> : <TabPanel tabs={ TABS }>
					{ ( tab ) => {
						/* General */
						if ( tab.name === 'general' ) {
							return (
								<div className="aime-settings-form">
									<div className="aime-form-grid aime-form-grid-2">
										<TextControl label={ __( 'From Name', 'ai-marketing-expert' ) } value={ settings.from_name || '' } onChange={ ( v ) => setSettings( { ...settings, from_name: v } ) } __nextHasNoMarginBottom />
										<TextControl label={ __( 'From Email', 'ai-marketing-expert' ) } value={ settings.from_email || '' } onChange={ ( v ) => setSettings( { ...settings, from_email: v } ) } __nextHasNoMarginBottom />
										<TextControl label={ __( 'Reply-To', 'ai-marketing-expert' ) } value={ settings.reply_to || '' } onChange={ ( v ) => setSettings( { ...settings, reply_to: v } ) } __nextHasNoMarginBottom />
										<TextControl label={ __( 'Emails Per Second', 'ai-marketing-expert' ) } type="number" value={ settings.emails_per_second || 10 } onChange={ ( v ) => setSettings( { ...settings, emails_per_second: parseInt( v ) || 10 } ) } __nextHasNoMarginBottom />
										<TextControl label={ __( 'Company Name', 'ai-marketing-expert' ) } value={ settings.company_name || '' } onChange={ ( v ) => setSettings( { ...settings, company_name: v } ) } __nextHasNoMarginBottom />
										<TextControl label={ __( 'Company Address', 'ai-marketing-expert' ) } value={ settings.company_address || '' } onChange={ ( v ) => setSettings( { ...settings, company_address: v } ) } __nextHasNoMarginBottom />
									</div>
									<TextareaControl label={ __( 'Email Footer', 'ai-marketing-expert' ) } value={ settings.email_footer || '' } onChange={ ( v ) => setSettings( { ...settings, email_footer: v } ) } rows={ 3 } />
									<TextControl label={ __( 'Unsubscribe Text', 'ai-marketing-expert' ) } value={ settings.unsubscribe_text || '' } onChange={ ( v ) => setSettings( { ...settings, unsubscribe_text: v } ) } __nextHasNoMarginBottom />
									{ ( window.aimeData || {} ).hasPro && (
										<div className="aime-unsubscribe-page-settings" style={ { marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' } }>
											<p className="aime-card-description" style={ { margin: '0 0 12px' } }>
												{ __( 'Customize the page shown after someone unsubscribes. Leave blank to use the defaults.', 'ai-marketing-expert' ) }
											</p>
											<TextControl label={ __( 'Unsubscribe Page Heading', 'ai-marketing-expert' ) } value={ settings.unsubscribe_heading || '' } onChange={ ( v ) => setSettings( { ...settings, unsubscribe_heading: v } ) } __nextHasNoMarginBottom />
											<TextareaControl label={ __( 'Unsubscribe Page Message', 'ai-marketing-expert' ) } value={ settings.unsubscribe_message || '' } onChange={ ( v ) => setSettings( { ...settings, unsubscribe_message: v } ) } rows={ 3 } />
											<TextControl label={ __( 'Re-subscribe Button Text', 'ai-marketing-expert' ) } value={ settings.resubscribe_button_text || '' } onChange={ ( v ) => setSettings( { ...settings, resubscribe_button_text: v } ) } __nextHasNoMarginBottom />
										</div>
									) }
									<CheckboxControl
										label={ __( 'Enable Double Opt-in', 'ai-marketing-expert' ) }
										checked={ !! settings.double_optin }
										onChange={ ( v ) => setSettings( { ...settings, double_optin: v } ) }
									/>
									<Button variant="primary" onClick={ handleSaveSettings } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
										{ saving
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
											: __( 'Save Settings', 'ai-marketing-expert' )
										}
									</Button>
								</div>
							);
						}

						/* Sending & Tracking */
						if ( tab.name === 'sending' ) {
							return (
								<div className="aime-settings-form">
									<Card title={ __( 'Sending Configuration', 'ai-marketing-expert' ) }>
										<p className="aime-card-description" style={ { margin: '0 0 16px' } }>
											{ __( 'Batch size controls how many queued emails are attempted in one cron run. Batch interval is the waiting time between those runs, which helps protect your server and mail provider from sending too many emails at once.', 'ai-marketing-expert' ) }
										</p>
										<div className="aime-form-row">
											<TextControl
												label={ __( 'Batch Size', 'ai-marketing-expert' ) }
												value={ pluginSettings.batch_size || 50 }
												onChange={ ( v ) => handlePluginChange( 'batch_size', parseInt( v ) || 50 ) }
												type="number"
												help={ __( 'Example: 50 sends up to 50 emails each time the queue runs.', 'ai-marketing-expert' ) }
												__nextHasNoMarginBottom
											/>
											<TextControl
												label={ __( 'Batch Interval (seconds)', 'ai-marketing-expert' ) }
												value={ pluginSettings.batch_interval || 60 }
												onChange={ ( v ) => handlePluginChange( 'batch_interval', parseInt( v ) || 60 ) }
												type="number"
												help={ __( 'Example: 60 waits about one minute before the next batch can start.', 'ai-marketing-expert' ) }
												__nextHasNoMarginBottom
											/>
										</div>
									</Card>

									<Card title={ __( 'Tracking & Compliance', 'ai-marketing-expert' ) }>
										<ToggleControl
											label={ __( 'Track Opens', 'ai-marketing-expert' ) }
											checked={ isEnabledByDefault( 'track_opens' ) }
											onChange={ ( v ) => handlePluginChange( 'track_opens', v ) }
										/>
										<ToggleControl
											label={ __( 'Track Clicks', 'ai-marketing-expert' ) }
											checked={ isEnabledByDefault( 'track_clicks' ) }
											onChange={ ( v ) => handlePluginChange( 'track_clicks', v ) }
										/>
										<ToggleControl
											label={ __( 'Double Opt-In', 'ai-marketing-expert' ) }
											checked={ !! pluginSettings.double_optin }
											onChange={ ( v ) => handlePluginChange( 'double_optin', v ) }
										/>
										<ToggleControl
											label={ __( 'GDPR Mode', 'ai-marketing-expert' ) }
											checked={ !! pluginSettings.gdpr_enabled }
											onChange={ ( v ) => handlePluginChange( 'gdpr_enabled', v ) }
										/>
									</Card>

									<Button variant="primary" onClick={ handleSavePluginSettings } isBusy={ savingPlugin } disabled={ savingPlugin } style={ { marginTop: 16 } }>
										{ savingPlugin
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
											: __( 'Save Settings', 'ai-marketing-expert' )
										}
									</Button>
								</div>
							);
						}

						/* Custom Fields */
						if ( tab.name === 'custom-fields' ) {
							return (
								<>
									<div className="aime-cf-info">
										<p className="aime-card-description" style={ { margin: '0 0 12px' } }>
											{ __( 'Custom fields let you store extra information on each subscriber \u2014 such as phone number, company, birthday, or any data unique to your business. These fields appear when editing a subscriber profile and help you build richer contact records.', 'ai-marketing-expert' ) }
										</p>
										<div className="aime-cf-how-it-works">
											<strong>{ __( 'How it works:', 'ai-marketing-expert' ) }</strong>
											<ul>
												<li>{ __( 'Create a field below with a label, slug, and type (text, number, date, select, etc.)', 'ai-marketing-expert' ) }</li>
												<li>{ __( 'The field automatically appears in every subscriber\'s edit form', 'ai-marketing-expert' ) }</li>
												<li>{ __( 'Values are saved per subscriber and available for AI-powered segment suggestions', 'ai-marketing-expert' ) }</li>
												<li>{ __( 'Use select or radio types with predefined options for consistent data entry', 'ai-marketing-expert' ) }</li>
											</ul>
										</div>
									</div>

									<div style={ { marginBottom: 16 } }>
										<Button variant="primary" onClick={ openCfCreate }>{ __( '+ New Custom Field', 'ai-marketing-expert' ) }</Button>
									</div>
									{ customFields.length === 0 && <p className="aime-empty-msg">{ __( 'No custom fields defined.', 'ai-marketing-expert' ) }</p> }
									{ customFields.length > 0 && (
										<table className="aime-table">
											<thead>
												<tr>
													<th>{ __( 'Label', 'ai-marketing-expert' ) }</th>
													<th>{ __( 'Slug', 'ai-marketing-expert' ) }</th>
													<th>{ __( 'Type', 'ai-marketing-expert' ) }</th>
													<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
												</tr>
											</thead>
											<tbody>
												{ customFields.map( ( cf ) => (
													<tr key={ cf.id }>
														<td>{ cf.label }</td>
														<td><code>{ cf.field_key }</code></td>
														<td>{ cf.field_type }</td>
														<td className="aime-actions">
															<Button variant="tertiary" size="small" onClick={ () => openCfEdit( cf ) }>{ __( 'Edit', 'ai-marketing-expert' ) }</Button>
															<Button isDestructive variant="tertiary" size="small" onClick={ () => handleDeleteCf( cf.id ) }>{ __( 'Delete', 'ai-marketing-expert' ) }</Button>
														</td>
													</tr>
												) ) }
											</tbody>
										</table>
									) }

									{ showCfModal && (
										<div className="aime-premium-modal-overlay" onClick={ () => setShowCfModal( false ) }>
											<div className="aime-premium-modal" style={ { maxWidth: 520 } } onClick={ ( e ) => e.stopPropagation() }>
												<div className="aime-premium-modal-header">
													<div>
														<h3>{ cfEditId ? __( 'Edit Custom Field', 'ai-marketing-expert' ) : __( 'New Custom Field', 'ai-marketing-expert' ) }</h3>
													</div>
													<button className="aime-premium-modal-close" onClick={ () => setShowCfModal( false ) }>&times;</button>
												</div>
												<div className="aime-premium-modal-body">
													<div className="aime-premium-form-row">
														<div className="aime-premium-form-group">
															<label className="aime-premium-form-label">{ __( 'Label', 'ai-marketing-expert' ) }</label>
															<input className="aime-premium-input" value={ cfForm.label } onChange={ ( e ) => setCfForm( { ...cfForm, label: e.target.value } ) } />
														</div>
														<div className="aime-premium-form-group">
															<label className="aime-premium-form-label">{ __( 'Slug', 'ai-marketing-expert' ) }</label>
															<input className="aime-premium-input" value={ cfForm.field_key } onChange={ ( e ) => setCfForm( { ...cfForm, field_key: e.target.value } ) } placeholder="snake_case" />
														</div>
													</div>
													<div className="aime-premium-form-group">
														<label className="aime-premium-form-label">{ __( 'Type', 'ai-marketing-expert' ) }</label>
														<select className="aime-premium-select" value={ cfForm.field_type } onChange={ ( e ) => setCfForm( { ...cfForm, field_type: e.target.value } ) }>
															<option value="text">Text</option>
															<option value="number">Number</option>
															<option value="date">Date</option>
															<option value="select">Select</option>
															<option value="radio">Radio</option>
															<option value="checkbox">Checkbox</option>
															<option value="textarea">Textarea</option>
														</select>
													</div>
													{ ( cfForm.field_type === 'select' || cfForm.field_type === 'radio' ) && (
														<div className="aime-premium-form-group">
															<label className="aime-premium-form-label">{ __( 'Options (comma separated)', 'ai-marketing-expert' ) }</label>
															<input className="aime-premium-input" value={ cfForm.options } onChange={ ( e ) => setCfForm( { ...cfForm, options: e.target.value } ) } />
														</div>
													) }
												</div>
														<div className="aime-premium-modal-footer">
													<button className="aime-btn-cancel" onClick={ () => setShowCfModal( false ) }>{ __( 'Cancel', 'ai-marketing-expert' ) }</button>
													<button className="aime-btn-primary" onClick={ handleSaveCf }>{ cfEditId ? __( 'Update', 'ai-marketing-expert' ) : __( 'Create', 'ai-marketing-expert' ) }</button>
												</div>
											</div>
										</div>
									) }
								</>
							);
						}

						/* Default fallback */
						return null;
					} }
				</TabPanel> }
			</Card>
		</div>
	);
};

export default EmailSettings;
