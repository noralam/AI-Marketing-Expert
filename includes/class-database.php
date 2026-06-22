<?php
/**
 * Database migration manager.
 *
 * @package WPSpace\AiMarketingExpert
 */

namespace WPSpace\AiMarketingExpert;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Database {

	/**
	 * Run all database migrations.
	 */
	public static function migrate(): void {
		global $wpdb;

		$charset_collate = $wpdb->get_charset_collate();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		// Core tables.
		self::create_core_tables( $charset_collate );

		// Module tables - each module handles its own.
		do_action( 'aime_create_tables', $charset_collate );
	}

	/**
	 * Create core plugin tables.
	 *
	 * @param string $charset_collate Database charset.
	 */
	private static function create_core_tables( string $charset_collate ): void {
		global $wpdb;

		$tables = array();

		// Module registry.
		$tables[] = "CREATE TABLE {$wpdb->prefix}aime_modules (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			module_id varchar(50) NOT NULL,
			is_active tinyint(1) NOT NULL DEFAULT 1,
			settings longtext,
			activated_at datetime DEFAULT NULL,
			updated_at datetime DEFAULT NULL,
			PRIMARY KEY (id),
			UNIQUE KEY idx_module_id (module_id)
		) {$charset_collate};";

		// Activity log.
		$tables[] = "CREATE TABLE {$wpdb->prefix}aime_log (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			module_id varchar(50) DEFAULT 'core',
			level varchar(20) NOT NULL DEFAULT 'info',
			message text NOT NULL,
			context longtext,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			KEY idx_module (module_id),
			KEY idx_level (level),
			KEY idx_created (created_at)
		) {$charset_collate};";

		foreach ( $tables as $sql ) {
			dbDelta( $sql );
		}
	}

	/**
	 * Drop all plugin tables (for uninstall).
	 */
	public static function drop_all_tables(): void {
		global $wpdb;

		$tables = array(
			// Core.
			"{$wpdb->prefix}aime_modules",
			"{$wpdb->prefix}aime_log",
			// Email CRM — Contact & Segmentation.
			"{$wpdb->prefix}aime_subscribers",
			"{$wpdb->prefix}aime_subscriber_meta",
			"{$wpdb->prefix}aime_subscriber_pivot",
			"{$wpdb->prefix}aime_subscriber_notes",
			"{$wpdb->prefix}aime_lists",
			"{$wpdb->prefix}aime_tags",
			"{$wpdb->prefix}aime_custom_fields",
			// Email CRM — Campaigns.
			"{$wpdb->prefix}aime_campaigns",
			"{$wpdb->prefix}aime_campaign_emails",
			"{$wpdb->prefix}aime_campaign_url_metrics",
			"{$wpdb->prefix}aime_url_stores",
			"{$wpdb->prefix}aime_templates",
			// Email CRM — Automations.
			"{$wpdb->prefix}aime_funnels",
			"{$wpdb->prefix}aime_funnel_sequences",
			"{$wpdb->prefix}aime_funnel_subscribers",
			"{$wpdb->prefix}aime_funnel_metrics",
			// Email CRM — Companies.
			"{$wpdb->prefix}aime_companies",
			"{$wpdb->prefix}aime_company_notes",
			// Email CRM — Taxonomy & Meta.
			"{$wpdb->prefix}aime_labels",
			"{$wpdb->prefix}aime_label_relations",
			"{$wpdb->prefix}aime_meta",
			"{$wpdb->prefix}aime_activity_log",
			// Legacy tables (cleanup from v1).
			"{$wpdb->prefix}aime_email_lists",
			"{$wpdb->prefix}aime_email_subscribers",
			"{$wpdb->prefix}aime_email_subscriber_lists",
			"{$wpdb->prefix}aime_email_tags",
			"{$wpdb->prefix}aime_email_subscriber_tags",
			"{$wpdb->prefix}aime_email_campaigns",
			"{$wpdb->prefix}aime_email_templates",
			"{$wpdb->prefix}aime_email_queue",
			"{$wpdb->prefix}aime_email_events",
			"{$wpdb->prefix}aime_email_automations",
			"{$wpdb->prefix}aime_email_automation_steps",
			"{$wpdb->prefix}aime_email_automation_logs",
			"{$wpdb->prefix}aime_email_subscriber_notes",
			// Chatbot.
			"{$wpdb->prefix}aime_chatbot_bots",
			"{$wpdb->prefix}aime_chatbot_conversations",
			"{$wpdb->prefix}aime_chatbot_messages",
			"{$wpdb->prefix}aime_chatbot_knowledge",
			"{$wpdb->prefix}aime_chatbot_analytics",
			// Social Media.
			"{$wpdb->prefix}aime_social_accounts",
			"{$wpdb->prefix}aime_social_posts",
			"{$wpdb->prefix}aime_social_post_log",
		);

		/**
		 * Filter the list of tables to drop on uninstall.
		 *
		 * @param array $tables Table names.
		 */
		$tables = apply_filters( 'aime_uninstall_tables', $tables );

		foreach ( $tables as $table ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table names are hardcoded with $wpdb->prefix.
			$wpdb->query( "DROP TABLE IF EXISTS `{$table}`" );
		}
	}
}
