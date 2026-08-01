/**
 * SmtpSettings - Multi-connection SMTP manager with primary / fallback support.
 *
 * Each connection can be Gmail, Outlook, SES, SendGrid, Mailgun, SparkPost,
 * Custom SMTP, or WordPress default wp_mail.  One connection is marked as
 * primary; the rest serve as ordered fallbacks.
 */

import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	TextControl,
	SelectControl,
	ToggleControl,
	Modal,
	Spinner,
} from '@aime/wp-components';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import useApi from '../../../hooks/useApi';
import { isProActive, ProLabel } from '../../common/ProLock';
import { formatDateTime } from '../../../utils/datetime';

const providerIconTypes = {
	wp_mail: 'settings',
	gmail: 'mail',
	outlook: 'mail-open',
	amazon_ses: 'cloud',
	sendgrid: 'send',
	mailgun: 'shield',
	sparkpost: 'spark',
	brevo: 'inbox',
	sendlayer: 'layers',
	smtpcom: 'envelope-stack',
	postmark: 'postmark',
	resend: 'refresh',
	custom: 'sliders',
};

const PASSWORD_MASK = '********************';

const SmtpProviderIcon = ( { provider, className = '' } ) => {
	const type = providerIconTypes[ provider ] || 'mail';

	const iconPaths = {
		settings: (
			<>
				<path d="M10.33 4.32L12 3l1.67 1.32 2.11-.22.82 1.96 1.96.82-.22 2.11L21 10.67 19.68 12l.22 2.11-1.96.82-.82 1.96-2.11-.22L12 21l-1.67-1.32-2.11.22-.82-1.96-1.96-.82.22-2.11L3 12l1.32-1.33-.22-2.11 1.96-.82.82-1.96 2.11.22Z" />
				<circle cx="12" cy="12" r="3" />
			</>
		),
		mail: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
		'mail-open': (
			<>
				<path d="M3 8l9 6 9-6" />
				<path d="M5 19h14a2 2 0 0 0 2-2V7H3v10a2 2 0 0 0 2 2Z" />
			</>
		),
		cloud: <path d="M7 18a4 4 0 1 1 .9-7.9A5.5 5.5 0 0 1 18.5 11 3.5 3.5 0 1 1 18 18Z" />,
		send: <path d="M21 3 3 11l8 2 2 8 8-18Z" />,
		shield: <path d="M12 3 6 5v6c0 4 2.55 7.46 6 9 3.45-1.54 6-5 6-9V5l-6-2Z" />,
		spark: <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />,
		inbox: (
			<>
				<path d="M4 13h4l2 3h4l2-3h4" />
				<path d="M5 13V6h14v7" />
				<path d="M4 13v4h16v-4" />
			</>
		),
		layers: (
			<>
				<path d="m12 4 8 4-8 4-8-4 8-4Z" />
				<path d="m4 12 8 4 8-4" />
				<path d="m4 16 8 4 8-4" />
			</>
		),
		'envelope-stack': (
			<>
				<path d="M5 7h14v10H5z" />
				<path d="m5 8 7 5 7-5" />
				<path d="M8 4h8" />
			</>
		),
		postmark: (
			<>
				<rect x="4" y="5" width="16" height="14" rx="2" />
				<path d="m4 8 8 5 8-5" />
				<path d="M9 11h6" />
			</>
		),
		refresh: (
			<>
				<path d="M20 6v5h-5" />
				<path d="M4 18v-5h5" />
				<path d="M6.5 9A7 7 0 0 1 18 6" />
				<path d="M17.5 15A7 7 0 0 1 6 18" />
			</>
		),
		sliders: (
			<>
				<path d="M4 7h16" />
				<path d="M4 17h16" />
				<circle cx="9" cy="7" r="2" />
				<circle cx="15" cy="17" r="2" />
			</>
		),
	};

	return (
		<span className={ `aime-smtp-card-icon ${ className }`.trim() } aria-hidden="true">
			<svg viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
				{ iconPaths[ type ] }
			</svg>
		</span>
	);
};

/* Empty form */
const emptyForm = {
	name:            '',
	provider:        '',
	smtp_host:       '',
	smtp_account_type: 'personal',
	smtp_port:       587,
	smtp_encryption: 'tls',
	smtp_username:   '',
	smtp_password:   '',
	from_name:       '',
	from_email:      '',
	sending_limit:   90,
	is_primary:      false,
	enabled:         true,
};

