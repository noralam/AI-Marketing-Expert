<?php
/**
 * Blog Post action — generate a full article and save it to the content module,
 * optionally publishing it.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions
 */

// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions;

use WPSpace\AiMarketingExpert\Modules\ContentGenerator\Services\ContentGeneratorService;
use WPSpace\AiMarketingExpert\Modules\ContentGenerator\Services\PublisherService;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BlogPostAction extends BaseAction {

	/**
	 * @param array $config  Step config.
	 * @param array $context Workflow context.
	 * @return array
	 */
	public static function run( array $config, array $context ): array {
		// Topic rotation (Pro): a topics list overrides the single topic —
		// each run picks a different one so scheduled posts stay varied.
		$topic = self::rotated_topic( $config, $context );
		if ( '' === $topic ) {
			return self::fail( __( 'No topic provided for blog post generation.', 'ai-marketing-expert' ) );
		}

		// Keywords: tokens field sends an array; legacy configs stored a comma string.
		$raw_keywords = $config['keywords'] ?? '';
		$keywords     = is_array( $raw_keywords )
			? array_values( array_filter( array_map( 'trim', array_map( 'strval', $raw_keywords ) ) ) )
			: array_values( array_filter( array_map( 'trim', explode( ',', (string) $raw_keywords ) ) ) );
		$tone     = self::tone( $context );
		$words    = max( 300, (int) ( $config['word_count'] ?? 1000 ) );
		$language = sanitize_text_field( (string) ( $config['language'] ?? 'en' ) );
		$language = '' !== $language ? $language : 'en';

		// Free tier: cap word count using the shared content limit.
		if ( ! aime_has_pro() ) {
			$limits = aime_free_limits();
			$words  = min( $words, (int) ( $limits['content_max_words'] ?? 2000 ) );
		}

		// Brand voice (Pro): resolve the workflow's voice into system instructions,
		// mirroring GenerateController's preset pattern.
		$preset          = null;
		$brand_voice_id  = aime_has_pro() ? (int) ( $context['brand_voice_id'] ?? 0 ) : 0;
		$voice_controller = '\\WPSpace\\AiMarketingExpert\\Modules\\ContentGenerator\\Controllers\\WorkflowController';
		if ( aime_has_pro() && class_exists( $voice_controller ) ) {
			$voice_prompt = (string) $voice_controller::get_brand_voice_prompt( $brand_voice_id );
			if ( '' !== $voice_prompt ) {
				$preset = (object) array(
					'prompt_template'     => '',
					'system_instructions' => $voice_prompt,
				);
			}
		}

		$service = new ContentGeneratorService();

		// In-body stock images: only ask the AI for placeholders when the
		// stock provider is actually configured (fail-soft otherwise).
		$inline_images = min( 3, absint( $config['inline_images'] ?? 0 ) );
		$stock_class   = '\\WPSpace\\AiMarketingExpert\\Modules\\ContentGenerator\\Services\\StockImageService';
		if ( $inline_images > 0 && ( ! class_exists( $stock_class ) || ! $stock_class::is_configured() ) ) {
			$inline_images = 0;
		}

		$result = $service->generate_article( $topic, $keywords, $tone, $words, $language, '', $preset, false, $inline_images );

		if ( empty( $result['success'] ) ) {
			return self::fail( $result['error'] ?? __( 'Article generation failed.', 'ai-marketing-expert' ) );
		}

		$parsed  = $result['parsed'] ?? array();
		$title   = $parsed['title'] ?? $topic;
		$body    = $parsed['body'] ?? ( $result['content'] ?? '' );
		$excerpt = $parsed['excerpt'] ?? '';

		// Swap AI image placeholders for stock photos (fail-soft; also strips
		// leftover placeholders when the feature is off or unconfigured).
		if ( class_exists( $stock_class ) ) {
			try {
				$body = ( new $stock_class() )->embed_inline_images( (string) $body, $inline_images, $topic );
			} catch ( \Throwable $e ) {
				aime_log( 'Workflow blog post: inline images failed: ' . $e->getMessage(), 'warning', 'workflow-automation' );
			}
		}

		// Category: step config, else the site default category.
		$category_id = (int) ( $config['category_id'] ?? 0 );
		if ( $category_id > 0 && ! term_exists( $category_id, 'category' ) ) {
			$category_id = 0;
		}
		if ( 0 === $category_id ) {
			$category_id = (int) get_option( 'default_category', 0 );
		}

		// Tags: fixed step tags + AI-suggested tags (both are name strings).
		$fixed_tags = $config['tags'] ?? array();
		$fixed_tags = is_array( $fixed_tags )
			? $fixed_tags
			: array_filter( array_map( 'trim', explode( ',', (string) $fixed_tags ) ) );
		$ai_tags    = array();
		if ( ! empty( $config['auto_tags'] ) || ! isset( $config['auto_tags'] ) ) {
			$ai_tags = is_array( $parsed['tags'] ?? null ) ? $parsed['tags'] : array();
		}
		$tags = array();
		foreach ( array_merge( $fixed_tags, $ai_tags ) as $tag ) {
			$tag = sanitize_text_field( (string) $tag );
			if ( '' !== $tag && ! in_array( $tag, $tags, true ) ) {
				$tags[] = $tag;
			}
		}
		$tags = array_slice( $tags, 0, 10 );

		// Author: step config, else the workflow creator (cron runs have no
		// logged-in user, which would otherwise leave the post authorless).
		$author_id = (int) ( $config['author_id'] ?? 0 );
		if ( $author_id <= 0 ) {
			$author_id = (int) ( $context['created_by'] ?? 0 );
		}
		if ( $author_id > 0 && ! get_userdata( $author_id ) ) {
			$author_id = 0;
		}

		// Featured image (fail-soft: image trouble never fails the post).
		$featured = self::resolve_featured_image( $config, $parsed, $topic, (string) $title, (string) $body );

		// Persist the article row via the shared helper (mirrors GenerateController's insert shape).
		$article_fields = array(
			'title'             => sanitize_text_field( $title ),
			'slug'              => sanitize_title( $title ),
			'content'           => wp_kses_post( $body ),
			'excerpt'           => sanitize_textarea_field( $excerpt ),
			'status'            => 'ready',
			'topic'             => $topic,
			'keywords'          => wp_json_encode( array_values( $keywords ) ),
			'tone'              => $tone,
			'language'          => $language,
			'word_count_target' => $words,
			'actual_word_count' => str_word_count( wp_strip_all_tags( $body ) ),
			'outline'           => wp_json_encode( $result['parsed']['outline'] ?? array() ),
			'category_ids'      => wp_json_encode( $category_id > 0 ? array( $category_id ) : array() ),
			'tag_ids'           => wp_json_encode( $tags ),
		);
		if ( ! empty( $featured['attachment_id'] ) ) {
			$article_fields['featured_image_id'] = (int) $featured['attachment_id'];
		}
		if ( ! empty( $featured['url'] ) ) {
			$article_fields['featured_image_url'] = (string) $featured['url'];
		}
		$article_id = self::save_article( $article_fields, $result );
		if ( ! $article_id ) {
			return self::fail( __( 'Article generated but could not be saved.', 'ai-marketing-expert' ) );
		}

		$reference = array(
			'article_id' => $article_id,
			'link'       => self::module_link( 'content' ),
		);
		$preview   = sprintf( /* translators: %s: article title */ __( 'Generated article: %s', 'ai-marketing-expert' ), $title );

		// Optionally publish.
		if ( ! empty( $config['publish'] ) ) {
			$publisher = new PublisherService();
			$pub       = $publisher->publish( $article_id, 'publish', '', $author_id );
			if ( ! empty( $pub['success'] ) ) {
				$reference['wp_post_id'] = (int) $pub['wp_post_id'];
				$reference['edit_url']   = $pub['edit_url'] ?? '';
				if ( ! empty( $pub['edit_url'] ) ) {
					$reference['link'] = (string) $pub['edit_url'];
				}
				$preview = sprintf( /* translators: %s: article title */ __( 'Published article: %s', 'ai-marketing-expert' ), $title );
			} else {
				// Non-fatal: the draft still exists.
				$preview .= ' ' . __( '(publish step failed; saved as draft)', 'ai-marketing-expert' );
			}
		}

		return self::ok( $preview, $reference );
	}

	/**
	 * Pick a featured image per step config ('none' | 'stock' | 'ai').
	 *
	 * Fail-soft by design: any API/key/network problem logs a warning and
	 * returns an empty result — the article itself must never be lost over
	 * an image.
	 *
	 * @return array{attachment_id:int, url:string}
	 */
	private static function resolve_featured_image( array $config, array $parsed, string $topic, string $title, string $body ): array {
		$none = array( 'attachment_id' => 0, 'url' => '' );
		$mode = sanitize_key( (string) ( $config['featured_image'] ?? 'none' ) );

		if ( 'stock' === $mode ) {
			try {
				$service_class = '\\WPSpace\\AiMarketingExpert\\Modules\\ContentGenerator\\Services\\StockImageService';
				if ( ! class_exists( $service_class ) ) {
					return $none;
				}
				$service = new $service_class();
				if ( ! $service_class::is_configured() ) {
					aime_log( 'Workflow blog post: stock image requested but no API key configured (Content → Settings → Images).', 'warning', 'workflow-automation' );
					return $none;
				}

				// AI supplies a purpose-built search query; fall back to the topic.
				$query = sanitize_text_field( (string) ( $parsed['image_search'] ?? '' ) );
				if ( '' === $query ) {
					$query = $topic;
				}

				$image = $service->first( $query );
				if ( ! $image ) {
					aime_log( "Workflow blog post: no stock image found for query \"{$query}\".", 'warning', 'workflow-automation' );
					return $none;
				}

				$import = $service->import_to_media_library( $image['full'], '' !== $image['alt'] ? $image['alt'] : $title );
				if ( empty( $import['success'] ) ) {
					aime_log( 'Workflow blog post: stock image import failed: ' . ( $import['error'] ?? 'unknown' ), 'warning', 'workflow-automation' );
					return $none;
				}

				return array( 'attachment_id' => (int) $import['attachment_id'], 'url' => (string) $import['url'] );
			} catch ( \Throwable $e ) {
				aime_log( 'Workflow blog post: stock image failed: ' . $e->getMessage(), 'warning', 'workflow-automation' );
				return $none;
			}
		}

		if ( 'ai' === $mode ) {
			if ( ! aime_has_pro() ) {
				aime_log( 'Workflow blog post: AI featured image requires Pro; skipping.', 'warning', 'workflow-automation' );
				return $none;
			}
			try {
				// Mirror GenerateController's prompt builder.
				$stripped = mb_substr( wp_strip_all_tags( $body ), 0, 500 );
				$prompt   = "Create a professional, high-quality featured blog image for an article titled: \"{$title}\". ";
				if ( $stripped ) {
					$prompt .= "The article is about: {$stripped}. ";
				}
				$prompt .= 'The image should be visually striking, relevant to the topic, suitable for a blog header. '
						 . 'Style: professional, modern, clean composition. No text in the image.';

				$image = \WPSpace\AiMarketingExpert\AiProvider::generate_image( $prompt, $title, 0 );
				if ( empty( $image['success'] ) ) {
					aime_log( 'Workflow blog post: AI image generation failed: ' . ( $image['message'] ?? 'unknown' ), 'warning', 'workflow-automation' );
					return $none;
				}

				return array(
					'attachment_id' => (int) ( $image['attachment_id'] ?? 0 ),
					'url'           => (string) ( $image['image_url'] ?? '' ),
				);
			} catch ( \Throwable $e ) {
				aime_log( 'Workflow blog post: AI image generation failed: ' . $e->getMessage(), 'warning', 'workflow-automation' );
				return $none;
			}
		}

		return $none;
	}
}
