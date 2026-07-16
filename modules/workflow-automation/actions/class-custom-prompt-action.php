<?php
/**
 * Custom Prompt action — free-form AI prompt; logs the output, optionally saves
 * it as a draft article.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions
 */

// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions;

use WPSpace\AiMarketingExpert\AiProvider;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CustomPromptAction extends BaseAction {

	public static function run( array $config, array $context ): array {
		$prompt = trim( (string) ( $config['prompt'] ?? '' ) );
		if ( '' === $prompt ) {
			return self::fail( __( 'No prompt provided.', 'ai-marketing-expert' ) );
		}

		// Inject workflow topic/context so the prompt can reference it.
		$topic = (string) ( $context['topic'] ?? '' );
		if ( '' !== $topic ) {
			$prompt .= "\n\nWorkflow topic/context: " . $topic;
		}
		// Allow chaining: expose the previous step's preview.
		$prev = $context['previous'][ count( $context['previous'] ) - 1 ] ?? null;
		if ( $prev && ! empty( $prev['preview'] ) ) {
			$prompt .= "\n\nPrevious step output: " . $prev['preview'];
		}

		$result = AiProvider::generate( $prompt, 'text', 2048 );
		if ( empty( $result['success'] ) ) {
			return self::fail( $result['message'] ?? __( 'AI generation failed.', 'ai-marketing-expert' ) );
		}

		// Free-form output shown to the user — strip leaked reasoning in
		// conversational mode (no JSON-prefix truncation).
		$output = trim( aime_strip_thinking_text( (string) $result['content'], 'text' ) );
		if ( '' === $output ) {
			return self::fail( __( 'AI returned an empty response.', 'ai-marketing-expert' ) );
		}

		$reference = array();
		if ( ! empty( $config['save_as_draft'] ) ) {
			$title      = wp_trim_words( wp_strip_all_tags( $output ), 8, '' ) ?: __( 'Custom AI Output', 'ai-marketing-expert' );
			$article_id = self::save_article( array(
				'title'   => sanitize_text_field( $title ),
				'content' => wp_kses_post( wpautop( $output ) ),
			), $result );
			if ( $article_id ) {
				$reference['article_id'] = $article_id;
				$reference['link']       = self::module_link( 'content' );
			}
		}

		aime_log( 'Workflow custom prompt executed.', 'info', 'workflow-automation' );

		return self::ok( wp_trim_words( wp_strip_all_tags( $output ), 30, '…' ), $reference );
	}
}
