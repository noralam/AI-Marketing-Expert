/**
 * SocialSettings - social media module settings form.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl, ToggleControl, TextareaControl, Spinner } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import { toast } from '../../common/Toast';

const SocialSettings = () => {
	const { get, post, loading } = useApi();
	const [ settings, setSettings ] = useState( null );
	const [ saving, setSaving ] = useState( false );

	const fetchSettings = useCallback( async () => {
		try {
			const res = await get( '/social/settings' );
			setSettings( res );
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	}, [ get ] );

	useEffect( () => {
		fetchSettings();
	}, [ fetchSettings ] );

	const update = ( key, value ) => {
		setSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const handleSave = async () => {
		setSaving( true );
		try {
			await post( '/social/settings', settings );
			toast( __( 'Settings saved.', 'ai-marketing-expert' ) );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSaving( false );
		}
	};

	if ( ! settings ) {
		return <Loader variant="form" text={ __( 'Loading settings...', 'ai-marketing-expert' ) } />;
	}

	return (
		<div className="aime-social-settings">
			<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } }>
				<h2 style={ { margin: 0 } }>{ __( 'Settings', 'ai-marketing-expert' ) }</h2>
				<Button variant="primary" onClick={ handleSave } disabled={ saving || loading }>
					{ saving
						? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
						: __( 'Save Settings', 'ai-marketing-expert' )
					}
				</Button>
			</div>

			<div style={ { display: 'grid', gridTemplateColumns: '1fr', gap: 20, maxWidth: 600 } }>
				{ /* General Settings */ }
				<Card title={ __( 'General', 'ai-marketing-expert' ) }>
					<div style={ { display: 'flex', flexDirection: 'column', gap: 16 } }>
						<SelectControl
							label={ __( 'Timezone', 'ai-marketing-expert' ) }
							value={ settings.default_timezone || '' }
							options={ [
								{ label: settings.wp_timezone ? `Site Default (${ settings.wp_timezone })` : __( 'Site Timezone (default)', 'ai-marketing-expert' ), value: '' },
								{ label: 'UTC', value: 'UTC' },
								{ label: 'US/Eastern (America/New_York)', value: 'America/New_York' },
								{ label: 'US/Central (America/Chicago)', value: 'America/Chicago' },
								{ label: 'US/Pacific (America/Los_Angeles)', value: 'America/Los_Angeles' },
								{ label: 'Europe/London', value: 'Europe/London' },
								{ label: 'Europe/Berlin', value: 'Europe/Berlin' },
								{ label: 'Europe/Paris', value: 'Europe/Paris' },
								{ label: 'Asia/Dubai', value: 'Asia/Dubai' },
								{ label: 'Asia/Karachi', value: 'Asia/Karachi' },
								{ label: 'Asia/Kolkata', value: 'Asia/Kolkata' },
								{ label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
								{ label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
								{ label: 'Asia/Singapore', value: 'Asia/Singapore' },
								{ label: 'Australia/Sydney', value: 'Australia/Sydney' },
								{ label: 'Pacific/Auckland', value: 'Pacific/Auckland' },
							] }
							onChange={ ( v ) => update( 'default_timezone', v ) }
							help={
								<span>
									{ __( 'Uses your WordPress site timezone by default. Change it at', 'ai-marketing-expert' ) }{ ' ' }
									<a href="options-general.php" style={ { color: 'var(--wp-admin-theme-color, #2271b1)' } }>
										{ __( 'Settings → General', 'ai-marketing-expert' ) }
									</a>.
								</span>
							}
							__nextHasNoMarginBottom
						/>

						<TextareaControl
							label={ __( 'Default Hashtags', 'ai-marketing-expert' ) }
							help={ __( 'Comma-separated hashtags to include in every post.', 'ai-marketing-expert' ) }
							value={ settings.default_hashtags || '' }
							onChange={ ( v ) => update( 'default_hashtags', v ) }
							rows={ 2 }
							placeholder="#mybrand, #marketing"
							__nextHasNoMarginBottom
						/>

						<ToggleControl
							label={ __( 'Auto-add default hashtags', 'ai-marketing-expert' ) }
							help={ __( 'Automatically append default hashtags to every new post.', 'ai-marketing-expert' ) }
							checked={ !! settings.auto_hashtags }
							onChange={ ( v ) => update( 'auto_hashtags', v ) }
							__nextHasNoMarginBottom
						/>

						<ToggleControl
							label={ __( 'Approval Workflow', 'ai-marketing-expert' ) }
							help={ __( 'Require approval before scheduled posts are published.', 'ai-marketing-expert' ) }
							checked={ !! settings.approval_workflow }
							onChange={ ( v ) => update( 'approval_workflow', v ) }
							__nextHasNoMarginBottom
						/>
					</div>
				</Card>

			</div>

			{ /* Save button (bottom) */ }
			<div style={ { marginTop: 24, display: 'flex', justifyContent: 'flex-end' } }>
				<Button variant="primary" onClick={ handleSave } disabled={ saving || loading }>
					{ saving
						? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
						: __( 'Save Settings', 'ai-marketing-expert' )
					}
				</Button>
			</div>
		</div>
	);
};

export default SocialSettings;
