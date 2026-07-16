<?php
/**
 * Funnel Enroll action — enroll a subscriber into an email funnel.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions
 */

// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions;

use WPSpace\AiMarketingExpert\Modules\EmailMarketing\Services\FunnelProcessor;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class FunnelEnrollAction extends BaseAction {

	public static function run( array $config, array $context ): array {
		global $wpdb;
		$p = $wpdb->prefix;

		$funnel_id = (int) ( $config['funnel_id'] ?? 0 );
		$email     = sanitize_email( (string) ( $config['subscriber_email'] ?? '' ) );

		// Blank email falls back to the trigger event's subscriber/lead email.
		if ( '' === $email && ! empty( $context['event']['email'] ) ) {
			$email = sanitize_email( (string) $context['event']['email'] );
		}

		if ( ! $funnel_id ) {
			return self::fail( __( 'No funnel selected.', 'ai-marketing-expert' ) );
		}
		if ( ! is_email( $email ) ) {
			return self::fail( __( 'A valid subscriber email is required.', 'ai-marketing-expert' ) );
		}

		// Validate funnel exists.
		$funnel = $wpdb->get_row( $wpdb->prepare(
			"SELECT id, title, status FROM {$p}aime_funnels WHERE id = %d",
			$funnel_id
		) );
		if ( ! $funnel ) {
			/* translators: %d: funnel ID. */
			return self::fail( sprintf( __( 'Funnel #%d not found.', 'ai-marketing-expert' ), $funnel_id ) );
		}

		// Resolve subscriber by email.
		$subscriber_id = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT id FROM {$p}aime_subscribers WHERE email = %s LIMIT 1",
			$email
		) );
		if ( ! $subscriber_id ) {
			/* translators: %s: subscriber email address. */
			return self::fail( sprintf( __( 'No subscriber found for %s.', 'ai-marketing-expert' ), $email ) );
		}

		// FunnelProcessor::trigger() returns void and guards its own status/dupe checks.
		( new FunnelProcessor() )->trigger( $funnel_id, $subscriber_id );

		$preview = sprintf(
			/* translators: 1: email, 2: funnel title */
			__( 'Enrolled %1$s into funnel "%2$s".', 'ai-marketing-expert' ),
			$email,
			$funnel->title
		);

		return self::ok( $preview, array( 'funnel_id' => $funnel_id, 'subscriber_id' => $subscriber_id, 'link' => self::module_link( 'email' ) ) );
	}
}
