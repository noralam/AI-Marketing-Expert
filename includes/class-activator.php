<?php
/**
 * Plugin Activator.
 *
 * @package WPSpace\AiMarketingExpert
 */

namespace WPSpace\AiMarketingExpert;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Activator {

	/**
	 * Run activation tasks.
	 */
	public static function activate(): void {
		// Check minimum WordPress version.
		if ( version_compare( get_bloginfo( 'version' ), AIME_MIN_WP, '<' ) ) {
			deactivate_plugins( AIME_PLUGIN_BASENAME );
			wp_die(
				sprintf(
					/* translators: %s: Minimum WordPress version */
					esc_html__( 'AI Marketing Expert requires WordPress %s or higher.', 'ai-marketing-expert' ),
					esc_html( AIME_MIN_WP )
				),
				esc_html__( 'Plugin Activation Error', 'ai-marketing-expert' ),
				array( 'back_link' => true )
			);
		}

		// Create database tables.
		Database::migrate();

		// Set default options.
		self::set_defaults();


		// Seed translated default email templates after init.
		set_transient( 'aime_seed_email_templates', true, 30 );

		// Schedule cron events.
		self::schedule_cron();

		// Set activation flag for redirect.
		set_transient( 'aime_activation_redirect', true, 30 );

		// Flush rewrite rules.
		flush_rewrite_rules();
	}

	/**
	 * Set default plugin options.
	 */
	private static function set_defaults(): void {
		$defaults = array(
			'from_name'        => get_bloginfo( 'name' ),
			'from_email'       => get_option( 'admin_email' ),
			'unsubscribe_page' => 0,
			'double_optin'     => true,
			'track_opens'      => true,
			'track_clicks'     => true,
			'sending_method'   => 'wp_mail',     // wp_mail, smtp, api
			'batch_size'       => 50,
			'batch_interval'   => 60,             // seconds between batches
			'gdpr_enabled'     => true,
		);

		$existing = get_option( 'aime_settings', array() );
		$merged   = array_merge( $defaults, $existing );
		update_option( 'aime_settings', $merged );
	}

	/**
	 * Seed default email templates on activation.
	 */
	public static function seed_email_templates(): void {
		if ( class_exists( '\\WPSpace\\AiMarketingExpert\\Modules\\EmailMarketing\\Controllers\\TemplateController' ) ) {
			$controller = new \WPSpace\AiMarketingExpert\Modules\EmailMarketing\Controllers\TemplateController();
			$controller->seed_defaults();
		}
	}

	/**
	 * Schedule cron events.
	 */
	private static function schedule_cron(): void {
		if ( ! wp_next_scheduled( 'aime_process_email_queue' ) ) {
			wp_schedule_event( time(), 'every_minute', 'aime_process_email_queue' );
		}

		if ( ! wp_next_scheduled( 'aime_process_automations' ) ) {
			wp_schedule_event( time(), 'every_minute', 'aime_process_automations' );
		}

		if ( ! wp_next_scheduled( 'aime_daily_cleanup' ) ) {
			wp_schedule_event( time(), 'daily', 'aime_daily_cleanup' );
		}
	}
}
