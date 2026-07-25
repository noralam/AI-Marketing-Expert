/**
 * Bot Editor - tabbed form for creating / editing a chatbot.
 * Tabs: General, Appearance, Lead Capture, Page Rules, Advanced.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	TextControl,
	TextareaControl,
	SelectControl,
	ToggleControl,
	TabPanel,
	Spinner,
} from '@aime/wp-components';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ProGate from '../../../common/ProGate';
import ProLock, { ProLabel } from '../../../common/ProLock';
import { toast } from '../../../common/Toast';

const THEME_OPTIONS = [
	{ label: 'Default (Indigo)', value: 'default' },
	{ label: 'Modern (Dark)', value: 'modern' },
	{ label: 'Minimal (Green)', value: 'minimal' },
];

const POSITION_OPTIONS = [
	{ label: 'Bottom Right', value: 'bottom-right' },
	{ label: 'Bottom Left', value: 'bottom-left' },
];

const FREE_LEAD_TRIGGERS = [ 'start', 'after_messages' ];
const VALID_LEAD_TRIGGERS = [ 'start', 'after_messages', 'ai_intent' ];

const getLeadTriggerOptions = ( hasPro ) => [
	{ label: __( 'Start with lead form', 'ai-marketing-expert' ), value: 'start' },
	{ label: __( 'After X messages', 'ai-marketing-expert' ), value: 'after_messages' },
	{ label: hasPro ? __( 'On AI detection', 'ai-marketing-expert' ) : __( 'On AI detection (Pro)', 'ai-marketing-expert' ), value: 'ai_intent' },
];

const RESPONSE_TONE_OPTIONS = [
	{ label: 'Friendly', value: 'friendly' },
	{ label: 'Professional', value: 'professional' },
	{ label: 'Neutral', value: 'neutral' },
];

const RESPONSE_LENGTH_OPTIONS = [
	{ label: 'Short', value: 'short' },
	{ label: 'Balanced', value: 'balanced' },
	{ label: 'Detailed', value: 'detailed' },
];

const RESPONSE_STYLE_OPTIONS = [
	{ label: 'Confident', value: 'confident' },
	{ label: 'Careful', value: 'careful' },
	{ label: 'Sales-focused', value: 'sales' },
];

const TABS = [
	{ name: 'general', title: __( 'General', 'ai-marketing-expert' ) },
	{ name: 'appearance', title: __( 'Appearance', 'ai-marketing-expert' ) },
	{ name: 'lead-capture', title: __( 'Lead Capture', 'ai-marketing-expert' ) },
	{ name: 'page-rules', title: __( 'Page Rules', 'ai-marketing-expert' ) },
	{ name: 'advanced', title: __( 'Advanced', 'ai-marketing-expert' ) },
];

const DEFAULT_BOT = {
	name: '',
	welcome_message: 'Hi! How can I help you today?',
	system_prompt: '',
	status: 'active',
	theme_id: 'default',
	position: 'bottom-right',
	offset_y: 0,
	offset_x: 0,
	primary_color: '#4f46e5',
	bubble_icon: 'chat',
	page_rules: '[]',
	lead_capture_config: JSON.stringify( {
		enabled: true,
		trigger: 'after_messages',
		trigger_count: 3,
		fields: [ 'email', 'name' ],
		heading: 'Get in touch',
	} ),
	banned_words: '',
	max_history_messages: 20,
	response_tone: 'friendly',
	response_length: 'short',
	response_style: 'confident',
	sales_focused: false,
	custom_response_style: '',
};

const BotEditor = ( { id, onBack, onNavigate } ) => {
	const { get, post, put, loading, error, clearError } = useApi();
	const { hasPro } = usePro();
	const [ bot, setBot ] = useState( null );
	const [ saving, setSaving ] = useState( false );
	const [ success, setSuccess ] = useState( '' );
	const isNew = ! id;

	const fetchBot = useCallback( async () => {
		if ( isNew ) {
			setBot( { ...DEFAULT_BOT } );
			return;
		}
		try {
			const res = await get( `/chatbot/bots/${ id }` );
			// Unpack theme_config to flat fields for editing.
			const tc = res.theme_config || {};
			const kc = res.knowledge_config || {};
			setBot( {
				...res,
				theme_id: res.theme_id || 'default',
				position: tc.position || 'bottom-right',
				offset_y: Number( tc.offset_y || 0 ),
				offset_x: Number( tc.offset_x || 0 ),
				primary_color: tc.primary_color || '#4f46e5',
				bubble_icon: tc.bubble_icon || 'chat',
				max_history_messages: kc.max_history_messages || 20,
				response_tone: kc.response_tone || 'friendly',
				response_length: kc.response_length || 'short',
				response_style: kc.response_style || 'confident',
				sales_focused: !! kc.sales_focused,
				custom_response_style: kc.custom_response_style || '',
			} );
		} catch ( e ) {
			// silent
		}
	}, [ get, id, isNew ] );

	useEffect( () => {
		fetchBot();
	}, [ fetchBot ] );

	const setField = ( key, value ) => {
		setBot( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const renderOffsetControl = ( { field, label, help, negativeLabel, positiveLabel } ) => {
		const value = Number( bot?.[ field ] ?? 0 );

		return (
			<div
				className="aime-form-group"
				style={ {
					padding: '16px',
					border: '1px solid #d7dbe0',
					borderRadius: '12px',
					background: '#fff',
					boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
				} }
			>
				<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 } }>
					<div>
						<label style={ { display: 'block', marginBottom: 4, fontWeight: 600 } }>{ label }</label>
						<div className="aime-form-help" style={ { margin: 0 } }>{ help }</div>
					</div>
					<div style={ { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 } }>
						<div
							style={ {
								minWidth: 64,
								padding: '6px 10px',
								borderRadius: '999px',
								background: value === 0 ? '#eef2ff' : '#eff6ff',
								color: '#1e293b',
								fontSize: 12,
								fontWeight: 600,
								textAlign: 'center',
							} }
						>
							{ value }px
						</div>
						<Button
							variant="secondary"
							onClick={ () => setField( field, 0 ) }
							disabled={ value === 0 }
							style={ { whiteSpace: 'nowrap' } }
						>
							{ __( 'Reset 0', 'ai-marketing-expert' ) }
						</Button>
					</div>
				</div>
				<input
					type="range"
					min="-200"
					max="200"
					step="1"
					value={ value }
					onChange={ ( e ) => setField( field, parseInt( e.target.value, 10 ) || 0 ) }
					style={ { width: '100%', accentColor: '#4f46e5', margin: '4px 0 8px' } }
				/>
				<div style={ { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: '#64748b' } }>
					<span>{ negativeLabel }</span>
					<span>{ __( '0 center', 'ai-marketing-expert' ) }</span>
					<span>{ positiveLabel }</span>
				</div>
			</div>
		);
	};

	const getLeadConfig = () => {
		try {
			return typeof bot.lead_capture_config === 'string'
				? JSON.parse( bot.lead_capture_config )
				: ( bot.lead_capture_config || {} );
		} catch {
			return { enabled: true, trigger: 'after_messages', trigger_count: 3, fields: [ 'email', 'name' ], heading: 'Get in touch' };
		}
	};

	const setLeadField = ( key, value ) => {
		const config = getLeadConfig();
		config[ key ] = value;
		setField( 'lead_capture_config', JSON.stringify( config ) );
	};

	const getPageRules = () => {
		try {
			return typeof bot.page_rules === 'string'
				? JSON.parse( bot.page_rules )
				: ( bot.page_rules || [] );
		} catch {
			return [];
		}
	};

	const setPageRules = ( rules ) => {
		setField( 'page_rules', JSON.stringify( rules ) );
	};

	const addPageRule = () => {
		if ( ! hasPro ) {
			toast( __( 'Page display rules require Pro.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		const rules = getPageRules();
		rules.push( { type: 'include', pattern: '/*' } );
		setPageRules( rules );
	};

	const normalizeLeadFields = ( fields ) => {
		const selected = Array.isArray( fields ) ? fields : [];
		return hasPro ? selected : selected.filter( ( field ) => [ 'email', 'name' ].includes( field ) );
	};

	const updatePageRule = ( index, key, value ) => {
		const rules = getPageRules();
		rules[ index ][ key ] = value;
		setPageRules( rules );
	};

	const removePageRule = ( index ) => {
		const rules = getPageRules();
		rules.splice( index, 1 );
		setPageRules( rules );
	};

	const handleSave = async () => {
		if ( ! bot.name?.trim() ) {
			toast( __( 'Bot name is required.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setSaving( true );
		setSuccess( '' );
		try {
			// Build payload that matches PHP data structure.
			const payload = {
				name: bot.name,
				status: bot.status || 'active',
				system_prompt: hasPro ? ( bot.system_prompt || '' ) : '',
				welcome_message: bot.welcome_message || '',
				theme_id: bot.theme_id || 'default',
				theme_config: {
					position: bot.position || 'bottom-right',
					offset_y: Math.max( -200, Math.min( 200, parseInt( bot.offset_y, 10 ) || 0 ) ),
					offset_x: Math.max( -200, Math.min( 200, parseInt( bot.offset_x, 10 ) || 0 ) ),
					primary_color: bot.primary_color || '#4f46e5',
					bubble_icon: bot.bubble_icon || 'chat',
				},
				lead_capture_config: {
					...getLeadConfig(),
					trigger: ( () => {
						const t = getLeadConfig().trigger || 'after_messages';
						if ( ! VALID_LEAD_TRIGGERS.includes( t ) ) return 'after_messages';
						return hasPro || FREE_LEAD_TRIGGERS.includes( t ) ? t : 'after_messages';
					} )(),
					fields: normalizeLeadFields( getLeadConfig().fields || [ 'email', 'name' ] ),
				},
				knowledge_config: {
					max_history_messages: Math.max( 1, parseInt( bot.max_history_messages, 10 ) || 20 ),
					response_tone: bot.response_tone || 'friendly',
					response_length: hasPro ? ( bot.response_length || 'short' ) : 'short',
					response_style: hasPro ? ( bot.response_style || 'confident' ) : 'confident',
					sales_focused: hasPro ? !! bot.sales_focused : false,
					custom_response_style: bot.custom_response_style || '',
				},
				page_rules: hasPro ? getPageRules() : [],
				offline_message: bot.offline_message || '',
				business_hours: typeof bot.business_hours === 'string'
					? JSON.parse( bot.business_hours || '{}' )
					: ( bot.business_hours || {} ),
				banned_words: hasPro ? ( bot.banned_words || '' ) : '',
			};
			if ( isNew ) {
				const res = await post( '/chatbot/bots', payload );
				toast( __( 'Chatbot created!', 'ai-marketing-expert' ) );
				onNavigate( 'edit-bot', { id: res.id } );
			} else {
				await put( `/chatbot/bots/${ id }`, payload );
				setSuccess( __( 'Chatbot saved.', 'ai-marketing-expert' ) );
			}
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSaving( false );
		}
	};

	if ( loading && ! bot ) {
		return <Loader text={ __( 'Loading chatbot...', 'ai-marketing-expert' ) } />;
	}

	if ( ! bot ) return null;

	const leadConfig = getLeadConfig();
	const pageRules = getPageRules();
	const freeLeadFields = [ 'email', 'name' ];

	return (
		<div className="aime-bot-editor">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ success && <Notice type="success" message={ success } dismissible onDismiss={ () => setSuccess( '' ) } /> }

			<div className="aime-page-header">
				<h2>
					<Button variant="link" onClick={ onBack } style={ { marginRight: 8 } }>
						{ '\u2190' } { __( 'Back', 'ai-marketing-expert' ) }
					</Button>
					{ isNew ? __( 'New Chatbot', 'ai-marketing-expert' ) : bot.name || __( 'Edit Chatbot', 'ai-marketing-expert' ) }
				</h2>
				<div className="aime-page-header-actions">
					<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving }>
						{ saving
							? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
							: isNew ? __( 'Create Chatbot', 'ai-marketing-expert' ) : __( 'Save Changes', 'ai-marketing-expert' )
						}
					</Button>
				</div>
			</div>

			<Card>
				<TabPanel tabs={ TABS }>
					{ ( tab ) => {
						/* General tab */
						if ( tab.name === 'general' ) {
							return (
								<div className="aime-settings-form">
									<div className="aime-form-grid aime-form-grid-2">
										<TextControl
											label={ __( 'Bot Name', 'ai-marketing-expert' ) }
											value={ bot.name || '' }
											onChange={ ( v ) => setField( 'name', v ) }
											placeholder={ __( 'e.g. Support Bot', 'ai-marketing-expert' ) }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'Status', 'ai-marketing-expert' ) }
											value={ bot.status || 'inactive' }
											options={ [
												{ label: __( 'Active', 'ai-marketing-expert' ), value: 'active' },
												{ label: __( 'Inactive', 'ai-marketing-expert' ), value: 'inactive' },
											] }
											onChange={ ( v ) => setField( 'status', v ) }
											__nextHasNoMarginBottom
										/>
									</div>
									<TextareaControl
										label={ __( 'Welcome Message', 'ai-marketing-expert' ) }
										help={ __( 'Shown when a visitor opens the chat.', 'ai-marketing-expert' ) }
										value={ bot.welcome_message || '' }
										onChange={ ( v ) => setField( 'welcome_message', v ) }
										rows={ 3 }
									/>
									<TextareaControl
										label={ __( 'System Prompt', 'ai-marketing-expert' ) }
										help={ __( 'Instructions for the AI. Use {site_name}, {bot_name}, {page_url} as placeholders.', 'ai-marketing-expert' ) }
										value={ bot.system_prompt || '' }
										onChange={ ( v ) => setField( 'system_prompt', v ) }
										placeholder={ __( 'Example: You are {bot_name} for {site_name}. Give clear, helpful answers and guide visitors using the current page context from {page_url}.', 'ai-marketing-expert' ) }
										rows={ 6 }
										disabled={ ! hasPro }
									/>
									{ ! hasPro && (
										<Notice type="info" message={ __( 'System Prompt with advanced placeholders is available in Pro.', 'ai-marketing-expert' ) } />
									) }
									<div className="aime-form-grid aime-form-grid-3">
										<SelectControl
											label={ __( 'Answer Tone', 'ai-marketing-expert' ) }
											value={ bot.response_tone || 'friendly' }
											options={ RESPONSE_TONE_OPTIONS }
											onChange={ ( v ) => setField( 'response_tone', v ) }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ hasPro ? __( 'Answer Length', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Answer Length', 'ai-marketing-expert' ) }</ProLabel> }
											value={ bot.response_length || 'short' }
											options={ RESPONSE_LENGTH_OPTIONS }
											onChange={ ( v ) => setField( 'response_length', hasPro ? v : 'short' ) }
											disabled={ ! hasPro }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ hasPro ? __( 'Answer Style', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Answer Style', 'ai-marketing-expert' ) }</ProLabel> }
											value={ bot.response_style || 'confident' }
											options={ RESPONSE_STYLE_OPTIONS }
											onChange={ ( v ) => setField( 'response_style', hasPro ? v : 'confident' ) }
											disabled={ ! hasPro }
											__nextHasNoMarginBottom
										/>
									</div>
									<ToggleControl
										label={ hasPro ? __( 'Sales-focused product answers', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Sales-focused product answers', 'ai-marketing-expert' ) }</ProLabel> }
										help={ __( 'When product knowledge is relevant, highlight benefits and include purchase links when available.', 'ai-marketing-expert' ) }
										checked={ !! bot.sales_focused }
										onChange={ ( v ) => setField( 'sales_focused', hasPro ? v : false ) }
										disabled={ ! hasPro }
									/>
									<TextareaControl
										label={ __( 'Custom Response Style', 'ai-marketing-expert' ) }
										help={ __( 'Optional extra style instructions for chatbot answers.', 'ai-marketing-expert' ) }
										value={ bot.custom_response_style || '' }
										onChange={ ( v ) => setField( 'custom_response_style', v ) }
										placeholder={ __( 'Example: Answer with the direct result first, then add a short helpful recommendation at the end.', 'ai-marketing-expert' ) }
										rows={ 3 }
									/>
								</div>
							);
						}

						/* Appearance tab */
						if ( tab.name === 'appearance' ) {
							return (
								<div className="aime-settings-form">
									<div className="aime-form-grid aime-form-grid-2">
										<SelectControl
											label={ hasPro ? __( 'Theme', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Theme', 'ai-marketing-expert' ) }</ProLabel> }
											value={ bot.theme_id || 'default' }
											options={ THEME_OPTIONS }
											onChange={ ( v ) => setField( 'theme_id', hasPro ? v : 'default' ) }
											disabled={ ! hasPro }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __( 'Position', 'ai-marketing-expert' ) }
											value={ bot.position || 'bottom-right' }
											options={ POSITION_OPTIONS }
											onChange={ ( v ) => setField( 'position', v ) }
											__nextHasNoMarginBottom
										/>
									</div>
									<div className="aime-form-grid aime-form-grid-2">
										{ renderOffsetControl( {
											field: 'offset_y',
											label: __( 'Top / Bottom Offset', 'ai-marketing-expert' ),
											help: __( 'Move the widget vertically from its selected corner, up to +/- 200px.', 'ai-marketing-expert' ),
											negativeLabel: __( '-200 up', 'ai-marketing-expert' ),
											positiveLabel: __( '+200 down', 'ai-marketing-expert' ),
										} ) }
										{ renderOffsetControl( {
											field: 'offset_x',
											label: __( 'Left / Right Offset', 'ai-marketing-expert' ),
											help: __( 'Move the widget horizontally from its selected corner, up to +/- 200px.', 'ai-marketing-expert' ),
											negativeLabel: __( '-200 left', 'ai-marketing-expert' ),
											positiveLabel: __( '+200 right', 'ai-marketing-expert' ),
										} ) }
									</div>
									<ProLock locked={ ! hasPro }>
									<div className="aime-form-group">
										<label>{ hasPro ? __( 'Primary Color', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Primary Color', 'ai-marketing-expert' ) }</ProLabel> }</label>
										<div style={ { display: 'flex', alignItems: 'center', gap: 12 } }>
											<input
												type="color"
												value={ bot.primary_color || '#4f46e5' }
												onChange={ ( e ) => setField( 'primary_color', e.target.value ) }
												style={ { width: 48, height: 36, border: 'none', cursor: 'pointer' } }
											/>
											<TextControl
												value={ bot.primary_color || '#4f46e5' }
												onChange={ ( v ) => setField( 'primary_color', v ) }
												__nextHasNoMarginBottom
												style={ { width: 120 } }
											/>
										</div>
									</div>
									</ProLock>
									<ProLock locked={ ! hasPro }>
									<TextControl
										label={ hasPro ? __( 'Bubble Icon', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Bubble Icon', 'ai-marketing-expert' ) }</ProLabel> }
										help={ __( 'Icon type: chat, help, bot, support', 'ai-marketing-expert' ) }
										value={ bot.bubble_icon || 'chat' }
										onChange={ ( v ) => setField( 'bubble_icon', v ) }
										__nextHasNoMarginBottom
									/>
									</ProLock>
									{ ! hasPro && (
										<Notice type="info" message={ __( 'Upgrade to Pro for custom theme colors and branding options.', 'ai-marketing-expert' ) } />
									) }
								</div>
							);
						}

						/* Lead capture tab */
						if ( tab.name === 'lead-capture' ) {
							return (
								<div className="aime-settings-form">
									<ToggleControl
										label={ __( 'Enable Lead Capture', 'ai-marketing-expert' ) }
										help={ __( 'Show a lead form to visitors during chat.', 'ai-marketing-expert' ) }
										checked={ !! leadConfig.enabled }
										onChange={ ( v ) => setLeadField( 'enabled', v ) }
									/>
									{ leadConfig.enabled && (
										<>
											<SelectControl
												label={ __( 'Trigger', 'ai-marketing-expert' ) }
												value={ VALID_LEAD_TRIGGERS.includes( leadConfig.trigger ) ? leadConfig.trigger : 'after_messages' }
												options={ getLeadTriggerOptions( hasPro ) }
												onChange={ ( v ) => setLeadField( 'trigger', hasPro || FREE_LEAD_TRIGGERS.includes( v ) ? v : 'after_messages' ) }
												__nextHasNoMarginBottom
											/>
											{ ( leadConfig.trigger || 'after_messages' ) === 'after_messages' && (
												<TextControl
													label={ __( 'Trigger After Messages', 'ai-marketing-expert' ) }
													type="number"
													value={ leadConfig.trigger_count || 3 }
													onChange={ ( v ) => setLeadField( 'trigger_count', Math.max( 1, parseInt( v, 10 ) || 3 ) ) }
													__nextHasNoMarginBottom
												/>
											) }
											<TextControl
												label={ __( 'Form Heading', 'ai-marketing-expert' ) }
												value={ leadConfig.heading || '' }
												onChange={ ( v ) => setLeadField( 'heading', v ) }
												__nextHasNoMarginBottom
											/>
											<div className="aime-form-group">
												<label>{ __( 'Fields', 'ai-marketing-expert' ) }</label>
												<div style={ { display: 'flex', gap: 16, flexWrap: 'wrap' } }>
															{ [ 'email', 'name', 'phone', 'company' ].map( ( field ) => {
																const isLockedField = ! hasPro && ! freeLeadFields.includes( field );

																return (
														<label key={ field } style={ { display: 'flex', alignItems: 'center', gap: 4 } }>
															<input
																type="checkbox"
																checked={ ( leadConfig.fields || [] ).includes( field ) }
																		disabled={ isLockedField }
																onChange={ ( e ) => {
																			if ( isLockedField ) return;
																	const fields = [ ...( leadConfig.fields || [] ) ];
																	if ( e.target.checked ) {
																		fields.push( field );
																	} else {
																		const idx = fields.indexOf( field );
																		if ( idx > -1 ) fields.splice( idx, 1 );
																	}
																	setLeadField( 'fields', fields );
																} }
															/>
																	{ field.charAt( 0 ).toUpperCase() + field.slice( 1 ) }{ isLockedField ? ' (Pro)' : '' }
														</label>
																);
															} ) }
												</div>
											</div>
													{ ! hasPro && (
														<Notice type="info" message={ __( 'Free plan lead capture includes email and name fields. Phone, company, and advanced triggers require Pro.', 'ai-marketing-expert' ) } />
													) }
										</>
									) }
								</div>
							);
						}

						/* Page rules tab */
						if ( tab.name === 'page-rules' ) {
							return (
								<div className="aime-settings-form">
									<p className="description">
										{ __( 'Control on which pages this chatbot is displayed. Leave empty to show on all pages. Use patterns like /products/* or /contact.', 'ai-marketing-expert' ) }
									</p>

									<ProLock locked={ ! hasPro }>
									{ pageRules.map( ( rule, index ) => (
										<div key={ index } className="aime-form-grid aime-form-grid-3" style={ { alignItems: 'end', marginBottom: 8 } }>
											<SelectControl
												label={ index === 0 ? __( 'Type', 'ai-marketing-expert' ) : '' }
												value={ rule.type || 'include' }
												options={ [
													{ label: __( 'Include', 'ai-marketing-expert' ), value: 'include' },
													{ label: __( 'Exclude', 'ai-marketing-expert' ), value: 'exclude' },
												] }
												onChange={ ( v ) => updatePageRule( index, 'type', v ) }
												__nextHasNoMarginBottom
											/>
											<TextControl
												label={ index === 0 ? __( 'URL Pattern', 'ai-marketing-expert' ) : '' }
												value={ rule.pattern || '' }
												onChange={ ( v ) => updatePageRule( index, 'pattern', v ) }
												placeholder="/products/*"
												__nextHasNoMarginBottom
											/>
											<Button
												isDestructive
												variant="tertiary"
												onClick={ () => removePageRule( index ) }
												style={ { color: '#d63638', whiteSpace: 'nowrap', alignSelf: 'center' } }
											>
												{ __( 'Remove', 'ai-marketing-expert' ) }
											</Button>
										</div>
									) ) }

									<Button variant="secondary" onClick={ addPageRule } style={ { marginTop: 8 } }>
										{ __( '+ Add Rule', 'ai-marketing-expert' ) }
									</Button>
									</ProLock>

									{ ! hasPro && (
										<Notice type="info" message={ __( 'Page display rules require Pro.', 'ai-marketing-expert' ) } />
									) }
								</div>
							);
						}

						/* Advanced tab */
						return (
							<div className="aime-settings-form">
								<ProGate feature={ __( 'Advanced Settings', 'ai-marketing-expert' ) } description={ __( 'Configure advanced chatbot options like banned words, message history, and more.', 'ai-marketing-expert' ) }>
									<TextareaControl
										label={ __( 'Banned Words', 'ai-marketing-expert' ) }
										help={ __( 'Enter one word or phrase per line to block from visitor messages.', 'ai-marketing-expert' ) }
										value={ bot.banned_words || '' }
										onChange={ ( v ) => setField( 'banned_words', v ) }
										rows={ 3 }
									/>
									<TextControl
										label={ __( 'Max History Messages', 'ai-marketing-expert' ) }
										help={ __( 'Number of conversation messages included in AI context.', 'ai-marketing-expert' ) }
										type="number"
										value={ bot.max_history_messages || 20 }
										onChange={ ( v ) => setField( 'max_history_messages', parseInt( v ) || 20 ) }
										__nextHasNoMarginBottom
									/>
								</ProGate>
							</div>
						);
					} }
				</TabPanel>
			</Card>
		</div>
	);
};

export default BotEditor;
