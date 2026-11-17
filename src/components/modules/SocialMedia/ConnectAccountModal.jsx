/**
 * ConnectAccountModal - OAuth account connection flow.
 */

import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { TextControl, Spinner, Button } from '@aime/wp-components';
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
			{ n: 1, isWarning: true, text: __( 'Notice: X.com (Twitter) API is NOT free. It is a premium/pay-as-you-go service and requires paid credits to publish posts.', 'ai-marketing-expert' ) },
			{ n: 2, text: __( 'Go to', 'ai-marketing-expert' ), link: { href: 'https://developer.twitter.com/en/portal/projects-and-apps', label: 'developer.twitter.com' }, after: __( 'and create a Project + App.', 'ai-marketing-expert' ) },
			{ n: 3, text: __( 'Under App Settings → "User authentication settings", set permissions to Read and Write.', 'ai-marketing-expert' ) },
			{ n: 4, text: __( 'Go to the "Keys and Tokens" tab of your App.', 'ai-marketing-expert' ) },
			{ n: 5, text: __( 'Copy your Consumer Key and Secret Key. In this plugin those map to API Key and API Secret.', 'ai-marketing-expert' ) },
			{ n: 6, text: __( 'Under Authentication Tokens, generate an Access Token and Access Token Secret.', 'ai-marketing-expert' ) },
			{ n: 7, text: __( 'You do not need the Bearer Token for this plugin. Paste only those four values in the fields below.', 'ai-marketing-expert' ) },
		],
	},
	linkedin: {
		color:       '#0A66C2',
		tokenLabel:  __( 'LinkedIn Access Token', 'ai-marketing-expert' ),
		nameLabel:    __( 'Account / Company Name', 'ai-marketing-expert' ),
		namePlaceholder: __( 'LinkedIn account or page name', 'ai-marketing-expert' ),
		nameHelp:     __( 'This is the label shown inside the plugin for the connected LinkedIn profile or company page.', 'ai-marketing-expert' ),
		needsSecret: false,
		steps: [
			{ n: 1, text: __( 'Go to', 'ai-marketing-expert' ), link: { href: 'https://www.linkedin.com/developers/apps', label: 'linkedin.com/developers' }, after: __( 'and create an App (linked to your LinkedIn Page or Personal profile).', 'ai-marketing-expert' ) },
			{ n: 2, text: __( 'Under the Products tab, request access to "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect".', 'ai-marketing-expert' ) },
			{ n: 3, text: __( 'Under the Auth tab, generate an OAuth 2.0 token with permissions (w_member_social or w_organization_social), or use the token tool.', 'ai-marketing-expert' ) },
			{ n: 4, text: __( 'Paste the Access Token below. The plugin will automatically detect your member or organization URN.', 'ai-marketing-expert' ) },
		],
	},
};

