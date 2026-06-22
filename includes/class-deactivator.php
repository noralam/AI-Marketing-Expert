<?php
/**
 * Plugin Deactivator.
 *
 * @package WPSpace\AiMarketingExpert
 */

namespace WPSpace\AiMarketingExpert;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Deactivator {

	/**
	 * Run deactivation tasks.
	 */
	public static function deactivate(): void {
		// Clear scheduled cron events.
		wp_clear_scheduled_hook( 'aime_process_email_queue' );
		wp_clear_scheduled_hook( 'aime_run_email_queue' );
		wp_clear_scheduled_hook( 'aime_process_automations' );
		wp_clear_scheduled_hook( 'aime_daily_cleanup' );
		wp_clear_scheduled_hook( 'aime_chatbot_daily_cleanup' );
		wp_clear_scheduled_hook( 'aime_chatbot_index_post' );
		wp_clear_scheduled_hook( 'aime_seo_rank_check' );
		wp_clear_scheduled_hook( 'aime_seo_automation_process' );
		wp_clear_scheduled_hook( 'aime_publish_scheduled_social_posts' );

		// Clear transients.
		delete_transient( 'aime_activation_redirect' );

		$settings = get_option( 'aime_settings', array() );
		if ( ! empty( $settings['delete_data_on_uninstall'] ) ) {
			self::delete_all_plugin_data();
		}

		// Flush rewrite rules.
		flush_rewrite_rules();
	}

	/**
	 * Delete all plugin data when the user opted into removal on uninstall/deactivation.
	 */
	private static function delete_all_plugin_data(): void {
		global $wpdb;

		$tables = $wpdb->get_col(
			$wpdb->prepare(
				'SHOW TABLES LIKE %s',
				$wpdb->esc_like( $wpdb->prefix . 'aime_' ) . '%'
			)
		);

		foreach ( $tables as $table ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table names come from SHOW TABLES with the plugin prefix.
			$wpdb->query( "DROP TABLE IF EXISTS `{$table}`" );
		}

		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( 'aime_' ) . '%'
			)
		);

		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s",
				$wpdb->esc_like( '_transient_aime_' ) . '%',
				$wpdb->esc_like( '_transient_timeout_aime_' ) . '%',
				$wpdb->esc_like( '_site_transient_aime_' ) . '%',
				$wpdb->esc_like( '_site_transient_timeout_aime_' ) . '%'
			)
		);

		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE %s",
				$wpdb->esc_like( 'aime_' ) . '%'
			)
		);

		wp_cache_flush();
	}
}
