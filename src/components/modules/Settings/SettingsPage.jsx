/**
 * Settings page - vertical tab layout with General, Modules, API & Webhooks, Debug Log.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	ToggleControl, Button, SelectControl, Spinner, Modal,
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
	const { get, post, del } = useApi();
	const { hasPro } = usePro();
	// `useApi` flips its shared `loading` on every request this page makes —
	// including the debug-log fetch, the cron poll and every toggle. Gating the
	// page render on it replaced the tab sidebar and the panel with a full-page
	// loader each time, which read as a page reload. Only the first load blanks
	// the page; each later request reports in its own section (`logsLoading`,
	// `cronLoading`, `apiKeyBusy`…).
	const [ booting, setBooting ] = useState( true );
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

	/* API Key & Webhooks */
	const [ apiKeyFull, setApiKeyFull ] = useState( '' );
	const [ apiKeyBusy, setApiKeyBusy ] = useState( false );
	const [ apiKeyCopied, setApiKeyCopied ] = useState( false );
	const [ webhookCopied, setWebhookCopied ] = useState( false );
	const [ cronUrlCopied, setCronUrlCopied ] = useState( false );
	const [ cronCmdCopied, setCronCmdCopied ] = useState( false );
	const [ cronTokenBusy, setCronTokenBusy ] = useState( false );
	const [ bounceWebhookCopied, setBounceWebhookCopied ] = useState( false );
	const [ complaintWebhookCopied, setComplaintWebhookCopied ] = useState( false );

	/* Logs */
	const [ logs, setLogs ] = useState( [] );
	const [ logTotal, setLogTotal ] = useState( 0 );
	const [ logPage, setLogPage ] = useState( 1 );
	const [ logLevel, setLogLevel ] = useState( '' );
	const [ logModule, setLogModule ] = useState( '' );
	const [ logsLoading, setLogsLoading ] = useState( false );

	/* Import / Export & Database Hygiene */
	const [ exporting, setExporting ] = useState( false );
	const [ importing, setImporting ] = useState( false );
	const [ pruningDb, setPruningDb ] = useState( false );
	const [ showPruneModal, setShowPruneModal ] = useState( false );
	const [ dbStats, setDbStats ] = useState( null );
	const [ dbStatsLoading, setDbStatsLoading ] = useState( false );
	const [ pruneMode, setPruneMode ] = useState( 'expired' );

	useEffect( () => {
		loadData();
	}, [] );

	const loadData = async () => {
		try {
			const [ settingsData, modulesData, cronData, hygieneData ] = await Promise.all( [
				get( '/settings' ),
				get( '/modules' ),
				get( '/system/cron-status' ),
				get( '/system/database-hygiene' ),
			] );
			setSettings( settingsData.settings || {} );
			setModules( modulesData.modules || [] );
			setCronStatus( cronData || null );
			setDbStats( hygieneData || null );
		} catch ( err ) {
			// Handled.
		} finally {
			setBooting( false );
		}
	};

	const fetchDbStats = async () => {
		setDbStatsLoading( true );
		try {
			const res = await get( '/system/database-hygiene' );
			setDbStats( res || null );
		} catch ( e ) { /* silent */ }
		setDbStatsLoading( false );
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

	const handleRegenerateCronToken = async () => {
		if ( ! window.confirm( __( 'Regenerate external cron token? Any existing server cron jobs using the old URL will need to be updated.', 'ai-marketing-expert' ) ) ) return;
		setCronTokenBusy( true );
		try {
			const res = await post( '/system/cron-token/regenerate' );
			setSettings( ( prev ) => ( {
				...prev,
				cron_token: res.cron_token,
				cron_runner_url: res.cron_runner_url,
				cron_cli_command: res.cron_cli_command,
				webhook_bounce_url: res.cron_runner_url ? res.cron_runner_url.replace( '/system/cron-runner', '/email/webhook/bounce' ) : prev.webhook_bounce_url,
				webhook_complaint_url: res.cron_runner_url ? res.cron_runner_url.replace( '/system/cron-runner', '/email/webhook/complaint' ) : prev.webhook_complaint_url,
			} ) );
			setNotice( { type: 'success', message: __( 'New cron token generated.', 'ai-marketing-expert' ) } );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		}
		setCronTokenBusy( false );
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

	const handlePruneDatabase = () => {
		setShowPruneModal( true );
	};

	const executePruneDatabase = async () => {
		setPruningDb( true );
		try {
			const res = await post( '/system/prune-database', {
				force_logs: pruneMode === 'force_logs',
			} );
			const deleted = res?.deleted || res?.details?.details || {};
			const total = Object.values( deleted ).reduce( ( acc, n ) => acc + ( Number( n ) || 0 ), 0 );
			setNotice( {
				type: 'success',
				message: res?.message || ( total > 0
					? `${ total } ${ __( 'old records cleaned from database.', 'ai-marketing-expert' ) }`
					: __( 'Database is already clean and optimal. No expired records found.', 'ai-marketing-expert' )
				),
			} );
			if ( res?.stats ) {
				setDbStats( res.stats );
			} else {
				fetchDbStats();
			}
			setShowPruneModal( false );
		} catch ( err ) {
			setNotice( { type: 'error', message: err.message } );
		} finally {
			setPruningDb( false );
		}
	};

	if ( booting ) {
		return <Loader variant="form" text={ __( 'Loading settings...', 'ai-marketing-expert' ) } />;
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
								<div className={ `aime-license-status ${ hasPro ? 'is-pro' : 'is-free' }` }>
									<span className="aime-license-status__mark" aria-hidden="true" />
									<div className="aime-license-status__text">
										<strong>
											{ hasPro
												? __( 'Pro License Active', 'ai-marketing-expert' )
												: __( 'Free Version', 'ai-marketing-expert' )
											}
										</strong>
										{ ! hasPro && (
											<p>{ __( 'Upgrade to Pro to unlock all features.', 'ai-marketing-expert' ) }</p>
										) }
									</div>
									{ ! hasPro && (
										<ProUpgradeButton>{ __( 'Upgrade Pro', 'ai-marketing-expert' ) }</ProUpgradeButton>
									) }
								</div>
							</Card>

							<Card title={ __( 'Import / Export', 'ai-marketing-expert' ) }>
								<p className="aime-card-description">
									{ __( 'Export plugin settings and email templates as a JSON file, or import them on another site. API keys and other secrets are never included in exports.', 'ai-marketing-expert' ) }
								</p>
								<div className="aime-settings-btn-row">
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

							<Card title={ __( 'Data Management & Database Hygiene', 'ai-marketing-expert' ) }>
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

								<div style={ { marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', maxWidth: 360 } }>
									<SelectControl
										label={ __( 'Log & Automation History Retention', 'ai-marketing-expert' ) }
										value={ settings.retention_days ?? 60 }
										options={ [
											{ label: __( '30 days', 'ai-marketing-expert' ), value: 30 },
											{ label: __( '60 days (Recommended)', 'ai-marketing-expert' ), value: 60 },
											{ label: __( '90 days', 'ai-marketing-expert' ), value: 90 },
											{ label: __( '180 days (6 months)', 'ai-marketing-expert' ), value: 180 },
											{ label: __( '365 days (1 year)', 'ai-marketing-expert' ), value: 365 },
											{ label: __( 'Keep indefinitely', 'ai-marketing-expert' ), value: 0 },
										] }
										onChange={ async ( v ) => {
											const val = parseInt( v, 10 );
											const nextSettings = { ...settings, retention_days: isNaN( val ) ? 60 : val };
											setSettings( nextSettings );
											try {
												const result = await post( '/settings', nextSettings );
												setSettings( result.settings || nextSettings );
												setNotice( { type: 'success', message: __( 'Retention setting saved.', 'ai-marketing-expert' ) } );
											} catch ( err ) {
												setSettings( settings );
												setNotice( { type: 'error', message: err.message } );
											}
										} }
										help={ __( 'Automatically prunes expired logs and workflow execution rows in daily background tasks to keep your database fast.', 'ai-marketing-expert' ) }
									/>
								</div>

								<div style={ { marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', maxWidth: 360 } }>
									<SelectControl
										label={ __( 'WooCommerce Cart Abandonment Cutoff', 'ai-marketing-expert' ) }
										value={ settings.woo_cart_cutoff_minutes ?? 30 }
										options={ [
											{ label: __( '5 minutes (Fast testing)', 'ai-marketing-expert' ), value: 5 },
											{ label: __( '10 minutes', 'ai-marketing-expert' ), value: 10 },
											{ label: __( '15 minutes (Recommended)', 'ai-marketing-expert' ), value: 15 },
											{ label: __( '30 minutes (Standard)', 'ai-marketing-expert' ), value: 30 },
											{ label: __( '60 minutes (1 hour)', 'ai-marketing-expert' ), value: 60 },
										] }
										onChange={ async ( v ) => {
											const val = parseInt( v, 10 );
											const nextSettings = { ...settings, woo_cart_cutoff_minutes: isNaN( val ) ? 30 : val };
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
										help={ __( 'Minimum inactivity time on checkout or cart before a session is marked abandoned and recovery triggers run.', 'ai-marketing-expert' ) }
									/>
								</div>

								{ /* Live DB Hygiene Status Box */ }
								<div style={ {
									marginTop: 20,
									padding: '14px 16px',
									background: '#f8fafc',
									border: '1px solid #e2e8f0',
									borderRadius: '8px',
								} }>
									<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } }>
										<strong style={ { fontSize: '13px', color: '#1e293b' } }>
											{ __( 'Database Health & Record Status', 'ai-marketing-expert' ) }
										</strong>
										<button
											type="button"
											onClick={ fetchDbStats }
											disabled={ dbStatsLoading }
											style={ { border: 'none', background: 'transparent', color: '#6366f1', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 } }
											title={ __( 'Refresh database counts', 'ai-marketing-expert' ) }
										>
											<span className={ `dashicons dashicons-update ${ dbStatsLoading ? 'aime-spin' : '' }` } style={ { fontSize: '14px', width: '14px', height: '14px', lineHeight: '14px' } }></span>
											{ __( 'Refresh Stats', 'ai-marketing-expert' ) }
										</button>
									</div>

									<div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' } }>
										<div style={ { background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' } }>
											<div style={ { fontSize: '11px', color: '#64748b' } }>{ __( 'Total Records', 'ai-marketing-expert' ) }</div>
											<div style={ { fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: 2 } }>
												{ dbStats?.total_rows ?? '—' }
											</div>
										</div>
										<div style={ { background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' } }>
											<div style={ { fontSize: '11px', color: '#64748b' } }>{ __( 'Expired (> retention)', 'ai-marketing-expert' ) }</div>
											<div style={ { fontSize: '16px', fontWeight: 700, color: ( dbStats?.expired_rows || 0 ) > 0 ? '#ef4444' : '#10b981', marginTop: 2 } }>
												{ dbStats?.expired_rows ?? '0' }
											</div>
										</div>
										<div style={ { background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' } }>
											<div style={ { fontSize: '11px', color: '#64748b' } }>{ __( 'Debug Logs', 'ai-marketing-expert' ) }</div>
											<div style={ { fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: 2 } }>
												{ dbStats?.tables?.aime_log?.total ?? '0' }
											</div>
										</div>
										<div style={ { background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' } }>
											<div style={ { fontSize: '11px', color: '#64748b' } }>{ __( 'Activity Logs', 'ai-marketing-expert' ) }</div>
											<div style={ { fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: 2 } }>
												{ dbStats?.tables?.aime_activity_log?.total ?? '0' }
											</div>
										</div>
									</div>

									<p style={ { fontSize: '12px', color: ( dbStats?.expired_rows || 0 ) > 0 ? '#b45309' : '#166534', margin: '12px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' } }>
										<span className={ `dashicons ${ ( dbStats?.expired_rows || 0 ) > 0 ? 'dashicons-warning' : 'dashicons-yes-alt' }` } style={ { fontSize: '16px', width: '16px', height: '16px', lineHeight: '16px' } }></span>
										{ ( dbStats?.expired_rows || 0 ) > 0
											? sprintf( __( '%d expired record(s) ready for cleanup.', 'ai-marketing-expert' ), dbStats.expired_rows )
											: __( 'Database is optimal. All records are recent and within your active retention window.', 'ai-marketing-expert' )
										}
									</p>
								</div>

								<div style={ { marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' } }>
									<strong style={ { display: 'block', fontSize: '13px', marginBottom: 4 } }>
										{ __( 'Manual Database Cleanup', 'ai-marketing-expert' ) }
									</strong>
									<p className="aime-card-description" style={ { marginBottom: 12 } }>
										{ __( 'Immediately purge expired debug logs, activity logs, and old workflow outputs according to your retention period.', 'ai-marketing-expert' ) }
									</p>
									<Button
										variant="secondary"
										onClick={ handlePruneDatabase }
										isBusy={ pruningDb }
										disabled={ pruningDb }
									>
										{ __( 'Clean Database Now', 'ai-marketing-expert' ) }
									</Button>
								</div>
							</Card>

							{ showPruneModal && (
								<Modal
									title={ __( 'Confirm Database Cleanup', 'ai-marketing-expert' ) }
									onRequestClose={ () => ! pruningDb && setShowPruneModal( false ) }
									className="aime-confirm-modal"
								>
									<div style={ { padding: '8px 0', maxWidth: '480px' } }>
										<div style={ { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' } }>
											<span className="dashicons dashicons-database" style={ { fontSize: '26px', width: '26px', height: '26px', color: '#6366f1', flexShrink: 0, marginTop: '2px' } }></span>
											<div>
												<p style={ { margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' } }>
													{ __( 'Clean and optimize database records', 'ai-marketing-expert' ) }
												</p>
												<p style={ { margin: 0, fontSize: '12px', lineHeight: 1.5, color: '#64748b' } }>
													{ sprintf(
														/* translators: %d: retention days */
														__( 'Active retention setting: %d days. Active funnels and subscribers are never touched.', 'ai-marketing-expert' ),
														settings.retention_days ?? 60
													) }
												</p>
											</div>
										</div>

										{ /* DB Overview Table */ }
										<div style={ { background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0' } }>
											<div style={ { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '3px 0' } }>
												<span>{ __( 'System Debug Logs:', 'ai-marketing-expert' ) }</span>
												<strong>{ dbStats?.tables?.aime_log?.total ?? 0 } { __( 'records', 'ai-marketing-expert' ) }</strong>
											</div>
											<div style={ { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '3px 0' } }>
												<span>{ __( 'Activity History Logs:', 'ai-marketing-expert' ) }</span>
												<strong>{ dbStats?.tables?.aime_activity_log?.total ?? 0 } { __( 'records', 'ai-marketing-expert' ) }</strong>
											</div>
											<div style={ { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '3px 0' } }>
												<span>{ __( 'Workflow Execution Logs:', 'ai-marketing-expert' ) }</span>
												<strong>{ dbStats?.tables?.workflow_executions?.total ?? 0 } { __( 'records', 'ai-marketing-expert' ) }</strong>
											</div>
											<div style={ { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#0f172a', fontWeight: 600, paddingTop: '6px', marginTop: '4px', borderTop: '1px solid #e2e8f0' } }>
												<span>{ sprintf( __( 'Expired (> %d days):', 'ai-marketing-expert' ), settings.retention_days ?? 60 ) }</span>
												<span style={ { color: ( dbStats?.expired_rows || 0 ) > 0 ? '#ef4444' : '#10b981' } }>
													{ dbStats?.expired_rows ?? 0 } { __( 'ready to clean', 'ai-marketing-expert' ) }
												</span>
											</div>
										</div>

										{ /* Cleanup mode choice */ }
										<div style={ { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' } }>
											<label style={ { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' } }>
												<input
													type="radio"
													name="aime_prune_mode"
													checked={ pruneMode === 'expired' }
													onChange={ () => setPruneMode( 'expired' ) }
													style={ { marginTop: '2px' } }
												/>
												<span>
													<strong>{ __( 'Standard Cleanup (Expired records only)', 'ai-marketing-expert' ) }</strong>
													<span style={ { display: 'block', color: '#64748b', fontSize: '11px', marginTop: '2px' } }>
														{ sprintf( __( 'Only removes records older than %d days. Recent logs remain preserved.', 'ai-marketing-expert' ), settings.retention_days ?? 60 ) }
													</span>
												</span>
											</label>
											<label style={ { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' } }>
												<input
													type="radio"
													name="aime_prune_mode"
													checked={ pruneMode === 'force_logs' }
													onChange={ () => setPruneMode( 'force_logs' ) }
													style={ { marginTop: '2px' } }
												/>
												<span>
													<strong>{ __( 'Purge All Debug & Activity Logs', 'ai-marketing-expert' ) }</strong>
													<span style={ { display: 'block', color: '#64748b', fontSize: '11px', marginTop: '2px' } }>
														{ __( 'Empties debug and activity log tables immediately (useful for testing on localhost or clearing testing junk).', 'ai-marketing-expert' ) }
													</span>
												</span>
											</label>
										</div>

										<div style={ { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' } }>
											<Button
												variant="secondary"
												onClick={ () => setShowPruneModal( false ) }
												disabled={ pruningDb }
											>
												{ __( 'Cancel', 'ai-marketing-expert' ) }
											</Button>
											<Button
												variant="primary"
												isDestructive={ pruneMode === 'force_logs' }
												isBusy={ pruningDb }
												disabled={ pruningDb }
												onClick={ executePruneDatabase }
											>
												{ pruneMode === 'force_logs'
													? __( 'Purge Logs Now', 'ai-marketing-expert' )
													: __( 'Clean Expired Records', 'ai-marketing-expert' )
												}
											</Button>
										</div>
									</div>
								</Modal>
							) }
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
									<div className="aime-settings-callout is-warning" style={ { marginTop: 0, marginBottom: 16 } }>
										<strong>{ __( 'Cron is overdue.', 'ai-marketing-expert' ) }</strong>{ ' ' }
										{ __( 'Automations can run later than the wait time you set. Configure server cron to call wp-cron.php every minute for reliable timing.', 'ai-marketing-expert' ) }
									</div>
								) }

								<div className="aime-settings-btn-row" style={ { marginBottom: 16 } }>
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
													<span className="aime-cron-delay">{ formatCronDelay( item.delay_seconds ) }</span>
												</td>
											</tr>
										) ) }
									</tbody>
								</table>

								<div className="aime-settings-callout">
									<p style={ { marginTop: 0 } }>
										<strong>{ __( 'Recommended server cron', 'ai-marketing-expert' ) }</strong>
									</p>
									<code>
										* * * * * curl -s { window.aimeData?.siteUrl || window.location.origin }/wp-cron.php?doing_wp_cron &gt;/dev/null 2&gt;&amp;1
									</code>
									<p style={ { marginBottom: 0 } }>
										{ cronStatus?.wp_cron_disabled
											? __( 'DISABLE_WP_CRON is enabled. Make sure a real server cron is configured.', 'ai-marketing-expert' )
											: __( 'For best reliability, disable visitor-triggered WP-Cron and run wp-cron.php from your hosting cron every minute.', 'ai-marketing-expert' ) }
									</p>
								</div>
							</Card>

							<Card title={ __( 'Dedicated External Server Cron (High Precision)', 'ai-marketing-expert' ) }>
								<p className="aime-card-description">
									{ __( 'Run email queue processing, delay timers, and bounce mailbox checks directly from server cron (cPanel Cron Jobs, Linux Crontab, or cloud cron ping services). This guarantees exact sequence timing and high-speed delivery without relying on website visitors.', 'ai-marketing-expert' ) }
								</p>

								<div style={ { marginBottom: 16 } }>
									<strong style={ { display: 'block', marginBottom: 6, fontSize: '13px' } }>
										{ __( 'Direct Cron URL:', 'ai-marketing-expert' ) }
									</strong>
									<div className="aime-api-key-value">
										<code style={ { fontSize: '12px', wordBreak: 'break-all' } }>
											{ settings.cron_runner_url || '—' }
										</code>
										{ settings.cron_runner_url && (
											<Button variant="secondary" size="small" onClick={ () => copyToClipboard( settings.cron_runner_url, setCronUrlCopied ) }>
												{ cronUrlCopied ? __( 'Copied!', 'ai-marketing-expert' ) : __( 'Copy URL', 'ai-marketing-expert' ) }
											</Button>
										) }
									</div>
								</div>

								<div style={ { marginBottom: 16 } }>
									<strong style={ { display: 'block', marginBottom: 6, fontSize: '13px' } }>
										{ __( 'cPanel / Linux Crontab Command (Every minute):', 'ai-marketing-expert' ) }
									</strong>
									<div className="aime-api-key-value">
										<code style={ { fontSize: '12px', wordBreak: 'break-all' } }>
											{ settings.cron_cli_command || `wget -q -O - "${ settings.cron_runner_url }" >/dev/null 2>&1` }
										</code>
										{ settings.cron_cli_command && (
											<Button variant="secondary" size="small" onClick={ () => copyToClipboard( settings.cron_cli_command, setCronCmdCopied ) }>
												{ cronCmdCopied ? __( 'Copied!', 'ai-marketing-expert' ) : __( 'Copy Command', 'ai-marketing-expert' ) }
											</Button>
										) }
									</div>
								</div>

								<div className="aime-settings-btn-row">
									<Button variant="secondary" onClick={ handleRegenerateCronToken } isBusy={ cronTokenBusy } disabled={ cronTokenBusy }>
										{ __( 'Regenerate Secret Token', 'ai-marketing-expert' ) }
									</Button>
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
											<p className="aime-settings-hint" style={ { marginBottom: 0 } }>
												{ __( 'API key:', 'ai-marketing-expert' ) } <code>{ settings.api_key_masked }</code>
											</p>
										) }
										<div className="aime-settings-btn-row" style={ { marginTop: 12 } }>
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
										<p className="aime-settings-hint">
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
									<p className="aime-settings-hint" style={ { marginBottom: 8 } }>
										{ __( 'Send a POST request to this URL with your API key to create subscribers from any external tool.', 'ai-marketing-expert' ) }
									</p>
									<div className="aime-api-key-value">
										<code style={ { fontSize: '12px', wordBreak: 'break-all' } }>{ settings.webhook_url }</code>
										<Button variant="secondary" size="small" onClick={ () => copyToClipboard( settings.webhook_url, setWebhookCopied ) }>
											{ webhookCopied ? __( 'Copied!', 'ai-marketing-expert' ) : __( 'Copy', 'ai-marketing-expert' ) }
										</Button>
									</div>

									<div className="aime-settings-callout">
										<strong>{ __( 'Request format:', 'ai-marketing-expert' ) }</strong>
										<pre className="aime-settings-code">{ `POST ${ settings.webhook_url || '/wp-json/aime/v1/email/webhook/subscribe' }
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
										<p style={ { margin: '10px 0 0' } }>
											{ __( 'Only "email" is required. All other fields are optional. Rate limit: 60 requests per minute.', 'ai-marketing-expert' ) }
										</p>
									</div>
								</Card>
							) }

							<Card title={ __( 'ESP Bounce & Spam Complaint Webhooks', 'ai-marketing-expert' ) }>
								<p className="aime-card-description" style={ { marginBottom: 16 } }>
									{ __( 'If you use transactional email services (Amazon SES, SendGrid, Mailgun, Postmark, Brevo), configure these webhook endpoints in your provider dashboard. Inbound bounces and spam complaints will immediately update contact statuses to protect your sender reputation.', 'ai-marketing-expert' ) }
								</p>

								<div style={ { marginBottom: 16 } }>
									<strong style={ { display: 'block', marginBottom: 6, fontSize: '13px' } }>
										{ __( 'Bounce Webhook URL:', 'ai-marketing-expert' ) }
									</strong>
									<div className="aime-api-key-value">
										<code style={ { fontSize: '12px', wordBreak: 'break-all' } }>
											{ settings.webhook_bounce_url || '—' }
										</code>
										{ settings.webhook_bounce_url && (
											<Button variant="secondary" size="small" onClick={ () => copyToClipboard( settings.webhook_bounce_url, setBounceWebhookCopied ) }>
												{ bounceWebhookCopied ? __( 'Copied!', 'ai-marketing-expert' ) : __( 'Copy URL', 'ai-marketing-expert' ) }
											</Button>
										) }
									</div>
								</div>

								<div style={ { marginBottom: 16 } }>
									<strong style={ { display: 'block', marginBottom: 6, fontSize: '13px' } }>
										{ __( 'Spam Complaint Webhook URL:', 'ai-marketing-expert' ) }
									</strong>
									<div className="aime-api-key-value">
										<code style={ { fontSize: '12px', wordBreak: 'break-all' } }>
											{ settings.webhook_complaint_url || '—' }
										</code>
										{ settings.webhook_complaint_url && (
											<Button variant="secondary" size="small" onClick={ () => copyToClipboard( settings.webhook_complaint_url, setComplaintWebhookCopied ) }>
												{ complaintWebhookCopied ? __( 'Copied!', 'ai-marketing-expert' ) : __( 'Copy URL', 'ai-marketing-expert' ) }
											</Button>
										) }
									</div>
								</div>

								<div className="aime-settings-callout" style={ { marginTop: 12 } }>
									<strong>{ __( 'Supported Providers & Setup:', 'ai-marketing-expert' ) }</strong>
									<ul style={ { margin: '8px 0 0 16px', padding: 0 } }>
										<li><strong>Amazon SES:</strong> { __( 'Create an SNS Topic for Bounces & Complaints, add an HTTPS subscription pointing to this URL. The subscription confirmation is handled automatically.', 'ai-marketing-expert' ) }</li>
										<li><strong>SendGrid:</strong> { __( 'In Mail Settings → Event Webhook, select "Dropped" and "Bounced" pointing to the Bounce URL.', 'ai-marketing-expert' ) }</li>
										<li><strong>Mailgun / Postmark / Brevo:</strong> { __( 'Add Webhook in their respective dashboards for permanent failure and complaint events.', 'ai-marketing-expert' ) }</li>
									</ul>
								</div>
							</Card>
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
								<Loader variant="table" text={ __( 'Loading log entries…', 'ai-marketing-expert' ) } />
							) : logs.length === 0 ? (
								<p className="aime-settings-hint" style={ { textAlign: 'center', padding: 20, marginBottom: 0 } }>
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
