<?php
/**
 * Global helper functions for AI Marketing Expert.
 *
 * @package WPSpace\AiMarketingExpert
 */

// phpcs:disable WordPress.PHP.DevelopmentFunctions.error_log_error_log

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Check if the Pro addon is active and licensed.
 * In dev mode (AIME_DEV_MODE = true), always returns true.
 *
 * @return bool
 */
function aime_has_pro(): bool {
	if ( defined( 'AIME_DEV_MODE' ) && AIME_DEV_MODE ) {
		return true;
	}
	return (bool) apply_filters( 'aime_has_pro', false );
}

/**
 * Check if a specific module has pro features available.
 *
 * @param string $module_id Module identifier.
 * @return bool
 */
function aime_module_has_pro( string $module_id ): bool {
	return (bool) apply_filters( "aime_{$module_id}_has_pro", aime_has_pro() );
}

/**
 * Get a plugin option.
 *
 * @param string $key     Option key.
 * @param mixed  $default Default value.
 * @return mixed
 */
function aime_get_option( string $key, $default = null ) {
	$options = get_option( 'aime_settings', array() );
	return $options[ $key ] ?? $default;
}

/**
 * Update a plugin option.
 *
 * @param string $key   Option key.
 * @param mixed  $value Option value.
 * @return bool
 */
function aime_update_option( string $key, $value ): bool {
	$options         = get_option( 'aime_settings', array() );
	$options[ $key ] = $value;
	$updated = update_option( 'aime_settings', $options, false );
	aime_clear_settings_cache( array( 'aime_settings' ) );
	return $updated;
}

/**
 * Read a plugin option directly from the database, bypassing stale object cache.
 * Use this only for admin-critical settings where persistent object caches can
 * serve stale values after a write.
 *
 * @param string $option_name Option name.
 * @param mixed  $default     Default value.
 * @return mixed
 */
function aime_get_db_option( string $option_name, $default = array() ) {
	global $wpdb;

	$raw = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT option_value FROM {$wpdb->options} WHERE option_name = %s LIMIT 1",
			$option_name
		)
	);

	if ( null === $raw ) {
		return $default;
	}

	$value = maybe_unserialize( $raw );
	return null === $value ? $default : $value;
}

/**
 * Clear plugin settings caches after writes.
 *
 * @param array $option_names Option names to clear.
 * @return void
 */
function aime_clear_settings_cache( array $option_names = array() ): void {
	$option_names = array_values( array_unique( array_filter( array_merge(
		$option_names,
		array( 'aime_settings' )
	) ) ) );

	foreach ( $option_names as $option_name ) {
		wp_cache_delete( $option_name, 'options' );
	}

	wp_cache_delete( 'alloptions', 'options' );

	if ( has_action( 'litespeed_purge_all' ) ) {
		do_action( 'litespeed_purge_all' );
	}

	if ( function_exists( 'rocket_clean_domain' ) ) {
		rocket_clean_domain();
	}

	if ( function_exists( 'w3tc_flush_all' ) ) {
		w3tc_flush_all();
	}

	if ( function_exists( 'wp_cache_clear_cache' ) ) {
		wp_cache_clear_cache();
	}

	if ( function_exists( 'sg_cachepress_purge_cache' ) ) {
		sg_cachepress_purge_cache();
	}

	if ( class_exists( 'autoptimizeCache' ) && is_callable( array( 'autoptimizeCache', 'clearall' ) ) ) {
		autoptimizeCache::clearall();
	}
}

/**
 * Get the plugin's REST API namespace.
 *
 * @return string
 */
function aime_rest_namespace(): string {
	return 'aime/v1';
}

/**
 * Log a message to the plugin log table.
 *
 * @param string $message  Log message.
 * @param string $level    Log level (info, warning, error).
 * @param string $module   Module ID.
 * @param array  $context  Additional context.
 */
function aime_log( string $message, string $level = 'info', string $module = 'core', array $context = array() ): void {
	global $wpdb;

	$table = $wpdb->prefix . 'aime_log';

	// Check if table exists before logging.
	if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
		// Fallback to error_log.
		error_log( sprintf( '[AIME][%s][%s] %s', strtoupper( $level ), $module, $message ) );
		return;
	}

	$wpdb->insert(
		$table,
		array(
			'module_id'  => sanitize_key( $module ),
			'level'      => sanitize_key( $level ),
			'message'    => sanitize_text_field( $message ),
			'context'    => wp_json_encode( $context ),
			'created_at' => current_time( 'mysql', true ),
		),
		array( '%s', '%s', '%s', '%s', '%s' )
	);

	// Cleanup: 1% chance per insert to prune old/excess logs.
	if ( wp_rand( 1, 100 ) === 1 ) {
		// Remove entries older than 30 days.
		$wpdb->query(
			$wpdb->prepare(
				'DELETE FROM %i WHERE created_at < %s',
				$table,
				gmdate( 'Y-m-d H:i:s', time() - ( 30 * DAY_IN_SECONDS ) )
			)
		);

		// Keep max 50 entries — delete oldest beyond limit.
		$count = (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i', $table ) );
		if ( $count > 50 ) {
			$wpdb->query(
				$wpdb->prepare(
					'DELETE FROM %i WHERE id NOT IN ( SELECT id FROM ( SELECT id FROM %i ORDER BY created_at DESC LIMIT %d ) AS keep_rows )',
					$table,
					$table,
					50
				)
			);
		}
	}
}

