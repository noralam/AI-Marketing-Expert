<?php
/**
 * Social Post action — AI caption + a social post row (draft or scheduled) that
 * the Social Media module's existing 5-minute publisher cron will process.
 *
 * Only rows with status = 'scheduled' are auto-published by that cron; 'draft'
 * rows are left untouched — keeping unattended sends opt-in and safe.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions
 */

// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions;

use WPSpace\AiMarketingExpert\Modules\SocialMedia\Services\AiSocialService;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SocialPostAction extends BaseAction {

	public static function run( array $config, array $context ): array {
		global $wpdb;
		$p = $wpdb->prefix;

		$account_id = (int) ( $config['account_id'] ?? 0 );
		$platform   = sanitize_text_field( (string) ( $config['platform'] ?? 'facebook' ) );
		$topic      = self::rotated_topic( $config, $context );
		$tone       = self::tone( $context );
		$schedule   = ! empty( $config['schedule'] );

		if ( '' === $topic ) {
			return self::fail( __( 'No topic provided for the social post.', 'ai-marketing-expert' ) );
		}

		// Validate the account exists and is connected.
		$account = $wpdb->get_row( $wpdb->prepare(
			"SELECT id, platform, status, name FROM {$p}aime_social_accounts WHERE id = %d",
			$account_id
		) );
		if ( ! $account ) {
			return self::fail( __( 'Connected social account not found.', 'ai-marketing-expert' ) );
		}
		if ( 'connected' !== $account->status ) {
			/* translators: %s: social media account name. */
			return self::fail( sprintf( __( 'Account "%s" is not connected.', 'ai-marketing-expert' ), $account->name ) );
		}
		$platform = $account->platform ?: $platform;

		// Generate the caption.
		$ai      = new AiSocialService();
		$caption = $ai->generate_caption( $platform, $topic, $tone, (string) ( $context['previous'][0]['preview'] ?? '' ) );
		if ( empty( $caption['success'] ) ) {
			return self::fail( $caption['error'] ?? __( 'Caption generation failed.', 'ai-marketing-expert' ) );
		}
		$content = (string) $caption['content'];

		// Insert a social post row for the existing publisher cron.
		$now    = current_time( 'mysql', true );
		$status = $schedule ? 'scheduled' : 'draft';
		// Schedule ~5 minutes out so the publisher cron picks it up on its next tick.
		$scheduled_at = $schedule ? gmdate( 'Y-m-d H:i:s', time() + 300 ) : null;

		$ok = $wpdb->insert( "{$p}aime_social_posts", array(
			'account_id'   => $account_id,
			'content'      => $content,
			'status'       => $status,
			'scheduled_at' => $scheduled_at,
			'ai_generated' => 1,
			'source_type'  => 'workflow',
			'source_id'    => (int) ( $context['workflow_id'] ?? 0 ),
			'created_at'   => $now,
			'updated_at'   => $now,
		) );

		if ( ! $ok ) {
			return self::fail( __( 'Social post could not be saved.', 'ai-marketing-expert' ) );
		}

		$post_id = (int) $wpdb->insert_id;
		$preview = $schedule
			? sprintf( /* translators: %s: platform */ __( 'Scheduled %s post (publisher cron will send it).', 'ai-marketing-expert' ), $platform )
			: sprintf( /* translators: %s: platform */ __( 'Saved %s post as draft for review.', 'ai-marketing-expert' ), $platform );

		return self::ok( $preview, array( 'social_post_id' => $post_id, 'status' => $status, 'link' => self::module_link( 'social' ) ) );
	}
}
