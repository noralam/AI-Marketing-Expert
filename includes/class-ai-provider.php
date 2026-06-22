<?php
/**
 * AI Provider Manager.
 *
 * Handles multiple AI provider connections (Google AI Studio, OpenAI, OpenRouter, Claude),
 * model selection, fallback logic, and API key management.
 *
 * Connection-based repeater pattern (like SMTP connections).

// phpcs:disable Squiz.PHP.DiscouragedFunctions.Discouraged
 *
 * @package WPSpace\AiMarketingExpert
 */

namespace WPSpace\AiMarketingExpert;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AiProvider {

	/**
	 * Option key for AI connections.
	 */
	private const OPTION_KEY = 'aime_ai_connections';
	private const HEALTH_OPTION_KEY = 'aime_ai_provider_health';
	private const TEMPORARY_COOLDOWN = 300;
	private const RATE_LIMIT_COOLDOWN = 3600;
	private const QUOTA_COOLDOWN = 86400;

	/**
	 * Available provider presets (definitions only — not user data).
	 *
	 * @return array
	 */
	public static function get_providers(): array {
		return array(
			'google_ai'  => array(
				'id'          => 'google_ai',
				'name'        => __( 'Google AI Studio', 'ai-marketing-expert' ),
				'description' => __( 'Google Gemini models for text, image, and multimodal tasks.', 'ai-marketing-expert' ),
				'api_url'     => 'https://generativelanguage.googleapis.com/v1beta',
				'docs_url'    => 'https://ai.google.dev/',
				'models'      => self::get_google_models(),
			),
			'openai'     => array(
				'id'          => 'openai',
				'name'        => __( 'OpenAI (ChatGPT)', 'ai-marketing-expert' ),
				'description' => __( 'GPT-5.2, GPT Image 1.5 and more from OpenAI.', 'ai-marketing-expert' ),
				'api_url'     => 'https://api.openai.com/v1',
				'docs_url'    => 'https://platform.openai.com/docs',
				'models'      => self::get_openai_models(),
			),
			'openrouter' => array(
				'id'          => 'openrouter',
				'name'        => __( 'OpenRouter', 'ai-marketing-expert' ),
				'description' => __( 'Access multiple AI models through one API — Claude, GPT, Llama, and more.', 'ai-marketing-expert' ),
				'api_url'     => 'https://openrouter.ai/api/v1',
				'docs_url'    => 'https://openrouter.ai/docs',
				'models'      => self::get_openrouter_models(),
			),
			'anthropic'  => array(
				'id'          => 'anthropic',
				'name'        => __( 'Anthropic (Claude)', 'ai-marketing-expert' ),
				'description' => __( 'Claude models for advanced reasoning, writing, and analysis.', 'ai-marketing-expert' ),
				'api_url'     => 'https://api.anthropic.com/v1',
				'docs_url'    => 'https://docs.anthropic.com/',
				'models'      => self::get_anthropic_models(),
			),
			'custom'     => array(
				'id'          => 'custom',
				'name'        => __( 'Custom Provider', 'ai-marketing-expert' ),
				'description' => __( 'Connect any OpenAI-compatible or Anthropic-compatible API endpoint.', 'ai-marketing-expert' ),
				'api_url'     => '',
				'docs_url'    => '',
				'is_custom'   => true,
				'models'      => array( 'text' => array(), 'image' => array() ),
			),
		);
	}

	/* ================================================================
	 *  MODEL DEFINITIONS
	 * ============================================================= */

	private static function get_google_models(): array {
		return array(
			'text'  => array(
				array( 'id' => 'gemini-3-flash-preview',    'name' => 'Gemini 3 Flash (Best)',           'type' => 'text', 'recommended' => true, 'capabilities' => array( 'text', 'image' ) ),
				array( 'id' => 'gemini-3.1-pro-preview',    'name' => 'Gemini 3.1 Pro (Most Capable)',   'type' => 'text', 'capabilities' => array( 'text', 'image' ) ),
				array( 'id' => 'gemini-2.5-flash',          'name' => 'Gemini 2.5 Flash (Stable)',       'type' => 'text', 'capabilities' => array( 'text', 'image' ) ),
				array( 'id' => 'gemini-2.5-pro',            'name' => 'Gemini 2.5 Pro (Stable)',         'type' => 'text', 'capabilities' => array( 'text' ) ),
				array( 'id' => 'gemini-2.5-flash-lite',     'name' => 'Gemini 2.5 Flash Lite (Budget)',  'type' => 'text', 'capabilities' => array( 'text' ) ),
			),
			'image' => array(
				array( 'id' => 'gemini-3.1-flash-image-preview', 'name' => 'Nano Banana 2 (Latest)',      'type' => 'image', 'recommended' => true, 'capabilities' => array( 'image' ) ),
				array( 'id' => 'gemini-3-pro-image-preview',    'name' => 'Nano Banana Pro (Studio)',     'type' => 'image', 'capabilities' => array( 'image' ) ),
				array( 'id' => 'gemini-2.5-flash-image',        'name' => 'Nano Banana (Stable)',         'type' => 'image', 'capabilities' => array( 'image' ) ),
				array( 'id' => 'imagen-4.0-generate-001',       'name' => 'Imagen 4 (Generation)',        'type' => 'image', 'capabilities' => array( 'image' ) ),
			),
		);
	}

	private static function get_openai_models(): array {
		return array(
			'text'  => array(
				array( 'id' => 'gpt-5.2',         'name' => 'GPT-5.2 (Best)',              'type' => 'text', 'recommended' => true, 'capabilities' => array( 'text', 'image' ) ),
				array( 'id' => 'gpt-5-mini',      'name' => 'GPT-5 Mini (Fast)',           'type' => 'text', 'capabilities' => array( 'text' ) ),
				array( 'id' => 'gpt-5-nano',      'name' => 'GPT-5 Nano (Fastest)',        'type' => 'text', 'capabilities' => array( 'text' ) ),
				array( 'id' => 'gpt-4.1',         'name' => 'GPT-4.1 (Non-Reasoning)',     'type' => 'text', 'capabilities' => array( 'text' ) ),
			),
			'image' => array(
				array( 'id' => 'gpt-image-1.5',   'name' => 'GPT Image 1.5 (Best)',        'type' => 'image', 'recommended' => true, 'capabilities' => array( 'image' ) ),
				array( 'id' => 'gpt-image-1',     'name' => 'GPT Image 1',                'type' => 'image', 'capabilities' => array( 'image' ) ),
				array( 'id' => 'gpt-5.2',         'name' => 'GPT-5.2 (Vision Input)',      'type' => 'image', 'capabilities' => array( 'image' ) ),
			),
		);
	}

	private static function get_openrouter_models(): array {
		return array(
			'text'  => array(
				array( 'id' => 'google/gemini-2.5-flash-preview:free',       'name' => 'Gemini 2.5 Flash (Free)',            'type' => 'text', 'recommended' => true, 'capabilities' => array( 'text', 'image' ) ),
				array( 'id' => 'deepseek/deepseek-r1:free',                 'name' => 'DeepSeek R1 (Free / Reasoning)',     'type' => 'text', 'capabilities' => array( 'text' ) ),
				array( 'id' => 'meta-llama/llama-4-maverick:free',          'name' => 'Llama 4 Maverick (Free)',            'type' => 'text', 'capabilities' => array( 'text' ) ),
				array( 'id' => 'qwen/qwen-2.5-72b-instruct:free',          'name' => 'Qwen 2.5 72B (Free)',                'type' => 'text', 'capabilities' => array( 'text' ) ),
				array( 'id' => 'stepfun/step-3.5-flash:free',              'name' => 'Step 3.5 Flash (Free)',              'type' => 'text', 'capabilities' => array( 'text' ) ),
				array( 'id' => 'google/gemini-3-flash-preview',            'name' => 'Gemini 3 Flash (Paid)',              'type' => 'text', 'capabilities' => array( 'text', 'image' ) ),
				array( 'id' => 'anthropic/claude-sonnet-4-6',              'name' => 'Claude Sonnet 4.6 (Paid)',           'type' => 'text', 'capabilities' => array( 'text' ) ),
				array( 'id' => 'openai/gpt-5.2',                          'name' => 'GPT-5.2 (Paid)',                     'type' => 'text', 'capabilities' => array( 'text', 'image' ) ),
			),
			'image' => array(
				array( 'id' => 'google/gemini-3.1-flash-image-preview',     'name' => 'Nano Banana 2 (Cheap)',              'type' => 'image', 'recommended' => true, 'capabilities' => array( 'image' ) ),
				array( 'id' => 'google/gemini-2.5-flash-preview:free',     'name' => 'Gemini 2.5 Flash Vision (Free)',     'type' => 'image', 'capabilities' => array( 'text', 'image' ) ),
				array( 'id' => 'anthropic/claude-sonnet-4-6',              'name' => 'Claude Sonnet 4.6 Vision (Paid)',    'type' => 'image', 'capabilities' => array( 'image' ) ),
				array( 'id' => 'openai/gpt-5.2',                          'name' => 'GPT-5.2 Vision (Paid)',              'type' => 'image', 'capabilities' => array( 'image' ) ),
			),
		);
	}