/**
 * Get free plan limits.
 *
 * @return array
 */
function aime_free_limits(): array {
	return apply_filters( 'aime_free_limits', array(
		'email_subscribers'          => \AIME_FREE_SUBSCRIBER_LIMIT,
		'email_lists'                => 10,
		'email_templates'            => 3,
		'email_template_imports_free' => 4,
		'email_scheduled_campaigns'  => 3,
		'email_smtp_connections'     => 2,
		'ai_provider_connections'     => 2,
		'csv_import_rows'            => 100,
		'campaigns_per_month'        => 30,
		'content_articles_per_month' => 20,
		'content_max_words'          => 2000,
		'content_presets'            => 4,
		'content_scheduled_posts'    => 3,
		// Chatbot.
		'chatbot_bots'                    => 1,
		'chatbot_conversations_monthly'   => 100,
		'chatbot_knowledge_qa'            => 50,
		'chatbot_knowledge_pages'         => 50,
		'chatbot_themes'                  => 3,
		'chatbot_history_days'            => 7,
		// Social Media.
		'social_accounts'                 => 2,
		'social_posts_per_month'          => 30,
		'social_scheduled_posts'          => 3,
		'social_ai_captions'              => 30,
		// SEO.
		'seo_keyword_research_monthly'    => 10,
		'seo_keywords_saved'              => 50,
		'seo_audits_monthly'              => 5,
		'seo_rank_keywords'               => 5,
	) );
}

/**
 * Check if a free limit has been reached.
 *
 * @param string $limit_key Limit key.
 * @param int    $current   Current count.
 * @return bool True if limit reached.
 */
function aime_limit_reached( string $limit_key, int $current ): bool {
	if ( aime_has_pro() ) {
		return false;
	}

	$limits = aime_free_limits();
	$limit  = $limits[ $limit_key ] ?? PHP_INT_MAX;

	return $current >= $limit;
}

/**
 * Sanitize and validate an email address.
 *
 * @param string $email Email address.
 * @return string|false Sanitized email or false.
 */
function aime_sanitize_email( string $email ) {
	$email = sanitize_email( $email );
	return is_email( $email ) ? $email : false;
}

/**
 * Get plugin asset URL.
 *
 * @param string $path Relative path to asset.
 * @return string Full URL.
 */
function aime_asset_url( string $path ): string {
	return AIME_PLUGIN_URL . ltrim( $path, '/' );
}

/**
 * Get the asset version, cache-busted on every dev-mode page load.
 *
 * @param string|null $version Production asset version.
 * @return string
 */
function aime_asset_version( ?string $version = null ): string {
	if ( defined( 'AIME_DEV_MODE' ) && AIME_DEV_MODE ) {
		return (string) time();
	}

	return $version ?: AIME_VERSION;
}

/**
 * Get current user's display name for emails.
 *
 * @return string
 */
function aime_get_sender_name(): string {
	$name = aime_get_option( 'from_name' );
	if ( $name ) {
		return $name;
	}
	return get_bloginfo( 'name' );
}

/**
 * Get sender email address.
 *
 * @return string
 */
function aime_get_sender_email(): string {
	$email = aime_get_option( 'from_email' );
	if ( $email ) {
		return $email;
	}
	return get_option( 'admin_email' );
}
/**
 * Parse a JSON response from an AI model.
 *
 * Handles thinking/reasoning models that inject chain-of-thought text
 * before, after, or even inside JSON output.
 *
 * Stages:
 *  1. Direct json_decode.
 *  2. Extract from fenced code block.
 *  3. Brace-matching to isolate { … } or [ … ] structures.
 *  3b. Repair: strip thinking prefix injected inside a JSON object.
 *  4. Fix unescaped newlines inside JSON string values.
 *
 * @param string $raw The raw AI response text.
 * @return array|null Parsed array or null on failure.
 */

/**
 * Strip chain-of-thought / reasoning text that some AI models prepend
 * before the actual JSON output.
 *
 * Finds the first plausible JSON start ( { or [ ) and strips everything
 * before it when the leading text looks like natural-language reasoning.
 *
 * @param string $raw Raw AI response.
 * @return string Cleaned text.
 */
