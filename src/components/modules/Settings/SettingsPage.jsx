/**
 * Settings page - vertical tab layout with General, Modules, API & Webhooks, Debug Log.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	ToggleControl, Button, SelectControl, Spinner,
} from '@aime/wp-components';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import { ProUpgradeButton } from '../../common/ProLock';
import useApi from '../../../hooks/useApi';
import usePro from '../../../hooks/usePro';

const isDebug = !! window.aimeData?.isDebug;

const TABS = [
	{ id: 'general', label: __( 'General', 'ai-marketing-expert' ) },
	{ id: 'modules', label: __( 'Modules', 'ai-marketing-expert' ) },
	{ id: 'system', label: __( 'System Status', 'ai-marketing-expert' ) },
	{ id: 'api', label: __( 'API & Webhooks', 'ai-marketing-expert' ) },
	...( isDebug ? [ { id: 'logs', label: __( 'Debug Log', 'ai-marketing-expert' ) } ] : [] ),
];

const formatCronDelay = ( seconds ) => {
	if ( seconds === null || seconds === undefined ) {
		return __( 'Not scheduled', 'ai-marketing-expert' );
	}
	if ( seconds <= 0 ) {
		return __( 'On time', 'ai-marketing-expert' );
	}
	const minutes = Math.floor( seconds / 60 );
	if ( minutes < 1 ) {
		return __( 'Less than 1 minute late', 'ai-marketing-expert' );
	}
	return `${ minutes } ${ minutes === 1 ? __( 'minute late', 'ai-marketing-expert' ) : __( 'minutes late', 'ai-marketing-expert' ) }`;
};

const SettingsPage = () => {
	const { loading, get, post, del } = useApi();
	const { hasPro } = usePro();
	const initialTab = new URLSearchParams( window.location.search ).get( 'tab' );
	const [ tab, setTab ] = useState( TABS.some( ( item ) => item.id === initialTab ) ? initialTab : 'general' );
	const [ settings, setSettings ] = useState( {} );
	const [ modules, setModules ] = useState( [] );
	const [ cronStatus, setCronStatus ] = useState( null );
	const [ cronLoading, setCronLoading ] = useState( false );
	const [ runningAutomations, setRunningAutomations ] = useState( false );
	const [ notice, setNotice ] = useState(
		new URLSearchParams( window.location.search ).get( 'module_disabled' )
			? { type: 'info', message: __( 'That module is disabled. Enable it here before opening it.', 'ai-marketing-expert' ) }
			: null
	);

	/* API Key */
	const [ apiKeyFull, setApiKeyFull ] = useState( '' );
	const [ apiKeyBusy, setApiKeyBusy ] = useState( false );
	const [ apiKeyCopied, setApiKeyCopied ] = useState( false );
	const [ webhookCopied, setWebhookCopied ] = useState( false );

	/* Logs */
	const [ logs, setLogs ] = useState( [] );
	const [ logTotal, setLogTotal ] = useState( 0 );
	const [ logPage, setLogPage ] = useState( 1 );
	const [ logLevel, setLogLevel ] = useState( '' );
	const [ logModule, setLogModule ] = useState( '' );
	const [ logsLoading, setLogsLoading ] = useState( false );

	/* Import / Export */
	const [ exporting, setExporting ] = useState( false );
	const [ importing, setImporting ] = useState( false );

	useEffect( () => {
		loadData();
	}, [] );

	const loadData = async () => {
		try {
			const [ settingsData, modulesData, cronData ] = await Promise.all( [
				get( '/settings' ),
				get( '/modules' ),
				get( '/system/cron-status' ),
			] );
			setSettings( settingsData.settings || {} );
			setModules( modulesData.modules || [] );
			setCronStatus( cronData || null );
		} catch ( err ) {
			// Handled.
		}
	};

	const loadCronStatus = async () => {
		setCronLoading( true );
		try {
			const res = await get( '/system/cron-status' );
			setCronStatus( res || null );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		}
		setCronLoading( false );
	};

	const runDueAutomations = async () => {
		setRunningAutomations( true );
		try {
			const res = await post( '/system/run-due-automations' );
			setCronStatus( res.cron || cronStatus );
			setNotice( { type: 'success', message: res.message || __( 'Due automations processed.', 'ai-marketing-expert' ) } );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		}
		setRunningAutomations( false );
	};

	const loadLogs = useCallback( async () => {
		setLogsLoading( true );
		try {
			const res = await get( '/debug-log', { page: logPage, per_page: 30, level: logLevel, module: logModule } );
			setLogs( res?.logs || [] );
			setLogTotal( res?.total || 0 );
		} catch ( err ) {
			// Handled.
		}
		setLogsLoading( false );
	}, [ get, logPage, logLevel, logModule ] );

	useEffect( () => {
		if ( tab === 'logs' && isDebug ) {
			loadLogs();
		}
	}, [ tab, loadLogs ] );

	const toggleModule = async ( moduleId ) => {
		try {
			const result = await post( `/modules/${ moduleId }/toggle` );
			setModules( ( prev ) =>
				prev.map( ( m ) =>
					m.id === moduleId ? { ...m, is_active: result.is_active } : m
				)
			);
			setNotice( { type: 'success', message: result.message } );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		}
	};

	/* API Key handlers */
	const handleGenerateApiKey = async () => {
		if ( settings.has_api_key && ! window.confirm( __( 'This will replace your current API key. Any integrations using the old key will stop working. Continue?', 'ai-marketing-expert' ) ) ) return;
		setApiKeyBusy( true );
		try {
			const res = await post( '/api-key/generate' );
			setApiKeyFull( res.api_key || '' );
			setSettings( ( prev ) => ( { ...prev, has_api_key: true, api_key_masked: res.masked || '', webhook_url: res.webhook_url || prev.webhook_url } ) );
			setNotice( { type: 'success', message: __( 'API key generated. Copy it now — it won\'t be shown again.', 'ai-marketing-expert' ) } );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		}
		setApiKeyBusy( false );
	};

	const handleRevokeApiKey = async () => {
		if ( ! window.confirm( __( 'Revoke API key? All webhook integrations will stop working.', 'ai-marketing-expert' ) ) ) return;
		setApiKeyBusy( true );
		try {
			await del( '/api-key' );
			setApiKeyFull( '' );
			setSettings( ( prev ) => ( { ...prev, has_api_key: false, api_key_masked: '' } ) );
			setNotice( { type: 'success', message: __( 'API key revoked.', 'ai-marketing-expert' ) } );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		}
		setApiKeyBusy( false );
	};

	const copyToClipboard = ( text, setter ) => {
		navigator.clipboard.writeText( text ).then( () => {
			setter( true );
			setTimeout( () => setter( false ), 2000 );
		} ).catch( () => {} );
	};

	const handleClearLogs = async () => {
		if ( ! window.confirm( __( 'Clear all plugin logs?', 'ai-marketing-expert' ) ) ) return;
		try {
			await del( '/debug-log' );
			setLogs( [] );
			setLogTotal( 0 );
			setLogPage( 1 );
			setNotice( { type: 'success', message: __( 'Logs cleared.', 'ai-marketing-expert' ) } );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		}
	};

	/* Import / Export handlers */
	const handleExportSettings = async () => {
		setExporting( true );
		try {
			const data = await get( '/settings/export' );
			const blob = new Blob( [ JSON.stringify( data, null, 2 ) ], { type: 'application/json' } );
			const url = URL.createObjectURL( blob );
			const a = document.createElement( 'a' );
			a.href = url;
			a.download = `aime-settings-export-${ new Date().toISOString().slice( 0, 10 ) }.json`;
			document.body.appendChild( a );
			a.click();
			document.body.removeChild( a );
			URL.revokeObjectURL( url );
			setNotice( { type: 'success', message: __( 'Settings exported. API keys and secrets are never included.', 'ai-marketing-expert' ) } );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		}
		setExporting( false );
	};

	const handleImportSettings = ( event ) => {
		const file = event.target.files?.[ 0 ];
		event.target.value = '';
		if ( ! file ) return;

		const reader = new FileReader();
		reader.onload = async () => {
			let parsed;
			try {
				parsed = JSON.parse( reader.result );
			} catch ( e ) {
				setNotice( { type: 'error', message: __( 'Invalid file — not valid JSON.', 'ai-marketing-expert' ) } );
				return;
			}
			setImporting( true );
			try {
				const res = await post( '/settings/import', parsed );
				setNotice( { type: 'success', message: res.message || __( 'Settings imported.', 'ai-marketing-expert' ) } );
				loadData();
			} catch ( err ) {
				setNotice( { type: 'error', message: err.message } );
			}
			setImporting( false );
		};
		reader.readAsText( file );
	};

	if ( loading ) {
		return <Loader text={ __( 'Loading settings...', 'ai-marketing-expert' ) } />;
	}

	const logPages = Math.ceil( logTotal / 30 );

	return (
		<div className="aime-settings-page">
			{ notice && (
				<Notice type={ notice.type } message={ notice.message } onDismiss={ () => setNotice( null ) } />
			) }

			{ cronStatus?.has_overdue && tab !== 'system' && (
				<Notice
					type="warning"
					message={ __( 'Background jobs are overdue. Email automations and queues may run late until WordPress cron is triggered reliably.', 'ai-marketing-expert' ) }
					dismissible={ false }
				/>
			) }

			<h2>{ __( 'Settings', 'ai-marketing-expert' ) }</h2>

			<div className="aime-settings-layout">
				{ /* Vertical Tab Menu */ }
				<div className="aime-settings-sidebar">
					{ TABS.map( ( t ) => (
						<button
							key={ t.id }
							className={ `aime-settings-tab${ tab === t.id ? ' is-active' : '' }` }
							onClick={ () => setTab( t.id ) }
						>
							{ t.label }
						</button>
					) ) }
				</div>

				{ /* Tab Content */ }
				<div className="aime-settings-content">

					{ /* General */ }
					{ tab === 'general' && (
						<>
							<Card title={ __( 'License Status', 'ai-marketing-expert' ) }>
								<div className={ `aime-license-status ${ hasPro ? 'aime-license-pro' : 'aime-license-free' }` }>
									<h3>
										{ hasPro
											? __( 'Pro License Active', 'ai-marketing-expert' )
											: __( 'Free Version', 'ai-marketing-expert' )
										}
									</h3>
									{ ! hasPro && (
										<div className="aime-license-status__content">
											<p>{ __( 'Upgrade to Pro to unlock all features.', 'ai-marketing-expert' ) }</p>
											<ProUpgradeButton>{ __( 'Upgrade Pro', 'ai-marketing-expert' ) }</ProUpgradeButton>
										</div>
									) }
								</div>
							</Card>

							<Card title={ __( 'Import / Export', 'ai-marketing-expert' ) }>
								<p className="aime-card-description">
									{ __( 'Export plugin settings and email templates as a JSON file, or import them on another site. API keys and other secrets are never included in exports.', 'ai-marketing-expert' ) }
								</p>
								<div style={ { display: 'flex', gap: 8, flexWrap: 'wrap' } }>
									<Button variant="secondary" onClick={ handleExportSettings } isBusy={ exporting } disabled={ exporting }>
										{ __( 'Export Settings', 'ai-marketing-expert' ) }
									</Button>
									<Button variant="secondary" disabled={ importing } isBusy={ importing } onClick={ () => document.getElementById( 'aime-import-file' )?.click() }>
										{ __( 'Import Settings', 'ai-marketing-expert' ) }
									</Button>
									<input
										id="aime-import-file"
										type="file"
										accept=".json,application/json"
										style={ { display: 'none' } }
										onChange={ handleImportSettings }
									/>
								</div>
								<p className="aime-card-description" style={ { marginTop: 8, marginBottom: 0 } }>
									{ __( 'Importing merges settings over your current configuration. Templates with duplicate names are skipped.', 'ai-marketing-expert' ) }
								</p>
							</Card>

							<Card title={ __( 'Data Management', 'ai-marketing-expert' ) }>
								<ToggleControl
									label={ __( 'Delete data on uninstall', 'ai-marketing-expert' ) }
									checked={ !! settings.delete_data_on_uninstall }
									onChange={ async ( v ) => {
										const nextSettings = { ...settings, delete_data_on_uninstall: v };
										setSettings( nextSettings );
										try {
											const result = await post( '/settings', nextSettings );
											setSettings( result.settings || nextSettings );
											setNotice( { type: 'success', message: __( 'Setting saved.', 'ai-marketing-expert' ) } );
										} catch ( err ) {
											setSettings( settings );
											setNotice( { type: 'error', message: err.message } );
										}
									} }
									help={ __( 'Remove all plugin data when the plugin is deleted.', 'ai-marketing-expert' ) }
								/>
							</Card>
						</>
					) }

					{ /* Modules */ }
					{ tab === 'modules' && (
						<Card title={ __( 'Modules', 'ai-marketing-expert' ) }>
							<p className="aime-card-description">
								{ __( 'Enable or disable marketing modules.', 'ai-marketing-expert' ) }
							</p>
							<div className="aime-modules-list">
								{ modules.map( ( module ) => (
									<div key={ module.id } className="aime-module-toggle">
										<div className="aime-module-info">
											<strong>{ module.name }</strong>
											<p>{ module.description }</p>
										</div>
										<ToggleControl
											checked={ module.is_active }
											onChange={ () => toggleModule( module.id ) }
										/>
									</div>
								) ) }
							</div>
						</Card>
					) }

					{ /* System Status */ }
					{ tab === 'system' && (
						<>
							<Card title={ __( 'Cron Status', 'ai-marketing-expert' ) }>
								<p className="aime-card-description">
									{ __( 'Email queues and automations run through WordPress cron. For accurate automation timing, configure real server cron.', 'ai-marketing-expert' ) }
								</p>

								{ cronStatus?.has_overdue && (
									<div style={ { border: '1px solid #fbbf24', background: '#fffbeb', color: '#92400e', borderRadius: 8, padding: 12, marginBottom: 16 } }>
										<strong>{ __( 'Cron is overdue.', 'ai-marketing-expert' ) }</strong>{ ' ' }
										{ __( 'Automations can run later than the wait time you set. Configure server cron to call wp-cron.php every minute for reliable timing.', 'ai-marketing-expert' ) }
									</div>
								) }

								<div style={ { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 } }>
									<Button variant="secondary" onClick={ loadCronStatus } disabled={ cronLoading }>
										{ cronLoading ? <Spinner /> : __( 'Refresh Status', 'ai-marketing-expert' ) }
									</Button>
									<Button variant="primary" onClick={ runDueAutomations } disabled={ runningAutomations } isBusy={ runningAutomations }>
										{ __( 'Run Due Automations Now', 'ai-marketing-expert' ) }
									</Button>
								</div>

								<table className="aime-table">
									<thead>
										<tr>
											<th>{ __( 'Job', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Hook', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Next Run', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
										</tr>
									</thead>
									<tbody>
										{ ( cronStatus?.items || [] ).map( ( item ) => (
											<tr key={ item.hook }>
												<td>{ item.label }</td>
												<td><code>{ item.hook }</code></td>
												<td>{ item.next_run_local || __( 'Not scheduled', 'ai-marketing-expert' ) }</td>
												<td>
													<span className={ `aime-status-badge aime-status-${ item.status }` }>
														{ item.status === 'overdue' ? __( 'Overdue', 'ai-marketing-expert' ) : item.status === 'missing' ? __( 'Missing', 'ai-marketing-expert' ) : __( 'Scheduled', 'ai-marketing-expert' ) }
													</span>
													<span style={ { marginLeft: 8, color: '#64748b' } }>{ formatCronDelay( item.delay_seconds ) }</span>
												</td>
											</tr>
										) ) }
									</tbody>
								</table>

								<div style={ { marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8 } }>
									<p style={ { marginTop: 0 } }>
										<strong>{ __( 'Recommended server cron', 'ai-marketing-expert' ) }</strong>
									</p>
									<code style={ { display: 'block', whiteSpace: 'normal', wordBreak: 'break-all' } }>
										* * * * * curl -s { window.aimeData?.siteUrl || window.location.origin }/wp-cron.php?doing_wp_cron &gt;/dev/null 2&gt;&amp;1
									</code>
									<p style={ { marginBottom: 0, color: '#64748b' } }>
										{ cronStatus?.wp_cron_disabled
											? __( 'DISABLE_WP_CRON is enabled. Make sure a real server cron is configured.', 'ai-marketing-expert' )
											: __( 'For best reliability, disable visitor-triggered WP-Cron and run wp-cron.php from your hosting cron every minute.', 'ai-marketing-expert' ) }
									</p>
								</div>
							</Card>
						</>
					) }

					{ /* API & Webhooks */ }
					{ tab === 'api' && (
						<>
							<Card title={ __( 'API & Webhooks', 'ai-marketing-expert' ) }>
								<p className="aime-card-description" style={ { marginBottom: 16 } }>
									{ __( 'Generate an API key to connect external tools, forms, and services — allowing them to add subscribers to your email lists automatically via webhook.', 'ai-marketing-expert' ) }
								</p>

								{ settings.has_api_key ? (
									<>
										{ apiKeyFull ? (
											<div className="aime-api-key-display">
												<div className="aime-api-key-notice">
													<strong>{ __( 'Copy your API key now — it won\'t be shown again!', 'ai-marketing-expert' ) }</strong>
												</div>
												<div className="aime-api-key-value">
													<code>{ apiKeyFull }</code>
													<Button variant="secondary" size="small" onClick={ () => copyToClipboard( apiKeyFull, setApiKeyCopied ) }>
														{ apiKeyCopied ? __( 'Copied!', 'ai-marketing-expert' ) : __( 'Copy', 'ai-marketing-expert' ) }
													</Button>
												</div>
											</div>
										) : (
											<p style={ { color: '#64748b' } }>
												{ __( 'API key:', 'ai-marketing-expert' ) } <code>{ settings.api_key_masked }</code>
											</p>
										) }
										<div style={ { display: 'flex', gap: 8, marginTop: 12 } }>
											<Button variant="secondary" onClick={ handleGenerateApiKey } isBusy={ apiKeyBusy } disabled={ apiKeyBusy }>
												{ __( 'Regenerate Key', 'ai-marketing-expert' ) }
											</Button>
											<Button isDestructive variant="secondary" onClick={ handleRevokeApiKey } isBusy={ apiKeyBusy } disabled={ apiKeyBusy }>
												{ __( 'Revoke Key', 'ai-marketing-expert' ) }
											</Button>
										</div>
									</>
								) : (
									<>
										<p style={ { color: '#64748b', marginBottom: 12 } }>
											{ __( 'No API key generated yet. Generate one to enable webhook integrations.', 'ai-marketing-expert' ) }
										</p>
										<Button variant="primary" onClick={ handleGenerateApiKey } isBusy={ apiKeyBusy } disabled={ apiKeyBusy }>
											{ __( 'Generate API Key', 'ai-marketing-expert' ) }
										</Button>
									</>
								) }
							</Card>

							{ settings.has_api_key && (
								<Card title={ __( 'Webhook Endpoint', 'ai-marketing-expert' ) }>
									<p style={ { color: '#64748b', marginBottom: 8 } }>
										{ __( 'Send a POST request to this URL with your API key to create subscribers from any external tool.', 'ai-marketing-expert' ) }
									</p>
									<div className="aime-api-key-value">
										<code style={ { fontSize: '12px', wordBreak: 'break-all' } }>{ settings.webhook_url }</code>
										<Button variant="secondary" size="small" onClick={ () => copyToClipboard( settings.webhook_url, setWebhookCopied ) }>
											{ webhookCopied ? __( 'Copied!', 'ai-marketing-expert' ) : __( 'Copy', 'ai-marketing-expert' ) }
										</Button>
									</div>

									<div style={ { marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: 13 } }>
										<strong>{ __( 'Request format:', 'ai-marketing-expert' ) }</strong>
										<pre style={ { margin: '8px 0 0', padding: 12, background: '#1e293b', color: '#e2e8f0', borderRadius: 6, overflow: 'auto', fontSize: 12, lineHeight: 1.5 } }>{ `POST ${ settings.webhook_url || '/wp-json/aime/v1/email/webhook/subscribe' }
Content-Type: application/json
X-API-Key: your-api-key

{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "list_id": 1,
  "tag_ids": [2, 5],
  "tag_names": ["My Tag", "Another Tag"],
  "status": "subscribed",
  "custom_fields": {
    "company": "Acme Inc"
  }
}` }</pre>
										<p style={ { margin: '10px 0 0', color: '#64748b' } }>
											{ __( 'Only "email" is required. All other fields are optional. Rate limit: 60 requests per minute.', 'ai-marketing-expert' ) }
										</p>
									</div>
								</Card>
							) }
						</>
					) }

					{ /* Debug Log */ }
					{ tab === 'logs' && isDebug && (
						<Card title={ __( 'Debug Log', 'ai-marketing-expert' ) }>
							<p className="aime-card-description">
								{ __( 'Plugin activity log. Only visible when WP_DEBUG is enabled.', 'ai-marketing-expert' ) }
							</p>

							<div className="aime-log-toolbar">
								<SelectControl
									value={ logLevel }
									onChange={ ( v ) => { setLogLevel( v ); setLogPage( 1 ); } }
									options={ [
										{ label: __( 'All Levels', 'ai-marketing-expert' ), value: '' },
										{ label: 'Info', value: 'info' },
										{ label: 'Warning', value: 'warning' },
										{ label: 'Error', value: 'error' },
									] }
								/>
								<SelectControl
									value={ logModule }
									onChange={ ( v ) => { setLogModule( v ); setLogPage( 1 ); } }
									options={ [
										{ label: __( 'All Modules', 'ai-marketing-expert' ), value: '' },
										{ label: 'AI', value: 'ai' },
										{ label: 'Core', value: 'core' },
										{ label: 'Content', value: 'content-generator' },
										{ label: 'SEO', value: 'seo' },
										{ label: 'Email', value: 'email-marketing' },
										{ label: 'Chatbot', value: 'chatbot' },
										{ label: 'Social', value: 'social-media' },
									] }
								/>
								<Button variant="secondary" onClick={ loadLogs } disabled={ logsLoading }>
									{ logsLoading ? <Spinner /> : __( 'Refresh', 'ai-marketing-expert' ) }
								</Button>
								<Button isDestructive variant="secondary" onClick={ handleClearLogs }>
									{ __( 'Clear All', 'ai-marketing-expert' ) }
								</Button>
								<span className="aime-log-count">{ logTotal } { __( 'entries', 'ai-marketing-expert' ) }</span>
							</div>

							{ logsLoading ? (
								<div style={ { textAlign: 'center', padding: 20 } }><Spinner /></div>
							) : logs.length === 0 ? (
								<p style={ { color: '#94a3b8', textAlign: 'center', padding: 20 } }>
									{ __( 'No log entries found.', 'ai-marketing-expert' ) }
								</p>
							) : (
								<>
									<table className="aime-table aime-log-table">
										<thead>
											<tr>
												<th>{ __( 'Time', 'ai-marketing-expert' ) }</th>
												<th>{ __( 'Level', 'ai-marketing-expert' ) }</th>
												<th>{ __( 'Module', 'ai-marketing-expert' ) }</th>
												<th>{ __( 'Message', 'ai-marketing-expert' ) }</th>
											</tr>
										</thead>
										<tbody>
											{ logs.map( ( log ) => (
												<tr key={ log.id } className={ `aime-log-level--${ log.level }` }>
													<td className="aime-log-time">{ log.created_at }</td>
													<td><span className={ `aime-log-badge aime-log-badge--${ log.level }` }>{ log.level }</span></td>
													<td>{ log.module_id }</td>
													<td className="aime-log-msg">{ log.message }</td>
												</tr>
											) ) }
										</tbody>
									</table>
									{ logPages > 1 && (
										<div className="aime-table-pagination">
											<Button variant="secondary" disabled={ logPage <= 1 } onClick={ () => setLogPage( logPage - 1 ) }>
												{ __( '← Previous', 'ai-marketing-expert' ) }
											</Button>
											<span className="aime-pagination-info">
												{ __( 'Page', 'ai-marketing-expert' ) } { logPage } / { logPages }
											</span>
											<Button variant="secondary" disabled={ logPage >= logPages } onClick={ () => setLogPage( logPage + 1 ) }>
												{ __( 'Next →', 'ai-marketing-expert' ) }
											</Button>
										</div>
									) }
								</>
							) }
						</Card>
					) }
				</div>
			</div>
		</div>
	);
};

export default SettingsPage;
