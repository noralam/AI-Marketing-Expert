<?php
/**
 * SEO Audit action — run an on-page audit for a post/URL.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions
 */

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions;

use WPSpace\AiMarketingExpert\Modules\Seo\Services\OnPageSeoService;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SeoAuditAction extends BaseAction {

	public static function run( array $config, array $context ): array {
		$post_id = (int) ( $config['wp_post_id'] ?? 0 );
		$url     = esc_url_raw( (string) ( $config['url'] ?? '' ) );
		$keyword = sanitize_text_field( (string) ( $config['keyword_focus'] ?? '' ) );

		// 0 = audit the most recently published post.
		if ( ! $post_id && '' === $url ) {
			$latest = get_posts( array(
				'numberposts' => 1,
				'post_status' => 'publish',
				'post_type'   => 'post',
				'fields'      => 'ids',
			) );
			if ( empty( $latest ) ) {
				return self::fail( __( 'No published post found to audit.', 'ai-marketing-expert' ) );
			}
			$post_id = (int) $latest[0];
		}

		$service = new OnPageSeoService();
		$result  = $service->run_audit( $post_id, $url, $keyword );

		if ( empty( $result['success'] ) ) {
			return self::fail( $result['message'] ?? __( 'SEO audit failed.', 'ai-marketing-expert' ) );
		}

		$score   = isset( $result['overall_score'] ) ? (int) $result['overall_score'] : (int) ( $result['score'] ?? 0 );
		$preview = sprintf(
			/* translators: 1: post id, 2: score */
			__( 'SEO audit complete for post #%1$d — score: %2$d/100.', 'ai-marketing-expert' ),
			$post_id,
			$score
		);

		$reference = array( 'wp_post_id' => $post_id, 'score' => $score, 'link' => self::module_link( 'seo' ) );
		if ( ! empty( $result['audit_id'] ) ) {
			$reference['audit_id'] = (int) $result['audit_id'];
		}

		return self::ok( $preview, $reference );
	}
}
