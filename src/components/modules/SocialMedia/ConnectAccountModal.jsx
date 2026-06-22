/**
 * ConnectAccountModal - OAuth account connection flow.
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { TextControl } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import { toast } from '../../common/Toast';

/**
 * Per-platform manual connection guide.
 */
const PLATFORM_GUIDE = {
	facebook: {
		color:       '#1877F2',
		tokenLabel:  __( 'Page Access Token or User Access Token', 'ai-marketing-expert' ),
		nameLabel:    __( 'Page Name', 'ai-marketing-expert' ),
		namePlaceholder: __( 'Facebook page name', 'ai-marketing-expert' ),
		nameHelp:     __( 'This is the page name label shown inside the plugin for the connected Facebook Page.', 'ai-marketing-expert' ),
		needsSecret: false,
		steps: [
			{ n: 1, text: __( 'Go to', 'ai-marketing-expert' ), link: { href: 'https://developers.facebook.com', label: 'developers.facebook.com' }, after: __( 'and log in with the account that manages your Page.', 'ai-marketing-expert' ) },
			{ n: 2, text: __( 'Create or open an App (type "Business"), then open', 'ai-marketing-expert' ), link: { href: 'https://developers.facebook.com/tools/explorer/', label: 'Graph API Explorer' }, after: __( 'and select your App from the top-right dropdown.', 'ai-marketing-expert' ) },
			{ n: 3, text: __( 'Click "Generate Access Token" and add permissions: pages_show_list, pages_manage_posts, and pages_read_engagement. Complete the login dialog.', 'ai-marketing-expert' ) },
			{ n: 4, text: __( 'If Graph API Explorer still shows "User Token", that is okay. The plugin can now resolve your Page automatically when the token can access only one Page.', 'ai-marketing-expert' ) },
			{ n: 5, text: __( 'If your token can access multiple Pages, run', 'ai-marketing-expert' ), link: { href: 'https://developers.facebook.com/tools/explorer/', label: '/me/accounts' }, after: __( 'in Graph API Explorer and copy the Page ID you want to connect.', 'ai-marketing-expert' ) },
			{ n: 6, text: __( 'You can still switch from "User Token" to your Page in Graph API Explorer to get a Page Access Token, then paste that token below.', 'ai-marketing-expert' ) },
		],
	},
	instagram: {
		color:       '#E4405F',
		tokenLabel:  __( 'Instagram Access Token', 'ai-marketing-expert' ),
		nameLabel:    __( 'Account Name', 'ai-marketing-expert' ),
		namePlaceholder: __( 'Instagram account name', 'ai-marketing-expert' ),
		nameHelp:     __( 'This is the label shown inside the plugin for the connected Instagram account.', 'ai-marketing-expert' ),
		needsSecret: false,
		steps: [
			{ n: 1, text: __( 'Make sure your Instagram is a Professional account (Business or Creator). On Instagram: Profile → ☰ → Settings → Professional account.', 'ai-marketing-expert' ) },
			{ n: 2, text: __( 'Go to', 'ai-marketing-expert' ), link: { href: 'https://developers.facebook.com/apps', label: 'developers.facebook.com/apps' }, after: __( '→ create or open an App (type "Business").', 'ai-marketing-expert' ) },
			{ n: 3, text: __( 'In the left menu click "Add Product" → find "Instagram" → click "Set up" → choose "API setup with Instagram business login".', 'ai-marketing-expert' ) },
			{ n: 4, text: __( 'Scroll down in the Instagram setup page to find your account → click "Generate token" → log in when prompted. The token is already long-lived (60 days). No Facebook Page needed.', 'ai-marketing-expert' ) },
			{ n: 5, text: __( 'Copy the Access Token AND your Instagram User ID shown on the same page. Paste both in the fields below.', 'ai-marketing-expert' ) },
		],
	},
	x: {
		color:       '#000000',
		tokenLabel:  __( 'Access Token', 'ai-marketing-expert' ),
		nameLabel:    __( 'Account Name', 'ai-marketing-expert' ),
		namePlaceholder: __( 'X account name', 'ai-marketing-expert' ),
		nameHelp:     __( 'This is the label shown inside the plugin for the connected X account.', 'ai-marketing-expert' ),
		needsSecret: true,
		needsAppCredentials: true,
		apiKeyLabel: __( 'API Key (Consumer Key)', 'ai-marketing-expert' ),
		apiSecretLabel: __( 'API Secret (Consumer Secret / Secret Key)', 'ai-marketing-expert' ),
		apiKeyHelp: __( 'In X docs this is also called the Consumer Key.', 'ai-marketing-expert' ),
		apiSecretHelp: __( 'In X docs this is also called the Consumer Secret or Secret Key.', 'ai-marketing-expert' ),
		bearerTokenHelp: __( 'Bearer Token is not required for this plugin. X posting here uses OAuth 1.0a user context with API Key, API Secret, Access Token, and Access Token Secret.', 'ai-marketing-expert' ),
		steps: [
			{ n: 1, text: __( 'Go to', 'ai-marketing-expert' ), link: { href: 'https://developer.twitter.com/en/portal/projects-and-apps', label: 'developer.twitter.com' }, after: __( 'and create a Project + App.', 'ai-marketing-expert' ) },
			{ n: 2, text: __( 'Under App Settings → "User authentication settings", set permissions to Read and Write.', 'ai-marketing-expert' ) },
			{ n: 3, text: __( 'Go to the "Keys and Tokens" tab of your App.', 'ai-marketing-expert' ) },
			{ n: 4, text: __( 'Copy your Consumer Key and Secret Key. In this plugin those map to API Key and API Secret.', 'ai-marketing-expert' ) },
			{ n: 5, text: __( 'Under Authentication Tokens, generate an Access Token and Access Token Secret.', 'ai-marketing-expert' ) },
			{ n: 6, text: __( 'You do not need the Bearer Token for this plugin. Paste only those four values in the fields below.', 'ai-marketing-expert' ) },
		],
	},
};

