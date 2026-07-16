<?php
/**
 * Ad Copy action — AI ad-copy variations saved as a draft article.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions
 */

// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions;

use WPSpace\AiMarketingExpert\AiProvider;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdCopyAction extends BaseAction {

	public static function run( array $config, array $context ): array {
		$product = self::rotated_topic( $config, $context, 'product', 'products' );
		if ( '' === $product ) {
			return self::fail( __( 'No product/offer provided for ad copy.', 'ai-marketing-expert' ) );
		}
		$tone       = self::tone( $context );
		$variations = max( 1, min( 10, (int) ( $config['variations'] ?? 3 ) ) );

		$prompt = sprintf(
			"Write %d distinct advertising copy variations for: \"%s\".\nTone: %s.\n" .
			"Each variation: a punchy headline and 1-2 sentence body. Return valid HTML: an <ol> with one <li> per variation (headline in <strong>). Return ONLY the HTML.",
			$variations,
			$product,
			$tone
		);
		$result = AiProvider::generate( $prompt, 'text', 1500 );
		if ( empty( $result['success'] ) ) {
			return self::fail( $result['message'] ?? __( 'Ad copy generation failed.', 'ai-marketing-expert' ) );
		}

		// Model was asked for pure HTML — strip any reasoning prefix before saving.
		$body  = trim( aime_strip_thinking_from_html( (string) $result['content'] ) );
		if ( '' === $body ) {
			return self::fail( __( 'AI returned an empty response.', 'ai-marketing-expert' ) );
		}
		/* translators: %s: product or service name. */
		$title = sprintf( __( 'Ad Copy: %s', 'ai-marketing-expert' ), wp_trim_words( $product, 8, '' ) );

		$article_id = self::save_article( array(
			'title'   => sanitize_text_field( $title ),
			'slug'    => sanitize_title( $title ),
			'content' => wp_kses_post( $body ),
			'topic'   => $product,
			'tone'    => $tone,
		), $result );

		if ( ! $article_id ) {
			return self::fail( __( 'Ad copy generated but could not be saved.', 'ai-marketing-expert' ) );
		}

		return self::ok(
			sprintf( /* translators: %d: count */ __( 'Generated %d ad-copy variations (saved as draft).', 'ai-marketing-expert' ), $variations ),
			array( 'article_id' => $article_id, 'link' => self::module_link( 'content' ) )
		);
	}
}