	private static function get_anthropic_models(): array {
		return array(
			'text'  => array(
				array( 'id' => 'claude-sonnet-4-6',          'name' => 'Claude Sonnet 4.6 (Best Value)',   'type' => 'text', 'recommended' => true, 'capabilities' => array( 'text' ) ),
				array( 'id' => 'claude-opus-4-6',            'name' => 'Claude Opus 4.6 (Most Intelligent)','type' => 'text', 'capabilities' => array( 'text' ) ),
				array( 'id' => 'claude-haiku-4-5',           'name' => 'Claude Haiku 4.5 (Fastest)',       'type' => 'text', 'capabilities' => array( 'text' ) ),
			),
			// Anthropic does not currently expose a native image-generation model,
			// so image generation is intentionally not offered for this provider.
			// generate_image() will skip anthropic connections because the
			// resolved model is empty and the call site already does
			// `if ( empty( $model ) ) { continue; }`.
			'image' => array(),
		);
	}

	/**
	 * Get default model IDs for a provider.
	 */
	private static function get_default_models( string $provider_id ): array {
		$map = array(
			'google_ai'  => array( 'text' => 'gemini-3-flash-preview',                    'image' => 'gemini-3.1-flash-image-preview' ),
			'openai'     => array( 'text' => 'gpt-5.2',                                   'image' => 'gpt-image-1.5' ),
			'openrouter' => array( 'text' => 'google/gemini-2.5-flash-preview:free',       'image' => 'google/gemini-3.1-flash-image-preview' ),
			// Anthropic has no native image-generation model. Returning an
			// empty default makes generate_image() skip anthropic connections
			// while leaving text generation untouched.
			'anthropic'  => array( 'text' => 'claude-sonnet-4-6',                          'image' => '' ),
		);
		return $map[ $provider_id ] ?? array( 'text' => '', 'image' => '' );
	}

	/**
	 * Check if a model has a specific capability.
	 *
	 * @param string $provider_id Provider ID.
	 * @param string $model_id    Model ID.
	 * @param string $capability  Capability to check ('text' or 'image').
	 * @return bool
	 */
	public static function model_has_capability( string $provider_id, string $model_id, string $capability ): bool {
		$providers = self::get_providers();
		$provider  = $providers[ $provider_id ] ?? null;
		if ( ! $provider ) {
			return false;
		}

		// Search across both text and image model lists.
		foreach ( array( 'text', 'image' ) as $type ) {
			$models = $provider['models'][ $type ] ?? array();
			foreach ( $models as $m ) {
				if ( $m['id'] === $model_id ) {
					return in_array( $capability, $m['capabilities'] ?? array(), true );
				}
			}
		}

		// For custom models, assume they have the requested capability.
		return true;
	}

	/**
	 * Normalize primary_for to a valid array.
	 *
	 * @param mixed $value Raw input value.
	 * @return array
	 */
	private static function normalize_primary_for( $value ): array {
		if ( is_array( $value ) ) {
			return array_values( array_intersect( $value, array( 'text', 'image' ) ) );
		}
		return array();
	}

	/* ================================================================
	 *  CONNECTIONS CRUD
	 * ============================================================= */

	/**
	 * Get all AI connections.
	 *
	 * @return array
	 */
	public static function get_connections(): array {
		$connections = \aime_get_db_option( self::OPTION_KEY, array() );
		$connections = is_array( $connections ) ? $connections : array();

		// Migration: convert old fixed-provider settings into connections.
		if ( empty( $connections ) ) {
			$connections = self::maybe_migrate_old();
		}

		// Migration: convert is_primary (bool) → primary_for (array).
		$needs_save = false;
		foreach ( $connections as &$c ) {
			if ( ! isset( $c['primary_for'] ) ) {
				$c['primary_for'] = ! empty( $c['is_primary'] ) ? array( 'text', 'image' ) : array();
				unset( $c['is_primary'] );
				$needs_save = true;
			}
		}
		unset( $c );

		if ( $needs_save && ! empty( $connections ) ) {
			// Ensure every task type has at least one primary.
			foreach ( array( 'text', 'image' ) as $task ) {
				$has = false;
				foreach ( $connections as $c ) {
					if ( in_array( $task, $c['primary_for'] ?? array(), true ) ) {
						$has = true;
						break;
					}
				}
				if ( ! $has ) {
					$connections[0]['primary_for'] = array_unique( array_merge( $connections[0]['primary_for'] ?? array(), array( $task ) ) );
					$connections[0]['primary_for'] = array_values( $connections[0]['primary_for'] );
				}
			}
			update_option( self::OPTION_KEY, $connections, false );
			\aime_clear_settings_cache( array( self::OPTION_KEY ) );
		}

		return $connections;
	}

	/**
	 * Get connections for API response (masks API keys).
	 *
	 * @return array
	 */
	public static function get_connections_for_api(): array {
		return array_map( function ( $c ) {
			$health = self::get_connection_health( $c['id'] ?? '' );
			$c['has_key'] = ! empty( $c['api_key'] );
			if ( ! empty( $c['api_key'] ) ) {
				$decrypted = Encryption::decrypt( $c['api_key'] );
				$c['api_key'] = ! empty( $decrypted )
					? '••••••••' . substr( $decrypted, -4 )
					: '';
			}
			// Ensure primary_for is always present.
			$c['primary_for'] = $c['primary_for'] ?? array();
			// Legacy compat: is_primary = true if primary for any task.
			$c['is_primary'] = ! empty( $c['primary_for'] );
			$c['health_status'] = $health['status'];
			$c['health_reason'] = $health['reason'];
			$c['retry_after'] = $health['retry_after'];
			$c['last_error'] = $health['last_error'];
			return $c;
		}, self::get_connections() );
	}

	/**
	 * Save (create or update) a single connection.
	 *
	 * @param array $data Connection data.
	 * @return array The saved connection.
	 */
	public static function save_connection( array $data ): array {
		$connections = self::get_connections();
		$id          = ! empty( $data['id'] ) ? sanitize_key( $data['id'] ) : 'ai_' . substr( md5( wp_generate_uuid4() ), 0, 10 );

		$provider_id = sanitize_key( $data['provider'] ?? 'google_ai' );
		$defaults    = self::get_default_models( $provider_id );

		// Handle primary_for — support both new array format and legacy is_primary bool.
		$primary_for = array();
		if ( isset( $data['primary_for'] ) ) {
			$primary_for = self::normalize_primary_for( $data['primary_for'] );
		} elseif ( ! empty( $data['is_primary'] ) ) {
			// Legacy compat: is_primary=true → primary for both.
			$primary_for = array( 'text', 'image' );
		}

		$conn = array(
			'id'                => $id,
			'name'              => sanitize_text_field( $data['name'] ?? '' ),
			'provider'          => $provider_id,
			'text_model'        => sanitize_text_field( $data['text_model'] ?? $defaults['text'] ),
			'image_model'       => sanitize_text_field( $data['image_model'] ?? $defaults['image'] ),
			'custom_text_model' => sanitize_text_field( $data['custom_text_model'] ?? '' ),
			'custom_image_model'=> sanitize_text_field( $data['custom_image_model'] ?? '' ),
			'primary_for'       => $primary_for,
			'enabled'           => (bool) ( $data['enabled'] ?? true ),
			'api_format'        => in_array( $data['api_format'] ?? '', array( 'openai', 'anthropic' ), true ) ? $data['api_format'] : 'openai',
			'base_url'          => ! empty( $data['base_url'] ) ? esc_url_raw( trim( $data['base_url'] ) ) : '',
		);

		// API key handling — encrypt if new, keep old if editing and not changed.
		if ( ! empty( $data['api_key'] ) && 0 !== strpos( $data['api_key'], '••' ) ) {
			$conn['api_key'] = Encryption::encrypt( $data['api_key'] );
		} else {
			$existing       = self::find_connection( $connections, $id );
			$conn['api_key'] = $existing ? ( $existing['api_key'] ?? '' ) : '';
		}

		// If this connection claims primary for a task, remove that task from all other connections.
		if ( ! empty( $primary_for ) ) {
			foreach ( $connections as &$c ) {
				if ( $c['id'] === $id ) {
					continue;
				}
				$c['primary_for'] = array_values( array_diff( $c['primary_for'] ?? array(), $primary_for ) );
			}
			unset( $c );
		}

		// Insert or update.
		$found = false;
		foreach ( $connections as $i => $c ) {
			if ( $c['id'] === $id ) {
				$connections[ $i ] = $conn;
				$found             = true;
				break;
			}
		}
		if ( ! $found ) {
			// First connection gets primary for both tasks.
			if ( empty( $connections ) ) {
				$conn['primary_for'] = array( 'text', 'image' );
			}
			$connections[] = $conn;
		}

		// Ensure every task type has at least one primary connection.
		foreach ( array( 'text', 'image' ) as $task ) {
			$has_primary = false;
			foreach ( $connections as $c ) {
				if ( in_array( $task, $c['primary_for'] ?? array(), true ) ) {
					$has_primary = true;
					break;
				}
			}
			if ( ! $has_primary && ! empty( $connections ) ) {
				$connections[0]['primary_for']   = array_unique( array_merge( $connections[0]['primary_for'] ?? array(), array( $task ) ) );
				$connections[0]['primary_for']   = array_values( $connections[0]['primary_for'] );
			}
		}

		update_option( self::OPTION_KEY, $connections, false );
		\aime_clear_settings_cache( array( self::OPTION_KEY ) );
		self::clear_connection_health( $id );

		aime_log( sprintf( 'AI connection "%s" saved.', $conn['name'] ), 'info', 'ai' );

		return $conn;
	}