const GuideStep = ( { step } ) => (
	<li style={ { display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, lineHeight: '1.5', color: 'var(--aime-text-muted)' } }>
		<span style={ {
			flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
			background: 'var(--aime-border)', color: 'var(--aime-text)',
			display: 'flex', alignItems: 'center', justifyContent: 'center',
			fontSize: 11, fontWeight: 700, marginTop: 1,
		} }>{ step.n }</span>
		<span>
			{ step.text }{ ' ' }
			{ step.link && (
				<a href={ step.link.href } target="_blank" rel="noreferrer noopener"
					style={ { color: 'var(--aime-primary)', textDecoration: 'underline' } }>
					{ step.link.label }
				</a>
			) }
			{ step.after && ' ' }{ step.after }
		</span>
	</li>
);

const pluginUrl = window.aimeData?.pluginUrl || '';

const platforms = [
	{
		id: 'facebook',
		name: 'Facebook',
		color: '#1877F2',
		icon: pluginUrl + 'assets/img/facebook-logo.svg',
		description: __( 'Connect your Facebook Page to publish posts.', 'ai-marketing-expert' ),
	},
	{
		id: 'instagram',
		name: 'Instagram',
		color: '#E4405F',
		icon: pluginUrl + 'assets/img/instagram-logo.svg',
		description: __( 'Connect Instagram Business to share photos & stories.', 'ai-marketing-expert' ),
	},
	{
		id: 'x',
		name: 'X (Twitter)',
		color: '#000000',
		icon: pluginUrl + 'assets/img/x-logo.svg',
		description: __( 'Connect your X account to post tweets.', 'ai-marketing-expert' ),
	},
];

