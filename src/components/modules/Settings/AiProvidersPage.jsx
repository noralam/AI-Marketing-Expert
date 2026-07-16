/**
 * AI Providers - standalone settings page for managing AI connections.
 */

import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	TextControl,
	SelectControl,
	ComboboxControl,
	ToggleControl,
	Modal,
	Spinner,
} from '@aime/wp-components';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import { ProLabel, ProUpgradeButton } from '../../common/ProLock';
import useApi from '../../../hooks/useApi';
import { FREE_LIMITS } from '../../../utils/constants';

/* AI provider logo paths (SVG) */
const pluginUrl = window.aimeData?.pluginUrl || '';
const aiProviderLogos = {
	google_ai:  pluginUrl + 'assets/img/google-aistudio.svg',
	openai:     pluginUrl + 'assets/img/open-ai.svg',
	openrouter: pluginUrl + 'assets/img/openrouter.svg',
	anthropic:  pluginUrl + 'assets/img/claude.svg',
};

/* AI empty connection form */
const emptyAiForm = {
	name:              '',
	provider:          '',
	api_key:           '',
	text_model:        '',
	image_model:       '',
	custom_text_model: '',
	custom_image_model:'',
	primary_for:       [],
	enabled:           true,
	api_format:        'openai',
	base_url:          '',
};

const modelTypeLabels = {
	text:  __( 'Main Model', 'ai-marketing-expert' ),
	image: __( 'Image Model', 'ai-marketing-expert' ),
};