	/**
	 * Delete a connection by ID.
	 *
	 * @param string $id Connection ID.
	 * @return bool
	 */
	public static function delete_connection( string $id ): bool {
		$connections = self::get_connections();

		// Collect primary_for tasks from the connection being deleted.
		$orphaned_tasks = array();
		foreach ( $connections as $c ) {
			if ( $c['id'] === $id ) {
				$orphaned_tasks = $c['primary_for'] ?? array();
				break;
			}
		}

		$connections = array_values( array_filter( $connections, function ( $c ) use ( $id ) {
			return $c['id'] !== $id;
		} ) );

		// Reassign orphaned primary tasks to the first enabled connection.
		if ( ! empty( $orphaned_tasks ) && ! empty( $connections ) ) {
			foreach ( $orphaned_tasks as $task ) {
				$has_primary = false;
				foreach ( $connections as $c ) {
					if ( in_array( $task, $c['primary_for'] ?? array(), true ) ) {
						$has_primary = true;
						break;
					}
				}
				if ( ! $has_primary ) {
					$connections[0]['primary_for']   = array_unique( array_merge( $connections[0]['primary_for'] ?? array(), array( $task ) ) );
					$connections[0]['primary_for']   = array_values( $connections[0]['primary_for'] );
				}
			}
		}

		update_option( self::OPTION_KEY, $connections, false );
		\aime_clear_settings_cache( array( self::OPTION_KEY ) );
		self::clear_connection_health( $id );

		aime_log( sprintf( 'AI connection "%s" deleted.', $id ), 'info', 'ai' );

		return true;
	}

	/**
	 * Find a connection by ID.
	 */
	private static function find_connection( array $connections, string $id ): ?array {
		foreach ( $connections as $c ) {
			if ( ( $c['id'] ?? '' ) === $id ) {
				return $c;
			}
		}
		return null;
	}

	/* ================================================================
	 *  PROVIDER HEALTH / CIRCUIT BREAKER
	 * ============================================================= */

	private static function get_health_bucket(): array {
		$health = get_option( self::HEALTH_OPTION_KEY, array() );
		return is_array( $health ) ? $health : array();
	}

	private static function get_connection_health( string $conn_id ): array {
		$defaults = array(
			'status'       => 'available',
			'reason'       => '',
			'retry_after'  => 0,
			'last_error'   => '',
			'failed_count' => 0,
		);

		if ( '' === $conn_id ) {
			return $defaults;
		}

		$health = self::get_health_bucket();
		$item = wp_parse_args( $health[ $conn_id ] ?? array(), $defaults );
		$item['retry_after'] = absint( $item['retry_after'] ?? 0 );

		if ( in_array( $item['status'], array( 'rate_limited', 'cooldown' ), true ) && $item['retry_after'] > 0 && time() >= $item['retry_after'] ) {
			self::clear_connection_health( $conn_id );
			return $defaults;
		}

		return $item;
	}

	private static function is_connection_available( array $conn ): bool {
		$health = self::get_connection_health( $conn['id'] ?? '' );
		return 'available' === $health['status'];
	}

	private static function clear_connection_health( string $conn_id ): void {
		if ( '' === $conn_id ) {
			return;
		}

		$health = self::get_health_bucket();
		if ( isset( $health[ $conn_id ] ) ) {
			unset( $health[ $conn_id ] );
			update_option( self::HEALTH_OPTION_KEY, $health, false );
		}
	}

	private static function mark_connection_health( array $conn, array $classification, string $message ): void {
		$conn_id = $conn['id'] ?? '';
		if ( '' === $conn_id || 'bad_request' === $classification['type'] ) {
			return;
		}

		$health = self::get_health_bucket();
		$previous = $health[ $conn_id ] ?? array();
		$status = 'temporary_error' === $classification['type'] ? 'cooldown' : $classification['type'];
		$retry_after = 'auth_error' === $classification['type'] ? 0 : time() + absint( $classification['cooldown'] ?? self::TEMPORARY_COOLDOWN );

		$health[ $conn_id ] = array(
			'status'       => $status,
			'reason'       => $classification['reason'] ?? '',
			'retry_after'  => $retry_after,
			'last_error'   => sanitize_text_field( substr( $message, 0, 500 ) ),
			'failed_count' => absint( $previous['failed_count'] ?? 0 ) + 1,
			'updated_at'   => time(),
		);

		update_option( self::HEALTH_OPTION_KEY, $health, false );
	}

	private static function classify_failure( array $result ): array {
		$message = strtolower( $result['message'] ?? '' );

		if ( false !== strpos( $message, 'invalid api key' ) || false !== strpos( $message, 'incorrect api key' ) || false !== strpos( $message, 'unauthorized' ) || false !== strpos( $message, '401' ) ) {
			return array( 'type' => 'auth_error', 'reason' => 'invalid_key', 'cooldown' => 0 );
		}

		if ( false !== strpos( $message, 'insufficient quota' ) || false !== strpos( $message, 'quota exceeded' ) || false !== strpos( $message, 'billing' ) || false !== strpos( $message, 'resource exhausted' ) ) {
			return array( 'type' => 'rate_limited', 'reason' => 'quota_exceeded', 'cooldown' => self::QUOTA_COOLDOWN );
		}

		if ( false !== strpos( $message, '429' ) || false !== strpos( $message, 'rate limit' ) || false !== strpos( $message, 'too many requests' ) ) {
			return array( 'type' => 'rate_limited', 'reason' => 'rate_limited', 'cooldown' => self::parse_provider_retry_after( $result['message'] ?? '' ) );
		}

		if ( false !== strpos( $message, '503' ) || false !== strpos( $message, '502' ) || false !== strpos( $message, '504' ) || false !== strpos( $message, 'timeout' ) || false !== strpos( $message, 'timed out' ) || false !== strpos( $message, 'overloaded' ) || false !== strpos( $message, 'temporarily unavailable' ) ) {
			return array( 'type' => 'temporary_error', 'reason' => 'provider_unavailable', 'cooldown' => self::TEMPORARY_COOLDOWN );
		}

		if ( false !== strpos( $message, 'model not found' ) || false !== strpos( $message, 'does not exist' ) || false !== strpos( $message, 'context length' ) || false !== strpos( $message, 'invalid request' ) ) {
			return array( 'type' => 'bad_request', 'reason' => 'request_or_model_error', 'cooldown' => 0 );
		}

		return array( 'type' => 'temporary_error', 'reason' => 'unknown_error', 'cooldown' => 60 );
	}

	private static function parse_provider_retry_after( string $message ): int {
		if ( preg_match( '/retry\s+(?:in|after)\s+([\d.]+)\s*(s|sec|second|seconds|m|min|minute|minutes)?/i', $message, $m ) ) {
			$value = (float) $m[1];
			$unit  = strtolower( $m[2] ?? 's' );
			$seconds = false !== strpos( $unit, 'm' ) ? (int) ceil( $value * 60 ) : (int) ceil( $value );
			return max( 60, min( $seconds, self::QUOTA_COOLDOWN ) );
		}

		return self::RATE_LIMIT_COOLDOWN;
	}

	/**
	 * Migrate old fixed-provider settings into connections format.
	 *
	 * @return array
	 */
	private static function maybe_migrate_old(): array {
		$old = get_option( 'aime_ai_settings', array() );
		if ( empty( $old ) || empty( $old['providers'] ) ) {
			return array();
		}

		$connections = array();
		$providers   = self::get_providers();

		foreach ( $old['providers'] as $provider_id => $settings ) {
			if ( empty( $settings['api_key'] ) && empty( $settings['enabled'] ) ) {
				continue;
			}
			$p = $providers[ $provider_id ] ?? null;
			if ( ! $p ) {
				continue;
			}

			$is_primary = ( $old['primary_provider'] ?? '' ) === $provider_id;

			$connections[] = array(
				'id'                 => 'ai_' . substr( md5( $provider_id ), 0, 10 ),
				'name'               => $p['name'],
				'provider'           => $provider_id,
				'api_key'            => $settings['api_key'] ?? '',
				'text_model'         => $settings['text_model'] ?? '',
				'image_model'        => $settings['image_model'] ?? '',
				'custom_text_model'  => $settings['custom_text_model'] ?? '',
				'custom_image_model' => $settings['custom_image_model'] ?? '',
				'primary_for'        => $is_primary ? array( 'text', 'image' ) : array(),
				'enabled'            => ! empty( $settings['enabled'] ),
			);
		}

		// If we migrated any, persist them and clean up old option.
		if ( ! empty( $connections ) ) {
			// Ensure every task type has at least one primary.
			foreach ( array( 'text', 'image' ) as $task ) {
				$has_primary = false;
				foreach ( $connections as $c ) {
					if ( in_array( $task, $c['primary_for'] ?? array(), true ) ) {
						$has_primary = true;
						break;
					}
				}
				if ( ! $has_primary ) {
					$connections[0]['primary_for'] = array_unique( array_merge( $connections[0]['primary_for'] ?? array(), array( $task ) ) );
					$connections[0]['primary_for'] = array_values( $connections[0]['primary_for'] );
				}
			}

			update_option( self::OPTION_KEY, $connections, false );
			\aime_clear_settings_cache( array( self::OPTION_KEY ) );
		}

		return $connections;
	}

	/* ================================================================
	 *  API RESPONSE
	 * ============================================================= */

	/**
	 * Get data for the REST API settings response.
	 *
	 * @return array
	 */
	public static function get_settings_for_api(): array {
		return array(
			'connections' => self::get_connections_for_api(),
			'providers'   => self::get_providers(),
		);
	}

	/* ================================================================
	 *  TEST CONNECTION
	 * ============================================================= */