const GuideStep = ( { step } ) => (
	<li style={ {
		display: 'flex',
		gap: 10,
		marginBottom: 8,
		fontSize: 13,
		lineHeight: '1.5',
		color: step.isWarning ? '#dc2626' : 'var(--aime-text-muted)',
		fontWeight: step.isWarning ? 600 : 'normal',
	} }>
		<span style={ {
			flexShrink: 0,
			width: 20,
			height: 20,
			borderRadius: '50%',
			background: step.isWarning ? '#fee2e2' : 'var(--aime-border)',
			color: step.isWarning ? '#dc2626' : 'var(--aime-text)',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			fontSize: 11,
			fontWeight: 700,
			marginTop: 1,
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

// Feature flag: Enable 1-Click OAuth for Meta (Facebook & Instagram).
// Set to false while Meta App Review is pending so Facebook & Instagram use direct manual token setup.
// Set to true once Meta approves the app to re-enable 1-Click Connect for Facebook & Instagram.
const ENABLE_META_OAUTH = false;

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
	{
		id: 'linkedin',
		name: 'LinkedIn',
		color: '#0A66C2',
		icon: pluginUrl + 'assets/img/linkedin-logo.svg',
		description: __( 'Connect your LinkedIn Profile or Company Page to publish professional updates.', 'ai-marketing-expert' ),
	},
];

const ConnectAccountModal = ( { account = null, onClose, onConnected } ) => {
	const { post, put, loading } = useApi();
	const isEditing = !! account;
	const [ step, setStep ] = useState( isEditing ? 'manual' : 'choose' ); // choose, connecting, select_accounts, manual, instagram_prerequisites
	const [ selectedPlatform, setSelectedPlatform ] = useState( account?.platform || null );
	const [ candidatesData, setCandidatesData ] = useState( null );
	const [ selectedAccountIds, setSelectedAccountIds ] = useState( [] );
	const [ savingSelected, setSavingSelected ] = useState( false );
	const [ instagramConfirmed, setInstagramConfirmed ] = useState( false );
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
					if ( messageHandled ) {
						return;
					}

					// Trust messages from own origin (bridge mode) or the OAuth proxy origin.
					const trustedOrigins = [
						window.location.origin,
						'https://oauth.wpthemespace.com',
					];
					if ( ! trustedOrigins.includes( event.origin ) ) {
						return;
					}

					if ( event.data?.type === 'aime_oauth_error' ) {
						messageHandled = true;
						window.removeEventListener( 'message', handleMessage );
						if ( popup && ! popup.closed ) {
							try { popup.close(); } catch ( _ ) {}
						}
						toast( event.data.error || __( 'OAuth connection failed.', 'ai-marketing-expert' ), 'error' );
						setStep( 'choose' );
						return;
					}

					if ( event.data?.type !== 'aime_oauth_callback' ) {
						return;
					}

					messageHandled = true;
					window.removeEventListener( 'message', handleMessage );
					if ( popup && ! popup.closed ) {
						try { popup.close(); } catch ( _ ) {}
					}

					try {
						const callbackRes = await post( '/social/accounts/callback', {
							// The provider may not echo `platform` back; fall back to the chosen one.
							platform: event.data.platform || platform,
							code: event.data.code,
							state: event.data.state,
						} );

						if ( callbackRes?.requires_selection ) {
							setCandidatesData( callbackRes );
							const avail = callbackRes.accounts.length;
							const initialSelected = [];
							let count = 0;
							for ( const acc of callbackRes.accounts ) {
								if ( ! acc.already_connected && count < avail ) {
									initialSelected.push( String( acc.id ) );
									count++;
								}
							}
							setSelectedAccountIds( initialSelected );
							setStep( 'select_accounts' );
							return;
						}

						toast( callbackRes?.message || __( 'Account connected successfully!', 'ai-marketing-expert' ) );
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

	const handleAccountCheckboxToggle = ( id, canToggle ) => {
		setSelectedAccountIds( ( prev ) => {
			if ( prev.includes( id ) ) {
				return prev.filter( ( item ) => item !== id );
			}
			if ( ! canToggle ) {
				return prev;
			}
			return [ ...prev, id ];
		} );
	};

	const handleToggleSelectAll = () => {
		if ( ! candidatesData?.accounts ) return;
		const selectable = candidatesData.accounts.filter( ( a ) => ! a.already_connected );
		if ( selectedAccountIds.length === selectable.length ) {
			setSelectedAccountIds( [] );
		} else {
			setSelectedAccountIds( selectable.map( ( a ) => String( a.id ) ) );
		}
	};

	const handleSaveSelectedAccounts = async () => {
		if ( ! candidatesData?.session_id || ! selectedAccountIds.length ) return;
		setSavingSelected( true );
		try {
			const res = await post( '/social/accounts/save-selected', {
				session_id: candidatesData.session_id,
				selected_ids: selectedAccountIds,
			} );
			toast( res.message || __( 'Accounts connected successfully!', 'ai-marketing-expert' ) );
			onConnected();
		} catch ( err ) {
			toast( err.message, 'error' );
		} finally {
			setSavingSelected( false );
		}
	};

	// Manual mode: go straight to manual connect form.
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
			<div className="aime-premium-modal" style={ { width: '540px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }>
				<div className="aime-premium-modal-header">
					<h3>
						<span className="aime-premium-modal-icon">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
						</span>
						{ isEditing
							? __( 'Edit Account', 'ai-marketing-expert' )
							: ( step === 'instagram_prerequisites'
								? __( 'Instagram Setup Guide', 'ai-marketing-expert' )
								: __( 'Connect Account', 'ai-marketing-expert' ) ) }
					</h3>
					<button className="aime-modal-close" onClick={ onClose }>&times;</button>
				</div>

				<div className="aime-premium-modal-body" style={ { overflowY: 'auto', flex: 1, padding: 24 } }>
					{ step === 'choose' && (
						<div className="aime-connect-platforms">
							<p style={ { marginBottom: 20, color: 'var(--aime-text-muted)' } }>
								{ __( 'Choose a platform to connect:', 'ai-marketing-expert' ) }
							</p>
							{ platforms.map( ( p ) => {
								const isOneClick = ( ( ENABLE_META_OAUTH && ( p.id === 'facebook' || p.id === 'instagram' ) ) || p.id === 'linkedin' );
								return (
									<button
										key={ p.id }
										className="aime-platform-connect-btn"
										onClick={ () => {
											if ( ENABLE_META_OAUTH && p.id === 'instagram' ) {
												setSelectedPlatform( 'instagram' );
												setInstagramConfirmed( false );
												setStep( 'instagram_prerequisites' );
											} else if ( isOneClick ) {
												handleOAuthConnect( p.id );
											} else {
												handlePlatformSelect( p.id );
											}
										} }
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
											<div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
												<span style={ { fontWeight: 600, fontSize: 15 } }>{ p.name }</span>
												{ isOneClick && (
													<span style={ {
														fontSize: 11,
														fontWeight: 600,
														color: '#16a34a',
														background: '#dcfce7',
														padding: '2px 8px',
														borderRadius: 6,
													} }>
														{ __( '1-Click Connect', 'ai-marketing-expert' ) }
													</span>
												) }
											</div>
											<div style={ { fontSize: 12, color: 'var(--aime-text-muted)', marginTop: 2 } }>
												{ p.description }
											</div>
										</div>
										<span style={ { fontSize: 20, color: 'var(--aime-text-muted)' } }>&rarr;</span>
									</button>
								);
							} ) }
							<div style={ { marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--aime-text-muted)' } }>
								{ __( 'Prefer entering API keys or access tokens manually?', 'ai-marketing-expert' ) }{ ' ' }
								<button
									type="button"
									onClick={ () => handlePlatformSelect( 'facebook' ) }
									style={ { background: 'none', border: 'none', color: 'var(--aime-primary, #2563eb)', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' } }
								>
									{ __( 'Manual Setup', 'ai-marketing-expert' ) }
								</button>
							</div>
						</div>
					) }

					{ step === 'instagram_prerequisites' && (
						<div className="aime-instagram-prerequisites">
							<div style={ { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 } }>
								<div style={ {
									width: 44,
									height: 44,
									borderRadius: 12,
									background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0,
								} }>
									<img
										src={ pluginUrl + 'assets/img/instagram-logo.svg' }
										alt="Instagram"
										style={ { width: 26, height: 26, filter: 'brightness(0) invert(1)' } }
									/>
								</div>
								<div>
									<h4 style={ { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--aime-text)' } }>
										{ __( 'Connect Instagram Business Account', 'ai-marketing-expert' ) }
									</h4>
									<div style={ { fontSize: 12.5, color: 'var(--aime-text-muted)', marginTop: 2 } }>
										{ __( 'Meta (Facebook) requires 2 quick setup requirements before connecting:', 'ai-marketing-expert' ) }
									</div>
								</div>
							</div>

							<div style={ {
								display: 'flex',
								flexDirection: 'column',
								gap: 12,
								marginBottom: 16,
							} }>
								{ /* Step 1 */ }
								<div style={ {
									display: 'flex',
									gap: 12,
									padding: '12px 14px',
									borderRadius: 10,
									border: '1px solid var(--aime-border, #e2e8f0)',
									background: 'var(--aime-surface-subtle, #f8fafc)',
								} }>
									<div style={ {
										width: 24,
										height: 24,
										borderRadius: '50%',
										background: '#e0e7ff',
										color: '#4338ca',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontWeight: 700,
										fontSize: 12,
										flexShrink: 0,
										marginTop: 1,
									} }>
										1
									</div>
									<div style={ { flex: 1 } }>
										<div style={ { fontWeight: 600, fontSize: 13.5, color: 'var(--aime-text)', marginBottom: 3 } }>
											{ __( 'Switch to Professional Account (Business or Creator)', 'ai-marketing-expert' ) }
										</div>
										<div style={ { fontSize: 12, color: 'var(--aime-text-muted)', lineHeight: 1.45 } }>
											{ __( 'Meta does not permit posting to Personal accounts. It is 100% free to switch.', 'ai-marketing-expert' ) }
											<div style={ { marginTop: 4, color: 'var(--aime-text)', fontWeight: 500 } }>
												📱 <em>{ __( 'In Instagram App: Settings & privacy → Account type & tools → Switch to professional account.', 'ai-marketing-expert' ) }</em>
											</div>
										</div>
									</div>
								</div>

								{ /* Step 2 */ }
								<div style={ {
									display: 'flex',
									gap: 12,
									padding: '12px 14px',
									borderRadius: 10,
									border: '1px solid var(--aime-border, #e2e8f0)',
									background: 'var(--aime-surface-subtle, #f8fafc)',
								} }>
									<div style={ {
										width: 24,
										height: 24,
										borderRadius: '50%',
										background: '#e0e7ff',
										color: '#4338ca',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontWeight: 700,
										fontSize: 12,
										flexShrink: 0,
										marginTop: 1,
									} }>
										2
									</div>
									<div style={ { flex: 1 } }>
										<div style={ { fontWeight: 600, fontSize: 13.5, color: 'var(--aime-text)', marginBottom: 3 } }>
											{ __( 'Link Instagram to a Facebook Page', 'ai-marketing-expert' ) }
										</div>
										<div style={ { fontSize: 12, color: 'var(--aime-text-muted)', lineHeight: 1.45 } }>
											{ __( 'Your Instagram account must be connected to a Facebook Page where you are an Admin.', 'ai-marketing-expert' ) }
											<div style={ { marginTop: 4, color: 'var(--aime-text)', fontWeight: 500 } }>
												🔗 <em>{ __( 'In Instagram App: Edit profile → Under "Public business information", tap Page → Connect your Facebook Page.', 'ai-marketing-expert' ) }</em>
											</div>
										</div>
									</div>
								</div>

								{ /* Tip */ }
								<div style={ {
									display: 'flex',
									gap: 10,
									padding: '10px 12px',
									borderRadius: 8,
									border: '1px solid #fed7aa',
									background: '#fff7ed',
									fontSize: 12,
									color: '#9a3412',
									lineHeight: 1.4,
								} }>
									<span style={ { fontSize: 15 } }>💡</span>
									<span>
										<strong>{ __( 'Tip during Meta popup login:', 'ai-marketing-expert' ) }</strong>{ ' ' }
										{ __( 'Make sure to select BOTH your Facebook Page and Instagram Account. If you previously connected, click "Edit settings" in the popup to verify both are checked.', 'ai-marketing-expert' ) }
									</span>
								</div>
							</div>

							{ /* Confirmation Checkbox */ }
							<label style={ {
								display: 'flex',
								alignItems: 'flex-start',
								gap: 12,
								padding: '12px 14px',
								borderRadius: 10,
								background: instagramConfirmed ? 'rgba(228, 64, 95, 0.06)' : 'var(--aime-surface-subtle, #f8fafc)',
								border: `1.5px solid ${ instagramConfirmed ? '#E4405F' : 'var(--aime-border, #e2e8f0)' }`,
								cursor: 'pointer',
								transition: 'all 0.2s ease',
								userSelect: 'none',
							} }>
								<input
									type="checkbox"
									checked={ instagramConfirmed }
									onChange={ ( e ) => setInstagramConfirmed( e.target.checked ) }
									style={ {
										width: 18,
										height: 18,
										marginTop: 1,
										cursor: 'pointer',
										accentColor: '#E4405F',
									} }
								/>
								<div style={ { fontSize: 12.5, lineHeight: 1.45, color: 'var(--aime-text)', fontWeight: 500 } }>
									{ __( 'I have confirmed that my Instagram account is switched to Professional and linked with my Facebook Page.', 'ai-marketing-expert' ) }
								</div>
							</label>

							<div style={ { marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--aime-text-muted)' } }>
								{ __( 'Prefer direct token setup without Facebook Page?', 'ai-marketing-expert' ) }{ ' ' }
								<button
									type="button"
									onClick={ () => handlePlatformSelect( 'instagram' ) }
									style={ { background: 'none', border: 'none', color: 'var(--aime-primary, #2563eb)', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' } }
								>
									{ __( 'Manual Token Setup', 'ai-marketing-expert' ) }
								</button>
							</div>
						</div>
					) }

					{ step === 'connecting' && (
						<div style={ { textAlign: 'center', padding: '40px 20px' } }>
							<Spinner style={ { marginBottom: 16 } } />
							<h4 style={ { margin: '0 0 8px', fontSize: 16, color: 'var(--aime-text)' } }>
								{ sprintf( __( 'Connecting to %s…', 'ai-marketing-expert' ), selectedPlatform ? selectedPlatform.toUpperCase() : '' ) }
							</h4>
							<p style={ { color: 'var(--aime-text-muted)', fontSize: 13, margin: '0 0 24px', lineHeight: 1.5 } }>
								{ __( 'Please complete authorization in the popup window. This window will automatically finish once you approve.', 'ai-marketing-expert' ) }
							</p>
							<div style={ { display: 'flex', justifyContent: 'center', gap: 12 } }>
								<button
									className="aime-btn-secondary"
									onClick={ () => setStep( 'choose' ) }
									style={ { fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' } }
								>
									{ __( 'Cancel', 'ai-marketing-expert' ) }
								</button>
								<button
									type="button"
									onClick={ () => setStep( 'manual' ) }
									style={ { background: 'none', border: 'none', color: 'var(--aime-primary, #2563eb)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' } }
								>
									{ __( 'Or enter token manually', 'ai-marketing-expert' ) }
								</button>
							</div>
						</div>
					) }

					{ step === 'select_accounts' && candidatesData && (
						<div className="aime-select-accounts-step">
							<div style={ { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } }>
								<img
									src={ platforms.find( ( p ) => p.id === candidatesData.platform )?.icon }
									alt={ candidatesData.platform }
									style={ { width: 36, height: 36, objectFit: 'contain' } }
								/>
								<div>
									<h4 style={ { margin: 0, fontSize: 16, color: 'var(--aime-text)' } }>
										{ candidatesData.platform === 'facebook'
											? __( 'Select Facebook Pages', 'ai-marketing-expert' )
											: __( 'Select Instagram Accounts', 'ai-marketing-expert' ) }
									</h4>
									<div style={ { fontSize: 12, color: 'var(--aime-text-muted)', marginTop: 2 } }>
										{ __( 'Select the accounts you want to connect.', 'ai-marketing-expert' ) }
									</div>
								</div>
							</div>

							{ candidatesData.accounts.length > 1 && (
								<div style={ { display: 'flex', justifyContent: 'flex-end', marginBottom: 10 } }>
									<button
										type="button"
										onClick={ handleToggleSelectAll }
										style={ { background: 'none', border: 'none', color: 'var(--aime-primary, #2563eb)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' } }
									>
										{ selectedAccountIds.length === candidatesData.accounts.filter( ( a ) => ! a.already_connected ).length
											? __( 'Deselect All', 'ai-marketing-expert' )
											: __( 'Select All', 'ai-marketing-expert' ) }
									</button>
								</div>
							) }

							<div style={ {
								maxHeight: '340px',
								overflowY: 'auto',
								border: '1px solid var(--aime-border)',
								borderRadius: 10,
								padding: '8px',
								marginBottom: 0,
								display: 'flex',
								flexDirection: 'column',
								gap: 8,
							} }>
								{ candidatesData.accounts.map( ( acc ) => {
									const isSelected = selectedAccountIds.includes( String( acc.id ) );
									const isAlready = !! acc.already_connected;
									const canToggle = true;

									return (
										<div
											key={ acc.id }
											onClick={ () => {
												if ( isAlready ) return;
												handleAccountCheckboxToggle( String( acc.id ), canToggle );
											} }
											style={ {
												display: 'flex',
												alignItems: 'center',
												gap: 12,
												padding: '10px 12px',
												borderRadius: 8,
												background: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'var(--aime-bg, #fff)',
												border: `1px solid ${ isSelected ? '#3b82f6' : 'var(--aime-border, #e2e8f0)' }`,
												cursor: isAlready ? 'default' : ( canToggle ? 'pointer' : 'not-allowed' ),
												opacity: ( ! isAlready && ! isSelected && ! canToggle ) ? 0.5 : 1,
												transition: 'all 0.15s ease',
											} }
										>
											<input
												type="checkbox"
												checked={ isSelected || isAlready }
												disabled={ isAlready || ( ! isSelected && ! canToggle ) }
												onChange={ () => {} }
												style={ { width: 18, height: 18, cursor: isAlready ? 'default' : ( canToggle ? 'pointer' : 'not-allowed' ) } }
											/>
											{ acc.avatar_url ? (
												<img
													src={ acc.avatar_url }
													alt={ acc.name }
													style={ { width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' } }
												/>
											) : (
												<div style={ {
													width: 38, height: 38, borderRadius: '50%',
													background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
													fontWeight: 700, color: '#64748b', fontSize: 14,
												} }>
													{ ( acc.name || '?' ).charAt( 0 ).toUpperCase() }
												</div>
											) }
											<div style={ { flex: 1, minWidth: 0 } }>
												<div style={ { fontWeight: 600, fontSize: 14, color: 'var(--aime-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }>
													{ acc.name }
												</div>
												{ acc.category && (
													<div style={ { fontSize: 11, color: 'var(--aime-text-muted)', marginTop: 2 } }>
														{ acc.category }
													</div>
												) }
											</div>
											{ isAlready && (
												<span style={ { fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: 6, fontWeight: 500 } }>
													{ __( 'Already Connected', 'ai-marketing-expert' ) }
												</span>
											) }
										</div>
									);
								} ) }
							</div>
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
					<button
						type="button"
						className="aime-btn-cancel"
						onClick={ () => {
							if ( step === 'select_accounts' || step === 'instagram_prerequisites' ) {
								setStep( 'choose' );
								setCandidatesData( null );
								setInstagramConfirmed( false );
							} else {
								onClose();
							}
						} }
					>
						{ ( step === 'select_accounts' || step === 'instagram_prerequisites' ) ? __( 'Back', 'ai-marketing-expert' ) : __( 'Cancel', 'ai-marketing-expert' ) }
					</button>
					{ step === 'instagram_prerequisites' && (
						<button
							type="button"
							className="aime-btn-primary"
							onClick={ () => handleOAuthConnect( 'instagram' ) }
							disabled={ ! instagramConfirmed || loading }
							style={ {
								background: instagramConfirmed
									? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
									: undefined,
								borderColor: instagramConfirmed ? '#dc2743' : undefined,
								fontWeight: 600,
							} }
						>
							{ loading ? __( 'Connecting...', 'ai-marketing-expert' ) : __( 'Continue to Connect Instagram', 'ai-marketing-expert' ) }
						</button>
					) }
					{ step === 'select_accounts' && (
						<button
							type="button"
							className="aime-btn-primary"
							onClick={ handleSaveSelectedAccounts }
							disabled={ savingSelected || selectedAccountIds.length === 0 }
						>
							{ savingSelected
								? __( 'Connecting...', 'ai-marketing-expert' )
								: sprintf( __( 'Connect Selected (%d)', 'ai-marketing-expert' ), selectedAccountIds.length ) }
						</button>
					) }
					{ step === 'manual' && (
						<button
							type="button"
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
