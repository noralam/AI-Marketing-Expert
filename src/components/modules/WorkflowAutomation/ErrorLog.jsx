/**
 * Error Log — every workflow run that failed, partly failed, or was skipped,
 * newest first, with the step-level reason attached.
 *
 * The point is that a user never has to guess why a run did nothing: an AI
 * timeout, a missing API key, a paused module, or a hit free-plan cap all end
 * up here in plain language.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { apiGet } from '../../../utils/api';
import { toast } from '../../common/Toast';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import { formatDateTime } from '../../../utils/datetime';
import { Button } from '../../common/WpComponents';

const STATUS_META = {
	failed: { label: __( 'Failed', 'ai-marketing-expert' ), color: '#c62828', bg: '#fdecea' },
	partial: { label: __( 'Partly failed', 'ai-marketing-expert' ), color: '#ed6c02', bg: '#fff4e5' },
	skipped: { label: __( 'Skipped', 'ai-marketing-expert' ), color: '#6c757d', bg: '#f1f2f4' },
};

const TRIGGER_LABELS = {
	manual: __( 'Run now', 'ai-marketing-expert' ),
	schedule: __( 'Scheduled', 'ai-marketing-expert' ),
	event: __( 'Event trigger', 'ai-marketing-expert' ),
};

// Stored as UTC; rendered in the site timezone and format (Settings → General).
const formatDate = ( value ) => formatDateTime( value );

/**
 * Turn a raw error into a plain-language hint about what to do next. The
 * matching is deliberately loose — provider SDKs word timeouts differently.
 */
const hintFor = ( text ) => {
	const t = ( text || '' ).toLowerCase();
	if ( t.includes( 'monthly run limit' ) || t.includes( 'free plan' ) ) {
		return __( 'Free-plan limit. Runs resume next month, or upgrade to Pro.', 'ai-marketing-expert' );
	}
	if ( t.includes( 'timed out' ) || t.includes( 'timeout' ) || t.includes( 'curl error 28' ) ) {
		return __( 'The AI request took too long. Try a shorter article, fewer steps, or a faster model.', 'ai-marketing-expert' );
	}
	if ( t.includes( 'api key' ) || t.includes( 'unauthorized' ) || t.includes( '401' ) || t.includes( 'invalid_api_key' ) ) {
		return __( 'The AI provider rejected the credentials. Check your API key in Settings → AI Connections.', 'ai-marketing-expert' );
	}
	if ( t.includes( 'rate limit' ) || t.includes( '429' ) || t.includes( 'quota' ) ) {
		return __( 'The AI provider is rate limiting or out of quota. Wait and retry, or add a fallback connection.', 'ai-marketing-expert' );
	}
	if ( t.includes( 'curl' ) || t.includes( 'could not resolve' ) || t.includes( 'connection' ) || t.includes( 'network' ) ) {
		return __( 'The site could not reach the AI provider. Check the server network or firewall.', 'ai-marketing-expert' );
	}
	if ( t.includes( 'no response' ) || t.includes( 'empty response' ) || t.includes( 'invalid result' ) ) {
		return __( 'The AI returned nothing usable. Retry, or switch to another model.', 'ai-marketing-expert' );
	}
	if ( t.includes( 'module' ) && t.includes( 'inactive' ) ) {
		return __( 'The module this step writes to is turned off. Enable it under Modules.', 'ai-marketing-expert' );
	}
	if ( t.includes( 'missing its required' ) || t.includes( 'no topic' ) ) {
		return __( 'A step is missing required configuration. Open the workflow and fill it in.', 'ai-marketing-expert' );
	}
	if ( t.includes( 'requires pro' ) || t.includes( 'require a pro' ) ) {
		return __( 'This step needs a Pro plan.', 'ai-marketing-expert' );
	}
	return '';
};