	/**
	 * Test an AI connection by ID.
	 *
	 * @param string $id Connection ID.
	 * @return array [ 'success' => bool, 'message' => string ]
	 */
	public static function test_connection( string $id ): array {
		$connections = self::get_connections();
		$conn        = self::find_connection( $connections, $id );

		if ( ! $conn ) {
			return array(
				'success' => false,
				'message' => __( 'Connection not found.', 'ai-marketing-expert' ),
			);
		}

		$api_key = ! empty( $conn['api_key'] ) ? Encryption::decrypt( $conn['api_key'] ) : '';

		if ( empty( $api_key ) ) {
			return array(
				'success' => false,
				'message' => __( 'No API key configured for this connection.', 'ai-marketing-expert' ),
			);
		}

		$provider_id = $conn['provider'] ?? '';

		switch ( $provider_id ) {
			case 'google_ai':
				$result = self::test_google_ai( $api_key );
				break;
			case 'openai':
				$result = self::test_openai( $api_key );
				break;
			case 'openrouter':
				$result = self::test_openrouter( $api_key );
				break;
			case 'anthropic':
				$result = self::test_anthropic( $api_key );
				break;
			case 'custom':
				$result = self::test_custom( $conn, $api_key );
				break;
			default:
				return array( 'success' => false, 'message' => __( 'Test not available for this provider.', 'ai-marketing-expert' ) );
		}

		if ( ! empty( $result['success'] ) ) {
			self::clear_connection_health( $id );
		} else {
			self::mark_connection_health( $conn, self::classify_failure( $result ), $result['message'] ?? '' );
		}

		return $result;
	}

	private static function test_google_ai( string $api_key ): array {
		$response = wp_remote_get(
			'https://generativelanguage.googleapis.com/v1beta/models?key=' . $api_key,
			array( 'timeout' => 15 )
		);

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 === $code ) {
			return array( 'success' => true, 'message' => __( 'Google AI Studio connected successfully!', 'ai-marketing-expert' ) );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		return array( 'success' => false, 'message' => $body['error']['message'] ?? __( 'Connection failed.', 'ai-marketing-expert' ) );
	}

