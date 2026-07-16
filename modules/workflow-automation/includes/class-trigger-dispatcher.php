<?php
/**
 * Trigger Dispatcher — connects registered event triggers to WordPress hooks.
 *
 * Listens on each event trigger's hook (only when at least one active
 * event-triggered workflow exists), matches fired events against workflow
 * trigger configs, and queues matched workflows for asynchronous execution
 * via a one-shot cron event.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Includes
 */

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Includes;

use WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\WorkflowAutomationModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TriggerDispatcher {

	/** Debounce window for identical event payloads per workflow. */
	private const DEBOUNCE_TTL = 60;

	private WorkflowRepository $repo;

	public function __construct( ?WorkflowRepository $repo = null ) {
		$this->repo = $repo ?? new WorkflowRepository();
	}

	/**
	 * Attach hook listeners for every registered event trigger.
	 *
	 * Listeners are registered lazily on `init` so that all modules have
	 * published their triggers, and only when at least one active
	 * event-triggered workflow exists (cheap cached COUNT).
	 */
	public function init(): void {
		add_action( 'init', array( $this, 'register_listeners' ), 20 );
	}

	public function register_listeners(): void {
		if ( ! $this->repo->has_event_workflows() ) {
			return;
		}

		foreach ( TriggerRegistry::event_triggers() as $key => $def ) {
			$hook      = (string) $def['hook'];
			$hook_args = max( 1, (int) ( $def['hook_args'] ?? 1 ) );

			add_action(
				$hook,
				function ( ...$args ) use ( $key ) {
					$this->handle_event( $key, $args );
				},
				10,
				$hook_args
			);
		}
	}

	/**
	 * A trigger hook fired: match it against every active workflow listening
	 * for this event and queue each match for async execution.
	 *
	 * @param string $trigger_key Trigger key.
	 * @param array  $args        Hook arguments.
	 */
	public function handle_event( string $trigger_key, array $args ): void {
		// Loop guard: a workflow action (e.g. publishing a post) must never
		// re-trigger workflows from inside a running execution.
		if ( WorkflowEngine::$executing ) {
			return;
		}

		$workflows = $this->repo->active_for_event( $trigger_key );
		if ( empty( $workflows ) ) {
			return;
		}

		foreach ( $workflows as $workflow ) {
			$config  = json_decode( (string) ( $workflow->trigger_config ?? '' ), true );
			$config  = is_array( $config ) ? $config : array();
			$payload = TriggerRegistry::match( $trigger_key, $config, $args );

			if ( false === $payload || ! is_array( $payload ) ) {
				continue;
			}

			// Debounce identical payloads (double-fired hooks, quick re-saves).
			$debounce_key = 'aime_wf_evt_' . $workflow->id . '_' . md5( (string) wp_json_encode( $payload ) );
			if ( get_transient( $debounce_key ) ) {
				continue;
			}
			set_transient( $debounce_key, 1, self::DEBOUNCE_TTL );

			$this->queue_execution( (int) $workflow->id, $payload );
		}
	}

	/**
	 * Create a queued execution row and schedule an immediate one-shot cron run.
	 *
	 * @param int   $workflow_id Workflow ID.
	 * @param array $payload     Event payload snapshot.
	 */
	private function queue_execution( int $workflow_id, array $payload ): void {
		// Free-plan monthly run cap: record the blocked fire instead of
		// queueing a run the engine would only skip.
		if ( $this->repo->monthly_run_limit_reached() ) {
			$this->repo->record_skipped_execution(
				$workflow_id,
				'event',
				__( 'Monthly run limit reached on the free plan. Runs resume next month — upgrade to Pro for unlimited runs.', 'ai-marketing-expert' )
			);
			aime_log( sprintf( 'Workflow #%d event trigger skipped: free monthly run limit reached.', $workflow_id ), 'info', 'workflow-automation' );
			return;
		}

		$steps_total  = $this->repo->count_steps( $workflow_id );
		$execution_id = $this->repo->start_execution( $workflow_id, 'event', $steps_total, 'queued', $payload );

		wp_schedule_single_event(
			time(),
			WorkflowAutomationModule::HOOK_EXECUTE_SINGLE,
			array( $workflow_id, 'event', $execution_id, $payload )
		);

		if ( function_exists( 'spawn_cron' ) ) {
			spawn_cron();
		}

		aime_log(
			sprintf( 'Workflow #%d queued by event trigger (execution #%d).', $workflow_id, $execution_id ),
			'info',
			'workflow-automation'
		);
	}
}
