/**
 * SEO Settings - module-level settings form.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, SelectControl, ToggleControl, TabPanel, Spinner } from '@aime/wp-components';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import { toast } from '../../../common/Toast';

const TABS = [
	{ name: 'general', title: __( 'General', 'ai-marketing-expert' ) },
	{ name: 'tracking', title: __( 'Rank Tracking', 'ai-marketing-expert' ) },
	{ name: 'integrations', title: __( 'Integrations', 'ai-marketing-expert' ) },
];

const LANGUAGE_OPTIONS = [
	{ label: 'English', value: 'en' },
	{ label: 'Bengali', value: 'bn' },
	{ label: 'Spanish', value: 'es' },
	{ label: 'French', value: 'fr' },
	{ label: 'German', value: 'de' },
	{ label: 'Hindi', value: 'hi' },
	{ label: 'Arabic', value: 'ar' },
	{ label: 'Portuguese', value: 'pt' },
	{ label: 'Chinese', value: 'zh' },
	{ label: 'Japanese', value: 'ja' },
	{ label: 'Korean', value: 'ko' },
	{ label: 'Russian', value: 'ru' },
	{ label: 'Italian', value: 'it' },
	{ label: 'Dutch', value: 'nl' },
	{ label: 'Turkish', value: 'tr' },
	{ label: 'Indonesian', value: 'id' },
	{ label: 'Vietnamese', value: 'vi' },
	{ label: 'Thai', value: 'th' },
	{ label: 'Polish', value: 'pl' },
	{ label: 'Swedish', value: 'sv' },
	{ label: 'Urdu', value: 'ur' },
	{ label: 'Malay', value: 'ms' },
];

const COUNTRY_OPTIONS = [
	{ label: 'United States', value: 'US' },
	{ label: 'Bangladesh', value: 'BD' },
	{ label: 'India', value: 'IN' },
	{ label: 'United Kingdom', value: 'GB' },
	{ label: 'Canada', value: 'CA' },
	{ label: 'Australia', value: 'AU' },
	{ label: 'Germany', value: 'DE' },
	{ label: 'France', value: 'FR' },
	{ label: 'Spain', value: 'ES' },
	{ label: 'Italy', value: 'IT' },
	{ label: 'Brazil', value: 'BR' },
	{ label: 'Mexico', value: 'MX' },
	{ label: 'Japan', value: 'JP' },
	{ label: 'South Korea', value: 'KR' },
	{ label: 'China', value: 'CN' },
	{ label: 'Indonesia', value: 'ID' },
	{ label: 'Pakistan', value: 'PK' },
	{ label: 'Russia', value: 'RU' },
	{ label: 'Turkey', value: 'TR' },
	{ label: 'Saudi Arabia', value: 'SA' },
	{ label: 'UAE', value: 'AE' },
	{ label: 'Netherlands', value: 'NL' },
	{ label: 'Sweden', value: 'SE' },
	{ label: 'Thailand', value: 'TH' },
	{ label: 'Vietnam', value: 'VN' },
	{ label: 'Malaysia', value: 'MY' },
	{ label: 'Philippines', value: 'PH' },
	{ label: 'Nigeria', value: 'NG' },
	{ label: 'South Africa', value: 'ZA' },
	{ label: 'Egypt', value: 'EG' },
	{ label: 'Poland', value: 'PL' },
	{ label: 'Argentina', value: 'AR' },
	{ label: 'Colombia', value: 'CO' },
	{ label: 'Singapore', value: 'SG' },
	{ label: 'New Zealand', value: 'NZ' },
	{ label: 'Ireland', value: 'IE' },
	{ label: 'Switzerland', value: 'CH' },
	{ label: 'Portugal', value: 'PT' },
];

const ENGINE_OPTIONS = [
	{ label: 'Google', value: 'google' },
	{ label: 'Bing', value: 'bing' },
	{ label: 'Yahoo', value: 'yahoo' },
];

const SERP_PROVIDER_OPTIONS = [
	{ label: __( 'AI Estimate Only', 'ai-marketing-expert' ), value: '' },
	{ label: 'SerpApi', value: 'serpapi' },
	{ label: 'DataForSEO', value: 'dataforseo' },
	{ label: 'Custom SERP API', value: 'custom' },
];

const SeoSettings = () => {
	const { get, put, loading, error, clearError } = useApi();
	const { hasPro } = usePro();
	const [ settings, setSettings ] = useState( null );
	const [ saving, setSaving ] = useState( false );
	const [ success, setSuccess ] = useState( '' );

	const fetchSettings = useCallback( async () => {
		try {
			const res = await get( '/seo/settings' );
			const data = res.data || res;
			// Pre-fill domain from WordPress site URL if not yet saved.
			if ( ! data.site_domain && window.aimeData?.siteUrl ) {
				try {
					data.site_domain = new URL( window.aimeData.siteUrl ).hostname;
				} catch ( e ) {
					data.site_domain = window.aimeData.siteUrl.replace( /^https?:\/\//, '' ).replace( /\/.*$/, '' );
				}
			}
			setSettings( data );
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
			const res = await put( '/seo/settings', settings );
			setSettings( res.data || settings );
			setSuccess( __( 'Settings saved.', 'ai-marketing-expert' ) );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSaving( false );
		}
	};

	if ( loading && ! settings ) {
		return <Loader text={ __( 'Loading settings\u2026', 'ai-marketing-expert' ) } />;
	}

	if ( ! settings ) return null;

	const setField = ( key, value ) => {
		setSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	return (
		<div className="aime-seo-settings">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ success && <Notice type="success" message={ success } dismissible onDismiss={ () => setSuccess( '' ) } /> }

			<h2>{ __( 'SEO Settings', 'ai-marketing-expert' ) }</h2>

			<Card>
				{ loading ? <Loader /> : (
					<TabPanel tabs={ TABS }>
						{ ( tab ) => {
							/* General tab */
							if ( tab.name === 'general' ) {
								return (
									<div className="aime-settings-form">
										<TextControl
											label={ __( 'Your Website Domain', 'ai-marketing-expert' ) }
											help={ __( 'Used for competitor analysis and rank tracking.', 'ai-marketing-expert' ) }
											value={ settings.site_domain || '' }
											onChange={ ( v ) => setField( 'site_domain', v ) }
											placeholder="example.com"
											__nextHasNoMarginBottom
										/>
										<TextControl
											label={ __( 'Primary Niche', 'ai-marketing-expert' ) }
											help={ __( 'Your main topic area for AI context.', 'ai-marketing-expert' ) }
											value={ settings.site_niche || '' }
											onChange={ ( v ) => setField( 'site_niche', v ) }
											placeholder={ __( 'e.g. digital marketing', 'ai-marketing-expert' ) }
											__nextHasNoMarginBottom
										/>
										<div className="aime-form-grid aime-form-grid-2">
											<SelectControl
												label={ __( 'Default Language', 'ai-marketing-expert' ) }
												value={ settings.default_language || 'en' }
												options={ LANGUAGE_OPTIONS }
												onChange={ ( v ) => setField( 'default_language', v ) }
												__nextHasNoMarginBottom
											/>
											<SelectControl
												label={ __( 'Target Country', 'ai-marketing-expert' ) }
												value={ settings.default_country || 'US' }
												options={ COUNTRY_OPTIONS }
												onChange={ ( v ) => setField( 'default_country', v ) }
												__nextHasNoMarginBottom
											/>
										</div>
										<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
											{ __( 'Save Settings', 'ai-marketing-expert' ) }
										</Button>
									</div>
								);
							}

							if ( tab.name === 'tracking' ) {
								return (
								<div className="aime-settings-form aime-seo-rank-settings-form">
									<SelectControl
										label={ __( 'Search Engine', 'ai-marketing-expert' ) }
										value={ settings.rank_check_engine || 'google' }
										options={ ENGINE_OPTIONS }
										onChange={ ( v ) => setField( 'rank_check_engine', v ) }
										__nextHasNoMarginBottom
									/>
									<ToggleControl
										label={ __( 'Auto Daily Rank Check', 'ai-marketing-expert' ) }
										help={ __( 'Automatically check keyword rankings once per day via cron.', 'ai-marketing-expert' ) }
										checked={ !! settings.auto_rank_check }
										onChange={ ( v ) => setField( 'auto_rank_check', v ) }
									/>
									<SelectControl
										label={ __( 'SERP Data Provider', 'ai-marketing-expert' ) }
										help={ __( 'AI estimates are used until a SERP provider integration is connected.', 'ai-marketing-expert' ) }
										value={ settings.serp_provider || '' }
										options={ SERP_PROVIDER_OPTIONS }
										onChange={ ( v ) => setField( 'serp_provider', v ) }
										__nextHasNoMarginBottom
									/>
									<TextControl
										label={ __( 'SERP API Key', 'ai-marketing-expert' ) }
										value={ settings.serp_api_key || '' }
										onChange={ ( v ) => setField( 'serp_api_key', v ) }
										type="password"
										placeholder={ __( 'Optional Pro integration key', 'ai-marketing-expert' ) }
										__nextHasNoMarginBottom
									/>
									<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
										{ saving
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving\u2026', 'ai-marketing-expert' ) }</>
											: __( 'Save Settings', 'ai-marketing-expert' )
										}
									</Button>
								</div>
								);
							}

							return (
								<div className="aime-settings-form">
									<TextControl
										label={ __( 'Google Search Console Property', 'ai-marketing-expert' ) }
										help={ __( 'Store the property URL or sc-domain value for the upcoming Search Console integration.', 'ai-marketing-expert' ) }
										value={ settings.search_console_property || '' }
										onChange={ ( v ) => setField( 'search_console_property', v ) }
										placeholder="sc-domain:example.com"
										__nextHasNoMarginBottom
									/>
									<ToggleControl
										label={ __( 'Enable Schema Suggestions', 'ai-marketing-expert' ) }
										help={ __( 'Show schema suggestion workflows in SEO audits and automation.', 'ai-marketing-expert' ) }
										checked={ !! settings.enable_schema_suggestions }
										onChange={ ( v ) => setField( 'enable_schema_suggestions', v ) }
									/>
									<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
										{ saving
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving\u2026', 'ai-marketing-expert' ) }</>
											: __( 'Save Settings', 'ai-marketing-expert' )
										}
									</Button>
								</div>
							);
						} }
					</TabPanel>
				) }
			</Card>
		</div>
	);
};

export default SeoSettings;
