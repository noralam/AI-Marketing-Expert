/**
 * Chatbot Settings - module-level settings with TabPanel.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, TextareaControl, SelectControl, ToggleControl, TabPanel, Spinner } from '@aime/wp-components';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ProLock, { ProLabel } from '../../../common/ProLock';
import { toast } from '../../../common/Toast';

const TABS = [
	{ name: 'general', title: __( 'General', 'ai-marketing-expert' ) },
	{ name: 'behavior', title: __( 'Behavior', 'ai-marketing-expert' ) },
	{ name: 'notifications', title: __( 'Notifications', 'ai-marketing-expert' ) },
	{ name: 'privacy', title: __( 'Privacy & GDPR', 'ai-marketing-expert' ) },
];

const THEME_OPTIONS = [
	{ label: 'Default (Indigo)', value: 'default' },
	{ label: 'Modern (Dark)', value: 'modern' },
	{ label: 'Minimal (Green)', value: 'minimal' },
];

const parseNumber = ( value, fallback, allowZero = false ) => {
	const parsed = parseInt( value, 10 );
	if ( Number.isNaN( parsed ) ) return fallback;
	if ( allowZero ) return Math.max( 0, parsed );
	return Math.max( 1, parsed );
};

const Settings = () => {
	const { get, post, loading, error, clearError } = useApi();
	const { hasPro } = usePro();
	const [ settings, setSettings ] = useState( null );
	const [ saving, setSaving ] = useState( false );
	const [ success, setSuccess ] = useState( '' );

	const fetchSettings = useCallback( async () => {
		try {
			const res = await get( '/chatbot/settings' );
			setSettings( res );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	useEffect( () => {
		fetchSettings();
	}, [ fetchSettings ] );

	const handleSave = async () => {
		setSaving( true );
		setSuccess( '' );
		try {
			const res = await post( '/chatbot/settings', settings );
			if ( res?.settings ) {
				setSettings( res.settings );
			}
			setSuccess( __( 'Settings saved.', 'ai-marketing-expert' ) );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSaving( false );
		}
	};

	if ( loading && ! settings ) {
		return <Loader text={ __( 'Loading settings...', 'ai-marketing-expert' ) } />;
	}

	if ( ! settings ) return null;

	const setField = ( key, value ) => {
		setSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	return (
		<div className="aime-chatbot-settings">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ success && <Notice type="success" message={ success } dismissible onDismiss={ () => setSuccess( '' ) } /> }

			<h2>{ __( 'Chatbot Settings', 'ai-marketing-expert' ) }</h2>

			<Card>
				{ loading ? <Loader /> : <TabPanel tabs={ TABS }>
					{ ( tab ) => {
						/* General tab */
						if ( tab.name === 'general' ) {
							return (
								<div className="aime-settings-form">
									<TextareaControl
										label={ __( 'Global System Prompt', 'ai-marketing-expert' ) }
										help={ __( 'Default system prompt for all bots. Individual bot prompts override this.', 'ai-marketing-expert' ) }
										value={ settings.global_system_prompt || '' }
										onChange={ ( v ) => setField( 'global_system_prompt', v ) }
										rows={ 5 }
									/>
									<TextControl
										label={ __( 'Default Welcome Message', 'ai-marketing-expert' ) }
										value={ settings.default_welcome_message || '' }
										onChange={ ( v ) => setField( 'default_welcome_message', v ) }
										__nextHasNoMarginBottom
									/>
									<SelectControl
										label={ __( 'Default Theme', 'ai-marketing-expert' ) }
										value={ settings.default_theme || 'default' }
										options={ THEME_OPTIONS }
										onChange={ ( v ) => setField( 'default_theme', v ) }
										__nextHasNoMarginBottom
									/>
									<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
										{ saving
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
											: __( 'Save Settings', 'ai-marketing-expert' )
										}
									</Button>
								</div>
							);
						}

						/* Behavior tab */
						if ( tab.name === 'behavior' ) {
							return (
								<div className="aime-settings-form">
									<ToggleControl
										label={ __( 'Sound Notifications', 'ai-marketing-expert' ) }
										help={ __( 'Play a sound when a new message arrives in the widget.', 'ai-marketing-expert' ) }
										checked={ !! settings.enable_sound_notification }
										onChange={ ( v ) => setField( 'enable_sound_notification', v ) }
									/>
									<ToggleControl
										label={ __( 'Typing Indicator', 'ai-marketing-expert' ) }
										help={ __( 'Show typing animation while the AI is generating a response.', 'ai-marketing-expert' ) }
										checked={ !! settings.enable_typing_indicator }
										onChange={ ( v ) => setField( 'enable_typing_indicator', v ) }
									/>
									<ProLock locked={ ! hasPro }>
									<ToggleControl
										label={ hasPro ? __( 'Read Receipts', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Read Receipts', 'ai-marketing-expert' ) }</ProLabel> }
										help={ __( 'Show read indicators for messages.', 'ai-marketing-expert' ) }
										checked={ !! settings.enable_read_receipts }
										onChange={ ( v ) => setField( 'enable_read_receipts', v ) }
									/>
									</ProLock>
									<div className="aime-form-grid aime-form-grid-2">
										<ProLock locked={ ! hasPro }>
										<TextControl
											label={ hasPro ? __( 'Poll Interval (seconds)', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Poll Interval (seconds)', 'ai-marketing-expert' ) }</ProLabel> }
											help={ __( 'How often the widget checks for new messages.', 'ai-marketing-expert' ) }
											type="number"
											value={ settings.poll_interval_seconds || 5 }
											onChange={ ( v ) => setField( 'poll_interval_seconds', parseNumber( v, 5 ) ) }
											__nextHasNoMarginBottom
										/>
										</ProLock>
										<ProLock locked={ ! hasPro }>
										<TextControl
											label={ hasPro ? __( 'Max Message Length', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Max Message Length', 'ai-marketing-expert' ) }</ProLabel> }
											help={ __( 'Maximum characters allowed per visitor message.', 'ai-marketing-expert' ) }
											type="number"
											value={ settings.max_message_length || 500 }
											onChange={ ( v ) => setField( 'max_message_length', parseNumber( v, 500 ) ) }
											__nextHasNoMarginBottom
										/>
										</ProLock>
									</div>
									<ProLock locked={ ! hasPro }>
									<TextControl
										label={ hasPro ? __( 'Rate Limit (per minute)', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Rate Limit (per minute)', 'ai-marketing-expert' ) }</ProLabel> }
										help={ __( 'Maximum messages a visitor can send per minute.', 'ai-marketing-expert' ) }
										type="number"
										value={ settings.rate_limit_per_minute ?? 10 }
										onChange={ ( v ) => setField( 'rate_limit_per_minute', parseNumber( v, 10, true ) ) }
										__nextHasNoMarginBottom
									/>
									</ProLock>
									{ ! hasPro && <Notice type="info" message={ __( 'Advanced behavior controls require Pro. Free users keep the standard message length, polling, rate limit, and read receipt settings.', 'ai-marketing-expert' ) } /> }
									<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
										{ saving
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
											: __( 'Save Settings', 'ai-marketing-expert' )
										}
									</Button>
								</div>
							);
						}

						/* Notifications tab */
						if ( tab.name === 'notifications' ) {
							return (
								<div className="aime-settings-form">
									<ToggleControl
										label={ __( 'Email on New Chat', 'ai-marketing-expert' ) }
										help={ __( 'Send an email to the site admin whenever a visitor starts a new chat conversation.', 'ai-marketing-expert' ) }
										checked={ !! settings.notify_new_chat }
										onChange={ ( v ) => setField( 'notify_new_chat', v ) }
									/>
									{ !! settings.notify_new_chat && (
										<TextControl
											label={ __( 'Notification Email', 'ai-marketing-expert' ) }
											help={ __( 'Where to send new chat notifications. Leave empty to use the site admin email.', 'ai-marketing-expert' ) }
											type="email"
											placeholder={ settings.admin_email || __( 'Site admin email (default)', 'ai-marketing-expert' ) }
											value={ settings.notify_email || '' }
											onChange={ ( v ) => setField( 'notify_email', v ) }
											__nextHasNoMarginBottom
										/>
									) }
									<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
										{ saving
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
											: __( 'Save Settings', 'ai-marketing-expert' )
										}
									</Button>
								</div>
							);
						}

						/* Privacy and GDPR tab */
						return (
							<div className="aime-settings-form">
								<ToggleControl
									label={ __( 'Enable GDPR Consent', 'ai-marketing-expert' ) }
									help={ __( 'Show a consent message before starting the chat.', 'ai-marketing-expert' ) }
									checked={ !! settings.gdpr_enabled }
									onChange={ ( v ) => setField( 'gdpr_enabled', v ) }
								/>
								{ settings.gdpr_enabled && (
									<TextareaControl
										label={ __( 'Consent Message', 'ai-marketing-expert' ) }
										value={ settings.consent_message || '' }
										onChange={ ( v ) => setField( 'consent_message', v ) }
										rows={ 3 }
									/>
								) }
								<ProLock locked={ ! hasPro }>
								<TextControl
									label={ hasPro ? __( 'Data Retention (days)', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Data Retention (days)', 'ai-marketing-expert' ) }</ProLabel> }
									help={ __( 'How long to keep conversation data. Set 0 for no auto-deletion.', 'ai-marketing-expert' ) }
									type="number"
									value={ settings.data_retention_days ?? 90 }
									onChange={ ( v ) => setField( 'data_retention_days', parseNumber( v, 90, true ) ) }
									__nextHasNoMarginBottom
								/>
								</ProLock>
								{ ! hasPro && <Notice type="info" message={ __( 'Custom data retention requires Pro. Free users keep the standard retention period.', 'ai-marketing-expert' ) } /> }
								<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
									{ saving
										? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
										: __( 'Save Settings', 'ai-marketing-expert' )
									}
								</Button>
							</div>
						);
					} }
				</TabPanel> }
			</Card>
		</div>
	);
};

export default Settings;
