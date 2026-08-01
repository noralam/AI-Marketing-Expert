/**
 * Content Settings - module-level settings for Content Generator.
 * Follows the EmailSettings pattern: TabPanel inside a Card.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, SelectControl, ToggleControl, TabPanel, Spinner } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import { toast } from '../../common/Toast';
import { isProActive, ProLabel, ProUpgradeButton } from '../../common/ProLock';

const TONES = [
	{ label: 'Professional', value: 'professional' },
	{ label: 'Casual', value: 'casual' },
	{ label: 'Friendly', value: 'friendly' },
	{ label: 'Authoritative', value: 'authoritative' },
	{ label: 'Humorous', value: 'humorous' },
	{ label: 'Formal', value: 'formal' },
	{ label: 'Conversational', value: 'conversational' },
];

const LANGUAGES = [
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

const POST_STATUSES = [
	{ label: 'Draft', value: 'draft' },
	{ label: 'Publish', value: 'publish' },
	{ label: 'Pending Review', value: 'pending' },
	{ label: 'Private', value: 'private' },
];

const TABS = [
	{ name: 'generation', title: __( 'Generation', 'ai-marketing-expert' ) },
	{ name: 'publishing', title: __( 'Publishing', 'ai-marketing-expert' ) },
	{ name: 'images', title: __( 'Images', 'ai-marketing-expert' ) },
	{ name: 'automation', title: __( 'Automation', 'ai-marketing-expert' ) },
];

const STOCK_PROVIDERS = [
	{ label: 'Pexels', value: 'pexels' },
	{ label: 'Pixabay', value: 'pixabay' },
];

const INLINE_IMAGE_COUNTS = [
	{ label: __( 'None', 'ai-marketing-expert' ), value: '0' },
	{ label: __( '1 image', 'ai-marketing-expert' ), value: '1' },
	{ label: __( '2 images', 'ai-marketing-expert' ), value: '2' },
	{ label: __( '3 images', 'ai-marketing-expert' ), value: '3' },
];

const INLINE_IMAGE_SIZES = [
	{ label: __( 'Medium (300px)', 'ai-marketing-expert' ), value: 'medium' },
	{ label: __( 'Medium Large (768px)', 'ai-marketing-expert' ), value: 'medium_large' },
	{ label: __( 'Large (1024px)', 'ai-marketing-expert' ), value: 'large' },
	{ label: __( 'Full Size', 'ai-marketing-expert' ), value: 'full' },
];

const ContentSettings = ( { initialTab } ) => {
	const { get, post, loading, error, clearError } = useApi();
	const hasPro = isProActive();
	const [ settings, setSettings ] = useState( null );
	const [ taxonomies, setTaxonomies ] = useState( { categories: [], post_types: [] } );
	const [ saving, setSaving ] = useState( false );
	const [ success, setSuccess ] = useState( '' );

	const fetchSettings = useCallback( async () => {
		try {
			const [ res, taxRes ] = await Promise.all( [
				get( '/content/settings' ),
				get( '/content/wp-taxonomies' ),
			] );
			setSettings( res );
			setTaxonomies( taxRes || { categories: [], post_types: [] } );
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
			const res = await post( '/content/settings', settings );
			setSettings( res.settings || settings );
			setSuccess( __( 'Settings saved.', 'ai-marketing-expert' ) );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSaving( false );
		}
	};

	if ( loading && ! settings ) {
		return <Loader variant="form" text={ __( 'Loading settings...', 'ai-marketing-expert' ) } />;
	}

	if ( ! settings ) return null;

	const setField = ( key, value ) => {
		if ( ! hasPro && [ 'auto_seo_optimize', 'auto_generate_meta', 'auto_generate_excerpt' ].includes( key ) ) {
			toast( __( 'Content automation settings are available in Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		setSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const postTypeOptions = ( taxonomies.post_types || [] ).map( ( postType ) => ( {
		label: postType.label,
		value: postType.name,
	} ) );

	const categoryOptions = [
		{ label: __( 'No default category', 'ai-marketing-expert' ), value: '0' },
		...( taxonomies.categories || [] ).map( ( category ) => ( {
			label: category.name,
			value: String( category.id ),
		} ) ),
	];

	return (
		<div className="aime-content-settings">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ success && <Notice type="success" message={ success } dismissible onDismiss={ () => setSuccess( '' ) } /> }

			<h2>{ __( 'Content Settings', 'ai-marketing-expert' ) }</h2>

			<Card>
				{ loading ? <Loader variant="form" /> : <TabPanel tabs={ TABS } initialTabName={ initialTab || undefined }>
					{ ( tab ) => {
						if ( tab.name === 'generation' ) {
							return (
								<div className="aime-settings-form">
									<div className="aime-form-grid aime-form-grid-2">
										<SelectControl
											label={ __( 'Default Tone', 'ai-marketing-expert' ) }
											value={ settings.default_tone || 'professional' }
											options={ TONES }
											onChange={ ( v ) => setField( 'default_tone', v ) }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'Default Language', 'ai-marketing-expert' ) }
											value={ settings.default_language || 'en' }
											options={ LANGUAGES }
											onChange={ ( v ) => setField( 'default_language', v ) }
											__nextHasNoMarginBottom
										/>
										<TextControl
											label={ __( 'Default Word Count', 'ai-marketing-expert' ) }
											type="number"
											value={ settings.default_word_count || 1000 }
											onChange={ ( v ) => setField( 'default_word_count', parseInt( v ) || 1000 ) }
											__nextHasNoMarginBottom
										/>
									</div>
									<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
										{ saving
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
											: __( 'Save Settings', 'ai-marketing-expert' )
										}
									</Button>
								</div>
							);
						}

						if ( tab.name === 'publishing' ) {
							return (
								<div className="aime-settings-form">
									<div className="aime-form-grid aime-form-grid-2">
										<SelectControl
											label={ __( 'Default Post Type', 'ai-marketing-expert' ) }
											value={ settings.default_post_type || 'post' }
											options={ postTypeOptions.length ? postTypeOptions : [ { label: 'Post', value: 'post' } ] }
											onChange={ ( v ) => setField( 'default_post_type', v ) }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'Default Post Status', 'ai-marketing-expert' ) }
											help={ __( 'Used by the default publish action in the article editor.', 'ai-marketing-expert' ) }
											value={ settings.default_post_status || 'draft' }
											options={ POST_STATUSES }
											onChange={ ( v ) => setField( 'default_post_status', v ) }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'Default Category', 'ai-marketing-expert' ) }
											value={ String( settings.default_category_id || 0 ) }
											options={ categoryOptions }
											onChange={ ( v ) => setField( 'default_category_id', parseInt( v, 10 ) || 0 ) }
											__nextHasNoMarginBottom
										/>
									</div>
									<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
										{ saving
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
											: __( 'Save Settings', 'ai-marketing-expert' )
										}
									</Button>
								</div>
							);
						}

						if ( tab.name === 'images' ) {
							const activeProvider = settings.stock_provider || 'pexels';
							const hasKey = activeProvider === 'pixabay' ? !! settings.has_pixabay_key : !! settings.has_pexels_key;
							const keyField = `${ activeProvider }_api_key`;
							const keyUrl = activeProvider === 'pixabay'
								? 'https://pixabay.com/api/docs/'
								: 'https://www.pexels.com/api/';
							return (
								<div className="aime-settings-form">
									<div className="aime-form-grid aime-form-grid--top aime-form-grid-2">
										<SelectControl
											label={ __( 'Stock Photo Provider', 'ai-marketing-expert' ) }
											help={ __( 'Where stock photos are searched from.', 'ai-marketing-expert' ) }
											value={ activeProvider }
											options={ STOCK_PROVIDERS }
											onChange={ ( v ) => setField( 'stock_provider', v ) }
											__nextHasNoMarginBottom
										/>
										<TextControl
											label={ activeProvider === 'pixabay' ? __( 'Pixabay API Key', 'ai-marketing-expert' ) : __( 'Pexels API Key', 'ai-marketing-expert' ) }
											type="password"
											autoComplete="new-password"
											value={ settings[ keyField ] || '' }
											placeholder={ hasKey ? __( 'Key saved — enter a new key to replace it', 'ai-marketing-expert' ) : __( 'Paste your free API key', 'ai-marketing-expert' ) }
											help={
												<>
													{ hasKey
														? __( 'A key is saved (stored encrypted, never exported). ', 'ai-marketing-expert' )
														: __( 'Free instant signup. ', 'ai-marketing-expert' ) }
													<a href={ keyUrl } target="_blank" rel="noreferrer">{ __( 'Get an API key', 'ai-marketing-expert' ) }</a>
												</>
											}
											onChange={ ( v ) => setField( keyField, v ) }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'In-body Stock Images', 'ai-marketing-expert' ) }
											help={ __( 'AI places relevant stock photos inside generated article text.', 'ai-marketing-expert' ) }
											value={ String( settings.inline_images || 0 ) }
											options={ INLINE_IMAGE_COUNTS }
											onChange={ ( v ) => setField( 'inline_images', parseInt( v, 10 ) || 0 ) }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'In-body Image Size', 'ai-marketing-expert' ) }
											help={ __( 'Display size of stock photos embedded inside articles.', 'ai-marketing-expert' ) }
											value={ settings.inline_image_size || 'large' }
											options={ INLINE_IMAGE_SIZES }
											onChange={ ( v ) => setField( 'inline_image_size', v ) }
											__nextHasNoMarginBottom
										/>
									</div>
									<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving } style={ { marginTop: 16 } }>
										{ saving
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
											: __( 'Save Settings', 'ai-marketing-expert' )
										}
									</Button>
								</div>
							);
						}

						/* Automation */
						return (
							<div className="aime-settings-form">
								{ ! hasPro && <div className="aime-pro-inline-action" style={ { marginBottom: 12 } }><ProLabel>{ __( 'Automation Settings', 'ai-marketing-expert' ) }</ProLabel><ProUpgradeButton /></div> }
								<ToggleControl
									label={ hasPro ? __( 'Auto SEO Optimize', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Auto SEO Optimize', 'ai-marketing-expert' ) }</ProLabel> }
									help={ __( 'Automatically run SEO scoring after article generation.', 'ai-marketing-expert' ) }
									checked={ hasPro && !! settings.auto_seo_optimize }
									onChange={ ( v ) => setField( 'auto_seo_optimize', v ) }
									disabled={ ! hasPro }
								/>
								<ToggleControl
									label={ hasPro ? __( 'Auto Generate Meta', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Auto Generate Meta', 'ai-marketing-expert' ) }</ProLabel> }
									help={ __( 'Automatically generate meta title and description.', 'ai-marketing-expert' ) }
									checked={ hasPro && !! settings.auto_generate_meta }
									onChange={ ( v ) => setField( 'auto_generate_meta', v ) }
									disabled={ ! hasPro }
								/>
								<ToggleControl
									label={ hasPro ? __( 'Auto Generate Excerpt', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Auto Generate Excerpt', 'ai-marketing-expert' ) }</ProLabel> }
									help={ __( 'Automatically generate article excerpt.', 'ai-marketing-expert' ) }
									checked={ hasPro && !! settings.auto_generate_excerpt }
									onChange={ ( v ) => setField( 'auto_generate_excerpt', v ) }
									disabled={ ! hasPro }
								/>
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

export default ContentSettings;