const ConnectAccountModal = ( { account = null, onClose, onConnected } ) => {
	const { post, put, loading } = useApi();
	const isEditing = !! account;
	const [ step, setStep ] = useState( isEditing ? 'manual' : 'choose' ); // choose, connecting, manual
	const [ selectedPlatform, setSelectedPlatform ] = useState( account?.platform || null );
	const [ manualData, setManualData ] = useState( {
		name: account?.name || '',
		api_key: '',
		api_secret: '',
		access_token: '',
		access_secret: '',
		platform_user_id: account?.platform_user_id || '',
	} );

	const emptyManualData = {
		name: '',
		api_key: '',
		api_secret: '',
		access_token: '',
		access_secret: '',
		platform_user_id: '',
	};

	/*
	 * OAuth proxy connect - commented out until Facebook App verification is approved.
	 * Once verified, uncomment this and remove the handlePlatformSelect below.
	 *
	const handleOAuthConnect = async ( platform ) => {
		setSelectedPlatform( platform );
		setStep( 'connecting' );

		try {
			const res = await post( '/social/accounts/connect', { platform } );
			if ( res.url ) {
				const popup = window.open(
					res.url,
					'aime_social_auth',
					'width=600,height=700,scrollbars=yes'
				);

				let messageHandled = false;

				const handleMessage = async ( event ) => {
					// Only trust messages from our own origin (the bridge page is same-origin).
					if ( event.origin !== window.location.origin ) {
						return;
					}

					if ( event.data?.type === 'aime_oauth_error' ) {
						messageHandled = true;
						window.removeEventListener( 'message', handleMessage );
						toast( event.data.error || __( 'OAuth connection failed.', 'ai-marketing-expert' ), 'error' );
						setStep( 'choose' );
						return;
					}

					if ( event.data?.type !== 'aime_oauth_callback' ) {
						return;
					}

					messageHandled = true;
					window.removeEventListener( 'message', handleMessage );

					try {
						await post( '/social/accounts/callback', {
							// The provider may not echo `platform` back; fall back to the chosen one.
							platform: event.data.platform || platform,
							code: event.data.code,
							state: event.data.state,
						} );
						toast( __( 'Account connected successfully!', 'ai-marketing-expert' ) );
						onConnected();
					} catch ( err ) {
						toast( err.message, 'error' );
						setStep( 'choose' );
					}
				};

				window.addEventListener( 'message', handleMessage );

				const timer = setInterval( () => {
					if ( popup && popup.closed ) {
						clearInterval( timer );
						window.removeEventListener( 'message', handleMessage );
						if ( ! messageHandled ) {
							setStep( 'choose' );
						}
					}
				}, 1000 );
			} else if ( res.message ) {
				toast( res.message, 'info' );
				setStep( 'manual' );
			}
		} catch ( e ) {
			toast( e.message, 'error' );
			setStep( 'choose' );
		}
	};
	*/

	// Manual-only mode: go straight to manual connect form.
	const handlePlatformSelect = ( platform ) => {
		setSelectedPlatform( platform );
		setStep( 'manual' );
	};

	const handleManualConnect = async () => {
		if ( ! manualData.name ) {
			toast( __( 'Name is required.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		if ( ! isEditing && ! manualData.access_token ) {
			toast( __( 'Name and access token are required.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		if ( ! isEditing && selectedPlatform === 'facebook' && ! manualData.access_token.trim() ) {
			toast( __( 'A Facebook access token is required.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		if ( ! isEditing && selectedPlatform === 'x' && ( ! manualData.api_key || ! manualData.api_secret || ! manualData.access_secret ) ) {
			toast( __( 'X API key, API secret, access token, and access token secret are required.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		try {
			const payload = {
				platform: selectedPlatform,
				name: manualData.name,
				api_key: manualData.api_key,
				api_secret: manualData.api_secret,
				access_token: manualData.access_token,
				access_secret: manualData.access_secret,
				platform_user_id: manualData.platform_user_id,
			};

			if ( isEditing ) {
				await put( `/social/accounts/${ account.id }`, payload );
				toast( __( 'Account updated successfully!', 'ai-marketing-expert' ) );
			} else {
				await post( '/social/accounts/connect-manual', payload );
				toast( __( 'Account connected successfully!', 'ai-marketing-expert' ) );
			}
			onConnected();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	return (
		<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) onClose(); } }>
			<div className="aime-premium-modal" style={ { width: '520px', maxHeight: '80vh', overflow: 'auto' } }>
				<div className="aime-premium-modal-header">
					<h3>
						<span className="aime-premium-modal-icon">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
						</span>
						{ isEditing ? __( 'Edit Account', 'ai-marketing-expert' ) : __( 'Connect Account', 'ai-marketing-expert' ) }
					</h3>
					<button className="aime-modal-close" onClick={ onClose }>&times;</button>
				</div>

				<div className="aime-premium-modal-body">
					{ step === 'choose' && (
						<div className="aime-connect-platforms">
							<p style={ { marginBottom: 20, color: 'var(--aime-text-muted)' } }>
								{ __( 'Choose a platform to connect:', 'ai-marketing-expert' ) }
							</p>
							{ platforms.map( ( p ) => (
								<button
									key={ p.id }
									className="aime-platform-connect-btn"
									onClick={ () => handlePlatformSelect( p.id ) }
									disabled={ loading }
									style={ {
										display: 'flex', alignItems: 'center', gap: 14,
										width: '100%', padding: '16px 20px', marginBottom: 12,
										border: '2px solid var(--aime-border)', borderRadius: 12,
										background: 'var(--aime-bg)', cursor: 'pointer',
										transition: 'all 0.2s ease',
									} }
									onMouseEnter={ ( e ) => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.transform = 'translateY(-1px)'; } }
									onMouseLeave={ ( e ) => { e.currentTarget.style.borderColor = 'var(--aime-border)'; e.currentTarget.style.transform = 'none'; } }
								>
									<span style={ {
										width: 44, height: 44, borderRadius: 10,
										display: 'flex',
										alignItems: 'center', justifyContent: 'center',
									} }>
										<img src={ p.icon } alt={ p.name } style={ { width: 44, height: 44, objectFit: 'contain', borderRadius: 10 } } />
									</span>
									<div style={ { textAlign: 'left', flex: 1 } }>
										<div style={ { fontWeight: 600, fontSize: 15 } }>{ p.name }</div>
										<div style={ { fontSize: 12, color: 'var(--aime-text-muted)', marginTop: 2 } }>
											{ p.description }
										</div>
									</div>
									<span style={ { fontSize: 20, color: 'var(--aime-text-muted)' } }>&rarr;</span>
								</button>
							) ) }
						</div>
					) }

					{ step === 'manual' && ( () => {
						const guide = PLATFORM_GUIDE[ selectedPlatform ] || {};
						const platformObj = platforms.find( ( p ) => p.id === selectedPlatform );
						return (
							<div className="aime-manual-connect">

								{ /* Platform badge */ }
								<div style={ { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 } }>
									<img
										src={ platformObj?.icon }
										alt={ platformObj?.name }
										style={ { width: 28, height: 28, objectFit: 'contain' } }
									/>
									<span style={ { fontWeight: 600, fontSize: 15, color: 'var(--aime-text)' } }>
										{ platformObj?.name }
									</span>
									{ ! isEditing && (
									<button
										onClick={ () => { setStep( 'choose' ); setManualData( emptyManualData ); } }
										style={ { marginLeft: 'auto', fontSize: 12, color: 'var(--aime-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 } }
									>
										{ __( 'Change platform', 'ai-marketing-expert' ) }
									</button>
									)}
								</div>

								{ /* Step-by-step guide */ }
								<div style={ {
									background: 'var(--aime-bg)',
									border: '1px solid var(--aime-border)',
									borderRadius: 10,
									padding: '14px 16px',
									marginBottom: 20,
								} }>
									<p style={ { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--aime-text-muted)', margin: '0 0 10px' } }>
										{ __( 'How to get your access token', 'ai-marketing-expert' ) }
									</p>
									<ol style={ { margin: 0, padding: 0, listStyle: 'none' } }>
										{ ( guide.steps || [] ).map( ( s ) => (
											<GuideStep key={ s.n } step={ s } />
										) ) }
									</ol>
								</div>

								{ /* Form fields */ }
								<TextControl
									label={ guide.nameLabel || __( 'Account Name', 'ai-marketing-expert' ) }
									value={ manualData.name }
									onChange={ ( v ) => setManualData( { ...manualData, name: v } ) }
									placeholder={ guide.namePlaceholder || __( 'Enter an account name', 'ai-marketing-expert' ) }
									help={ guide.nameHelp || __( 'This is the label shown inside the plugin for the connected account.', 'ai-marketing-expert' ) }
									__nextHasNoMarginBottom
								/>
								{ isEditing && (
									<p style={ { margin: '10px 0 0', fontSize: 12, color: 'var(--aime-text-muted)' } }>
										{ __( 'Leave token and secret fields blank to keep the current saved values.', 'ai-marketing-expert' ) }
									</p>
								)}
								{ guide.needsAppCredentials && (
									<>
										<div style={ { marginTop: 14 } }>
											<TextControl
												label={ guide.apiKeyLabel || __( 'API Key', 'ai-marketing-expert' ) }
												value={ manualData.api_key }
												onChange={ ( v ) => setManualData( { ...manualData, api_key: v } ) }
												placeholder={ __( 'Paste your X API key here', 'ai-marketing-expert' ) }
												help={ guide.apiKeyHelp }
												__nextHasNoMarginBottom
											/>
										</div>
										<div style={ { marginTop: 14 } }>
											<TextControl
												label={ guide.apiSecretLabel || __( 'API Secret', 'ai-marketing-expert' ) }
												value={ manualData.api_secret }
												onChange={ ( v ) => setManualData( { ...manualData, api_secret: v } ) }
												placeholder={ __( 'Paste your X API secret here', 'ai-marketing-expert' ) }
												type="password"
												help={ guide.apiSecretHelp }
												__nextHasNoMarginBottom
											/>
										</div>
										<p style={ { margin: '12px 0 0', fontSize: 12, color: 'var(--aime-text-muted)' } }>
											{ guide.bearerTokenHelp }
										</p>
									</>
								) }
								<div style={ { marginTop: 14 } }>
									<TextControl
										label={ guide.tokenLabel || __( 'Access Token', 'ai-marketing-expert' ) }
										value={ manualData.access_token }
										onChange={ ( v ) => setManualData( { ...manualData, access_token: v } ) }
										placeholder="Paste your access token here"
										__nextHasNoMarginBottom
									/>
								</div>
								{ guide.needsSecret && (
									<div style={ { marginTop: 14 } }>
										<TextControl
											label={ __( 'Access Token Secret', 'ai-marketing-expert' ) }
											value={ manualData.access_secret }
											onChange={ ( v ) => setManualData( { ...manualData, access_secret: v } ) }
											placeholder={ __( 'Paste your access token secret here', 'ai-marketing-expert' ) }
											help={ __( 'Required for X (Twitter) — found in Keys and Tokens tab.', 'ai-marketing-expert' ) }
											__nextHasNoMarginBottom
										/>
									</div>
								) }
								{ selectedPlatform === 'instagram' && (
									<div style={ { marginTop: 14 } }>
										<TextControl
											label={ __( 'Instagram User ID', 'ai-marketing-expert' ) }
											value={ manualData.platform_user_id }
											onChange={ ( v ) => setManualData( { ...manualData, platform_user_id: v } ) }
											placeholder={ __( 'e.g. 17841400000000000', 'ai-marketing-expert' ) }
											help={ __( 'Found on App Dashboard → Instagram → API setup page, next to your account. Leave blank to auto-detect.', 'ai-marketing-expert' ) }
											__nextHasNoMarginBottom
										/>
									</div>
								) }
								{ selectedPlatform === 'facebook' && (
									<div style={ { marginTop: 14 } }>
										<TextControl
											label={ __( 'Facebook Page ID (Optional)', 'ai-marketing-expert' ) }
											value={ manualData.platform_user_id }
											onChange={ ( v ) => setManualData( { ...manualData, platform_user_id: v } ) }
											placeholder={ __( 'Paste a Page ID if your token manages multiple Pages', 'ai-marketing-expert' ) }
											help={ __( 'Leave blank when the token belongs to one Page only. If you use a user token with multiple Pages, this field tells the plugin which Page to connect.', 'ai-marketing-expert' ) }
											__nextHasNoMarginBottom
										/>
									</div>
								) }
							</div>
						);
					} )() }
				</div>

				<div className="aime-premium-modal-footer">
					<button className="aime-btn-cancel" onClick={ onClose }>
						{ __( 'Cancel', 'ai-marketing-expert' ) }
					</button>
					{ step === 'manual' && (
						<button
							className="aime-btn-primary"
							onClick={ handleManualConnect }
							disabled={ loading }
						>
											{ loading ? ( isEditing ? __( 'Saving...', 'ai-marketing-expert' ) : __( 'Connecting...', 'ai-marketing-expert' ) ) : ( isEditing ? __( 'Save Changes', 'ai-marketing-expert' ) : __( 'Connect', 'ai-marketing-expert' ) ) }
						</button>
					) }
				</div>
			</div>
		</div>
	);
};

export default ConnectAccountModal;
