<?php
/**
 * SEO Module — Research Controller (AI keyword/niche research).
 *
 * @package WPSpace\AiMarketingExpert\Modules\Seo\Controllers
 */

namespace WPSpace\AiMarketingExpert\Modules\Seo\Controllers;

use WPSpace\AiMarketingExpert\Modules\Seo\SeoModule;
use WPSpace\AiMarketingExpert\Modules\Seo\Services\KeywordResearchService;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class ResearchController {

	/**
	 * AI keyword research.
	 */
	public function keyword_research( \WP_REST_Request $request ): \WP_REST_Response {
		$seed_keyword = sanitize_text_field( $request->get_param( 'seed_keyword' ) ?? '' );
		$niche        = sanitize_text_field( $request->get_param( 'niche' ) ?? '' );
		$language     = sanitize_text_field( $request->get_param( 'language' ) ?? 'English' );
		$country      = sanitize_text_field( $request->get_param( 'country' ) ?? 'US' );

		if ( empty( $seed_keyword ) ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'Seed keyword is required.', 'ai-marketing-expert' ),
			), 400 );
		}

		$service = new KeywordResearchService();
		$result  = $service->research_keywords( $seed_keyword, $niche, $language, $country );

		if ( $result['success'] ) {
			SeoModule::increment_monthly_research();
		}

		return new \WP_REST_Response( $result, $result['success'] ? 200 : 500 );
	}

	/**
	 * AI niche analysis.
	 */
	public function niche_analysis( \WP_REST_Request $request ): \WP_REST_Response {
		$niche = sanitize_text_field( $request->get_param( 'niche' ) ?? '' );

		if ( empty( $niche ) ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'Niche is required.', 'ai-marketing-expert' ),
			), 400 );
		}

		$service = new KeywordResearchService();
		$result  = $service->niche_analysis( $niche );

		if ( $result['success'] ) {
			SeoModule::increment_monthly_feature( 'niche_analysis' );
		}

		return new \WP_REST_Response( $result, $result['success'] ? 200 : 500 );
	}

	/**
	 * AI competitor gap analysis.
	 */
	public function competitor_gap( \WP_REST_Request $request ): \WP_REST_Response {
		$my_domain         = sanitize_text_field( $request->get_param( 'my_domain' ) ?? '' );
		$competitor_domains = $request->get_param( 'competitor_domains' );

		if ( empty( $my_domain ) || empty( $competitor_domains ) ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'Your domain and at least one competitor domain are required.', 'ai-marketing-expert' ),
			), 400 );
		}

		if ( is_array( $competitor_domains ) ) {
			$competitor_domains = array_map( 'sanitize_text_field', $competitor_domains );
		} else {
			$competitor_domains = array( sanitize_text_field( $competitor_domains ) );
		}

		$service = new KeywordResearchService();
		$result  = $service->competitor_gap( $my_domain, $competitor_domains );

		if ( $result['success'] ) {
			SeoModule::increment_monthly_feature( 'competitor_gap' );
		}

		return new \WP_REST_Response( $result, $result['success'] ? 200 : 500 );
	}

	/**
	 * Generate AI content brief for a keyword.
	 */
	public function content_brief( \WP_REST_Request $request ): \WP_REST_Response {
		$keyword = sanitize_text_field( $request->get_param( 'keyword' ) ?? '' );
		$niche   = sanitize_text_field( $request->get_param( 'niche' ) ?? '' );

		if ( empty( $keyword ) ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'message' => __( 'Keyword is required.', 'ai-marketing-expert' ),
			), 400 );
		}

		$service = new KeywordResearchService();
		$result  = $service->generate_content_brief( $keyword, $niche );

		if ( $result['success'] ) {
			SeoModule::increment_monthly_feature( 'content_brief' );
		}

		return new \WP_REST_Response( $result, $result['success'] ? 200 : 500 );
	}

	/**
	 * Per-feature research usage counts and free limits.
	 */
	public function research_usage(): \WP_REST_Response {
		return new \WP_REST_Response( array(
			'success' => true,
			'usage'   => array(
				'keyword_research' => array(
					'used'  => SeoModule::get_monthly_research_count(),
					'limit' => null,
				),
				'niche_analysis' => array(
					'used'  => SeoModule::get_monthly_feature_count( 'niche_analysis' ),
					'limit' => null,
				),
				'competitor_gap' => array(
					'used'  => SeoModule::get_monthly_feature_count( 'competitor_gap' ),
					'limit' => null,
				),
				'content_brief' => array(
					'used'  => SeoModule::get_monthly_feature_count( 'content_brief' ),
					'limit' => null,
				),
			),
		) );
	}
}
