<?php
/**
 * Base action — shared helpers for workflow action handlers.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions
 */

// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class BaseAction {

	/**
	 * Standard success result.
	 */
	protected static function ok( string $preview, array $reference = array() ): array {
		return array(
			'success'   => true,
			'preview'   => $preview,
			'reference' => $reference,
			'error'     => '',
		);
	}

	/**
	 * Standard failure result.
	 */
	protected static function fail( string $error ): array {
		return array(
			'success'   => false,
			'preview'   => '',
			'reference' => array(),
			'error'     => $error,
		);
	}

	/**
	 * Resolve the effective topic: step config topic, else workflow context topic.
	 */
	protected static function topic( array $config, array $context, string $key = 'topic' ): string {
		$topic = trim( (string) ( $config[ $key ] ?? '' ) );
		if ( '' === $topic ) {
			$topic = trim( (string) ( $context['topic'] ?? '' ) );
		}
		return $topic;
	}

	/**
	 * Resolve the effective topic with Pro rotation support.
	 *
	 * A non-empty rotation list ($list_key, Pro only) overrides the single
	 * topic: each run picks a different entry via rotate_topic(). Otherwise
	 * falls back to the single-topic resolution (step config, else workflow
	 * topic) exactly as before.
	 *
	 * @param array  $config   Step config.
	 * @param array  $context  Workflow context.
	 * @param string $key      Single-value config key ('topic', 'product', …).
	 * @param string $list_key Rotation-list config key ('topics', 'products', …).
	 */
	protected static function rotated_topic( array $config, array $context, string $key = 'topic', string $list_key = 'topics' ): string {
		$list = $config[ $list_key ] ?? array();
		$list = is_array( $list )
			? $list
			: array_filter( array_map( 'trim', explode( ',', (string) $list ) ) );

		if ( $list && aime_has_pro() ) {
			$state_key = (int) ( $context['workflow_id'] ?? 0 ) . ':' . (int) ( $context['step_id'] ?? 0 );
			$rotated   = self::rotate_topic( $list, $state_key );
			if ( '' !== $rotated ) {
				return $rotated;
			}
		}

		return self::topic( $config, $context, $key );
	}

	/**
	 * Pick the next topic from a rotation list (Pro).
	 *
	 * Random-without-repeat: tracks which entries have already been used
	 * (per state key + list fingerprint, so editing the list restarts the
	 * cycle) and picks randomly among the unused ones. When every entry has
	 * been used the cycle resets, guaranteeing even coverage.
	 *
	 * @param array  $topics    Raw rotation list from step config.
	 * @param string $state_key Rotation-state scope ("workflow_id:step_id").
	 * @return string Chosen entry ('' when the list is empty).
	 */
	protected static function rotate_topic( array $topics, string $state_key ): string {
		$topics = array_values( array_unique( array_filter( array_map( 'trim', array_map( 'strval', $topics ) ), 'strlen' ) ) );
		if ( ! $topics ) {
			return '';
		}
		if ( 1 === count( $topics ) ) {
			return $topics[0];
		}

		$state = get_option( 'aime_wf_topic_rotation', array() );
		$state = is_array( $state ) ? $state : array();
		$key   = $state_key . ':' . md5( wp_json_encode( $topics ) );

		$used      = isset( $state[ $key ] ) && is_array( $state[ $key ] ) ? array_map( 'intval', $state[ $key ] ) : array();
		$remaining = array_values( array_diff( array_keys( $topics ), $used ) );
		if ( ! $remaining ) {
			$used      = array();
			$remaining = array_keys( $topics );
		}

		$pick   = $remaining[ array_rand( $remaining ) ];
		$used[] = $pick;

		// Drop stale state for this step (old topic lists) before saving.
		foreach ( array_keys( $state ) as $k ) {
			if ( 0 === strpos( (string) $k, $state_key . ':' ) && $k !== $key ) {
				unset( $state[ $k ] );
			}
		}
		$state[ $key ] = $used;
		update_option( 'aime_wf_topic_rotation', $state, false );

		return $topics[ $pick ];
	}

	protected static function tone( array $context ): string {
		$tone = trim( (string) ( $context['tone'] ?? '' ) );
		return '' !== $tone ? $tone : 'professional';
	}

	/**
	 * Deep link to a plugin module admin page (used as reference['link'] so
	 * execution history can jump straight to the produced artifact).
	 *
	 * @param string $page Module page suffix (content|email|seo|social|...).
	 */
	protected static function module_link( string $page ): string {
		return admin_url( 'admin.php?page=ai-marketing-expert-' . $page );
	}

	/**
	 * Shared insert into the content module's articles table — the single place
	 * workflow actions persist generated article drafts.
	 *
	 * @param array $fields    Column overrides (title/content/topic/...).
	 * @param array $ai_result AiProvider result (provider/model metadata).
	 * @return int Article ID (0 on failure).
	 */
	protected static function save_article( array $fields, array $ai_result = array() ): int {
		global $wpdb;
		$now = current_time( 'mysql', true );

		$defaults = array(
			'title'       => '',
			'slug'        => '',
			'content'     => '',
			'status'      => 'draft',
			'post_type'   => 'post',
			'language'    => 'en',
			'ai_provider' => $ai_result['provider'] ?? '',
			'ai_model'    => $ai_result['model'] ?? '',
			'created_at'  => $now,
			'updated_at'  => $now,
		);

		$data = array_merge( $defaults, $fields );
		if ( '' === $data['slug'] ) {
			$data['slug'] = sanitize_title( $data['title'] ) . '-' . wp_generate_password( 5, false );
		}

		$ok = $wpdb->insert( $wpdb->prefix . 'aime_content_articles', $data );
		return $ok ? (int) $wpdb->insert_id : 0;
	}
}
