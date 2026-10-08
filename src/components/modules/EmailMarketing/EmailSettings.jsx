/**
 * EmailSettings - general settings, custom fields management.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button, TextControl, TextareaControl, CheckboxControl, ToggleControl, SelectControl, TabPanel, Spinner,
} from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import { toast } from '../../common/Toast';
import ProBadge, { ProUpgradeButton } from '../../common/ProLock';

const VALID_TABS = [ 'general', 'sending', 'bounce', 'custom-fields' ];

const EmailSettings = ( { onNavigate, initialTab } ) => {
	const { get, post, del, loading, error, clearError } = useApi();
	const [ settings, setSettings ] = useState( {} );
	const [ customFields, setCustomFields ] = useState( [] );
	const [ saving, setSaving ] = useState( false );
	const [ success, setSuccess ] = useState( '' );

	const getInitialTab = () => {
		if ( initialTab && VALID_TABS.includes( initialTab ) ) {
			return initialTab;
		}
		const hashParts = ( window.location.hash || '' ).replace( '#', '' ).split( '/' );
		if ( hashParts[ 0 ] === 'settings' && VALID_TABS.includes( hashParts[ 1 ] ) ) {
			return hashParts[ 1 ];
		}
		try {
			const stored = localStorage.getItem( 'aime_email_settings_tab' );
			if ( stored && VALID_TABS.includes( stored ) ) {
				return stored;
			}
		} catch ( e ) { /* */ }
		return 'general';
	};

	const [ activeTab, setActiveTab ] = useState( getInitialTab );

	/* Sending & Tracking (from global plugin settings) */
	const [ pluginSettings, setPluginSettings ] = useState( {} );
	const [ savingPlugin, setSavingPlugin ] = useState( false );

	/* Deliverability & Bounce Health state */
	const [ deliverability, setDeliverability ] = useState( {
		is_pro: false,
		imap_mailbox_count: 0,
		cloud_esp_count: 0,
		total_bounced: 0,
		active_esp_names: [],
		has_legacy_imap: false,
		last_esp_sync: '',
		preflight_mx_check: true,
		auto_sync_esp: true,
		imap_enabled: false,
		imap_host: '',
		imap_port: 993,
		imap_encryption: 'ssl',
		imap_username: '',
	} );
	const [ testingLegacyImap, setTestingLegacyImap ] = useState( false );
	const [ legacyImapNotice, setLegacyImapNotice ] = useState( null );

	/* Cloud ESP Sync state */
	const [ syncingEsp, setSyncingEsp ] = useState( false );
	const [ espSyncNotice, setEspSyncNotice ] = useState( null );
	const [ lastEspSync, setLastEspSync ] = useState( '' );

	/* Custom field modal */
	const [ showCfModal, setShowCfModal ] = useState( false );
	const [ cfForm, setCfForm ] = useState( { label: '', field_key: '', field_type: 'text', options: '' } );
	const [ cfEditId, setCfEditId ] = useState( null );

	const fetchAll = useCallback( async () => {
		try {
			const [ s, cf, ps, deliv ] = await Promise.all( [
				get( '/email/settings' ),
				get( '/email/custom-fields' ),
				get( '/settings' ),
				get( '/email/deliverability/settings' ).catch( () => null ),
			] );
			setSettings( s || {} );
			setCustomFields( cf.data || cf || [] );
			const pSettings = ps.settings || {};
			if ( s?.custom_tracking_domain && ! pSettings.custom_tracking_domain ) {
				pSettings.custom_tracking_domain = s.custom_tracking_domain;
			}
			setPluginSettings( pSettings );
			if ( deliv ) {
				setDeliverability( deliv );
				if ( deliv.last_esp_sync ) {
					setLastEspSync( deliv.last_esp_sync );
				}
			}
		} catch ( e ) { /* */ }
	}, [ get ] );

	useEffect( () => { fetchAll(); }, [ fetchAll ] );

	/* General settings */
	const handleSaveSettings = async () => {
		setSaving( true );
		setSuccess( '' );
		try {
			await post( '/email/settings', settings );
			setPluginSettings( ( prev ) => ( { ...prev, double_optin: !! settings.double_optin, custom_tracking_domain: settings.custom_tracking_domain } ) );
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
			if ( pluginSettings.custom_tracking_domain !== undefined ) {
				await post( '/email/settings', { custom_tracking_domain: pluginSettings.custom_tracking_domain } );
			}
			setSettings( ( prev ) => ( {
				...prev,
				double_optin: !! pluginSettings.double_optin,
				custom_tracking_domain: pluginSettings.custom_tracking_domain,
			} ) );
			setSuccess( __( 'Sending & tracking settings saved.', 'ai-marketing-expert' ) );
		} catch ( e ) { /* */ }
		setSavingPlugin( false );
	};

	/* Deliverability & Legacy IMAP test handler */
	const handleTestLegacyImap = async () => {
		setTestingLegacyImap( true );
		setLegacyImapNotice( null );
		try {
			const res = await post( '/email/deliverability/test-imap', {
				host: deliverability.imap_host,
				port: deliverability.imap_port,
				encryption: deliverability.imap_encryption,
				username: deliverability.imap_username,
			} );
			const msg = res?.message || ( res?.success ? __( 'Connected to legacy IMAP bounce mailbox successfully!', 'ai-marketing-expert' ) : __( 'Failed to connect to IMAP server.', 'ai-marketing-expert' ) );
			setLegacyImapNotice( {
				type: res?.success ? 'success' : 'error',
				message: msg,
			} );
			toast( msg, res?.success ? 'success' : 'error', 5000 );
		} catch ( err ) {
			const errMsg = err.message || __( 'Failed to connect to IMAP server.', 'ai-marketing-expert' );
			setLegacyImapNotice( {
				type: 'error',
				message: errMsg,
			} );
			toast( errMsg, 'error', 5000 );
		}
		setTestingLegacyImap( false );
	};

	/* Cloud ESP & Mailbox Multi-channel Sync handler */
	const handleSyncEsp = async () => {
		setSyncingEsp( true );
		setEspSyncNotice( null );
		try {
			const res = await post( '/email/deliverability/sync-esp' );
			const msg = res?.message || __( 'Multi-channel deliverability sync completed successfully.', 'ai-marketing-expert' );
			setEspSyncNotice( {
				type: 'success',
				message: msg,
			} );
			toast( msg, 'success', 6000 );
			await fetchAll();
		} catch ( err ) {
			const errMsg = err?.message || __( 'Failed to synchronize with Cloud ESP APIs and mailboxes.', 'ai-marketing-expert' );
			setEspSyncNotice( {
				type: 'error',
				message: errMsg,
			} );
			toast( errMsg, 'error', 6000 );
		}
		setSyncingEsp( false );
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
		{ name: 'bounce', title: __( 'Bounce & Deliverability', 'ai-marketing-expert' ) },
		{ name: 'custom-fields', title: __( 'Custom Fields', 'ai-marketing-expert' ) },
	];

	return (
		<div className="aime-email-settings">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ success && <Notice type="success" message={ success } dismissible onDismiss={ () => setSuccess( '' ) } /> }

			<h2>{ __( 'Email Settings', 'ai-marketing-expert' ) }</h2>

			<Card>
				{ loading ? <Loader variant="form" /> : (
					<TabPanel
						tabs={ TABS }
						initialTabName={ activeTab }
						onSelect={ ( tabName ) => {
							setActiveTab( tabName );
							try {
								localStorage.setItem( 'aime_email_settings_tab', tabName );
								window.location.hash = `settings/${ tabName }`;
							} catch ( e ) { /* */ }
						} }
					>
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
									<div style={ { marginTop: 20 } }>
										<CheckboxControl
											label={ __( 'Enable Double Opt-in', 'ai-marketing-expert' ) }
											checked={ !! settings.double_optin }
											onChange={ ( v ) => setSettings( { ...settings, double_optin: v } ) }
											__nextHasNoMarginBottom
										/>
									</div>
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
										<div className="aime-toggle-stack" style={ { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 } }>
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
										</div>
										<div style={ { marginTop: 16 } }>
											<TextControl
												label={ __( 'Custom Tracking Domain (Branded CNAME)', 'ai-marketing-expert' ) }
												value={ pluginSettings.custom_tracking_domain || settings.custom_tracking_domain || '' }
												onChange={ ( v ) => {
													handlePluginChange( 'custom_tracking_domain', v );
													setSettings( ( prev ) => ( { ...prev, custom_tracking_domain: v } ) );
												} }
												placeholder="https://track.yourdomain.com"
												help={ __( 'Optional branded tracking domain (e.g. https://track.yourdomain.com). Point a CNAME DNS record to this site to mask tracking URLs and maximize domain reputation.', 'ai-marketing-expert' ) }
												__nextHasNoMarginBottom
											/>
										</div>
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

						/* Bounce & Deliverability */
						if ( tab.name === 'bounce' ) {
							const hasPro = Boolean( window.aimeData?.hasPro || deliverability?.is_pro );

							return (
								<div className="aime-settings-form">
									{ /* Deliverability Health Overview */ }
									<Card title={ __( 'Deliverability & Bounce Health Overview', 'ai-marketing-expert' ) }>
										<p className="aime-card-description" style={ { margin: '0 0 16px' } }>
											{ __( 'Multi-channel monitoring safeguards your sender reputation and domain health by proactively identifying hard bounces, invalid addresses, and spam complaints across all sending engines.', 'ai-marketing-expert' ) }
										</p>

										<div className="aime-usage-stats" style={ { marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--aime-border, #e2e8f0)' } }>
											<div className="aime-usage-stat">
												<span className="aime-usage-stat__value">{ deliverability.imap_mailbox_count || 0 }</span>
												<span className="aime-usage-stat__label">
													<strong>{ __( 'Active Mailbox Readers', 'ai-marketing-expert' ) }</strong>
													<span className="aime-usage-stat__note">
														{ hasPro
															? __( 'Multi-Account Protected', 'ai-marketing-expert' )
															: __( 'Primary Connection (Free Tier)', 'ai-marketing-expert' )
														}
													</span>
												</span>
											</div>

											<div className="aime-usage-stat">
												<span className="aime-usage-stat__value">{ deliverability.total_bounced ?? 0 }</span>
												<span className="aime-usage-stat__label">
													<strong>{ __( 'Quarantined Contacts', 'ai-marketing-expert' ) }</strong>
													<span className="aime-usage-stat__note">{ __( 'Invalid addresses isolated', 'ai-marketing-expert' ) }</span>
												</span>
											</div>

											<div className="aime-usage-stat">
												<span className="aime-usage-stat__value" style={ { fontSize: hasPro ? 18 : 20, lineHeight: 1.6, color: '#16a34a' } }>
													{ hasPro
														? ( lastEspSync || deliverability.last_esp_sync || __( 'Pending First Scan', 'ai-marketing-expert' ) )
														: ( ( deliverability.imap_mailbox_count > 0 ) ? __( 'Primary Shield Active', 'ai-marketing-expert' ) : __( '100% DNS Guard Active', 'ai-marketing-expert' ) )
													}
												</span>
												<span className="aime-usage-stat__label">
													<strong>{ hasPro ? __( 'Last Automated Scan', 'ai-marketing-expert' ) : __( 'Domain Shield Status', 'ai-marketing-expert' ) }</strong>
													<span className="aime-usage-stat__note">
														{ hasPro ? __( 'Daily WP-Cron / On-demand', 'ai-marketing-expert' ) : __( 'DNS MX + 5xx Protection', 'ai-marketing-expert' ) }
													</span>
												</span>
											</div>
										</div>

										{ /* Clear Guidance & Status Banner based on Primary SMTP Mailbox state */ }
										{ ! hasPro ? (
											<div style={ { marginTop: 12 } }>
												{ ( deliverability.imap_mailbox_count || 0 ) === 0 ? (
													/* Warning: Mailbox reader not active yet */
													<div style={ { padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 } }>
														<div style={ { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' } }>
															<div style={ { flex: 1, minWidth: 260 } }>
																<div style={ { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } }>
																	<span style={ { fontSize: 16 } }>⚠️</span>
																	<strong style={ { fontSize: 13, color: '#92400e' } }>
																		{ __( 'Action Required: Primary Bounce Mailbox Not Configured', 'ai-marketing-expert' ) }
																	</strong>
																</div>
																<p style={ { fontSize: 12, color: '#78350f', margin: '0 0 8px', lineHeight: 1.5 } }>
																	{ deliverability.primary_smtp_name
																		? sprintf( __( 'Your primary SMTP connection ("%s") does not have Automatic Bounce Detection (IMAP) turned on. Returned delivery failure notices (NDRs) in your inbox cannot be auto-quarantined until enabled.', 'ai-marketing-expert' ), deliverability.primary_smtp_name )
																		: __( 'You do not have an active SMTP connection configured for bounce detection. Returned delivery failure notices (NDRs) cannot be auto-quarantined until configured.', 'ai-marketing-expert' )
																	}
																</p>
																<div style={ { fontSize: 12, color: '#92400e', background: 'rgba(254, 243, 199, 0.6)', padding: '6px 10px', borderRadius: 6 } }>
																	<strong>{ __( 'Free vs Pro Coverage:', 'ai-marketing-expert' ) }</strong>{ ' ' }
																	{ __( 'Free tier monitors 1 Primary sending mailbox for free. Pro tier monitors ALL your secondary SMTP connections simultaneously plus Cloud ESP APIs.', 'ai-marketing-expert' ) }
																</div>
															</div>
															<Button
																variant="secondary"
																onClick={ () => onNavigate ? onNavigate( 'smtp' ) : ( window.location.hash = '#smtp' ) }
																style={ { background: '#ffffff', borderColor: '#f59e0b', color: '#92400e', fontWeight: 600, alignSelf: 'center' } }
															>
																{ __( 'Configure in SMTP Settings →', 'ai-marketing-expert' ) }
															</Button>
														</div>
													</div>
												) : (
													/* Success: Primary mailbox reader active */
													<div style={ { padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 } }>
														<div style={ { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' } }>
															<div style={ { flex: 1, minWidth: 260 } }>
																<div style={ { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } }>
																	<span style={ { color: '#16a34a', fontWeight: 'bold' } }>✓</span>
																	<strong style={ { fontSize: 13, color: '#15803d' } }>
																		{ __( 'Primary Sending Mailbox Protected (Free Tier)', 'ai-marketing-expert' ) }
																	</strong>
																</div>
																<p style={ { fontSize: 12, color: '#166534', margin: '0 0 8px', lineHeight: 1.5 } }>
																	{ deliverability.primary_smtp_name
																		? sprintf( __( 'AI Marketing Expert is monitoring your primary inbox ("%s"). Delivery failure notices (NDRs) are scanned and bounced emails are quarantined automatically.', 'ai-marketing-expert' ), deliverability.primary_smtp_name )
																		: __( 'AI Marketing Expert is actively monitoring your primary sending inbox for delivery failure notices (NDRs).', 'ai-marketing-expert' )
																	}
																</p>
																<div style={ { fontSize: 12, color: '#166534', background: 'rgba(220, 252, 231, 0.6)', padding: '6px 10px', borderRadius: 6 } }>
																	<strong>{ __( 'Pro Benefit:', 'ai-marketing-expert' ) }</strong>{ ' ' }
																	{ __( 'You are currently receiving bounce data from your 1 Primary SMTP connection. Upgrading to Pro unlocks automatic monitoring for ALL SMTP connections simultaneously + Cloud ESP suppression sync (Brevo, SendGrid, Mailgun).', 'ai-marketing-expert' ) }
																</div>
															</div>
															<Button
																variant="secondary"
																onClick={ () => onNavigate ? onNavigate( 'smtp' ) : ( window.location.hash = '#smtp' ) }
																style={ { alignSelf: 'center' } }
															>
																{ __( 'Manage in SMTP Settings →', 'ai-marketing-expert' ) }
															</Button>
														</div>
													</div>
												) }
											</div>
										) : (
											/* Pro Tier Status */
											<div style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #cbd5e1', marginTop: 12 } }>
												<div>
													<strong style={ { display: 'block', fontSize: 14, color: '#1e293b' } }>
														🛡️ { __( 'Enterprise Multi-Connection Shield is active on your site.', 'ai-marketing-expert' ) }
													</strong>
													<span style={ { fontSize: 12, color: '#64748b' } }>
														{ __( 'All your active SMTP connections and connected Cloud ESP suppression APIs are monitored concurrently for bounces and complaints.', 'ai-marketing-expert' ) }
													</span>
												</div>
												<Button
													variant="secondary"
													onClick={ () => onNavigate ? onNavigate( 'smtp' ) : ( window.location.hash = '#smtp' ) }
												>
													{ __( 'Manage Connections in SMTP Settings →', 'ai-marketing-expert' ) }
												</Button>
											</div>
										) }
									</Card>

									{ /* Multi-Account Shield & Cloud ESP Suppression Sync Card */ }
									<Card>
										<div style={ { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } }>
											<h3 style={ { margin: 0, fontSize: 16 } }>
												{ __( 'Multi-Account Shield & Cloud ESP Suppression Sync', 'ai-marketing-expert' ) }
											</h3>
											{ ! hasPro && <ProBadge /> }
										</div>

										<p className="aime-card-description" style={ { margin: '0 0 16px' } }>
											{ __( 'Synchronizes suppression feeds across Cloud ESP REST APIs (Brevo, SendGrid, Mailgun) and inspects multiple sending mailboxes simultaneously. Quarantines invalid addresses before your sender score drops.', 'ai-marketing-expert' ) }
										</p>

										{ hasPro ? (
											<>
												<div style={ { padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16 } }>
													<div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
														<span style={ { color: '#16a34a', fontWeight: 'bold' } }>✓</span>
														<span style={ { fontSize: 13, color: '#15803d', fontWeight: 500 } }>
															{ __( 'Automated daily background scanning is active.', 'ai-marketing-expert' ) }
														</span>
													</div>
												</div>

												{ espSyncNotice && (
													<div style={ { marginBottom: 16 } }>
														<Notice type={ espSyncNotice.type } message={ espSyncNotice.message } dismissible onDismiss={ () => setEspSyncNotice( null ) } />
													</div>
												) }

												<div className="aime-settings-btn-row">
													<Button
														variant="primary"
														onClick={ handleSyncEsp }
														isBusy={ syncingEsp }
														disabled={ syncingEsp }
													>
														{ syncingEsp ? __( 'Scanning & Quarantining Bounces...', 'ai-marketing-expert' ) : __( 'Scan & Quarantine Bounces Now', 'ai-marketing-expert' ) }
													</Button>
												</div>
											</>
										) : (
											<div style={ { padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 } }>
												<div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 16 } }>
													<div style={ { background: '#ffffff', padding: '12px 14px', borderRadius: 6, border: '1px solid #e2e8f0' } }>
														<span style={ { fontWeight: 700, fontSize: 12, color: '#166534', display: 'block', marginBottom: 6 } }>
															{ __( 'FREE TIER (CURRENT PLAN)', 'ai-marketing-expert' ) }
														</span>
														<ul style={ { margin: 0, paddingLeft: 18, fontSize: 12, color: '#475569', lineHeight: 1.6 } }>
															<li>{ __( '1 Primary SMTP Mailbox Protected', 'ai-marketing-expert' ) }</li>
															<li>{ __( 'DNS MX Pre-flight Guard on campaigns', 'ai-marketing-expert' ) }</li>
															<li>{ __( 'Instant 5xx hard bounce isolation', 'ai-marketing-expert' ) }</li>
														</ul>
													</div>
													<div style={ { background: '#faf5ff', padding: '12px 14px', borderRadius: 6, border: '1px solid #e9d5ff' } }>
														<span style={ { fontWeight: 700, fontSize: 12, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } }>
															<span>⚡ { __( 'PRO TIER (ADVANCED SHIELD)', 'ai-marketing-expert' ) }</span>
															<ProBadge />
														</span>
														<ul style={ { margin: 0, paddingLeft: 18, fontSize: 12, color: '#581c87', lineHeight: 1.6 } }>
															<li>{ __( 'Monitor ALL SMTP connections simultaneously', 'ai-marketing-expert' ) }</li>
															<li>{ __( 'Cloud ESP API Sync (Brevo, SendGrid, Mailgun)', 'ai-marketing-expert' ) }</li>
															<li>{ __( 'On-demand "Scan & Quarantine Now" button', 'ai-marketing-expert' ) }</li>
														</ul>
													</div>
												</div>
												<ProUpgradeButton>
													{ __( 'Upgrade to Pro for Multi-Account & Cloud Sync →', 'ai-marketing-expert' ) }
												</ProUpgradeButton>
											</div>
										) }
									</Card>

									{ /* Backward Compatibility Card (if legacy global IMAP settings detected) */ }
									{ deliverability.has_legacy_imap && (
										<Card title={ __( 'Legacy Global Bounce Mailbox (Active)', 'ai-marketing-expert' ) }>
											<div style={ { padding: '12px 16px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, marginBottom: 16 } }>
												<p style={ { margin: 0, fontSize: 13, color: '#92400e' } }>
													<strong>{ __( 'Backward Compatibility Active:', 'ai-marketing-expert' ) }</strong>{ ' ' }
													{ __( 'A legacy global bounce mailbox was detected on this site (', 'ai-marketing-expert' ) }
													<code>{ deliverability.imap_username || deliverability.imap_host }</code>
													{ __( '). AI Marketing Expert will continue monitoring this mailbox automatically so you never lose data. You can also configure dedicated bounce mailboxes per connection in SMTP Settings.', 'ai-marketing-expert' ) }
												</p>
											</div>

											{ legacyImapNotice && (
												<div style={ { marginBottom: 16 } }>
													<Notice type={ legacyImapNotice.type } message={ legacyImapNotice.message } dismissible onDismiss={ () => setLegacyImapNotice( null ) } />
												</div>
											) }

											{ hasPro && (
												<Button
													variant="secondary"
													onClick={ handleTestLegacyImap }
													isBusy={ testingLegacyImap }
													disabled={ testingLegacyImap }
												>
													{ testingLegacyImap ? __( 'Testing Legacy Mailbox...', 'ai-marketing-expert' ) : __( 'Test Legacy Mailbox Connection', 'ai-marketing-expert' ) }
												</Button>
											) }
										</Card>
									) }

									{ /* Active Deliverability Guardrails */ }
									<Card title={ __( 'Active Deliverability Guardrails', 'ai-marketing-expert' ) }>
										<p className="aime-card-description" style={ { margin: '0 0 16px' } }>
											{ __( 'The following automated defenses run on every campaign to preserve sender domain reputation and prevent spam folder landing.', 'ai-marketing-expert' ) }
										</p>
										<div className="aime-cf-how-it-works">
											<ul>
												<li>
													<strong>{ __( 'DNS MX Pre-flight Guard:', 'ai-marketing-expert' ) }</strong>{ ' ' }
													{ __( 'Validates DNS Mail Exchange records for recipient domains before sending. Dead domains and typos are filtered before dispatch to protect your IP.', 'ai-marketing-expert' ) }
												</li>
												<li>
													<strong>{ __( 'Instant 5xx Hard Bounce Isolation:', 'ai-marketing-expert' ) }</strong>{ ' ' }
													{ __( 'Permanent SMTP failure codes (such as 550 User Unknown or 554 Rejected) immediately mark contacts as bounced to prevent repeated delivery strikes.', 'ai-marketing-expert' ) }
												</li>
												<li>
													<strong>{ __( 'Branded CNAME Tracking Domain:', 'ai-marketing-expert' ) }</strong>{ ' ' }
													{ __( 'Tracking links can be signed with your custom branded domain under "Sending & Tracking" tab to align SPF/DKIM with click tracking URLs.', 'ai-marketing-expert' ) }
												</li>
												<li>
													<strong>{ __( 'ESP Webhook & Event Listeners:', 'ai-marketing-expert' ) }</strong>{ ' ' }
													{ __( 'Real-time webhook endpoints receive immediate bounce and spam complaint notifications from Amazon SES, SendGrid, Mailgun, Postmark, and Brevo.', 'ai-marketing-expert' ) }
												</li>
											</ul>
										</div>
									</Card>
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
				</TabPanel> ) }
			</Card>
		</div>
	);
};

export default EmailSettings;