const SmtpSettings = () => {
	const { get, post, del } = useApi();
	const hasPro = isProActive();
	const freeSmtpLimit = Number( window.aimeData?.freeLimits?.email_smtp_connections || 2 );

	const [ connections, setConnections ]   = useState( [] );
	const [ siteMailEnabled, setSiteMailEnabled ] = useState( true );
	const [ showSiteMailOption, setShowSiteMailOption ] = useState( false );
	const [ fetching, setFetching ]         = useState( true );
	const [ notice, setNotice ]             = useState( null );
	const [ modalErrors, setModalErrors ]   = useState( {} );
	const [ showModal, setShowModal ]       = useState( false );
	const [ editId, setEditId ]             = useState( null );
	const [ form, setForm ]                 = useState( { ...emptyForm } );
	const [ nameManuallyEdited, setNameManuallyEdited ] = useState( false );
	const [ saving, setSaving ]             = useState( false );
	const [ testingId, setTestingId ]       = useState( null );
	const [ testEmail, setTestEmail ]       = useState( window.aimeData?.adminEmail || '' );
	const [ showTestId, setShowTestId ]     = useState( null );
	const [ deleting, setDeleting ]         = useState( null );
	const [ movingKey, setMovingKey ]       = useState( null );
	const [ savingSiteMail, setSavingSiteMail ] = useState( false );
	const [ smtpTestResults, setSmtpTestResults ] = useState( {} );
	const [ smtpErrorLogs, setSmtpErrorLogs ] = useState( [] );
	const [ smtpErrorLogLimit, setSmtpErrorLogLimit ] = useState( 50 );
	const [ clearingErrorLogs, setClearingErrorLogs ] = useState( false );
	const [ globalFromName, setGlobalFromName ] = useState( '' );
	const [ globalFromEmail, setGlobalFromEmail ] = useState( '' );

	const providers = window.aimeData?.smtpProviders || {};
	const countedSmtpConnections = connections.filter( ( conn ) => conn.provider !== 'wp_mail' ).length;
	const smtpLimitReached = ! hasPro && countedSmtpConnections >= freeSmtpLimit;
	const outlookSmtpHosts = {
		personal: 'smtp-mail.outlook.com',
		business: 'smtp.office365.com',
	};

	const getOutlookAccountType = ( conn ) => {
		if ( conn.smtp_account_type ) {
			return conn.smtp_account_type;
		}

		return conn.smtp_host === outlookSmtpHosts.business ? 'business' : 'personal';
	};

	/* Fetch connections */
	const fetchConnections = useCallback( async () => {
		setFetching( true );
		try {
			const [ connectionRes, siteMailRes, errorLogRes, emailSettingsRes ] = await Promise.all( [
				get( '/email/smtp' ),
				get( '/email/smtp/site-mail' ),
				get( '/email/smtp/errors' ),
				get( '/email/settings' ),
			] );
			setConnections( connectionRes || [] );
			setSiteMailEnabled( siteMailRes?.enabled !== false );
			setShowSiteMailOption( !! siteMailRes?.show_option );
			setSmtpErrorLogs( Array.isArray( errorLogRes?.logs ) ? errorLogRes.logs : [] );
			setSmtpErrorLogLimit( errorLogRes?.limit || 50 );
			setGlobalFromName( emailSettingsRes?.from_name || '' );
			setGlobalFromEmail( emailSettingsRes?.from_email || '' );
		} catch {
			/* Handled by useApi. */
		} finally {
			setFetching( false );
		}
	}, [ get ] );

	useEffect( () => { fetchConnections(); }, [ fetchConnections ] );

	/* Modal helpers */
	const openCreate = () => {
		if ( smtpLimitReached ) {
			setNotice( { type: 'warning', message: sprintf( __( 'Free sites can create up to %d SMTP connections. Upgrade to Pro for unlimited connections.', 'ai-marketing-expert' ), freeSmtpLimit ) } );
			return;
		}
		setEditId( null );
		setForm( {
			...emptyForm,
			is_primary: connections.length === 0,
			from_name:  globalFromName,
			from_email: globalFromEmail,
		} );
		setNameManuallyEdited( false );
		setModalErrors( {} );
		setShowModal( true );
	};

	const openEdit = ( conn ) => {
		setEditId( conn.id );
		setForm( {
			name:            conn.name || '',
			provider:        conn.provider || 'wp_mail',
			smtp_host:       conn.smtp_host || '',
			smtp_account_type: conn.provider === 'outlook' ? getOutlookAccountType( conn ) : ( conn.smtp_account_type || 'personal' ),
			smtp_port:       conn.smtp_port || 587,
			smtp_encryption: conn.smtp_encryption || 'tls',
			smtp_username:   conn.smtp_username || '',
			smtp_password:   conn.has_password ? PASSWORD_MASK : '',
			from_name:       conn.from_name || globalFromName,
			from_email:      conn.from_email || globalFromEmail,
			sending_limit:   conn.sending_limit || 90,
			is_primary:      !! conn.is_primary,
			enabled:         conn.enabled !== false,
		} );
		setNameManuallyEdited( true );
		setModalErrors( {} );
		setShowModal( true );
	};

	const closeModal = () => {
		setShowModal( false );
		setEditId( null );
		setNameManuallyEdited( false );
		setModalErrors( {} );
	};

	const getDefaultConnectionName = ( providerId ) => {
		const provider = providers[ providerId ];
		if ( ! provider ) {
			return '';
		}

		return providerId === 'wp_mail'
			? __( 'WordPress Default', 'ai-marketing-expert' )
			: provider.name;
	};

	/* Provider selection (auto-fills SMTP fields) */
	const handleProviderSelect = ( providerId ) => {
		const p = providers[ providerId ];
		const defaultName = getDefaultConnectionName( providerId );
		if ( p && p.host ) {
			const smtpAccountType = providerId === 'outlook' ? 'personal' : form.smtp_account_type;
			setForm( ( prev ) => ( {
				...prev,
				name:            nameManuallyEdited ? prev.name : defaultName,
				provider:        providerId,
				smtp_host:       providerId === 'outlook' ? outlookSmtpHosts.personal : ( p.host || '' ),
				smtp_account_type: smtpAccountType,
				smtp_port:       p.port || 587,
				smtp_encryption: p.encryption || 'tls',
				smtp_username:   p.username || prev.smtp_username,
			} ) );
		} else {
			setForm( ( prev ) => ( {
				...prev,
				name: nameManuallyEdited ? prev.name : defaultName,
				provider: providerId,
			} ) );
		}
		setModalErrors( ( prev ) => ( { ...prev, name: null, provider: null, submit: null } ) );
	};

	const handleOutlookAccountTypeChange = ( accountType ) => {
		setForm( ( prev ) => ( {
			...prev,
			smtp_account_type: accountType,
			smtp_host: outlookSmtpHosts[ accountType ] || outlookSmtpHosts.personal,
			smtp_port: 587,
			smtp_encryption: 'tls',
		} ) );
	};

	/* Save connection */
	const handleSave = async () => {
		if ( ! form.name.trim() ) {
			setModalErrors( { name: __( 'Connection name is required.', 'ai-marketing-expert' ) } );
			return;
		}
		if ( ! form.provider ) {
			setModalErrors( { provider: __( 'Please select a provider.', 'ai-marketing-expert' ) } );
			return;
		}

		setModalErrors( {} );
		setSaving( true );
		try {
			const payload = { ...form };
			if ( editId ) {
				payload.id = editId;
			}
			const res = await post( '/email/smtp', payload );
			const returnedConnections = Array.isArray( res.connections ) ? res.connections : null;
			const savedId = res.connection?.id || editId;

			if ( returnedConnections && savedId && ! returnedConnections.some( ( conn ) => conn.id === savedId ) ) {
				throw new Error( __( 'Connection save was not confirmed by the server. Please try again.', 'ai-marketing-expert' ) );
			}

			if ( returnedConnections ) {
				setConnections( returnedConnections );
			}

			setNotice( { type: 'success', message: res.message || __( 'Connection saved.', 'ai-marketing-expert' ) } );
			closeModal();
			if ( ! returnedConnections ) {
				await fetchConnections();
			}
		} catch ( err ) {
			setModalErrors( { submit: err.message } );
		} finally {
			setSaving( false );
		}
	};

	/* Delete connection */
	const handleDelete = async ( id ) => {
		if ( ! window.confirm( __( 'Delete this SMTP connection?', 'ai-marketing-expert' ) ) ) {
			return;
		}
		setDeleting( id );
		try {
			await del( `/email/smtp/${ id }` );
			setNotice( { type: 'success', message: __( 'Connection deleted.', 'ai-marketing-expert' ) } );
			await fetchConnections();
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setDeleting( null );
		}
	};

	/* Test connection */
	const handleTest = async ( id ) => {
		if ( ! testEmail ) {
			setNotice( { type: 'error', message: __( 'Enter a test email address.', 'ai-marketing-expert' ) } );
			return;
		}
		setTestingId( id );
		try {
			const result = await post( `/email/smtp/${ id }/test`, { to: testEmail } );
			setSmtpTestResults( ( prev ) => ( { ...prev, [ id ]: result.success ? 'ok' : 'fail' } ) );
			setNotice( {
				type: result.success ? 'success' : 'error',
				message: result.message,
			} );
		} catch ( err ) {
			setSmtpTestResults( ( prev ) => ( { ...prev, [ id ]: 'fail' } ) );
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setTestingId( null );
			setShowTestId( null );
		}
	};

	/* Set primary (quick action) */
	const handleSetPrimary = async ( conn ) => {
		setSaving( true );
		try {
			const res = await post( '/email/smtp', { id: conn.id, is_primary: true } );
			const returnedConnections = Array.isArray( res.connections ) ? res.connections : null;
			const updatedConnection = returnedConnections?.find( ( item ) => item.id === conn.id );

			if ( returnedConnections && ! updatedConnection?.is_primary ) {
				throw new Error( __( 'Primary connection update was not confirmed by the server. Please try again.', 'ai-marketing-expert' ) );
			}

			if ( returnedConnections ) {
				setConnections( returnedConnections );
			}

			setNotice( { type: 'success', message: __( 'Primary connection updated.', 'ai-marketing-expert' ) } );
			if ( ! returnedConnections ) {
				await fetchConnections();
			}
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setSaving( false );
		}
	};

	/* Toggle enabled */
	const handleToggleEnabled = async ( conn ) => {
		try {
			const res = await post( '/email/smtp', { id: conn.id, enabled: ! conn.enabled } );
			const returnedConnections = Array.isArray( res.connections ) ? res.connections : null;
			if ( returnedConnections ) {
				setConnections( returnedConnections );
			} else {
				await fetchConnections();
			}
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		}
	};

	/* Toggle site-wide SMTP handling */
	const handleToggleSiteMail = async () => {
		const nextValue = ! siteMailEnabled;
		setSiteMailEnabled( nextValue );
		setSavingSiteMail( true );
		try {
			const res = await post( '/email/smtp/site-mail', { enabled: nextValue } );
			setSiteMailEnabled( res.enabled !== false );
			setShowSiteMailOption( !! res.show_option );
			setNotice( {
				type: 'success',
				message: res.message || __( 'SMTP site email setting updated.', 'ai-marketing-expert' ),
			} );
		} catch ( err ) {
			setSiteMailEnabled( siteMailEnabled );
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setSavingSiteMail( false );
		}
	};

	/* Determine which SMTP fields to show */
	const showSmtpFields = form.provider && form.provider !== 'wp_mail';
	const providerPreset = providers[ form.provider ] || {};
	const providerFields = providerPreset.fields || [];
	const amazonSesRegions = [
		'us-east-1',
		'us-east-2',
		'us-west-1',
		'us-west-2',
		'eu-west-1',
		'eu-west-2',
		'eu-west-3',
		'eu-central-1',
		'eu-north-1',
		'ap-south-1',
		'ap-southeast-1',
		'ap-southeast-2',
		'ap-northeast-1',
		'ap-northeast-2',
		'ca-central-1',
		'sa-east-1',
	];
	const getAmazonSesRegionFromHost = ( host ) => {
		const match = /^email-smtp\.([a-z0-9-]+)\.amazonaws\.com$/i.exec( host || '' );
		return match?.[ 1 ] || '';
	};
	const selectedAmazonSesRegion = getAmazonSesRegionFromHost( form.smtp_host ) || 'us-east-1';
	const handleAmazonSesRegionChange = ( region ) => {
		setForm( ( prev ) => ( {
			...prev,
			smtp_host: `email-smtp.${ region }.amazonaws.com`,
		} ) );
	};
	const displayedConnections = useMemo( () => connections, [ connections ] );
	const fallbackIds = useMemo(
		() => displayedConnections.filter( ( conn ) => ! conn.is_primary ).map( ( conn ) => conn.id ),
		[ displayedConnections ]
	);

	const handleMove = async ( conn, direction ) => {
		const moveKey = `${ conn.id }:${ direction }`;
		setMovingKey( moveKey );
		try {
			const res = await post( `/email/smtp/${ conn.id }/move`, { direction } );
			if ( Array.isArray( res.connections ) ) {
				setConnections( res.connections );
			}
			setNotice( { type: 'success', message: res.message || __( 'SMTP sending order updated.', 'ai-marketing-expert' ) } );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setMovingKey( null );
		}
	};

	const handleClearErrorLogs = async () => {
		if ( ! window.confirm( __( 'Clear recent SMTP error logs?', 'ai-marketing-expert' ) ) ) {
			return;
		}

		setClearingErrorLogs( true );
		try {
			const res = await del( '/email/smtp/errors' );
			setSmtpErrorLogs( Array.isArray( res.logs ) ? res.logs : [] );
			setNotice( { type: 'success', message: res.message || __( 'SMTP error logs cleared.', 'ai-marketing-expert' ) } );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setClearingErrorLogs( false );
		}
	};

	// Logged as UTC; shown in the site timezone and format (Settings → General).
	const formatErrorLogTime = ( value ) => formatDateTime( value, '-' );

	/* Render */

	if ( fetching ) {
		return <Loader variant="form" text={ __( 'Loading SMTP connections...', 'ai-marketing-expert' ) } />;
	}

	return (
		<div className="aime-smtp-settings">
			{ notice && (
				<Notice type={ notice.type } message={ notice.message } onDismiss={ () => setNotice( null ) } />
			) }

			{ /* Header */ }
			<div className="aime-section-header" style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } }>
				<div>
					<h2 style={ { margin: 0 } }>{ __( 'SMTP Connections', 'ai-marketing-expert' ) }</h2>
					<p className="aime-card-description" style={ { margin: '4px 0 0' } }>
						{ __( 'Configure one or more SMTP connections. The primary connection is used for plugin emails and can optionally handle all site emails.', 'ai-marketing-expert' ) }
					</p>
				</div>
				<Button variant="primary" onClick={ openCreate }>
					<span className="aime-pro-inline-action">{ __( '+ Add Connection', 'ai-marketing-expert' ) }{ smtpLimitReached && <ProLabel /> }</span>
				</Button>
			</div>

			{ showSiteMailOption && (
				<Card>
					<div className="aime-smtp-site-mail-setting" style={ { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' } }>
						<div>
							<h3 style={ { margin: '0 0 6px' } }>{ __( 'Use AI Marketing Expert SMTP for all site emails', 'ai-marketing-expert' ) }</h3>
							<p className="aime-card-description" style={ { margin: 0 } }>
								{ __( 'Another SMTP plugin is active. Turn this off if that plugin should handle WooCommerce, contact forms, and other site emails. Campaigns and automations from this plugin will still use the SMTP connections below.', 'ai-marketing-expert' ) }
							</p>
						</div>
						<ToggleControl
							checked={ siteMailEnabled }
							disabled={ savingSiteMail }
							onChange={ handleToggleSiteMail }
							label={ siteMailEnabled ? __( 'Enabled', 'ai-marketing-expert' ) : __( 'Disabled', 'ai-marketing-expert' ) }
							__nextHasNoMarginBottom
						/>
					</div>
				</Card>
			) }

			{ /* Connection cards */ }
			{ connections.length === 0 && (
				<Card>
					<div style={ { textAlign: 'center', padding: '40px 20px' } }>
						<div style={ { display: 'inline-flex', margin: '0 0 12px' } }>
							<SmtpProviderIcon provider="sendlayer" className="aime-smtp-empty-state-icon" />
						</div>
						<h3 style={ { margin: '0 0 8px' } }>{ __( 'No SMTP Connections', 'ai-marketing-expert' ) }</h3>
						<p className="aime-card-description" style={ { margin: '0 0 16px' } }>
							{ __( 'Add your first SMTP connection to start sending emails reliably.', 'ai-marketing-expert' ) }
						</p>
						<Button variant="primary" onClick={ openCreate }>
							<span className="aime-pro-inline-action">{ __( '+ Add Connection', 'ai-marketing-expert' ) }{ smtpLimitReached && <ProLabel /> }</span>
						</Button>
					</div>
				</Card>
			) }

			<div className="aime-smtp-connections-list">
				{ displayedConnections.map( ( conn ) => {
					const p = providers[ conn.provider ] || {};
					const orderNumber = displayedConnections.findIndex( ( item ) => item.id === conn.id ) + 1;
					const fallbackIndex = fallbackIds.indexOf( conn.id );
					const canMoveUp = ! conn.is_primary && fallbackIndex > 0;
					const canMoveDown = ! conn.is_primary && fallbackIndex !== -1 && fallbackIndex < fallbackIds.length - 1;

					return (
						<div key={ conn.id } className={ `aime-smtp-connection-card${ conn.enabled ? '' : ' aime-smtp-card-disabled' }` }>
							<div className="aime-smtp-card-header">
								<div className="aime-smtp-card-provider">
									<SmtpProviderIcon provider={ conn.provider } />
									<div>
										<strong className="aime-smtp-card-name">{ conn.name || __( 'Unnamed', 'ai-marketing-expert' ) }</strong>
										<span className="aime-smtp-card-provider-label">{ p.name || conn.provider }</span>
									</div>								{ /* Connection status */ }
								{ conn.limit_reached && (
									<span className="aime-ai-conn-status aime-ai-conn-invalid">{ __( 'Limit reached', 'ai-marketing-expert' ) }</span>
								) }
								{ ! conn.limit_reached && conn.provider === 'wp_mail' && (
									<span className="aime-ai-conn-status aime-ai-conn-connected">{ __( 'Connected', 'ai-marketing-expert' ) }</span>
								) }
								{ ! conn.limit_reached && conn.provider !== 'wp_mail' && conn.has_password && smtpTestResults[ conn.id ] === 'fail' && (
									<span className="aime-ai-conn-status aime-ai-conn-invalid">{ __( 'Connection Failed', 'ai-marketing-expert' ) }</span>
								) }
								{ ! conn.limit_reached && conn.provider !== 'wp_mail' && conn.has_password && smtpTestResults[ conn.id ] === 'ok' && (
									<span className="aime-ai-conn-status aime-ai-conn-connected">{ __( 'Connected', 'ai-marketing-expert' ) }</span>
								) }
								{ ! conn.limit_reached && conn.provider !== 'wp_mail' && conn.has_password && ! smtpTestResults[ conn.id ] && (
									<span className="aime-ai-conn-status aime-ai-conn-configured">{ __( 'Configured', 'ai-marketing-expert' ) }</span>
								) }
								{ ! conn.limit_reached && conn.provider !== 'wp_mail' && ! conn.has_password && (
									<span className="aime-ai-conn-status aime-ai-conn-nokey">{ __( 'No Password', 'ai-marketing-expert' ) }</span>
								) }								</div>
								<div className="aime-smtp-card-badges">
									<span className="aime-badge aime-badge-default">{ sprintf( __( 'Order %d', 'ai-marketing-expert' ), orderNumber ) }</span>
									{ conn.is_primary && (
										<span className="aime-badge aime-badge-primary">{ __( 'Primary', 'ai-marketing-expert' ) }</span>
									) }
									{ ! conn.is_primary && conn.enabled && (
										<span className="aime-badge aime-badge-fallback">{ __( 'Fallback', 'ai-marketing-expert' ) }</span>
									) }
									{ ! conn.enabled && (
										<span className="aime-badge aime-badge-disabled">{ __( 'Disabled', 'ai-marketing-expert' ) }</span>
									) }
								</div>
							</div>

							<div className="aime-smtp-card-meta">
								{ conn.provider !== 'wp_mail' && <span>{ conn.smtp_host || p.host || '-' }:{ conn.smtp_port || p.port || 587 }</span> }
								{ conn.provider !== 'wp_mail' && <span>{ ( conn.smtp_encryption || 'tls' ).toUpperCase() }</span> }
								<span>{ sprintf( __( '%1$d / %2$d sent', 'ai-marketing-expert' ), conn.sent_last_24h || 0, conn.sending_limit || 90 ) }</span>
								{ conn.from_email && <span>{ conn.from_email }</span> }
							</div>

							{ conn.provider === 'wp_mail' && (
								<div className="aime-smtp-default-warning">
									<strong>{ __( 'Default WordPress mail may not work properly.', 'ai-marketing-expert' ) }</strong>
									<span>{ __( 'Set up a real SMTP server for reliable email delivery.', 'ai-marketing-expert' ) }</span>
								</div>
							) }

							<div className="aime-smtp-card-actions">
								<div className="aime-smtp-card-buttons">
									<Button variant="secondary" size="small" onClick={ () => openEdit( conn ) }>
										{ __( 'Edit', 'ai-marketing-expert' ) }
									</Button>

									{ showTestId === conn.id ? (
										<div className="aime-smtp-inline-test">
											<TextControl
												value={ testEmail }
												onChange={ setTestEmail }
												placeholder="test@example.com"
												__nextHasNoMarginBottom
											/>
											<Button
												variant="secondary"
												size="small"
												isBusy={ testingId === conn.id }
												disabled={ testingId === conn.id }
												onClick={ () => handleTest( conn.id ) }
											>
											{ testingId === conn.id
													? <><Spinner style={ { marginRight: 4 } } />{ __( 'Sending...', 'ai-marketing-expert' ) }</>
												: __( 'Send', 'ai-marketing-expert' )
											}
											</Button>
											<Button
												variant="tertiary"
												size="small"
												onClick={ () => setShowTestId( null ) }
											>
												{ __( 'Cancel', 'ai-marketing-expert' ) }
											</Button>
										</div>
									) : (
										<Button variant="tertiary" size="small" onClick={ () => setShowTestId( conn.id ) }>
											{ __( 'Test', 'ai-marketing-expert' ) }
										</Button>
									) }

									{ ! conn.is_primary && (
										<>
											<Button
												variant="tertiary"
												size="small"
												disabled={ ! canMoveUp || movingKey === `${ conn.id }:up` || movingKey === `${ conn.id }:down` }
												isBusy={ movingKey === `${ conn.id }:up` }
												onClick={ () => handleMove( conn, 'up' ) }
											>
												{ __( 'Move Up', 'ai-marketing-expert' ) }
											</Button>
											<Button
												variant="tertiary"
												size="small"
												disabled={ ! canMoveDown || movingKey === `${ conn.id }:up` || movingKey === `${ conn.id }:down` }
												isBusy={ movingKey === `${ conn.id }:down` }
												onClick={ () => handleMove( conn, 'down' ) }
											>
												{ __( 'Move Down', 'ai-marketing-expert' ) }
											</Button>
											{ conn.enabled && (
												<Button variant="tertiary" size="small" onClick={ () => handleSetPrimary( conn ) }>
													{ __( 'Make Primary', 'ai-marketing-expert' ) }
												</Button>
											) }
										</>
									) }

									<Button
										variant="tertiary"
										size="small"
										isDestructive
										isBusy={ deleting === conn.id }
										disabled={ deleting === conn.id }
										onClick={ () => handleDelete( conn.id ) }
									>
										{ deleting === conn.id
											? <><Spinner style={ { marginRight: 4 } } />{ __( 'Deleting...', 'ai-marketing-expert' ) }</>
											: __( 'Delete', 'ai-marketing-expert' )
										}
									</Button>
								</div>

								<ToggleControl
									checked={ !! conn.enabled }
									onChange={ () => handleToggleEnabled( conn ) }
									__nextHasNoMarginBottom
								/>
							</div>
						</div>
					);
				} ) }
			</div>

			{ displayedConnections.length > 1 && (
				<p className="aime-card-description" style={ { margin: '12px 0 0' } }>
					{ __( 'Emails are sent in this order.', 'ai-marketing-expert' ) }
				</p>
			) }


			<div className="aime-smtp-error-log-accordion">
				<details className="aime-smtp-error-log-panel">
					<summary>
						<span>
							<strong>{ __( 'Recent SMTP Errors', 'ai-marketing-expert' ) }</strong>
							<small>{ sprintf( __( 'Latest %d site email failures', 'ai-marketing-expert' ), smtpErrorLogLimit ) }</small>
						</span>
						<span className={ `aime-smtp-error-count${ smtpErrorLogs.length ? ' has-errors' : '' }` }>
							{ sprintf( __( '%d errors', 'ai-marketing-expert' ), smtpErrorLogs.length ) }
						</span>
					</summary>

					<div className="aime-smtp-error-log-content">
						<div className="aime-smtp-error-log-toolbar">
							<p className="aime-card-description">
								{ __( 'Site email failures from WooCommerce, contact forms, WordPress, and other wp_mail emails appear here.', 'ai-marketing-expert' ) }
							</p>
							<Button
								variant="tertiary"
								size="small"
								isDestructive
								disabled={ smtpErrorLogs.length === 0 || clearingErrorLogs }
								isBusy={ clearingErrorLogs }
								onClick={ handleClearErrorLogs }
							>
								{ __( 'Clear Logs', 'ai-marketing-expert' ) }
							</Button>
						</div>

						{ smtpErrorLogs.length === 0 ? (
							<div className="aime-smtp-error-log-empty">
								{ __( 'No SMTP errors recorded yet.', 'ai-marketing-expert' ) }
							</div>
						) : (
							<div className="aime-smtp-error-log-table-wrap">
								<table className="aime-smtp-error-log-table">
									<thead>
										<tr>
											<th>{ __( 'Time', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Recipient', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Subject', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Error', 'ai-marketing-expert' ) }</th>
										</tr>
									</thead>
									<tbody>
										{ smtpErrorLogs.map( ( log, index ) => (
											<tr key={ `${ log.time || 'smtp-error' }-${ index }` }>
												<td>{ formatErrorLogTime( log.time ) }</td>
												<td>{ log.to || '-' }</td>
												<td>{ log.subject || '-' }</td>
												<td>
													<strong>{ log.code || __( 'Error', 'ai-marketing-expert' ) }</strong>
													<span>{ log.message || '-' }</span>
												</td>
											</tr>
										) ) }
									</tbody>
								</table>
							</div>
						) }
					</div>
				</details>
			</div>

			{ /* FAQ */ }
			<div className="aime-smtp-faq">
				<h3>{ __( 'Frequently Asked Questions', 'ai-marketing-expert' ) }</h3>

				<details className="aime-smtp-faq-item">
					<summary>{ __( 'Does this SMTP work with contact forms and other plugins too?', 'ai-marketing-expert' ) }</summary>
					<p>
						{ __( 'Yes, when the site email toggle is enabled. The primary connection then handles outgoing emails across your site, including contact forms, WooCommerce notifications, and other plugins that use WordPress mail.', 'ai-marketing-expert' ) }
					</p>
				</details>

				<details className="aime-smtp-faq-item">
					<summary>{ __( 'Do I still need another SMTP plugin like WP Mail SMTP?', 'ai-marketing-expert' ) }</summary>
					<p>
						{ __( 'No, not if the site email toggle is enabled here. If you prefer to keep another SMTP plugin active, turn this toggle off so AI Marketing Expert only sends its own campaign and automation emails.', 'ai-marketing-expert' ) }
					</p>
				</details>

				<details className="aime-smtp-faq-item">
					<summary>{ __( 'Can I use another SMTP plugin instead of the SMTP connections here?', 'ai-marketing-expert' ) }</summary>
					<p>
						{ __( 'Yes. You can use any other SMTP plugin for your site emails and leave the SMTP connections here unused. If another SMTP plugin is active, turn off the site email toggle in AI Marketing Expert so the other plugin handles WordPress emails while this plugin continues to work normally.', 'ai-marketing-expert' ) }
					</p>
				</details>
				<details className="aime-smtp-faq-item">
					<summary>{ __( 'What happens if no SMTP connection is configured?', 'ai-marketing-expert' ) }</summary>
					<p>
						{ __( 'Without an SMTP connection, WordPress uses the default PHP mail function, which on many hosts can result in emails landing in spam or not being delivered. Adding at least one SMTP connection ensures your emails are delivered reliably through a trusted provider.', 'ai-marketing-expert' ) }
					</p>
				</details>
			</div>

			{ /* Add / Edit modal */ }
			{ showModal && (
				<Modal
					title={ editId ? __( 'Edit SMTP Connection', 'ai-marketing-expert' ) : __( 'Add SMTP Connection', 'ai-marketing-expert' ) }
					onRequestClose={ closeModal }
					className="aime-smtp-modal"
					overlayClassName="aime-modal-overlay"
				>
					<div className="aime-smtp-modal-body">
						{ /* Connection name */ }
						{ modalErrors.name && (
							<div className="aime-field-error aime-smtp-modal-field-error">
								{ modalErrors.name }
							</div>
						) }
						<TextControl
							label={ __( 'Connection Name', 'ai-marketing-expert' ) }
							value={ form.name }
							onChange={ ( v ) => {
								setForm( ( prev ) => ( { ...prev, name: v } ) );
								setNameManuallyEdited( true );
								setModalErrors( ( prev ) => ( { ...prev, name: null, submit: null } ) );
							} }
							placeholder={ __( 'e.g. Gmail Primary', 'ai-marketing-expert' ) }
							__nextHasNoMarginBottom
						/>

						{ /* Provider picker */ }
						<div className="aime-smtp-provider-section">
							<label className="components-base-control__label">
								{ __( 'Select Provider', 'ai-marketing-expert' ) }
							</label>
							<div className="aime-smtp-providers-grid">
								{ Object.entries( providers ).map( ( [ id, prov ] ) => (
									<button
										key={ id }
										type="button"
										className={ `aime-smtp-provider-card${ form.provider === id ? ' aime-smtp-selected' : '' }` }
										onClick={ () => handleProviderSelect( id ) }
									>
											<SmtpProviderIcon provider={ id } />
										<strong>{ prov.name }</strong>
											{ form.provider === id && <span className="aime-smtp-check">{ '\u2713' }</span> }
									</button>
								) ) }
							</div>
							{ modalErrors.provider && (
								<div className="aime-field-error">
									{ modalErrors.provider }
								</div>
							) }
						</div>

						{ /* SMTP fields (only for non-wp_mail) */ }
						{ showSmtpFields && (
							<div className="aime-smtp-config animate__animated animate__fadeIn animate__faster">
								<h4>{ __( 'SMTP Configuration', 'ai-marketing-expert' ) }</h4>

								{ form.provider === 'amazon_ses' && (
									<div className="aime-smtp-provider-help">
										<SelectControl
											label={ __( 'Amazon SES Region', 'ai-marketing-expert' ) }
											value={ selectedAmazonSesRegion }
											onChange={ handleAmazonSesRegionChange }
											options={ amazonSesRegions.map( ( region ) => ( {
												label: region,
												value: region,
											} ) ) }
											__nextHasNoMarginBottom
										/>
										<p>
											{ __( 'Amazon SES SMTP credentials only work in the region where they were created. If your SES account uses another region, select it here or edit the SMTP host manually.', 'ai-marketing-expert' ) }
										</p>
										<p>
											{ __( 'If your SES account is in sandbox mode, both the sender and recipient email addresses must be verified.', 'ai-marketing-expert' ) }
										</p>
									</div>
								) }

								{ form.provider === 'gmail' && (
									<div className="aime-smtp-provider-help">
										<p>
											{ __( 'Use a Gmail App Password, not your normal Google password. Repeated quick test emails may be temporarily rejected by Gmail even when authentication is correct.', 'ai-marketing-expert' ) }
										</p>
										<p>
											{ __( 'For best results, leave From Email blank or use the same Gmail address as the SMTP username.', 'ai-marketing-expert' ) }
										</p>
									</div>
								) }

								{ providerFields.includes( 'smtp_host' ) && (
									<TextControl
										label={ __( 'SMTP Host', 'ai-marketing-expert' ) }
										value={ form.smtp_host }
										onChange={ ( v ) => setForm( ( prev ) => ( { ...prev, smtp_host: v } ) ) }
										__nextHasNoMarginBottom
									/>
								) }

								{ form.provider === 'outlook' && (
									<SelectControl
										label={ __( 'Microsoft Account Type', 'ai-marketing-expert' ) }
										value={ form.smtp_account_type || 'personal' }
										onChange={ handleOutlookAccountTypeChange }
										options={ [
											{ label: __( 'Personal Outlook.com', 'ai-marketing-expert' ), value: 'personal' },
											{ label: __( 'Microsoft 365 Business', 'ai-marketing-expert' ), value: 'business' },
										] }
										__nextHasNoMarginBottom
									/>
								) }

								<div className="aime-form-row">
									{ providerFields.includes( 'smtp_port' ) && (
										<TextControl
											label={ __( 'Port', 'ai-marketing-expert' ) }
											value={ form.smtp_port }
											onChange={ ( v ) => setForm( ( prev ) => ( { ...prev, smtp_port: parseInt( v ) || 587 } ) ) }
											type="number"
											__nextHasNoMarginBottom
										/>
									) }
									{ providerFields.includes( 'smtp_encryption' ) && (
										<SelectControl
											label={ __( 'Encryption', 'ai-marketing-expert' ) }
											value={ form.smtp_encryption }
											onChange={ ( v ) => setForm( ( prev ) => ( { ...prev, smtp_encryption: v } ) ) }
											options={ [
												{ label: 'TLS', value: 'tls' },
												{ label: 'SSL', value: 'ssl' },
												{ label: __( 'None', 'ai-marketing-expert' ), value: 'none' },
											] }
											__nextHasNoMarginBottom
										/>
									) }
								</div>

								{ providerFields.includes( 'smtp_username' ) && (
									<TextControl
										label={ __( 'Username', 'ai-marketing-expert' ) }
										value={ form.smtp_username }
										onChange={ ( v ) => setForm( ( prev ) => ( { ...prev, smtp_username: v } ) ) }
										__nextHasNoMarginBottom
									/>
								) }

								{ providerFields.includes( 'smtp_password' ) && (
									<TextControl
										label={ __( 'Password / API Key', 'ai-marketing-expert' ) }
										value={ form.smtp_password }
										onChange={ ( v ) => setForm( ( prev ) => ( { ...prev, smtp_password: v } ) ) }
										onFocus={ () => {
											if ( editId && form.smtp_password === PASSWORD_MASK ) {
												setForm( ( prev ) => ( { ...prev, smtp_password: '' } ) );
											}
										} }
										type="password"
										help={
											editId
											? __( 'Saved credentials are masked. Leave unchanged or blank to keep the current password.', 'ai-marketing-expert' )
												: ''
										}
										__nextHasNoMarginBottom
									/>
								) }

								{ providerPreset.docs_url && (
									<p className="aime-smtp-docs">
										<a href={ providerPreset.docs_url } target="_blank" rel="noopener noreferrer">
											{ __( 'View setup guide for this provider \u2192', 'ai-marketing-expert' ) }
										</a>
									</p>
								) }
							</div>
						) }

						{ /* From overrides */ }
						<div className="aime-smtp-from-override">
							<h4>{ __( 'From Override', 'ai-marketing-expert' ) }</h4>
							<p className="aime-card-description" style={ { margin: '0 0 12px' } }>
								{ __( 'Each SMTP connection can have its own sender identity. Set these to match your SMTP account to ensure successful delivery.', 'ai-marketing-expert' ) }
							</p>
							<TextControl
								label={ __( 'Sending Limit', 'ai-marketing-expert' ) }
								type="number"
								min="1"
								value={ form.sending_limit }
								onChange={ ( v ) => setForm( ( prev ) => ( { ...prev, sending_limit: parseInt( v ) || 90 } ) ) }
								help={ __( 'Maximum emails this connection can send in 24 hours. When reached, sending uses the next fallback connection.', 'ai-marketing-expert' ) }
								__nextHasNoMarginBottom
							/>
							<div className="aime-form-row" style={ { marginTop: 12 } }>
								<TextControl
									label={ __( 'From Name', 'ai-marketing-expert' ) }
									value={ form.from_name }
									onChange={ ( v ) => setForm( ( prev ) => ( { ...prev, from_name: v } ) ) }
									__nextHasNoMarginBottom
								/>
								<TextControl
									label={ __( 'From Email', 'ai-marketing-expert' ) }
									value={ form.from_email }
									onChange={ ( v ) => setForm( ( prev ) => ( { ...prev, from_email: v } ) ) }
									type="email"
									__nextHasNoMarginBottom
								/>
							</div>
							<p className="aime-hint-warn" style={ { margin: '8px 0 0' } }>
								⚠ { __( 'The From Email must match your SMTP account address. Mismatches will cause emails to be rejected by your provider.', 'ai-marketing-expert' ) }
							</p>
						</div>

						{ /* Primary toggle */ }
						<div className="aime-smtp-primary-toggle">
							<ToggleControl
								label={ __( 'Set as Primary Connection', 'ai-marketing-expert' ) }
								checked={ form.is_primary }
								onChange={ ( v ) => setForm( ( prev ) => ( { ...prev, is_primary: v } ) ) }
								help={ __( 'The primary connection is used first. Other enabled connections act as fallbacks.', 'ai-marketing-expert' ) }
							/>
						</div>
					</div>

						{ modalErrors.submit && (
							<Notice type="error" message={ modalErrors.submit } onDismiss={ () => setModalErrors( ( prev ) => ( { ...prev, submit: null } ) ) } />
						) }

					{ /* Modal footer */ }
					<div className="aime-smtp-modal-footer">
						<Button variant="tertiary" onClick={ closeModal }>
							{ __( 'Cancel', 'ai-marketing-expert' ) }
						</Button>
						<Button
							variant="primary"
							onClick={ handleSave }
							isBusy={ saving }
							disabled={ saving }
						>
							{ saving
								? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
								: editId ? __( 'Update Connection', 'ai-marketing-expert' ) : __( 'Save Connection', 'ai-marketing-expert' )
							}
						</Button>
					</div>
				</Modal>
			) }
		</div>
	);
};

export default SmtpSettings;
