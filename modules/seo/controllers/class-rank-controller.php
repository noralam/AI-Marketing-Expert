<?php
/**
 * SEO Module — Rank Controller (Rank tracking history + manual/bulk checks).
 *
 * @package WPSpace\AiMarketingExpert\Modules\Seo\Controllers
 */

namespace WPSpace\AiMarketingExpert\Modules\Seo\Controllers;

use WPSpace\AiMarketingExpert\Modules\Seo\SeoModule;
use WPSpace\AiMarketingExpert\Modules\Seo\Services\RankTrackerService;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class RankController {

	/**
	 * Rank history for a keyword or all keywords.
	 */
	public function history( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$p = $wpdb->prefix;

		$keyword_id = absint( $request->get_param( 'keyword_id' ) );
		$days       = min( 365, max( 7, absint( $request->get_param( 'days' ) ?: 30 ) ) );
		$since      = gmdate( 'Y-m-d H:i:s', strtotime( "-{$days} days" ) );

		if ( $keyword_id ) {
			$history = $wpdb->get_results( $wpdb->prepare(
				"SELECT h.*, k.keyword FROM {$p}aime_seo_rank_history h JOIN {$p}aime_seo_keywords k ON h.keyword_id = k.id WHERE h.keyword_id = %d AND h.checked_at >= %s ORDER BY h.checked_at ASC",
				$keyword_id,
				$since
			) );
		} else {
			// Latest rank for each tracked keyword.
			$history = $wpdb->get_results( $wpdb->prepare(
				"SELECT h.*, k.keyword FROM {$p}aime_seo_rank_history h JOIN {$p}aime_seo_keywords k ON h.keyword_id = k.id WHERE h.checked_at >= %s ORDER BY h.checked_at DESC LIMIT 200",
				$since
			) );
		}

		// Also return summary of tracked keywords.
		$tracked = $wpdb->get_results(
			"SELECT k.id, k.keyword, k.current_rank, k.target_url,
				(SELECT h2.rank_position FROM {$p}aime_seo_rank_history h2 WHERE h2.keyword_id = k.id ORDER BY h2.checked_at DESC LIMIT 1) as latest_rank,
				(SELECT h3.checked_at FROM {$p}aime_seo_rank_history h3 WHERE h3.keyword_id = k.id ORDER BY h3.checked_at DESC LIMIT 1) as last_checked
			FROM {$p}aime_seo_keywords k WHERE k.current_rank IS NOT NULL OR k.status = 'targeted' ORDER BY k.keyword ASC"
		);

		return new \WP_REST_Response( array(
			'history' => $history,
			'tracked' => $tracked,
		) );
	}

	/**
	 * Manual rank check for a single keyword.
	 */
	public function manual_check( \WP_REST_Request $request ): \WP_REST_Response {
		$keyword_id = absint( $request->get_param( 'keyword_id' ) );
		$settings   = get_option( 'aime_seo_settings', array() );
		$engine     = sanitize_key( $request->get_param( 'search_engine' ) ?: ( $settings['rank_check_engine'] ?? 'google' ) );

		if ( ! $keyword_id ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'Keyword ID is required.', 'ai-marketing-expert' ),
			), 400 );
		}

		$service = new RankTrackerService();
		$result  = $service->check_rank( $keyword_id, $engine );

		return new \WP_REST_Response( $result, $result['success'] ? 200 : 500 );
	}

	/**
	 * Bulk rank check.
	 */
	public function bulk_check( \WP_REST_Request $request ): \WP_REST_Response {
		$keyword_ids = $request->get_param( 'keyword_ids' );
		if ( empty( $keyword_ids ) || ! is_array( $keyword_ids ) ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'Keyword IDs array is required.', 'ai-marketing-expert' ),
			), 400 );
		}

		$keyword_ids = array_map( 'absint', $keyword_ids );
		$settings    = get_option( 'aime_seo_settings', array() );
		$engine      = sanitize_key( $request->get_param( 'search_engine' ) ?: ( $settings['rank_check_engine'] ?? 'google' ) );
		$service     = new RankTrackerService();
		$results     = array();

		foreach ( $keyword_ids as $kid ) {
			$results[] = $service->check_rank( $kid, $engine );
		}

		return new \WP_REST_Response( array(
			'success' => true,
			'results' => $results,
		) );
	}
}
