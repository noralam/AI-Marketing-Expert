<?php
/**
 * Uninstall AI Marketing Expert.
 *
 * Fires when the plugin is deleted from Plugins page.
 * Removes all data if the user opted in.
 *
 * @package WPSpace\AiMarketingExpert
 */

// Abort if not called by WordPress.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Check if user wants to delete all data.
$settings    = get_option( 'aime_settings', array() );
$delete_data = isset( $settings['delete_data_on_uninstall'] ) && $settings['delete_data_on_uninstall'];

if ( $delete_data ) {
	global $wpdb;

	// Drop all plugin tables, including future module tables using the same prefix.
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

	// Delete all options.
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
			$wpdb->esc_like( 'aime_' ) . '%'
		)
	);

	// Delete all transients.
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s",
			$wpdb->esc_like( '_transient_aime_' ) . '%',
			$wpdb->esc_like( '_transient_timeout_aime_' ) . '%',
			$wpdb->esc_like( '_site_transient_aime_' ) . '%',
			$wpdb->esc_like( '_site_transient_timeout_aime_' ) . '%'
		)
	);

	// Delete plugin user meta.
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE %s",
			$wpdb->esc_like( 'aime_' ) . '%'
		)
	);

	// Clear scheduled cron hooks.
	wp_clear_scheduled_hook( 'aime_minutely_tasks' );
	wp_clear_scheduled_hook( 'aime_process_email_queue' );
	wp_clear_scheduled_hook( 'aime_run_email_queue' );
	wp_clear_scheduled_hook( 'aime_process_automations' );
	wp_clear_scheduled_hook( 'aime_daily_cleanup' );
	wp_clear_scheduled_hook( 'aime_chatbot_daily_cleanup' );
	wp_clear_scheduled_hook( 'aime_chatbot_index_post' );
	wp_clear_scheduled_hook( 'aime_seo_rank_check' );
	wp_clear_scheduled_hook( 'aime_seo_automation_process' );
	wp_clear_scheduled_hook( 'aime_publish_scheduled_social_posts' );
	wp_clear_scheduled_hook( 'aime_workflow_dispatch' );
	wp_clear_scheduled_hook( 'aime_workflow_execute_single' );
	wp_clear_scheduled_hook( 'aime_workflow_resume_execution' );
	wp_clear_scheduled_hook( 'aime_check_abandoned_carts' );
	wp_clear_scheduled_hook( 'aime_b2b_lead_autopilot_daily' );
	wp_clear_scheduled_hook( 'aime_content_sync_scheduled_articles' );
	wp_clear_scheduled_hook( 'aime_sync_esp_bounces' );
	wp_clear_scheduled_hook( 'aime_process_bounce_mailbox' );
	wp_clear_scheduled_hook( 'aime_run_ai_jobs' );

	wp_cache_flush();
}

// Ensure scheduled hooks are always cleared on uninstall, even if user chose to preserve data.
wp_clear_scheduled_hook( 'aime_minutely_tasks' );
wp_clear_scheduled_hook( 'aime_process_email_queue' );
wp_clear_scheduled_hook( 'aime_run_email_queue' );
wp_clear_scheduled_hook( 'aime_process_automations' );
wp_clear_scheduled_hook( 'aime_daily_cleanup' );
wp_clear_scheduled_hook( 'aime_chatbot_daily_cleanup' );
wp_clear_scheduled_hook( 'aime_chatbot_index_post' );
wp_clear_scheduled_hook( 'aime_seo_rank_check' );
wp_clear_scheduled_hook( 'aime_seo_automation_process' );
wp_clear_scheduled_hook( 'aime_publish_scheduled_social_posts' );
wp_clear_scheduled_hook( 'aime_workflow_dispatch' );
wp_clear_scheduled_hook( 'aime_workflow_execute_single' );
wp_clear_scheduled_hook( 'aime_workflow_resume_execution' );
wp_clear_scheduled_hook( 'aime_check_abandoned_carts' );
wp_clear_scheduled_hook( 'aime_b2b_lead_autopilot_daily' );
wp_clear_scheduled_hook( 'aime_content_sync_scheduled_articles' );
wp_clear_scheduled_hook( 'aime_sync_esp_bounces' );
wp_clear_scheduled_hook( 'aime_process_bounce_mailbox' );
wp_clear_scheduled_hook( 'aime_run_ai_jobs' );
