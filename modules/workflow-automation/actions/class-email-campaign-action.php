<?php
/**
 * Email Campaign action — AI subject + body saved as a DRAFT campaign row.
 *
 * Deliberately creates a review-ready draft (status = 'draft'); it never sends.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions
 */

// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions;

use WPSpace\AiMarketingExpert\AiProvider;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class EmailCampaignAction extends BaseAction {

	public static function run( array $config, array $context ): array {
		global $wpdb;
		$p = $wpdb->prefix;

		$topic = self::rotated_topic( $config, $context );
		if ( '' === $topic ) {
			return self::fail( __( 'No topic provided for the email campaign.', 'ai-marketing-expert' ) );
		}
		$tone  = self::tone( $context );
		$title = sanitize_text_field( (string) ( $config['title'] ?? '' ) );
		if ( '' === $title ) {
			/* translators: %s: email campaign topic. */
			$title = sprintf( __( 'Draft: %s', 'ai-marketing-expert' ), wp_trim_words( $topic, 8, '' ) );
		}

		$prompt = sprintf(
			"Write a marketing email about: \"%s\".\nTone: %s.\n" .
			"Return a JSON object with keys \"subject\" (max 120 chars) and \"body\" (valid HTML using p, h2, ul, li, strong tags). Return ONLY the JSON.",
			$topic,
			$tone
		);
		$result = AiProvider::generate( $prompt, 'text', 2048 );
		if ( empty( $result['success'] ) ) {
			return self::fail( $result['message'] ?? __( 'Email generation failed.', 'ai-marketing-expert' ) );
		}

		// Shared parser handles think blocks, code fences, and reasoning
		// prefixes; hand-rolled fence-stripping missed leaked thinking text.
		$parsed  = aime_parse_ai_json( (string) $result['content'] );
		$subject = is_array( $parsed ) ? (string) ( $parsed['subject'] ?? '' ) : '';
		$body    = is_array( $parsed ) ? (string) ( $parsed['body'] ?? '' ) : trim( aime_strip_thinking_from_html( (string) $result['content'] ) );
		if ( '' === $body ) {
			return self::fail( __( 'AI returned an empty response.', 'ai-marketing-expert' ) );
		}
		if ( '' === $subject ) {
			$subject = wp_trim_words( $topic, 10, '' );
		}

		$now = current_time( 'mysql', true );
		$ok  = $wpdb->insert( "{$p}aime_campaigns", array(
			'type'         => 'campaign',
			'title'        => $title,
			'slug'         => sanitize_title( $title ) . '-' . wp_generate_password( 5, false ),
			'status'       => 'draft',
			'email_subject' => sanitize_text_field( $subject ),
			'email_body'   => wp_kses_post( $body ),
			'design_template' => 'simple',
			'created_by'   => get_current_user_id() ?: null,
			'created_at'   => $now,
			'updated_at'   => $now,
		) );

		if ( ! $ok ) {
			return self::fail( __( 'Campaign draft could not be saved.', 'ai-marketing-expert' ) );
		}

		$campaign_id = (int) $wpdb->insert_id;
		$preview     = sprintf( /* translators: %s: subject */ __( 'Draft campaign created — subject: %s', 'ai-marketing-expert' ), $subject );

		return self::ok( $preview, array( 'campaign_id' => $campaign_id, 'link' => self::module_link( 'email' ) ) );
	}
}