const AiProvidersPage = () => {
	const { loading, get, post, del } = useApi();
	const [ notice, setNotice ] = useState( null );

	// AI connections state.
	const [ aiConnections, setAiConnections ] = useState( [] );
	const [ aiProviders, setAiProviders ] = useState( {} );
	const [ aiShowModal, setAiShowModal ] = useState( false );
	const [ aiEditId, setAiEditId ] = useState( null );
	const [ aiForm, setAiForm ] = useState( { ...emptyAiForm } );
	const [ aiSaving, setAiSaving ] = useState( false );
	const [ aiTesting, setAiTesting ] = useState( {} );
	const [ aiDeleting, setAiDeleting ] = useState( null );
	const [ aiFetchedModels, setAiFetchedModels ] = useState( null );
	const [ aiFetchingModels, setAiFetchingModels ] = useState( false );
	const [ aiTestResults, setAiTestResults ] = useState( {} );
	const hasPro = !! window.aimeData?.hasPro;
	const aiProviderLimit = FREE_LIMITS.ai_provider_connections || 2;
	const aiProviderLimitReached = ! hasPro && aiConnections.length >= aiProviderLimit;

	// AI usage dashboard state.
	const [ pageTab, setPageTab ] = useState( 'providers' );
	const [ usage, setUsage ] = useState( null );
	const [ usageDays, setUsageDays ] = useState( 30 );
	const [ usageLoading, setUsageLoading ] = useState( false );

	useEffect( () => {
		loadConnections();
	}, [] );

	useEffect( () => {
		if ( pageTab !== 'usage' ) {
			return;
		}
		let cancelled = false;
		( async () => {
			setUsageLoading( true );
			try {
				const res = await get( `/ai/usage?days=${ usageDays }` );
				if ( ! cancelled ) {
					setUsage( res.usage || res );
				}
			} catch ( err ) {
				// Usage table may not exist yet — hide the section silently.
			} finally {
				if ( ! cancelled ) {
					setUsageLoading( false );
				}
			}
		} )();
		return () => { cancelled = true; };
	}, [ usageDays, pageTab ] );

	const loadConnections = async () => {
		try {
			const aiData = await get( '/ai/connections' );
			setAiConnections( aiData.connections || [] );
			setAiProviders( aiData.providers || {} );
		} catch ( err ) {
			// AI might not exist yet.
		}
	};

	/* AI connection handlers */

	const aiOpenCreate = () => {
		if ( aiProviderLimitReached ) {
			setNotice( {
				type: 'warning',
				message: sprintf(
					__( 'Free plan includes %d AI provider connections. Upgrade to Pro for unlimited providers.', 'ai-marketing-expert' ),
					aiProviderLimit
				),
			} );
			return;
		}

		setAiEditId( null );
		setAiFetchedModels( null );
		setAiForm( {
			...emptyAiForm,
			primary_for: aiConnections.length === 0 ? [ 'text', 'image' ] : [],
		} );
		setAiShowModal( true );
	};

	const aiOpenEdit = ( conn ) => {
		setAiEditId( conn.id );
		setAiFetchedModels( null );
		setAiForm( {
			name:               conn.name || '',
			provider:           conn.provider || '',
			api_key:            '',
			text_model:         conn.text_model || '',
			image_model:        conn.image_model || '',
			custom_text_model:  conn.custom_text_model || '',
			custom_image_model: conn.custom_image_model || '',
			primary_for:        conn.primary_for || [],
			enabled:            conn.enabled !== false,
			api_format:         conn.api_format || 'openai',
			base_url:           conn.base_url || '',
			_hasStoredKey:      !! conn.has_key,
		} );
		setAiShowModal( true );
	};

	const aiCloseModal = () => {
		setAiShowModal( false );
		setAiEditId( null );
	};

	const aiHandleProviderSelect = ( providerId ) => {
		const p = aiProviders[ providerId ];
		if ( ! p ) return;

		setAiFetchedModels( null );

		if ( providerId === 'custom' ) {
			// Custom providers have no preset models — let the user type a model ID,
			// and don't auto-fill the connection name.
			setAiForm( ( prev ) => ( {
				...prev,
				provider:    'custom',
				text_model:  'custom',
				image_model: '',
				api_format:  prev.api_format || 'openai',
			} ) );
			return;
		}

		setAiForm( ( prev ) => ( {
			...prev,
			provider:    providerId,
			text_model:  '',
			image_model: '',
			name:        prev.name || p.name,
		} ) );
	};

	const aiHandleSave = async () => {
		if ( ! aiForm.name.trim() ) {
			setNotice( { type: 'error', message: __( 'Connection name is required.', 'ai-marketing-expert' ) } );
			return;
		}
		if ( ! aiForm.provider ) {
			setNotice( { type: 'error', message: __( 'Please select a provider.', 'ai-marketing-expert' ) } );
			return;
		}
		if ( aiForm.provider === 'custom' && ! aiForm.base_url.trim() ) {
			setNotice( { type: 'error', message: __( 'Base URL is required for a custom provider.', 'ai-marketing-expert' ) } );
			return;
		}
		if ( ! aiEditId && aiProviderLimitReached ) {
			setNotice( {
				type: 'warning',
				message: sprintf(
					__( 'Free plan includes %d AI provider connections. Upgrade to Pro for unlimited providers.', 'ai-marketing-expert' ),
					aiProviderLimit
				),
			} );
			return;
		}

		setAiSaving( true );
		try {
			const payload = { ...aiForm };
			if ( aiEditId ) {
				payload.id = aiEditId;
			}
			const res = await post( '/ai/connections', payload );
			setNotice( { type: 'success', message: res.message || __( 'Connection saved.', 'ai-marketing-expert' ) } );
			aiCloseModal();
			setAiConnections( res.data?.connections || [] );
			setAiProviders( res.data?.providers || aiProviders );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setAiSaving( false );
		}
	};

	const aiHandleDelete = async ( id ) => {
		if ( ! window.confirm( __( 'Delete this AI connection?', 'ai-marketing-expert' ) ) ) {
			return;
		}
		setAiDeleting( id );
		try {
			const res = await del( `/ai/connections/${ id }` );
			setNotice( { type: 'success', message: res.message || __( 'Connection deleted.', 'ai-marketing-expert' ) } );
			setAiConnections( res.data?.connections || [] );
			setAiProviders( res.data?.providers || aiProviders );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setAiDeleting( null );
		}
	};

	const aiHandleTest = async ( id ) => {
		setAiTesting( ( prev ) => ( { ...prev, [ id ]: true } ) );
		try {
			const result = await post( `/ai/connections/${ id }/test` );
			setAiTestResults( ( prev ) => ( { ...prev, [ id ]: result.success ? 'ok' : 'fail' } ) );
			setNotice( {
				type: result.success ? 'success' : 'error',
				message: result.message,
			} );
		} catch ( err ) {
			setAiTestResults( ( prev ) => ( { ...prev, [ id ]: 'fail' } ) );
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setAiTesting( ( prev ) => ( { ...prev, [ id ]: false } ) );
		}
	};

	const aiHandleSetPrimary = async ( conn, tasks = [ 'text', 'image' ] ) => {
		setAiSaving( true );
		try {
			const newPrimaryFor = Array.from( new Set( [ ...( conn.primary_for || [] ), ...tasks ] ) );
			const res = await post( '/ai/connections', { id: conn.id, ...conn, primary_for: newPrimaryFor } );
			setNotice( { type: 'success', message: __( 'Primary connection updated.', 'ai-marketing-expert' ) } );
			setAiConnections( res.data?.connections || [] );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setAiSaving( false );
		}
	};

	const aiHandleToggleEnabled = async ( conn ) => {
		try {
			const res = await post( '/ai/connections', { id: conn.id, ...conn, enabled: ! conn.enabled } );
			setAiConnections( res.data?.connections || [] );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		}
	};

	/* Fetch available models from provider API. silent = auto-fetch (no notices). */
	const aiFetchModels = async ( silent = false ) => {
		if ( ! aiForm.provider ) return;

		setAiFetchingModels( true );
		try {
			const payload = { provider: aiForm.provider };
			if ( aiForm.api_key ) {
				payload.api_key = aiForm.api_key;
			} else if ( aiEditId ) {
				payload.connection_id = aiEditId;
			}
			if ( aiForm.provider === 'custom' ) {
				payload.base_url = aiForm.base_url;
				payload.api_format = aiForm.api_format;
			}
			const res = await post( '/ai/fetch-models', payload );
			if ( res.success ) {
				setAiFetchedModels( res.models );
				// No preset lists shipped anymore — auto-select the recommended
				// (or first) fetched text model if nothing is chosen yet.
				const rec = ( res.models?.text || [] ).find( ( m ) => m.recommended ) || ( res.models?.text || [] )[ 0 ];
				if ( rec ) {
					setAiForm( ( prev ) => ( prev.text_model ? prev : { ...prev, text_model: rec.id } ) );
				}
				if ( ! silent ) {
					setNotice( { type: 'success', message: __( 'Models fetched successfully.', 'ai-marketing-expert' ) } );
				}
			} else if ( ! silent ) {
				setNotice( { type: 'error', message: res.message || __( 'Failed to fetch models.', 'ai-marketing-expert' ) } );
			}
		} catch ( err ) {
			if ( ! silent ) {
				setNotice( { type: 'error', message: err.message } );
			}
		} finally {
			setAiFetchingModels( false );
		}
	};

	/* Auto-fetch models: when a key is typed (debounced), or when editing a
	   connection that already has a stored key. Silent — no notices while typing. */
	useEffect( () => {
		if ( ! aiShowModal || ! aiForm.provider ) return;
		if ( aiForm.provider === 'custom' && ! aiForm.base_url.trim() ) return;

		const hasTypedKey  = !! aiForm.api_key && aiForm.api_key.length >= 10;
		const hasStoredKey = !! aiEditId && !! aiForm._hasStoredKey && ! aiForm.api_key;
		if ( ! hasTypedKey && ! hasStoredKey ) return;

		const timer = setTimeout( () => aiFetchModels( true ), hasTypedKey ? 800 : 100 );
		return () => clearTimeout( timer );
	}, [ aiShowModal, aiForm.api_key, aiForm.provider, aiForm.base_url, aiForm.api_format, aiEditId ] );

	/* Get model label by id */
	const getModelLabel = ( providerDef, type, modelId ) => {
		const models = providerDef?.models?.[ type ] || [];
		const found = models.find( ( m ) => m.id === modelId );
		return found ? found.name : modelId || '—';
	};

	/* Current form provider definition */
	const formProviderDef = aiProviders[ aiForm.provider ] || null;

	/* Helper: check if a provider has any connected (has_key) connection */
	const providerConnStatus = useCallback( ( providerId ) => {
		const conns = aiConnections.filter( ( c ) => c.provider === providerId );
		if ( conns.length === 0 ) return null; // no connection at all
		return conns.some( ( c ) => c.has_key ) ? 'connected' : 'disconnected';
	}, [ aiConnections ] );

	const getHealthBadge = ( conn ) => {
		if ( conn.key_decrypt_failed ) {
			return {
				className: 'aime-ai-conn-invalid',
				label: __( 'Re-enter API Key', 'ai-marketing-expert' ),
			};
		}

		if ( conn.health_status === 'rate_limited' ) {
			return {
				className: 'aime-ai-conn-invalid',
				label: __( 'Limit reached', 'ai-marketing-expert' ),
			};
		}

		if ( conn.health_status === 'cooldown' ) {
			return {
				className: 'aime-ai-conn-configured',
				label: __( 'Cooling down', 'ai-marketing-expert' ),
			};
		}

		if ( conn.health_status === 'auth_error' ) {
			return {
				className: 'aime-ai-conn-invalid',
				label: __( 'Invalid API Key', 'ai-marketing-expert' ),
			};
		}

		return null;
	};

	const getHealthText = ( conn ) => {
		if ( conn.key_decrypt_failed ) {
			return __( 'The stored API key could not be decrypted — your site security keys may have changed. Edit this connection and re-enter the API key.', 'ai-marketing-expert' );
		}

		if ( ! conn.health_status || conn.health_status === 'available' ) {
			return '';
		}

		if ( conn.health_status === 'auth_error' ) {
			return __( 'Requests are paused until the API key is fixed.', 'ai-marketing-expert' );
		}

		if ( conn.retry_after ) {
			const retryDate = new Date( conn.retry_after * 1000 );
			return sprintf( __( 'Requests paused until %s.', 'ai-marketing-expert' ), retryDate.toLocaleString() );
		}

		return __( 'Requests are temporarily paused for this provider.', 'ai-marketing-expert' );
	};

	const sortedAiConnections = useMemo( () => {
		return aiConnections
			.map( ( conn, index ) => ( { conn, index } ) )
			.sort( ( a, b ) => {
				const aPrimary = ( a.conn.primary_for || [] ).length > 0;
				const bPrimary = ( b.conn.primary_for || [] ).length > 0;

				if ( aPrimary !== bPrimary ) {
					return aPrimary ? -1 : 1;
				}

				return b.index - a.index;
			} )
			.map( ( item ) => item.conn );
	}, [ aiConnections ] );

	if ( loading ) {
		return <Loader text={ __( 'Loading AI providers...', 'ai-marketing-expert' ) } />;
	}

	return (
		<div className="aime-settings-page">
			{ notice && ! aiShowModal && (
				<Notice type={ notice.type } message={ notice.message } onDismiss={ () => setNotice( null ) } />
			) }

			{ /* Header */ }
			<div className="aime-section-header" style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } }>
				<div>
					<h2 style={ { margin: 0 } }>{ __( 'AI Providers', 'ai-marketing-expert' ) }</h2>
					<p className="aime-card-description" style={ { margin: '4px 0 0' } }>
						{ __( 'Configure one or more AI provider connections. Assign different providers for text and image tasks. Unassigned connections serve as automatic fallbacks.', 'ai-marketing-expert' ) }
					</p>
				</div>
				{ pageTab === 'providers' && (
					<Button variant="primary" onClick={ aiOpenCreate }>
						<span className="aime-pro-inline-action">
							{ __( '+ Add Provider', 'ai-marketing-expert' ) }
							{ aiProviderLimitReached && <ProLabel>{ __( 'Pro', 'ai-marketing-expert' ) }</ProLabel> }
						</span>
					</Button>
				) }
			</div>

			{ /* Page tabs */ }
			<div style={ { display: 'flex', gap: 4, marginBottom: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 6, width: 'fit-content' } }>
				{ [
					{ id: 'providers', label: __( 'Providers', 'ai-marketing-expert' ) },
					{ id: 'usage', label: __( 'Usage & Cost', 'ai-marketing-expert' ) },
				].map( ( t ) => (
					<button
						key={ t.id }
						type="button"
						className={ `aime-settings-tab${ pageTab === t.id ? ' is-active' : '' }` }
						style={ { width: 'auto' } }
						onClick={ () => setPageTab( t.id ) }
					>
						{ t.label }
					</button>
				) ) }
			</div>

			{ pageTab === 'providers' && ! hasPro && (
				<Notice
					type={ aiProviderLimitReached ? 'warning' : 'info' }
					message={ sprintf(
						__( 'Free plan includes %1$d AI provider connections. You currently have %2$d. Upgrade to Pro for unlimited providers.', 'ai-marketing-expert' ),
						aiProviderLimit,
						aiConnections.length
					) }
				/>
			) }

			{ /* Empty state */ }
			{ pageTab === 'providers' && aiConnections.length === 0 && (
				<Card>
					<div style={ { textAlign: 'center', padding: '40px 20px' } }>
						<p style={ { fontSize: 48, margin: '0 0 12px' } }>{ '\uD83E\uDD16' }</p>
						<h3 style={ { margin: '0 0 8px' } }>{ __( 'No AI Providers', 'ai-marketing-expert' ) }</h3>
						<p className="aime-card-description" style={ { margin: '0 0 16px' } }>
							{ __( 'Add your first AI provider connection to enable AI-powered content generation.', 'ai-marketing-expert' ) }
						</p>
						<Button variant="primary" onClick={ aiOpenCreate }>
							{ __( '+ Add Provider', 'ai-marketing-expert' ) }
						</Button>
					</div>
				</Card>
			) }

			{ /* Connection cards */ }
			{ pageTab === 'providers' && (
			<div className="aime-ai-providers-list">
				{ sortedAiConnections.map( ( conn ) => {
					const provDef = aiProviders[ conn.provider ] || {};
					const logo = aiProviderLogos[ conn.provider ] || '';
					const healthBadge = getHealthBadge( conn );
					const healthText = getHealthText( conn );

					return (
						<div
							key={ conn.id }
							className={ `aime-ai-provider-card${ conn.enabled ? '' : ' aime-ai-card-disabled' }` }
						>
							<div className="aime-ai-card-header">
								<div className="aime-ai-card-provider">
									{ logo
										? <img className="aime-ai-card-icon" src={ logo } alt={ provDef.name || '' } />
										: <span className="aime-ai-card-icon">{ '\uD83E\uDD16' }</span>
									}
									<div>
										<strong className="aime-ai-card-name">{ conn.name || __( 'Unnamed', 'ai-marketing-expert' ) }</strong>
										<span className="aime-ai-card-desc">{ provDef.name || conn.provider }</span>
									</div>								{ /* Connection status */ }
								{ healthBadge && (
									<span className={ `aime-ai-conn-status ${ healthBadge.className }` }>{ healthBadge.label }</span>
								) }
								{ ! healthBadge && conn.has_key && aiTestResults[ conn.id ] === 'fail' && (
									<span className="aime-ai-conn-status aime-ai-conn-invalid">{ __( 'Invalid API Key', 'ai-marketing-expert' ) }</span>
								) }
								{ ! healthBadge && conn.has_key && aiTestResults[ conn.id ] !== 'fail' && (
									<span className="aime-ai-conn-status aime-ai-conn-connected">{ __( 'Connected', 'ai-marketing-expert' ) }</span>
								) }
								{ ! healthBadge && ! conn.has_key && (
									<span className="aime-ai-conn-status aime-ai-conn-nokey">{ __( 'No API Key', 'ai-marketing-expert' ) }</span>
								) }								</div>
								<div className="aime-ai-card-badges">
									{ ( conn.primary_for || [] ).includes( 'text' ) && ( conn.primary_for || [] ).includes( 'image' ) && (
										<span className="aime-badge aime-badge-primary">{ __( 'Primary', 'ai-marketing-expert' ) }</span>
									) }
									{ ( conn.primary_for || [] ).includes( 'text' ) && ! ( conn.primary_for || [] ).includes( 'image' ) && (
										<span className="aime-badge aime-badge-primary">{ __( 'Text Primary', 'ai-marketing-expert' ) }</span>
									) }
									{ ( conn.primary_for || [] ).includes( 'image' ) && ! ( conn.primary_for || [] ).includes( 'text' ) && (
										<span className="aime-badge aime-badge-primary">{ __( 'Image Primary', 'ai-marketing-expert' ) }</span>
									) }
									{ ( conn.primary_for || [] ).length === 0 && conn.enabled && (
										<span className="aime-badge aime-badge-fallback">{ __( 'Fallback', 'ai-marketing-expert' ) }</span>
									) }
									{ ! conn.enabled && (
										<span className="aime-badge aime-badge-disabled">{ __( 'Disabled', 'ai-marketing-expert' ) }</span>
									) }
								</div>
							</div>

							{ conn.enabled && (
								<div className="aime-ai-card-meta">
									<span>{ __( 'Text:', 'ai-marketing-expert' ) } { getModelLabel( provDef, 'text', conn.text_model ) }</span>
									<span>{ __( 'Image:', 'ai-marketing-expert' ) } { conn.image_model ? getModelLabel( provDef, 'image', conn.image_model ) : __( 'Auto-fallback', 'ai-marketing-expert' ) }</span>
									{ healthText && <span>{ healthText }</span> }
								</div>
							) }

							<div className="aime-ai-card-actions">
								<div className="aime-ai-card-buttons">
									<Button
										variant="secondary"
										size="small"
										onClick={ () => aiOpenEdit( conn ) }
									>
										{ __( 'Edit', 'ai-marketing-expert' ) }
									</Button>

									<Button
										variant="tertiary"
										size="small"
										onClick={ () => aiHandleTest( conn.id ) }
										isBusy={ aiTesting[ conn.id ] }
										disabled={ aiTesting[ conn.id ] || ! conn.has_key }
									>
										{ aiTesting[ conn.id ]
												? <><Spinner style={ { marginRight: 4 } } />{ __( 'Testing…', 'ai-marketing-expert' ) }</>
											: __( 'Test', 'ai-marketing-expert' )
										}
									</Button>

									{ conn.enabled && ( conn.primary_for || [] ).length < 2 && (
										<Button
											variant="tertiary"
											size="small"
											onClick={ () => aiHandleSetPrimary( conn ) }
										>
											{ __( 'Set Primary', 'ai-marketing-expert' ) }
										</Button>
									) }

									<Button
										variant="tertiary"
										size="small"
										isDestructive
										isBusy={ aiDeleting === conn.id }
										disabled={ aiDeleting === conn.id }
										onClick={ () => aiHandleDelete( conn.id ) }
									>
										{ aiDeleting === conn.id
												? <><Spinner style={ { marginRight: 4 } } />{ __( 'Deleting…', 'ai-marketing-expert' ) }</>
											: __( 'Delete', 'ai-marketing-expert' )
										}
									</Button>
								</div>

								<ToggleControl
									checked={ !! conn.enabled }
									onChange={ () => aiHandleToggleEnabled( conn ) }
									__nextHasNoMarginBottom
								/>
							</div>
						</div>
					);
				} ) }
			</div>
			) }

			{ /* AI Usage & Cost dashboard */ }
			{ pageTab === 'usage' && (
				<Card>
					<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } }>
						<h3 style={ { margin: 0 } }>{ __( 'AI Usage & Cost', 'ai-marketing-expert' ) }</h3>
						<SelectControl
							value={ String( usageDays ) }
							options={ [
								{ value: '7', label: __( 'Last 7 days', 'ai-marketing-expert' ) },
								{ value: '30', label: __( 'Last 30 days', 'ai-marketing-expert' ) },
								{ value: '90', label: __( 'Last 90 days', 'ai-marketing-expert' ) },
							] }
							onChange={ ( v ) => setUsageDays( parseInt( v, 10 ) || 30 ) }
							__nextHasNoMarginBottom
						/>
					</div>

					{ usageLoading && <Spinner /> }

					{ ! usageLoading && ( ! usage?.totals || ! usage.totals.calls ) && (
						<p style={ { color: '#94a3b8', textAlign: 'center', padding: 20, margin: 0 } }>
							{ __( 'No AI usage recorded yet. Data appears here after your first AI generation.', 'ai-marketing-expert' ) }
						</p>
					) }

					{ ! usageLoading && usage?.totals && usage.totals.calls > 0 && (
						<>
							<div style={ { display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 } }>
								<div>
									<strong style={ { fontSize: 20, display: 'block' } }>{ usage.totals.calls }</strong>
									<span className="aime-card-description">{ __( 'API calls', 'ai-marketing-expert' ) }</span>
								</div>
								<div>
									<strong style={ { fontSize: 20, display: 'block' } }>{ usage.totals.failures }</strong>
									<span className="aime-card-description">{ __( 'Failures', 'ai-marketing-expert' ) }</span>
								</div>
								<div>
									<strong style={ { fontSize: 20, display: 'block' } }>
										{ Number( usage.totals.prompt_tokens + usage.totals.completion_tokens ).toLocaleString() }
									</strong>
									<span className="aime-card-description">{ __( 'Total tokens', 'ai-marketing-expert' ) }</span>
								</div>
								<div>
									<strong style={ { fontSize: 20, display: 'block' } }>
										{ usage.totals.estimated_cost !== null && usage.totals.estimated_cost !== undefined
											? `$${ Number( usage.totals.estimated_cost ).toFixed( 4 ) }${ usage.totals.cost_is_partial ? '+' : '' }`
											: '—'
										}
									</strong>
									<span className="aime-card-description">
										{ __( 'Estimated cost', 'ai-marketing-expert' ) }
										{ usage.totals.cost_is_partial ? ' ' + __( '(some models unpriced)', 'ai-marketing-expert' ) : '' }
									</span>
								</div>
							</div>

							{ ( usage.by_model || [] ).length > 0 && (
								<table className="widefat striped" style={ { marginBottom: 4 } }>
									<thead>
										<tr>
											<th>{ __( 'Connection', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Model', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Task', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Calls', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Tokens (in / out)', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Est. cost', 'ai-marketing-expert' ) }</th>
										</tr>
									</thead>
									<tbody>
										{ usage.by_model.map( ( row, i ) => (
											<tr key={ i }>
												<td>{ row.connection_name || row.connection_id || '—' }</td>
												<td>{ row.model || '—' }</td>
												<td>{ row.task || 'text' }</td>
												<td>{ row.calls }</td>
												<td>{ Number( row.prompt_tokens ).toLocaleString() } / { Number( row.completion_tokens ).toLocaleString() }</td>
												<td>
													{ row.estimated_cost !== null && row.estimated_cost !== undefined
														? `$${ Number( row.estimated_cost ).toFixed( 4 ) }`
														: '—'
													}
												</td>
											</tr>
										) ) }
									</tbody>
								</table>
							) }
						</>
					) }
				</Card>
			) }

			{ /* Add / Edit Provider Modal */ }
			{ aiShowModal && (
				<Modal
					title={ aiEditId ? __( 'Edit AI Provider', 'ai-marketing-expert' ) : __( 'Add AI Provider', 'ai-marketing-expert' ) }
					onRequestClose={ aiCloseModal }
					className="aime-ai-modal"
				>
					<div className="aime-ai-modal-body">
						{ notice && (
							<Notice type={ notice.type } message={ notice.message } onDismiss={ () => setNotice( null ) } />
						) }

						{ /* Connection name */ }
						<TextControl
							label={ __( 'Connection Name', 'ai-marketing-expert' ) }
							value={ aiForm.name }
							onChange={ ( v ) => setAiForm( ( prev ) => ( { ...prev, name: v } ) ) }
							placeholder={ __( 'e.g. Google AI Primary', 'ai-marketing-expert' ) }
							__nextHasNoMarginBottom
						/>

						{ /* Provider picker grid */ }
						<div className="aime-ai-provider-section">
							<label className="components-base-control__label">
								{ __( 'Select AI Provider', 'ai-marketing-expert' ) }
							</label>
							<div className="aime-ai-providers-grid">
							{ Object.entries( aiProviders ).map( ( [ id, prov ] ) => {
								const status = providerConnStatus( id );
								return (
									<button
										key={ id }
										type="button"
										className={ `aime-ai-picker-card${ aiForm.provider === id ? ' aime-ai-picker-selected' : '' }` }
										onClick={ () => aiHandleProviderSelect( id ) }
									>
										{ aiProviderLogos[ id ]
											? <img className="aime-ai-picker-icon" src={ aiProviderLogos[ id ] } alt={ prov.name || '' } />
											: <span className="aime-ai-picker-icon">{ '\uD83E\uDD16' }</span>
										}
										<strong>{ prov.name }</strong>
										{ status === 'connected' && (
											<span className="aime-ai-picker-status aime-ai-picker-connected">{ __( 'Connected', 'ai-marketing-expert' ) }</span>
										) }
										{ status === 'disconnected' && (
											<span className="aime-ai-picker-status aime-ai-picker-disconnected">{ __( 'No API Key', 'ai-marketing-expert' ) }</span>
										) }
										{ aiForm.provider === id && <span className="aime-ai-picker-check">✓</span> }
									</button>
								);
							} ) }
							</div>
						</div>

						{ /* API Key */ }
						{ aiForm.provider && (
							<div className="aime-ai-config animate__animated animate__fadeIn animate__faster">
								{ /* Custom provider: API format + Base URL */ }
								{ aiForm.provider === 'custom' && (
									<>
										<SelectControl
											label={ __( 'API Format', 'ai-marketing-expert' ) }
											value={ aiForm.api_format }
											options={ [
												{ value: 'openai', label: __( 'OpenAI-compatible', 'ai-marketing-expert' ) },
												{ value: 'anthropic', label: __( 'Anthropic-compatible', 'ai-marketing-expert' ) },
											] }
											onChange={ ( v ) => setAiForm( ( prev ) => ( { ...prev, api_format: v } ) ) }
											__nextHasNoMarginBottom
										/>
										<TextControl
											label={ __( 'Base URL', 'ai-marketing-expert' ) }
											value={ aiForm.base_url }
											placeholder="https://your-endpoint/v1"
											onChange={ ( v ) => setAiForm( ( prev ) => ( { ...prev, base_url: v } ) ) }
											help={ __( 'The API base, e.g. https://your-endpoint/v1 (no trailing slash needed).', 'ai-marketing-expert' ) }
											__nextHasNoMarginBottom
										/>
									</>
								) }
								{ /* Connected / No Key badge */ }
								{ aiEditId && aiForm._hasStoredKey && (
									<div className="aime-ai-key-status aime-ai-key-connected">
										<span className="aime-ai-key-dot"></span>
										{ __( 'Connected', 'ai-marketing-expert' ) }
									</div>
								) }
								{ aiEditId && ! aiForm._hasStoredKey && (
									<div className="aime-ai-key-status aime-ai-key-missing">
										<span className="aime-ai-key-dot"></span>
										{ __( 'No API Key', 'ai-marketing-expert' ) }
									</div>
								) }
								<TextControl
									label={ __( 'API Key', 'ai-marketing-expert' ) }
									type="password"
									value={ aiForm.api_key }
									placeholder={ aiEditId && aiForm._hasStoredKey ? '••••••••••••••••' : '' }
									onChange={ ( v ) => setAiForm( ( prev ) => ( { ...prev, api_key: v } ) ) }
									help={
										<span>
											{ aiEditId && aiForm._hasStoredKey
												? __( 'Leave blank to keep current key. ', 'ai-marketing-expert' )
												: ''
											}
											{ __( 'Get your API key from', 'ai-marketing-expert' ) }{ ' ' }
											<a href={ formProviderDef?.docs_url || '#' } target="_blank" rel="noopener noreferrer">
												{ formProviderDef?.name || __( 'provider docs', 'ai-marketing-expert' ) }
											</a>
										</span>
									}
									__nextHasNoMarginBottom
								/>

								{ /* Model selection */ }
								<div className="aime-ai-modal-models">
									<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
										<h4 style={ { margin: 0 } }>{ __( 'Model Selection', 'ai-marketing-expert' ) }</h4>
										<Button
											variant="secondary"
											size="small"
											onClick={ () => aiFetchModels( false ) }
											isBusy={ aiFetchingModels }
											disabled={ aiFetchingModels || ( ! aiForm.api_key && ! aiEditId ) }
										>
										{ aiFetchingModels ? <><Spinner style={ { marginRight: 4 } } />{ __( 'Fetching…', 'ai-marketing-expert' ) }</> : __( 'Fetch Available Models', 'ai-marketing-expert' ) }
										</Button>
									</div>
									<Notice
										type="info"
										message={ __( '💡 Models load automatically once you enter your API key. Use "Fetch Available Models" to refresh the list, or type a custom model ID manually.', 'ai-marketing-expert' ) }
										dismissible={ false }
									/>
									{ aiFetchedModels && (
										<p className="components-base-control__help" style={ { margin: '4px 0 8px' } }>
											{ __( 'Showing live models from provider API — newest first.', 'ai-marketing-expert' ) }
										</p>
									) }
									<div className="aime-form-row">
										{ [ 'text', 'image' ].map( ( type ) => {
											// When fetched, show all models in both dropdowns (image dropdown gets text+image combined).
											let models;
											if ( aiFetchedModels ) {
												if ( type === 'text' ) {
													models = aiFetchedModels.text || [];
												} else {
													// Combine image + text models, deduplicate by ID.
													const seen = new Set();
													models = [ ...( aiFetchedModels.image || [] ), ...( aiFetchedModels.text || [] ) ]
														.filter( ( m ) => { if ( seen.has( m.id ) ) return false; seen.add( m.id ); return true; } );
												}
											} else {
												models = formProviderDef?.models?.[ type ] || [];
											}
										const noneOption = type === 'image'
											? [ { value: '', label: __( '— None (auto-fallback) —', 'ai-marketing-expert' ) } ]
											: [];

										const modelKey = `${ type }_model`;
										const currentVal = aiForm[ modelKey ] || '';

										// Build base options from models list.
										const baseOptions = models.map( ( m ) => ( {
											value: m.id,
											label: m.name + ( m.recommended ? ' ★' : '' ),
										} ) );

										// If current value isn't in the options (e.g. previously fetched model), inject it.
										const hasCurrentInList = ! currentVal || currentVal === 'custom' || baseOptions.some( ( o ) => o.value === currentVal );
										const currentOption = ! hasCurrentInList
											? [ { value: currentVal, label: currentVal + ' (saved)' } ]
											: [];

										const options = [
											...noneOption,
											...currentOption,
											...baseOptions,
											{ value: 'custom', label: __( '— Custom —', 'ai-marketing-expert' ) },
										];

										const customKey = `custom_${ type }_model`;

											return (
												<div key={ type } className="aime-ai-modal-model-col">
														<ComboboxControl
															label={ modelTypeLabels[ type ] }
															value={ aiForm[ modelKey ] || '' }
															options={ options }
															onChange={ ( val ) => setAiForm( ( prev ) => ( { ...prev, [ modelKey ]: val || '' } ) ) }
														__nextHasNoMarginBottom
													/>													{ type === 'image' && (
														<p className="components-base-control__help" style={ { margin: '4px 0 0', color: '#b45309' } }>
															{ __( '⚠ Not all models support image generation.', 'ai-marketing-expert' ) }
														</p>
													) }													{ aiForm[ modelKey ] === 'custom' && (
														<TextControl
															label={ __( 'Custom Model ID', 'ai-marketing-expert' ) }
															value={ aiForm[ customKey ] || '' }
															onChange={ ( val ) => setAiForm( ( prev ) => ( { ...prev, [ customKey ]: val } ) ) }
															__nextHasNoMarginBottom
														/>
													) }
												</div>
											);
										} ) }
									</div>
								</div>
							</div>
						) }

						{ /* Primary for task type */ }
						<div className="aime-ai-modal-primary">
							<label className="components-base-control__label" style={ { display: 'block', marginBottom: 8 } }>
								{ __( 'Set as Primary For', 'ai-marketing-expert' ) }
							</label>
							<div style={ { display: 'flex', gap: 16 } }>
								<ToggleControl
									label={ __( 'Text / Chat', 'ai-marketing-expert' ) }
									checked={ ( aiForm.primary_for || [] ).includes( 'text' ) }
									onChange={ ( v ) => setAiForm( ( prev ) => {
										const pf = prev.primary_for || [];
										return { ...prev, primary_for: v ? [ ...pf, 'text' ] : pf.filter( ( t ) => t !== 'text' ) };
									} ) }
									__nextHasNoMarginBottom
								/>
								<ToggleControl
									label={ __( 'Image Generation', 'ai-marketing-expert' ) }
									checked={ ( aiForm.primary_for || [] ).includes( 'image' ) }
									onChange={ ( v ) => setAiForm( ( prev ) => {
										const pf = prev.primary_for || [];
										return { ...prev, primary_for: v ? [ ...pf, 'image' ] : pf.filter( ( t ) => t !== 'image' ) };
									} ) }
									__nextHasNoMarginBottom
								/>
							</div>
							<p className="components-base-control__help" style={ { marginTop: 4 } }>
								{ __( 'Choose which task types this connection handles first. You can assign text and image to different providers.', 'ai-marketing-expert' ) }
							</p>
						</div>
					</div>

					{ /* Modal footer */ }
					<div className="aime-ai-modal-footer">
						<Button variant="tertiary" onClick={ aiCloseModal }>
							{ __( 'Cancel', 'ai-marketing-expert' ) }
						</Button>
						<Button
							variant="primary"
							onClick={ aiHandleSave }
							isBusy={ aiSaving }
							disabled={ aiSaving || ( ! aiEditId && aiProviderLimitReached ) }
						>
							{ aiSaving
								? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving…', 'ai-marketing-expert' ) }</>
								: aiEditId ? __( 'Update Provider', 'ai-marketing-expert' ) : __( 'Add Provider', 'ai-marketing-expert' )
							}
						</Button>
						{ ! aiEditId && aiProviderLimitReached && <ProUpgradeButton /> }
					</div>
				</Modal>
			) }
		</div>
	);
};

export default AiProvidersPage;
