<?php
/**
 * SEO Module — Automation Controller.
 *
 * REST endpoints for managing SEO automation settings and viewing logs.
 *
 * @package WPSpace\AiMarketingExpert\Modules\Seo\Controllers
 */

namespace WPSpace\AiMarketingExpert\Modules\Seo\Controllers;

use WPSpace\AiMarketingExpert\Modules\Seo\Services\AutomationService;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AutomationController {

	/**
	 * Get automation settings.
	 */
	public function get_settings( \WP_REST_Request $request ): \WP_REST_Response {
		$service  = new AutomationService();
		$settings = $service->get_settings();

		return new \WP_REST_Response( array(
			'success' => true,
			'data'    => $settings,
			'is_pro'  => aime_has_pro(),
		) );
	}

	/**
	 * Save automation settings (Pro only).
	 */
	public function save_settings( \WP_REST_Request $request ): \WP_REST_Response {
		if ( ! aime_has_pro() ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'SEO Automation requires Pro.', 'ai-marketing-expert' ),
			), 403 );
		}

		$service  = new AutomationService();
		$settings = $service->save_settings( $request->get_params() );

		return new \WP_REST_Response( array(
			'success' => true,
			'data'    => $settings,
		) );
	}

	/**
	 * Get automation log entries.
	 */
	public function get_log( \WP_REST_Request $request ): \WP_REST_Response {
		$service   = new AutomationService();
		$page      = absint( $request->get_param( 'page' ) ) ?: 1;
		$per_page  = absint( $request->get_param( 'per_page' ) ) ?: 20;
		$task_type = sanitize_key( $request->get_param( 'task_type' ) ?? '' );

		$result = $service->get_log( $page, $per_page, $task_type );

		return new \WP_REST_Response( $result );
	}

	/**
	 * Get stored internal link suggestions.
	 */
	public function get_internal_link_suggestions( \WP_REST_Request $request ): \WP_REST_Response {
		$service = new AutomationService();
		$status  = sanitize_key( $request->get_param( 'status' ) ?? 'pending' );

		return new \WP_REST_Response( $service->get_internal_link_suggestions( $status ) );
	}

	/**
	 * Dismiss a stored internal link suggestion.
	 */
	public function dismiss_internal_link_suggestion( \WP_REST_Request $request ): \WP_REST_Response {
		if ( ! aime_has_pro() ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'SEO Automation requires Pro.', 'ai-marketing-expert' ),
			), 403 );
		}

		$service       = new AutomationService();
		$post_id       = absint( $request->get_param( 'post_id' ) );
		$suggestion_id = sanitize_key( $request->get_param( 'suggestion_id' ) ?? '' );
		$result        = $service->dismiss_internal_link_suggestion( $post_id, $suggestion_id );

		if ( is_wp_error( $result ) ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => $result->get_error_message(),
			), $result->get_error_data()['status'] ?? 400 );
		}

		return new \WP_REST_Response( array_merge( $result, array(
			'message' => __( 'Suggestion dismissed.', 'ai-marketing-expert' ),
		) ) );
	}

	/**
	 * Apply a stored internal link suggestion to post content.
	 */
	public function apply_internal_link_suggestion( \WP_REST_Request $request ): \WP_REST_Response {
		if ( ! aime_has_pro() ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'SEO Automation requires Pro.', 'ai-marketing-expert' ),
			), 403 );
		}

		$service       = new AutomationService();
		$post_id       = absint( $request->get_param( 'post_id' ) );
		$suggestion_id = sanitize_key( $request->get_param( 'suggestion_id' ) ?? '' );
		$result        = $service->apply_internal_link_suggestion( $post_id, $suggestion_id );

		if ( is_wp_error( $result ) ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => $result->get_error_message(),
			), $result->get_error_data()['status'] ?? 400 );
		}

		return new \WP_REST_Response( $result );
	}

	/**
	 * Clear automation log (Pro only).
	 */
	public function clear_log( \WP_REST_Request $request ): \WP_REST_Response {
		if ( ! aime_has_pro() ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'SEO Automation requires Pro.', 'ai-marketing-expert' ),
			), 403 );
		}

		$service = new AutomationService();
		$service->clear_log();

		return new \WP_REST_Response( array(
			'success' => true,
			'message' => __( 'Automation log cleared.', 'ai-marketing-expert' ),
		) );
	}

	/**
	 * Manually trigger an automation task (Pro only).
	 */
	public function run_task( \WP_REST_Request $request ): \WP_REST_Response {
		if ( ! aime_has_pro() ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'SEO Automation requires Pro.', 'ai-marketing-expert' ),
			), 403 );
		}

		$task = sanitize_key( $request->get_param( 'task' ) ?? '' );

		if ( ! $task ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'Task type is required.', 'ai-marketing-expert' ),
			), 400 );
		}

		$service = new AutomationService();

		switch ( $task ) {
			case 'internal_links':
				$service->process_scheduled_tasks( true );
				return new \WP_REST_Response( array(
					'success' => true,
					'message' => __( 'Internal link scan started.', 'ai-marketing-expert' ),
				) );

			default:
				return new \WP_REST_Response( array(
					'success' => false,
					'message' => __( 'Unknown task type.', 'ai-marketing-expert' ),
				), 400 );
		}
	}
}