function aime_strip_thinking_text( string $raw ): string {
	$raw = trim( $raw );

	if ( '' === $raw ) {
		return $raw;
	}

	// Strip <think>…</think> blocks (DeepSeek, Qwen, and other open models).
	$raw = preg_replace( '/<think>[\s\S]*?<\/think>\s*/i', '', $raw );
	$raw = trim( $raw );

	if ( '' === $raw ) {
		return $raw;
	}

	// Already starts with JSON — nothing to strip.
	$first_char = $raw[0];
	if ( '{' === $first_char || '[' === $first_char ) {
		return $raw;
	}

	// Find the first { or [ that might start JSON.
	$brace   = strpos( $raw, '{' );
	$bracket = strpos( $raw, '[' );

	$json_start = false;
	if ( false !== $brace && false !== $bracket ) {
		$json_start = min( $brace, $bracket );
	} elseif ( false !== $brace ) {
		$json_start = $brace;
	} elseif ( false !== $bracket ) {
		$json_start = $bracket;
	}

	if ( false === $json_start || $json_start < 1 ) {
		return $raw;
	}

	// Only strip if the prefix looks like natural language (contains words).
	$prefix = substr( $raw, 0, $json_start );
	if ( preg_match( '/[a-zA-Z]{3,}/', $prefix ) ) {
		return substr( $raw, $json_start );
	}

	return $raw;
}

function aime_parse_ai_json( string $raw ): ?array {
	$raw = trim( $raw );

	// Stage 0 — Strip thinking / reasoning prefix text.
	// Many models output chain-of-thought reasoning before JSON.
	// Remove everything before the first plausible JSON start.
	$raw = aime_strip_thinking_text( $raw );

	// Stage 1 — Direct decode.
	$decoded = json_decode( $raw, true );
	if ( json_last_error() === JSON_ERROR_NONE && is_array( $decoded ) ) {
		return $decoded;
	}

	// Stage 2 — Extract from fenced code block.
	if ( preg_match( '/```(?:json)?\s*([\s\S]*?)```/', $raw, $m ) ) {
		$decoded = json_decode( trim( $m[1] ), true );
		if ( json_last_error() === JSON_ERROR_NONE && is_array( $decoded ) ) {
			return $decoded;
		}
	}

	// Stage 3 — Brace / bracket matching.
	$openers = array(
		array( '{', '}' ),
		array( '[', ']' ),
	);

	foreach ( $openers as list( $open, $close ) ) {
		$start = strpos( $raw, $open );

		while ( $start !== false ) {
			$depth     = 0;
			$in_string = false;
			$escape    = false;
			$len       = strlen( $raw );

			for ( $i = $start; $i < $len; $i++ ) {
				$ch = $raw[ $i ];

				if ( $escape ) {
					$escape = false;
					continue;
				}
				if ( '\\' === $ch && $in_string ) {
					$escape = true;
					continue;
				}
				if ( '"' === $ch ) {
					$in_string = ! $in_string;
					continue;
				}
				if ( $in_string ) {
					continue;
				}

				if ( $ch === $open ) {
					$depth++;
				} elseif ( $ch === $close ) {
					$depth--;
					if ( 0 === $depth ) {
						$candidate = substr( $raw, $start, $i - $start + 1 );
						$decoded   = json_decode( $candidate, true );
						if ( json_last_error() === JSON_ERROR_NONE && is_array( $decoded ) ) {
							return $decoded;
						}

						// Stage 3b — Repair: thinking models may inject reasoning
						// text inside the JSON object before actual key-value pairs.
						// Find each valid-looking JSON key and try building JSON from there.
						if ( '{' === $open && preg_match_all( '/"([a-z_][a-z0-9_]{0,30})"\s*:/i', $candidate, $keys, PREG_OFFSET_CAPTURE ) ) {
							foreach ( $keys[0] as $km ) {
								$repair_pos = $km[1];
								if ( $repair_pos <= 1 ) {
									continue; // Already tried the full candidate.
								}
								$repaired = '{ ' . substr( $candidate, $repair_pos );
								$decoded  = json_decode( $repaired, true );
								if ( json_last_error() === JSON_ERROR_NONE && is_array( $decoded ) ) {
									return $decoded;
								}
							}
						}

						break;
					}
				}
			}

			$start = strpos( $raw, $open, $start + 1 );
		}
	}

	// Stage 4 — Fix unescaped newlines inside JSON string values.
	if ( preg_match( '/[\[{][\s\S]*[\]}]/', $raw, $m ) ) {
		$fixed = preg_replace_callback(
			'/"((?:[^"\\\\]|\\\\.)*?)"/',
			function ( $match ) {
				$inner = $match[1];
				$inner = str_replace(
					array( "\r\n", "\r", "\n", "\t" ),
					array( '\\n', '\\n', '\\n', '\\t' ),
					$inner
				);
				return '"' . $inner . '"';
			},
			$m[0]
		);

		if ( $fixed ) {
			$decoded = json_decode( $fixed, true );
			if ( json_last_error() === JSON_ERROR_NONE && is_array( $decoded ) ) {
				return $decoded;
			}
		}
	}

	return null;
}