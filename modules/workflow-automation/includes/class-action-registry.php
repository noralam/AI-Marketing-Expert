<?php
/**
 * Action Registry — resolves the shared `aime_workflow_actions` filter.
 *
 * The registry is the single, additive seam through which the Workflow module
 * (and any third party) exposes runnable actions. Nothing here hard-codes
 * another module's logic.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Includes
 */

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Includes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class ActionRegistry {

	/**
	 * Cached, resolved action definitions.
	 *
	 * @var array<string,array>|null
	 */
	private static ?array $cache = null;

	/**
	 * All registered actions keyed by action type.
	 *
	 * @return array<string,array>
	 */
	public static function all(): array {
		if ( null === self::$cache ) {
			$actions = apply_filters( 'aime_workflow_actions', array() );
			self::$cache = is_array( $actions ) ? $actions : array();
		}
		return self::$cache;
	}

	/**
	 * Reset the cache (used after module activation changes availability).
	 */
	public static function flush(): void {
		self::$cache = null;
	}

	/**
	 * A single action definition, or null if unknown.
	 */
	public static function get( string $type ): ?array {
		$all = self::all();
		return $all[ $type ] ?? null;
	}

	/**
	 * Whether an action type exists and its target module is currently available.
	 */
	public static function is_available( string $type ): bool {
		$def = self::get( $type );
		if ( ! $def ) {
			return false;
		}
		$check = $def['available'] ?? null;
		if ( is_callable( $check ) ) {
			return (bool) $check();
		}
		return true;
	}

	/**
	 * Actions formatted for the REST/React builder (handlers stripped, callables
	 * resolved to booleans so the payload is JSON-safe).
	 *
	 * @return array<int,array>
	 */
	public static function for_api(): array {
		$out = array();
		foreach ( self::all() as $type => $def ) {
			$available = true;
			if ( is_callable( $def['available'] ?? null ) ) {
				$available = (bool) call_user_func( $def['available'] );
			}
			$out[] = array(
				'type'        => $type,
				'label'       => $def['label'] ?? $type,
				'module'      => $def['module'] ?? '',
				'description' => $def['description'] ?? '',
				'is_pro'      => (bool) ( $def['is_pro'] ?? false ),
				'available'   => $available,
				'fields'      => self::resolve_fields( $def['fields'] ?? array() ),
			);
		}
		return $out;
	}

	/**
	 * Resolve dynamic field options: a field's 'options' may be a callable that
	 * queries live data (accounts, funnels, posts…); resolve it here so the API
	 * payload is plain JSON. Failures degrade to an empty options list.
	 *
	 * @param array $fields Field definitions.
	 * @return array<int,array>
	 */
	public static function resolve_fields( array $fields ): array {
		$out = array();
		foreach ( array_values( $fields ) as $field ) {
			if ( is_callable( $field['options'] ?? null ) ) {
				try {
					$options = call_user_func( $field['options'] );
				} catch ( \Throwable $e ) {
					$options = array();
				}
				$field['options'] = is_array( $options ) ? array_values( $options ) : array();
			}
			$out[] = $field;
		}
		return $out;
	}

	/**
	 * Invoke an action handler safely.
	 *
	 * @param string $type    Action type.
	 * @param array  $config  Step config.
	 * @param array  $context Workflow context (topic/tone/brand_voice_id/previous).
	 * @return array{success:bool,preview:string,reference:array,error:string}
	 */
	public static function run( string $type, array $config, array $context ): array {
		$def = self::get( $type );

		if ( ! $def ) {
			return self::error( sprintf( 'Unknown action type "%s".', $type ) );
		}

		if ( ! self::is_available( $type ) ) {
			return array(
				'success'   => false,
				'preview'   => '',
				'reference' => array(),
				'error'     => sprintf( 'The module for action "%s" is inactive; step skipped.', $type ),
				'skipped'   => true,
			);
		}

		$handler = $def['handler'] ?? null;
		if ( ! is_callable( $handler ) ) {
			return self::error( sprintf( 'Action "%s" has no callable handler.', $type ) );
		}

		try {
			$result = call_user_func( $handler, $config, $context );
		} catch ( \Throwable $e ) {
			return self::error( $e->getMessage() );
		}

		if ( ! is_array( $result ) ) {
			return self::error( 'Action handler returned an invalid result.' );
		}

		return array(
			'success'   => (bool) ( $result['success'] ?? false ),
			'preview'   => (string) ( $result['preview'] ?? '' ),
			'reference' => is_array( $result['reference'] ?? null ) ? $result['reference'] : array(),
			'error'     => (string) ( $result['error'] ?? '' ),
		);
	}

	private static function error( string $message ): array {
		return array(
			'success'   => false,
			'preview'   => '',
			'reference' => array(),
			'error'     => $message,
		);
	}
}