const ErrorLog = ( { onNavigate } ) => {
	const [ loading, setLoading ] = useState( true );
	const [ entries, setEntries ] = useState( [] );

	const load = useCallback( async () => {
		setLoading( true );
		try {
			const res = await apiGet( '/workflow-automation/logs' );
			setEntries( res?.entries || [] );
		} catch ( e ) {
			toast( e?.message || __( 'Failed to load the error log.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setLoading( false );
		}
	}, [] );

	useEffect( () => {
		load();
	}, [ load ] );

	// Refresh reuses `load()`, so gate the skeleton on having nothing to show —
	// otherwise pressing Refresh tears the log down and rebuilds it.
	if ( loading && ! entries.length ) {
		return <Loader variant="table" />;
	}

	return (
		<div className="aime-wf-error-log">
			<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } }>
				<h2 style={ { margin: 0 } }>{ __( 'Error Log', 'ai-marketing-expert' ) }</h2>
				<Button variant="secondary" onClick={ load }>{ __( 'Refresh', 'ai-marketing-expert' ) }</Button>
			</div>

			{ entries.length === 0 ? (
				<Card>
					<p>{ __( 'No failed runs. Every workflow run so far completed successfully.', 'ai-marketing-expert' ) }</p>
				</Card>
			) : (
				entries.map( ( entry ) => {
					const meta = STATUS_META[ entry.status ] || STATUS_META.failed;
					const topHint = hintFor( entry.error || entry.steps?.[ 0 ]?.error );

					return (
						<Card key={ entry.id } className="aime-mb-2">
							<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' } }>
								<div>
									<span
										style={ {
											display: 'inline-block',
											padding: '2px 8px',
											borderRadius: 3,
											fontSize: 11,
											fontWeight: 600,
											color: meta.color,
											background: meta.bg,
											marginRight: 8,
										} }
									>
										{ meta.label }
									</span>
									<strong>{ entry.workflow_name || __( '(deleted workflow)', 'ai-marketing-expert' ) }</strong>
									<div style={ { color: '#787c82', fontSize: 12, marginTop: 4 } }>
										{ formatDate( entry.started_at ) }
										{ ' · ' }
										{ TRIGGER_LABELS[ entry.trigger_type ] || entry.trigger_type }
										{ entry.steps_total > 0 && ` · ${ sprintf(
											/* translators: 1: successful steps, 2: total steps, 3: failed steps */
											__( '%1$d of %2$d steps ok, %3$d failed', 'ai-marketing-expert' ),
											entry.steps_succeeded,
											entry.steps_total,
											entry.steps_failed
										) }` }
									</div>
								</div>
								{ entry.workflow_id > 0 && (
									<div style={ { display: 'flex', gap: 6 } }>
										<Button variant="tertiary" size="small" onClick={ () => onNavigate( 'history', { id: entry.workflow_id } ) }>
											{ __( 'History', 'ai-marketing-expert' ) }
										</Button>
										<Button variant="tertiary" size="small" onClick={ () => onNavigate( 'edit-workflow', { id: entry.workflow_id } ) }>
											{ __( 'Edit', 'ai-marketing-expert' ) }
										</Button>
									</div>
								) }
							</div>

							{ entry.error && (
								<p style={ { color: '#c62828', fontSize: 13, margin: '10px 0 0', whiteSpace: 'pre-wrap' } }>
									{ entry.error }
								</p>
							) }

							{ ( entry.steps || [] ).length > 0 && (
								<ul style={ { margin: '10px 0 0', paddingLeft: 18, fontSize: 13 } }>
									{ entry.steps.map( ( step, i ) => (
										<li key={ i } style={ { marginBottom: 4 } }>
											<strong>{ step.action_label }</strong>
											{ ' — ' }
											<span style={ { color: step.status === 'failed' ? '#c62828' : '#6c757d' } }>{ step.error }</span>
										</li>
									) ) }
								</ul>
							) }

							{ topHint && (
								<p style={ { fontSize: 12, color: '#50575e', margin: '10px 0 0', padding: '8px 10px', background: '#f6f7f7', borderRadius: 4 } }>
									{ __( 'What to try:', 'ai-marketing-expert' ) } { topHint }
								</p>
							) }
						</Card>
					);
				} )
			) }
		</div>
	);
};

export default ErrorLog;