	private static function test_openrouter( string $api_key ): array {
		$response = wp_remote_get(
			'https://openrouter.ai/api/v1/models',
			array(
				'timeout' => 15,
				'headers' => array( 'Authorization' => 'Bearer ' . $api_key ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 === $code ) {
			return array( 'success' => true, 'message' => __( 'OpenRouter connected successfully!', 'ai-marketing-expert' ) );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		return array( 'success' => false, 'message' => $body['error']['message'] ?? __( 'Connection failed.', 'ai-marketing-expert' ) );
	}

	private static function test_openai( string $api_key ): array {
		$response = wp_remote_post(
			'https://api.openai.com/v1/chat/completions',
			array(
				'timeout' => 15,
				'headers' => array(
					'Authorization' => 'Bearer ' . $api_key,
					'Content-Type'  => 'application/json',
				),
				'body'    => wp_json_encode( array(
					'model'      => 'gpt-5-nano',
					'max_tokens' => 10,
					'messages'   => array(
						array( 'role' => 'user', 'content' => 'Hi' ),
					),
				) ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 === $code ) {
			return array( 'success' => true, 'message' => __( 'OpenAI (ChatGPT) connected successfully!', 'ai-marketing-expert' ) );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		return array( 'success' => false, 'message' => $body['error']['message'] ?? __( 'Connection failed.', 'ai-marketing-expert' ) );
	}

	private static function test_anthropic( string $api_key ): array {
		$response = wp_remote_post(
			'https://api.anthropic.com/v1/messages',
			array(
				'timeout' => 15,
				'headers' => array(
					'x-api-key'         => $api_key,
					'anthropic-version'  => '2023-06-01',
					'Content-Type'       => 'application/json',
				),
				'body'    => wp_json_encode( array(
					'model'      => 'claude-haiku-4-5',
					'max_tokens' => 10,
					'messages'   => array(
						array( 'role' => 'user', 'content' => 'Hi' ),
					),
				) ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 === $code ) {
			return array( 'success' => true, 'message' => __( 'Anthropic (Claude) connected successfully!', 'ai-marketing-expert' ) );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		return array( 'success' => false, 'message' => $body['error']['message'] ?? __( 'Anthropic error.', 'ai-marketing-expert' ) );
	}

	/* ================================================================
	 *  FETCH REMOTE MODELS FROM PROVIDER API
	 * ============================================================= */

	/**
	 * Fetch available models from a provider's API.
	 *
	 * @param string $provider_id Provider ID.
	 * @param string $api_key     Decrypted API key.
	 * @return array { success: bool, message?: string, models?: { text: array[], image: array[] } }
	 */
	public static function fetch_remote_models( string $provider_id, string $api_key, string $base_url = '', string $api_format = '' ): array {
		switch ( $provider_id ) {
			case 'google_ai':
				return self::fetch_google_ai_models( $api_key );
			case 'openai':
				return self::fetch_openai_models( $api_key );
			case 'openrouter':
				return self::fetch_openrouter_models( $api_key );
			case 'anthropic':
				return self::fetch_anthropic_models( $api_key );
			case 'custom':
				return self::fetch_custom_models( $api_format, $api_key, $base_url );
			default:
				return array(
					'success' => false,
					'message' => __( 'Fetching models is not supported for this provider.', 'ai-marketing-expert' ),
				);
		}
	}

	private static function fetch_google_ai_models( string $api_key ): array {
		$response = wp_remote_get(
			'https://generativelanguage.googleapis.com/v1beta/models?key=' . urlencode( $api_key ) . '&pageSize=1000',
			array( 'timeout' => 20 )
		);

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 !== $code ) {
			return array( 'success' => false, 'message' => $body['error']['message'] ?? __( 'Failed to fetch models.', 'ai-marketing-expert' ) );
		}

		$text_models  = array();
		$image_models = array();

		foreach ( $body['models'] ?? array() as $m ) {
			$id      = str_replace( 'models/', '', $m['name'] ?? '' );
			$name    = $m['displayName'] ?? $id;
			$methods = $m['supportedGenerationMethods'] ?? array();

			// Skip models that can't generate content or images.
			if ( ! in_array( 'generateContent', $methods, true ) && ! in_array( 'generateImages', $methods, true ) ) {
				continue;
			}

			$entry = array( 'id' => $id, 'name' => $name );

			// Image generation models.
			if ( in_array( 'generateImages', $methods, true )
				|| false !== strpos( strtolower( $id ), 'imagen' )
				|| false !== strpos( strtolower( $id ), '-image' )
			) {
				$entry['type'] = 'image';
				$image_models[] = $entry;
			}

			// Text/content models.
			if ( in_array( 'generateContent', $methods, true ) ) {
				$entry['type'] = 'text';
				$text_models[] = $entry;
			}
		}

		// Reverse: Google typically lists older models first.
		$text_models  = array_reverse( $text_models );
		$image_models = array_reverse( $image_models );

		return array(
			'success' => true,
			'models'  => array( 'text' => array_values( $text_models ), 'image' => array_values( $image_models ) ),
		);
	}

	private static function fetch_openai_models( string $api_key ): array {
		$response = wp_remote_get(
			'https://api.openai.com/v1/models',
			array(
				'timeout' => 20,
				'headers' => array( 'Authorization' => 'Bearer ' . $api_key ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 !== $code ) {
			return array( 'success' => false, 'message' => $body['error']['message'] ?? __( 'Failed to fetch models.', 'ai-marketing-expert' ) );
		}

		$text_models  = array();
		$image_models = array();

		foreach ( $body['data'] ?? array() as $m ) {
			$id      = $m['id'] ?? '';
			$created = $m['created'] ?? 0;

			// Image generation model.
			if ( preg_match( '/^(dall-e|gpt-image)/i', $id ) ) {
				$image_models[] = array( 'id' => $id, 'name' => $id, 'type' => 'image', 'created' => $created );
				continue;
			}

			// Chat / text model.
			if ( preg_match( '/^(gpt-|o[0-9]|chatgpt)/i', $id ) ) {
				$text_models[] = array( 'id' => $id, 'name' => $id, 'type' => 'text', 'created' => $created );
			}
		}

		// Sort by created date, newest first.
		usort( $text_models, function ( $a, $b ) {
			return ( $b['created'] ?? 0 ) <=> ( $a['created'] ?? 0 );
		} );
		usort( $image_models, function ( $a, $b ) {
			return ( $b['created'] ?? 0 ) <=> ( $a['created'] ?? 0 );
		} );

		return array(
			'success' => true,
			'models'  => array( 'text' => array_values( $text_models ), 'image' => array_values( $image_models ) ),
		);
	}

	private static function fetch_openrouter_models( string $api_key ): array {
		$response = wp_remote_get(
			'https://openrouter.ai/api/v1/models',
			array(
				'timeout' => 20,
				'headers' => array( 'Authorization' => 'Bearer ' . $api_key ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 !== $code ) {
			return array( 'success' => false, 'message' => $body['error']['message'] ?? __( 'Failed to fetch models.', 'ai-marketing-expert' ) );
		}

		$text_models  = array();
		$image_models = array();

		foreach ( $body['data'] ?? array() as $m ) {
			$id       = $m['id'] ?? '';
			$name     = $m['name'] ?? $id;
			$created  = $m['created'] ?? 0;
			$modality = $m['architecture']['modality'] ?? '';

			$entry = array( 'id' => $id, 'name' => $name, 'created' => $created );

			// Models that can generate images.
			if ( false !== strpos( $modality, '->image' ) || false !== strpos( $modality, '->text+image' ) ) {
				$entry['type'] = 'image';
				$image_models[] = $entry;
			}

			// All models that accept text input can serve as text models.
			if ( 0 === strpos( $modality, 'text' ) ) {
				$entry['type'] = 'text';
				$text_models[] = $entry;
			}
		}

		// Sort by created date, newest first.
		usort( $text_models, function ( $a, $b ) {
			return ( $b['created'] ?? 0 ) <=> ( $a['created'] ?? 0 );
		} );
		usort( $image_models, function ( $a, $b ) {
			return ( $b['created'] ?? 0 ) <=> ( $a['created'] ?? 0 );
		} );

		return array(
			'success' => true,
			'models'  => array( 'text' => array_values( $text_models ), 'image' => array_values( $image_models ) ),
		);
	}

	private static function fetch_anthropic_models( string $api_key ): array {
		$response = wp_remote_get(
			'https://api.anthropic.com/v1/models?limit=100',
			array(
				'timeout' => 20,
				'headers' => array(
					'x-api-key'         => $api_key,
					'anthropic-version'  => '2023-06-01',
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 !== $code ) {
			return array( 'success' => false, 'message' => $body['error']['message'] ?? __( 'Failed to fetch models.', 'ai-marketing-expert' ) );
		}

		$text_models = array();

		foreach ( $body['data'] ?? array() as $m ) {
			$id         = $m['id'] ?? '';
			$name       = $m['display_name'] ?? $id;
			$created_at = $m['created_at'] ?? '';

			$text_models[] = array(
				'id'      => $id,
				'name'    => $name,
				'type'    => 'text',
				'created' => $created_at ? strtotime( $created_at ) : 0,
			);
		}

		// Sort by creation, newest first.
		usort( $text_models, function ( $a, $b ) {
			return ( $b['created'] ?? 0 ) <=> ( $a['created'] ?? 0 );
		} );

		// Anthropic models are text-only; no image generation.
		return array(
			'success' => true,
			'models'  => array( 'text' => array_values( $text_models ), 'image' => array() ),
		);
	}

	/* ================================================================
	 *  GENERATE CONTENT
	 * ============================================================= */

	/**
	 * Get the active model for a specific task type with smart fallback.
	 *
	 * Fallback chain:
	 * 1. Connection primary for this task → use its dedicated model (text_model or image_model)
	 * 2. Connection primary for this task → use its text_model if it has this capability (e.g., text model that can generate images)
	 * 3. Any enabled connection → use its dedicated model for this task
	 * 4. Any enabled connection → use its text_model if it has this capability
	 *
	 * @param string $task_type 'text' or 'image'.
	 * @return array [ 'provider' => string, 'model' => string, 'api_key' => string, 'conn_id' => string ]
	 */
	public static function get_active_model( string $task_type = 'text' ): array {
		$connections = self::get_connections();

		// Sort: primary for this task first, then other primaries, then the rest.
		usort( $connections, function ( $a, $b ) use ( $task_type ) {
			$a_primary = in_array( $task_type, $a['primary_for'] ?? array(), true );
			$b_primary = in_array( $task_type, $b['primary_for'] ?? array(), true );
			if ( $a_primary && ! $b_primary ) return -1;
			if ( ! $a_primary && $b_primary ) return 1;
			return 0;
		} );

		// Pass 1: Try the dedicated model for this task type (text_model or image_model).
		foreach ( $connections as $conn ) {
			if ( empty( $conn['enabled'] ) || empty( $conn['api_key'] ) || ! self::is_connection_available( $conn ) ) {
				continue;
			}

			$model_key = $task_type . '_model';
			$model     = $conn[ $model_key ] ?? '';

			if ( 'custom' === $model ) {
				$model = $conn[ 'custom_' . $model_key ] ?? '';
			}

			if ( ! empty( $model ) ) {
				return array(
					'provider' => $conn['provider'],
					'model'    => $model,
					'api_key'  => Encryption::decrypt( $conn['api_key'] ),
					'conn_id'  => $conn['id'],
				);
			}
		}

		// Pass 2 (image fallback): If looking for image and no image_model found,
		// try text_model from connections if it has image capability.
		if ( 'image' === $task_type ) {
			foreach ( $connections as $conn ) {
				if ( empty( $conn['enabled'] ) || empty( $conn['api_key'] ) || ! self::is_connection_available( $conn ) ) {
					continue;
				}

				$model = $conn['text_model'] ?? '';
				if ( 'custom' === $model ) {
					$model = $conn['custom_text_model'] ?? '';
				}

				if ( ! empty( $model ) && self::model_has_capability( $conn['provider'], $model, 'image' ) ) {
					return array(
						'provider' => $conn['provider'],
						'model'    => $model,
						'api_key'  => Encryption::decrypt( $conn['api_key'] ),
						'conn_id'  => $conn['id'],
					);
				}
			}
		}

		return array( 'provider' => '', 'model' => '', 'api_key' => '' );
	}

	/* ================================================================
	 *  RETRY WITH BACKOFF
	 * ============================================================= */

	/**
	 * Maximum number of retry attempts for rate-limited requests.
	 */
	private const MAX_RETRIES = 2;

	/**
	 * Check if an API result indicates a rate-limit / quota error worth retrying.
	 *
	 * @param array $result Provider result array.
	 * @return bool
	 */
	private static function is_retryable( array $result ): bool {
		if ( $result['success'] ) {
			return false;
		}
		$classification = self::classify_failure( $result );
		return 'temporary_error' === $classification['type'];
	}

	/**
	 * Extract retry-after seconds from an API error message.
	 *
	 * Many providers include "retry in N.NNs" or "retry after N" in the body.
	 *
	 * @param string $message Error message.
	 * @return int Seconds to wait (capped at 30, minimum 5).
	 */
	private static function parse_retry_after( string $message ): int {
		if ( preg_match( '/retry\s+(?:in|after)\s+([\d.]+)/i', $message, $m ) ) {
			$seconds = (int) ceil( (float) $m[1] );
			return max( 5, min( $seconds, 30 ) );
		}
		return 10; // sensible default
	}

	/**
	 * Execute a callable with automatic retry on rate-limit errors.
	 *
	 * @param callable $fn        Function returning an array with 'success' and 'message'.
	 * @param string   $label     Label for logging (e.g. "Google AI / model-id").
	 * @return array The last result from $fn.
	 */
	/**
	 * Compute a sensible HTTP timeout for an AI request based on max_tokens.
	 * Large completions (full article, keyword research) need far more than 60 s.
	 * Caps at 300 s (5 minutes) which handles even the slowest providers.
	 */
	private static function compute_http_timeout( int $max_tokens ): int {
		// ~30 tokens per second is conservative for large models.
		return max( 120, min( 300, (int) ( $max_tokens / 30 ) ) );
	}

	private static function with_retry( callable $fn, string $label = '' ): array {
		// Disable PHP max_execution_time for the entire retry sequence.
		// Large AI generations (full articles, keyword lists) can take 2-5 minutes,
		// and without this the PHP watchdog kills the process mid-cURL at 120-130 s.
		if ( function_exists( 'set_time_limit' ) ) {
			set_time_limit( 0 );
		}

		$result = $fn();

		for ( $attempt = 1; $attempt <= self::MAX_RETRIES; $attempt++ ) {
			if ( ! self::is_retryable( $result ) ) {
				return $result;
			}

			$wait = self::parse_retry_after( $result['message'] ?? '' );
			aime_log( sprintf( 'Rate limited (%s). Retry %d/%d after %ds.', $label, $attempt, self::MAX_RETRIES, $wait ), 'info', 'ai' );

			sleep( $wait );

			$result = $fn();
		}

		return $result;
	}

	/**
	 * Generate text content using AI connections (tries primary, then fallbacks).
	 *
	 * @param string $prompt     The prompt to send.
	 * @param string $task       Task type (text, image).
	 * @param int    $max_tokens Maximum tokens.
	 * @return array { success: bool, content: string, provider: string, model: string }
	 */
	public static function generate( string $prompt, string $task = 'text', int $max_tokens = 2048 ): array {
		$connections = self::get_connections();

		// Sort: primary for this task first.
		usort( $connections, function ( $a, $b ) use ( $task ) {
			$a_primary = in_array( $task, $a['primary_for'] ?? array(), true );
			$b_primary = in_array( $task, $b['primary_for'] ?? array(), true );
			if ( $a_primary && ! $b_primary ) return -1;
			if ( ! $a_primary && $b_primary ) return 1;
			return 0;
		} );

		foreach ( $connections as $conn ) {
			if ( empty( $conn['enabled'] ) || empty( $conn['api_key'] ) || ! self::is_connection_available( $conn ) ) {
				continue;
			}

			$model_key = $task . '_model';
			$model     = $conn[ $model_key ] ?? '';
			if ( 'custom' === $model ) {
				$model = $conn[ 'custom_' . $model_key ] ?? '';
			}

			$api_key = Encryption::decrypt( $conn['api_key'] );
			if ( empty( $model ) || empty( $api_key ) ) {
				continue;
			}

			$result = null;
			$provider_id = $conn['provider'];
			$call_label  = sprintf( '%s / %s', $conn['name'] ?? $provider_id, $model );

			switch ( $provider_id ) {
				case 'google_ai':
					$result = self::with_retry( fn() => self::generate_google( $api_key, $model, $prompt, $max_tokens ), $call_label );
					break;
				case 'openai':
					$result = self::with_retry( fn() => self::generate_openai( $api_key, $model, $prompt, $max_tokens ), $call_label );
					break;
				case 'openrouter':
					$result = self::with_retry( fn() => self::generate_openrouter( $api_key, $model, $prompt, $max_tokens ), $call_label );
					break;
				case 'anthropic':
					$result = self::with_retry( fn() => self::generate_anthropic( $api_key, $model, $prompt, $max_tokens ), $call_label );
					break;
				case 'custom':
					$result = self::with_retry( fn() => self::generate_custom( $conn, $api_key, $model, $prompt, $max_tokens ), $call_label );
					break;
			}

			if ( $result && $result['success'] ) {
				self::clear_connection_health( $conn['id'] ?? '' );
				$result['provider'] = $provider_id;
				$result['model']    = $model;
				return $result;
			}

			if ( $result && ! $result['success'] ) {
				$classification = self::classify_failure( $result );
				self::mark_connection_health( $conn, $classification, $result['message'] ?? '' );
			}

			// Log fallback.
			aime_log( sprintf( 'AI connection "%s" failed, trying next...', $conn['name'] ), 'warning', 'ai' );
		}

		return array(
			'success' => false,
			'content' => '',
			'message' => __( 'No AI provider is configured or all providers failed. Please configure an AI provider in Settings.', 'ai-marketing-expert' ),
		);
	}

	/**
	 * Generate an image using AI and save it to the WordPress media library.
	 *
	 * @param string $prompt  Image description / prompt.
	 * @param string $title   Image title for WP media.
	 * @param int    $post_id Optional article / post ID for attachment linkage.
	 * @return array { success: bool, image_url: string, attachment_id: int, provider: string }
	 */
	public static function generate_image( string $prompt, string $title = '', int $post_id = 0 ): array {
		$connections = self::get_connections();

		// Sort: primary for image first.
		usort( $connections, function ( $a, $b ) {
			$a_primary = in_array( 'image', $a['primary_for'] ?? array(), true );
			$b_primary = in_array( 'image', $b['primary_for'] ?? array(), true );
			if ( $a_primary && ! $b_primary ) return -1;
			if ( ! $a_primary && $b_primary ) return 1;
			return 0;
		} );

		$errors = array();
		$tried  = 0;

		// Pass 1: connections with an explicit image model.
		// Pass 2: connections without an image model — fall back to provider default image model.
		foreach ( array( 'explicit', 'fallback' ) as $pass ) {
		foreach ( $connections as $conn ) {
			if ( empty( $conn['enabled'] ) || empty( $conn['api_key'] ) || ! self::is_connection_available( $conn ) ) {
				continue;
			}

			$api_key     = Encryption::decrypt( $conn['api_key'] );
			$provider_id = $conn['provider'];

			$model = $conn['image_model'] ?? '';
			if ( 'custom' === $model ) {
				$model = $conn['custom_image_model'] ?? '';
			}

			// On the first pass only process connections with an image model set.
			// On the fallback pass only process connections that were skipped (empty model).
			if ( 'explicit' === $pass && empty( $model ) ) {
				continue;
			}
			if ( 'fallback' === $pass && ! empty( $model ) ) {
				continue; // already tried in pass 1
			}

			// Resolve fallback model from provider defaults.
			if ( empty( $model ) ) {
				$defaults = self::get_default_models( $provider_id );
				$model    = $defaults['image'] ?? '';
			}

			if ( empty( $model ) || empty( $api_key ) ) {
				continue;
			}

			++$tried;
			$result     = null;
			$call_label = sprintf( '%s / %s', $conn['name'] ?? $provider_id, $model );

			switch ( $provider_id ) {
				case 'openai':
					$result = self::with_retry( fn() => self::generate_image_openai( $api_key, $model, $prompt ), $call_label );
					break;
				case 'google_ai':
					$result = self::with_retry( fn() => self::generate_image_google( $api_key, $model, $prompt ), $call_label );
					break;
				case 'openrouter':
					$result = self::with_retry( fn() => self::generate_image_openrouter( $api_key, $model, $prompt ), $call_label );
					break;
				case 'custom':
					if ( 'anthropic' === ( $conn['api_format'] ?? 'openai' ) ) {
						continue 2; // Anthropic-compatible endpoints have no image generation.
					}
					$result = self::with_retry( fn() => self::generate_image_custom_openai( $api_key, $model, $prompt, $conn['base_url'] ?? '' ), $call_label );
					break;
				default:
					continue 2; // skip providers without image generation
			}

			if ( $result && $result['success'] && ! empty( $result['image_data'] ) ) {
				self::clear_connection_health( $conn['id'] ?? '' );
				// Save to WP media library.
				$saved = self::save_image_to_media( $result['image_data'], $result['mime_type'] ?? 'image/png', $title, $post_id );
				if ( $saved ) {
					return array(
						'success'       => true,
						'image_url'     => $saved['url'],
						'attachment_id' => $saved['id'],
						'provider'      => $provider_id,
						'model'         => $model,
					);
				}
			}

			if ( $result && ! $result['success'] ) {
				$raw_message = $result['message'] ?? 'Unknown error';
				$classification = self::classify_failure( $result );
				self::mark_connection_health( $conn, $classification, $raw_message );
				$full_error  = sprintf( '[%s / %s] %s', $conn['name'] ?? $provider_id, $model, $raw_message );

				// Log full technical detail for debugging.
				aime_log( 'Image generation failed: ' . $full_error, 'warning', 'ai' );

				// Build short user-facing error.
				$short = self::shorten_api_error( $raw_message );
				$errors[] = sprintf( '[%s / %s] %s', $conn['name'] ?? $provider_id, $model, $short );
			}
		} // end inner foreach (connections)
		} // end outer foreach (pass)

		if ( 0 === $tried ) {
			return array(
				'success' => false,
				'message' => __( 'No AI provider is configured with an image model. Please select an image model in Settings → AI Providers.', 'ai-marketing-expert' ),
			);
		}

		return array(
			'success' => false,
			'message' => ! empty( $errors )
				? implode( "\n", $errors )
				: __( 'Image generation failed. Ensure your AI provider supports image generation.', 'ai-marketing-expert' ),
		);
	}

	/**
	 * Shorten a verbose API error message to a user-friendly one-liner.
	 *
	 * @param string $message Raw error from the API.
	 * @return string
	 */
	private static function shorten_api_error( string $message ): string {
		$lower = strtolower( $message );

		if ( false !== strpos( $lower, 'quota' ) || false !== strpos( $lower, 'rate' ) ) {
			return __( 'API quota exceeded. Please check your plan or try again later.', 'ai-marketing-expert' );
		}
		if ( false !== strpos( $lower, 'invalid' ) && false !== strpos( $lower, 'key' ) ) {
			return __( 'Invalid API key. Please check your credentials.', 'ai-marketing-expert' );
		}
		if ( false !== strpos( $lower, 'not found' ) || false !== strpos( $lower, 'does not exist' ) ) {
			return __( 'Model not found. Please select a different model.', 'ai-marketing-expert' );
		}
		if ( false !== strpos( $lower, 'permission' ) || false !== strpos( $lower, 'forbidden' ) ) {
			return __( 'Permission denied. Check your API key permissions.', 'ai-marketing-expert' );
		}
		if ( false !== strpos( $lower, 'timeout' ) || false !== strpos( $lower, 'timed out' ) ) {
			return __( 'Request timed out. Please try again.', 'ai-marketing-expert' );
		}
		if ( false !== strpos( $lower, 'safety' ) || false !== strpos( $lower, 'blocked' ) || false !== strpos( $lower, 'content filter' ) ) {
			return __( 'Content blocked by safety filters. Try a different prompt.', 'ai-marketing-expert' );
		}

		// Truncate anything else to keep it short.
		if ( strlen( $message ) > 100 ) {
			// Take the first sentence.
			$dot = strpos( $message, '.' );
			if ( false !== $dot && $dot < 120 ) {
				return substr( $message, 0, $dot + 1 );
			}
			return substr( $message, 0, 100 ) . '…';
		}

		return $message;
	}

	/* ── Image generation per provider ──────────────── */

	private static function generate_image_openai( string $api_key, string $model, string $prompt ): array {
		$response = wp_remote_post( 'https://api.openai.com/v1/images/generations', array(
			'timeout' => 120,
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'model'           => $model,
				'prompt'          => $prompt,
				'n'               => 1,
				'size'            => '1024x1024',
				'response_format' => 'b64_json',
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		$code = wp_remote_retrieve_response_code( $response );

		if ( 200 !== $code ) {
			return array( 'success' => false, 'message' => $body['error']['message'] ?? "OpenAI error (HTTP {$code})" );
		}

		$b64 = $body['data'][0]['b64_json'] ?? '';
		if ( empty( $b64 ) ) {
			// Fallback: check for url response.
			$url = $body['data'][0]['url'] ?? '';
			if ( $url ) {
				$img = wp_remote_get( $url, array( 'timeout' => 60 ) );
				if ( ! is_wp_error( $img ) ) {
					return array(
						'success'    => true,
						'image_data' => wp_remote_retrieve_body( $img ),
						'mime_type'  => wp_remote_retrieve_header( $img, 'content-type' ) ?: 'image/png',
					);
				}
			}
			return array( 'success' => false, 'message' => 'No image data returned.' );
		}

		return array(
			'success'    => true,
			'image_data' => base64_decode( $b64 ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
			'mime_type'  => 'image/png',
		);
	}

	private static function generate_image_google( string $api_key, string $model, string $prompt ): array {
		// Imagen models use a different endpoint and payload structure.
		$is_imagen = ( false !== strpos( $model, 'imagen' ) );

		if ( $is_imagen ) {
			return self::generate_image_google_imagen( $api_key, $model, $prompt );
		}

		// Gemini image models — try IMAGE-only first, fall back to TEXT+IMAGE.
		$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$api_key}";

		$modality_sets = array(
			array( 'IMAGE' ),
			array( 'TEXT', 'IMAGE' ),
		);

		$last_error = '';

		foreach ( $modality_sets as $modalities ) {
			$body_payload = array(
				'contents'         => array(
					array( 'parts' => array( array( 'text' => $prompt ) ) ),
				),
				'generationConfig' => array(
					'responseModalities' => $modalities,
				),
			);

			$response = wp_remote_post( $url, array(
				'timeout' => 120,
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode( $body_payload ),
			) );

			if ( is_wp_error( $response ) ) {
				return array( 'success' => false, 'message' => $response->get_error_message() );
			}

			$body = json_decode( wp_remote_retrieve_body( $response ), true );
			$code = wp_remote_retrieve_response_code( $response );

			if ( 200 !== $code ) {
				$last_error = $body['error']['message'] ?? "Google AI error (HTTP {$code})";
				aime_log( "Gemini image attempt [{$model}] modalities=" . implode( ',', $modalities ) . " failed: {$last_error}", 'warning', 'ai' );
				continue; // try next modality set
			}

			// Look for inline image data in the response parts.
			$parts = $body['candidates'][0]['content']['parts'] ?? array();
			foreach ( $parts as $part ) {
				if ( isset( $part['inlineData'] ) ) {
					$b64  = $part['inlineData']['data'] ?? '';
					$mime = $part['inlineData']['mimeType'] ?? 'image/png';
					if ( $b64 ) {
						return array(
							'success'    => true,
							'image_data' => base64_decode( $b64 ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
							'mime_type'  => $mime,
						);
					}
				}
			}

			$last_error = 'Response received but no image data found.';
		}

		return array( 'success' => false, 'message' => $last_error ?: 'No image data in Google AI response.' );
	}

	/**
	 * Google Imagen models — use the predict endpoint.
	 */
	private static function generate_image_google_imagen( string $api_key, string $model, string $prompt ): array {
		$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:predict?key={$api_key}";

		$body_payload = array(
			'instances' => array(
				array( 'prompt' => $prompt ),
			),
			'parameters' => array(
				'sampleCount'  => 1,
			),
		);

		$response = wp_remote_post( $url, array(
			'timeout' => 120,
			'headers' => array( 'Content-Type' => 'application/json' ),
			'body'    => wp_json_encode( $body_payload ),
		) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		$code = wp_remote_retrieve_response_code( $response );

		if ( 200 !== $code ) {
			return array( 'success' => false, 'message' => $body['error']['message'] ?? "Imagen error (HTTP {$code})" );
		}

		// Imagen returns predictions[].bytesBase64Encoded.
		$predictions = $body['predictions'] ?? array();
		if ( ! empty( $predictions[0]['bytesBase64Encoded'] ) ) {
			$b64  = $predictions[0]['bytesBase64Encoded'];
			$mime = $predictions[0]['mimeType'] ?? 'image/png';
			return array(
				'success'    => true,
				'image_data' => base64_decode( $b64 ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
				'mime_type'  => $mime,
			);
		}

		return array( 'success' => false, 'message' => 'No image data in Imagen response.' );
	}

	private static function generate_image_openrouter( string $api_key, string $model, string $prompt ): array {
		// OpenRouter image-capable models (currently the Gemini "Nano Banana"
		// family) are accessed via the standard chat/completions endpoint.
		// `response_format: { type: 'image' }` is not a documented OpenRouter
		// parameter and has been observed to either be rejected or ignored;
		// the response body still carries either an inline `data:image/...`
		// URI or a direct image URL inside `choices[0].message.content`,
		// both of which the parsing below already handles.
		$response = wp_remote_post( 'https://openrouter.ai/api/v1/chat/completions', array(
			'timeout' => 120,
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type'  => 'application/json',
				'HTTP-Referer'  => home_url(),
			),
			'body'    => wp_json_encode( array(
				'model'    => $model,
				'messages' => array(
					array( 'role' => 'user', 'content' => $prompt ),
				),
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		$code = wp_remote_retrieve_response_code( $response );

		if ( 200 !== $code ) {
			return array( 'success' => false, 'message' => $body['error']['message'] ?? "OpenRouter error (HTTP {$code})" );
		}

		// OpenRouter may return image data inline or as a URL depending on the model.
		$content = $body['choices'][0]['message']['content'] ?? '';
		if ( preg_match( '/data:image\/([a-z]+);base64,([A-Za-z0-9+\/=]+)/s', $content, $m ) ) {
			return array(
				'success'    => true,
				'image_data' => base64_decode( $m[2] ), // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
				'mime_type'  => 'image/' . $m[1],
			);
		}

		// Check for URL in response.
		if ( preg_match( '/https?:\/\/[^\s"]+\.(?:png|jpg|jpeg|webp)/i', $content, $m ) ) {
			$img = wp_remote_get( $m[0], array( 'timeout' => 60 ) );
			if ( ! is_wp_error( $img ) && 200 === wp_remote_retrieve_response_code( $img ) ) {
				return array(
					'success'    => true,
					'image_data' => wp_remote_retrieve_body( $img ),
					'mime_type'  => wp_remote_retrieve_header( $img, 'content-type' ) ?: 'image/png',
				);
			}
		}

		return array( 'success' => false, 'message' => 'No image data in OpenRouter response.' );
	}

	/**
	 * Save raw image binary data to the WordPress media library.
	 */
	private static function save_image_to_media( string $image_data, string $mime_type, string $title, int $post_id = 0 ): ?array {
		if ( ! function_exists( 'wp_upload_bits' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}
		if ( ! function_exists( 'wp_generate_attachment_metadata' ) ) {
			require_once ABSPATH . 'wp-admin/includes/image.php';
		}
		if ( ! function_exists( 'media_handle_sideload' ) ) {
			require_once ABSPATH . 'wp-admin/includes/media.php';
		}

		$ext_map = array(
			'image/png'  => 'png',
			'image/jpeg' => 'jpg',
			'image/webp' => 'webp',
			'image/gif'  => 'gif',
		);
		$ext = $ext_map[ $mime_type ] ?? 'png';

		$slug     = sanitize_title( $title ?: 'ai-image' );
		$filename = $slug . '-' . wp_generate_password( 6, false ) . '.' . $ext;

		$upload = wp_upload_bits( $filename, null, $image_data );
		if ( ! empty( $upload['error'] ) ) {
			aime_log( 'Image upload error: ' . $upload['error'], 'error', 'ai' );
			return null;
		}

		$attachment = array(
			'post_title'     => $title ?: 'AI Generated Image',
			'post_content'   => '',
			'post_mime_type' => $mime_type,
			'guid'           => $upload['url'],
		);

		$attach_id = wp_insert_attachment( $attachment, $upload['file'], $post_id );
		if ( is_wp_error( $attach_id ) ) {
			return null;
		}

		$metadata = wp_generate_attachment_metadata( $attach_id, $upload['file'] );
		wp_update_attachment_metadata( $attach_id, $metadata );

		return array(
			'id'  => $attach_id,
			'url' => $upload['url'],
		);
	}

	/* ================================================================
	 *  GENERATE METHODS
	 * ============================================================= */

	private static function generate_google( string $api_key, string $model, string $prompt, int $max_tokens ): array {
		$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$api_key}";

		$response = wp_remote_post( $url, array(
			'timeout' => self::compute_http_timeout( $max_tokens ),
			'headers' => array( 'Content-Type' => 'application/json' ),
			'body'    => wp_json_encode( array(
				'contents'         => array(
					array( 'parts' => array( array( 'text' => $prompt ) ) ),
				),
				'generationConfig' => array(
					'maxOutputTokens' => $max_tokens,
					'temperature'     => 0.7,
					'thinkingConfig'  => array( 'thinkingBudget' => 0 ),
				),
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $body['error']['message'] ?? __( 'Google AI error.', 'ai-marketing-expert' ) );
		}

		$text = $body['candidates'][0]['content']['parts'][0]['text'] ?? '';
		return array( 'success' => true, 'content' => $text );
	}

	private static function generate_openrouter( string $api_key, string $model, string $prompt, int $max_tokens ): array {
		$response = wp_remote_post( 'https://openrouter.ai/api/v1/chat/completions', array(
			'timeout' => self::compute_http_timeout( $max_tokens ),
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type'  => 'application/json',
				'HTTP-Referer'  => home_url(),
			),
			'body'    => wp_json_encode( array(
				'model'      => $model,
				'max_tokens' => $max_tokens,
				'messages'   => array(
					array( 'role' => 'user', 'content' => $prompt ),
				),
				'provider' => array(
					'require_parameters' => true,
				),
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $body['error']['message'] ?? __( 'OpenRouter error.', 'ai-marketing-expert' ) );
		}

		$choice        = $body['choices'][0] ?? array();
		$finish_reason = $choice['finish_reason'] ?? '';
		// content can be null when the model applies a content filter or refuses.
		$text          = isset( $choice['message']['content'] ) ? (string) $choice['message']['content'] : null;

		if ( null === $text || '' === trim( $text ) ) {
			if ( 'content_filter' === $finish_reason ) {
				$reason = __( 'The model blocked this request due to its content filter.', 'ai-marketing-expert' );
			} elseif ( 'stop' === $finish_reason || '' === $finish_reason ) {
				$reason = __( 'Model returned empty content. Try a different model.', 'ai-marketing-expert' );
			} else {
				$reason = sprintf( __( 'Model returned no content (finish_reason: %s).', 'ai-marketing-expert' ), $finish_reason );
			}
			return array( 'success' => false, 'content' => '', 'message' => $reason );
		}

		return array( 'success' => true, 'content' => $text );
	}

	private static function generate_openai( string $api_key, string $model, string $prompt, int $max_tokens ): array {
		$response = wp_remote_post( 'https://api.openai.com/v1/chat/completions', array(
			'timeout' => self::compute_http_timeout( $max_tokens ),
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'model'      => $model,
				'max_tokens' => $max_tokens,
				'messages'   => array(
					array( 'role' => 'user', 'content' => $prompt ),
				),
				'reasoning_effort' => 'none',
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $body['error']['message'] ?? __( 'OpenAI error.', 'ai-marketing-expert' ) );
		}

		$text = $body['choices'][0]['message']['content'] ?? '';
		return array( 'success' => true, 'content' => $text );
	}

	private static function generate_anthropic( string $api_key, string $model, string $prompt, int $max_tokens ): array {
		$response = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
			'timeout' => self::compute_http_timeout( $max_tokens ),
			'headers' => array(
				'x-api-key'        => $api_key,
				'anthropic-version' => '2023-06-01',
				'Content-Type'     => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'model'      => $model,
				'max_tokens' => $max_tokens,
				'messages'   => array(
					array( 'role' => 'user', 'content' => $prompt ),
				),
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $body['error']['message'] ?? __( 'Anthropic error.', 'ai-marketing-expert' ) );
		}

		$text = $body['content'][0]['text'] ?? '';
		return array( 'success' => true, 'content' => $text );
	}

	/* ================================================================
	 *  CUSTOM PROVIDER (OpenAI-compatible / Anthropic-compatible)
	 * ============================================================= */

	/**
	 * Normalize a user-supplied base URL (trim, strip trailing slash).
	 */
	private static function normalize_base_url( string $base_url ): string {
		return rtrim( trim( $base_url ), '/' );
	}

	/**
	 * Dispatch text generation for a custom connection based on its API format.
	 */
	private static function generate_custom( array $conn, string $api_key, string $model, string $prompt, int $max_tokens ): array {
		$base_url = self::normalize_base_url( $conn['base_url'] ?? '' );
		if ( empty( $base_url ) ) {
			return array( 'success' => false, 'content' => '', 'message' => __( 'Custom provider base URL is not configured.', 'ai-marketing-expert' ) );
		}
		$format = ( 'anthropic' === ( $conn['api_format'] ?? 'openai' ) ) ? 'anthropic' : 'openai';
		return 'anthropic' === $format
			? self::generate_custom_anthropic( $api_key, $model, $prompt, $max_tokens, $base_url )
			: self::generate_custom_openai( $api_key, $model, $prompt, $max_tokens, $base_url );
	}

	private static function generate_custom_openai( string $api_key, string $model, string $prompt, int $max_tokens, string $base_url ): array {
		$response = wp_remote_post( self::normalize_base_url( $base_url ) . '/chat/completions', array(
			'timeout' => self::compute_http_timeout( $max_tokens ),
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'model'      => $model,
				'max_tokens' => $max_tokens,
				'messages'   => array(
					array( 'role' => 'user', 'content' => $prompt ),
				),
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $body['error']['message'] ?? __( 'Custom provider error.', 'ai-marketing-expert' ) );
		}

		$text = $body['choices'][0]['message']['content'] ?? '';
		return array( 'success' => true, 'content' => (string) $text );
	}

	private static function generate_custom_anthropic( string $api_key, string $model, string $prompt, int $max_tokens, string $base_url ): array {
		$response = wp_remote_post( self::normalize_base_url( $base_url ) . '/messages', array(
			'timeout' => self::compute_http_timeout( $max_tokens ),
			'headers' => array(
				'x-api-key'         => $api_key,
				'anthropic-version' => '2023-06-01',
				'Content-Type'      => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'model'      => $model,
				'max_tokens' => $max_tokens,
				'messages'   => array(
					array( 'role' => 'user', 'content' => $prompt ),
				),
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return array( 'success' => false, 'content' => '', 'message' => $body['error']['message'] ?? __( 'Custom provider error.', 'ai-marketing-expert' ) );
		}

		$text = $body['content'][0]['text'] ?? '';
		return array( 'success' => true, 'content' => (string) $text );
	}

	private static function generate_image_custom_openai( string $api_key, string $model, string $prompt, string $base_url ): array {
		$base_url = self::normalize_base_url( $base_url );
		if ( empty( $base_url ) ) {
			return array( 'success' => false, 'message' => __( 'Custom provider base URL is not configured.', 'ai-marketing-expert' ) );
		}

		$response = wp_remote_post( $base_url . '/images/generations', array(
			'timeout' => 120,
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'model'           => $model,
				'prompt'          => $prompt,
				'n'               => 1,
				'size'            => '1024x1024',
				'response_format' => 'b64_json',
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		$code = wp_remote_retrieve_response_code( $response );

		if ( 200 !== $code ) {
			return array( 'success' => false, 'message' => $body['error']['message'] ?? "Custom provider error (HTTP {$code})" );
		}

		$b64 = $body['data'][0]['b64_json'] ?? '';
		if ( empty( $b64 ) ) {
			return array( 'success' => false, 'message' => __( 'Custom provider returned no image data.', 'ai-marketing-expert' ) );
		}

		return array(
			'success'    => true,
			'image_data' => base64_decode( $b64 ),
			'mime_type'  => 'image/png',
		);
	}

	/**
	 * Test a custom connection. Resolves the connection's text model and pings the endpoint.
	 */
	private static function test_custom( array $conn, string $api_key ): array {
		$base_url = self::normalize_base_url( $conn['base_url'] ?? '' );
		if ( empty( $base_url ) ) {
			return array( 'success' => false, 'message' => __( 'Enter a base URL before testing.', 'ai-marketing-expert' ) );
		}

		$model = $conn['text_model'] ?? '';
		if ( 'custom' === $model ) {
			$model = $conn['custom_text_model'] ?? '';
		}
		if ( empty( $model ) ) {
			return array( 'success' => false, 'message' => __( 'Select a main model before testing.', 'ai-marketing-expert' ) );
		}

		$result = ( 'anthropic' === ( $conn['api_format'] ?? 'openai' ) )
			? self::generate_custom_anthropic( $api_key, $model, 'Hi', 10, $base_url )
			: self::generate_custom_openai( $api_key, $model, 'Hi', 10, $base_url );

		if ( ! empty( $result['success'] ) ) {
			return array( 'success' => true, 'message' => __( 'Custom provider connected successfully!', 'ai-marketing-expert' ) );
		}
		return array( 'success' => false, 'message' => $result['message'] ?? __( 'Connection failed.', 'ai-marketing-expert' ) );
	}

	/**
	 * Fetch available models from a custom endpoint's /models route.
	 */
	private static function fetch_custom_models( string $api_format, string $api_key, string $base_url ): array {
		$base_url = self::normalize_base_url( $base_url );
		if ( empty( $base_url ) ) {
			return array( 'success' => false, 'message' => __( 'Enter a base URL before fetching models.', 'ai-marketing-expert' ) );
		}

		$headers = ( 'anthropic' === $api_format )
			? array( 'x-api-key' => $api_key, 'anthropic-version' => '2023-06-01' )
			: array( 'Authorization' => 'Bearer ' . $api_key );

		$response = wp_remote_get( $base_url . '/models', array( 'timeout' => 20, 'headers' => $headers ) );

		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 !== $code ) {
			return array( 'success' => false, 'message' => $body['error']['message'] ?? __( 'Failed to fetch models.', 'ai-marketing-expert' ) );
		}

		$text_models  = array();
		$image_models = array();

		foreach ( $body['data'] ?? array() as $m ) {
			$id = $m['id'] ?? '';
			if ( empty( $id ) ) {
				continue;
			}
			$entry = array( 'id' => $id, 'name' => $id, 'created' => $m['created'] ?? 0 );
			if ( preg_match( '/(image|dall-e|imagen|sdxl|stable-diffusion|flux)/i', $id ) ) {
				$entry['type']  = 'image';
				$image_models[] = $entry;
			} else {
				$entry['type'] = 'text';
				$text_models[] = $entry;
			}
		}

		usort( $text_models, fn( $a, $b ) => ( $b['created'] ?? 0 ) <=> ( $a['created'] ?? 0 ) );
		usort( $image_models, fn( $a, $b ) => ( $b['created'] ?? 0 ) <=> ( $a['created'] ?? 0 ) );

		return array(
			'success' => true,
			'models'  => array( 'text' => array_values( $text_models ), 'image' => array_values( $image_models ) ),
		);
	}

	/* ================================================================
	 *  LEGACY COMPAT — keep old get_api_key working
	 * ============================================================= */

	/**
	 * Get decrypted API key for the primary connection of a given provider.
	 *
	 * @param string $provider_id Provider ID.
	 * @return string Decrypted API key.
	 */
	public static function get_api_key( string $provider_id ): string {
		$connections = self::get_connections();

		foreach ( $connections as $conn ) {
			if ( $conn['provider'] === $provider_id && ! empty( $conn['enabled'] ) && ! empty( $conn['api_key'] ) ) {
				return Encryption::decrypt( $conn['api_key'] );
			}
		}

		return '';
	}
}
