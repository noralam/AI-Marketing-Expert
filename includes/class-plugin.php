<?php
/**
 * Main Plugin class (Singleton).
 *
 * @package WPSpace\AiMarketingExpert
 */

// phpcs:disable PluginCheck.CodeAnalysis.DiscouragedFunctions.load_plugin_textdomainFound

namespace WPSpace\AiMarketingExpert;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var Plugin|null
	 */
	private static ?Plugin $instance = null;

	/**
	 * Module manager instance.
	 *
	 * @var ModuleManager
	 */
	private ModuleManager $modules;

	/**
	 * Admin handler.
	 *
	 * @var Admin
	 */
	private Admin $admin;

	/**
	 * REST API handler.
	 *
	 * @var RestApi
	 */
	private RestApi $rest_api;

	/**
	 * Whether active modules have been initialized.
	 *
	 * @var bool
	 */
	private bool $modules_initialized = false;

	/**
	 * Get singleton instance.
	 *
	 * @return Plugin
	 */
	public static function instance(): Plugin {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor - private for singleton.
	 */
	private function __construct() {
		$this->init_hooks();
	}

	/**
	 * Prevent cloning.
	 */
	private function __clone() {}

	/**
	 * Prevent unserialization.
	 */
	public function __wakeup() {
		throw new \Exception( esc_html__( 'Cannot unserialize singleton.', 'ai-marketing-expert' ) );
	}

	/**
	 * Initialize hooks.
	 */
	private function init_hooks(): void {
		add_action( 'plugins_loaded', array( $this, 'on_plugins_loaded' ) );
		add_action( 'init', array( $this, 'on_init' ) );
		add_action( 'rest_api_init', array( $this, 'on_rest_api_init' ) );
	}

	/**
	 * Runs on plugins_loaded.
	 */
	public function on_plugins_loaded(): void {
		// Discover modules early so admin and REST handlers can reference them.
		$this->modules = new ModuleManager();
		$this->modules->discover_modules();

		// Initialize admin if in admin context.
		if ( is_admin() ) {
			$this->admin = new Admin( $this->modules );
		}

		/**
		 * Fires after the plugin is fully loaded.
		 *
		 * @param Plugin $plugin Plugin instance.
		 */
		do_action( 'aime_loaded', $this );
	}

	/**
	 * Runs on init.
	 */
	public function on_init(): void {
		// Load text domain (WP 6.7+ requires this on init or later).
		load_plugin_textdomain(
			'ai-marketing-expert',
			false,
			dirname( AIME_PLUGIN_BASENAME ) . '/languages'
		);

		$this->init_active_modules();

		// Now check database version and run migrations (modules hooks are ready).
		$this->maybe_upgrade_db();

		SmtpProvider::init();

		if ( get_transient( 'aime_seed_email_templates' ) ) {
			Activator::seed_email_templates();
			delete_transient( 'aime_seed_email_templates' );
		}

		// Register public hooks (tracking, unsubscribe, etc.).
		$this->register_public_hooks();
	}

	/**
	 * Runs on rest_api_init.
	 */
	public function on_rest_api_init(): void {
		$this->rest_api = new RestApi( $this->modules );
		$this->rest_api->register_routes();
	}

	/**
	 * Register public-facing hooks.
	 */
	private function register_public_hooks(): void {
		// Public form handling, tracking pixels, etc.
		// Each module registers its own public hooks.
	}

	/**
	 * Check and run database migrations.
	 */
	private function maybe_upgrade_db(): void {
		$current_version = get_option( 'aime_db_version', '0' );

		if ( version_compare( $current_version, AIME_DB_VERSION, '<' ) ) {
			Database::migrate();
			update_option( 'aime_db_version', AIME_DB_VERSION );
		}
	}

	/**
	 * Initialize active modules once translations are available.
	 */
	private function init_active_modules(): void {
		if ( $this->modules_initialized ) {
			return;
		}

		$this->modules->init_active_modules();
		$this->modules_initialized = true;
	}

	/**
	 * Get the module manager.
	 *
	 * @return ModuleManager
	 */
	public function modules(): ModuleManager {
		return $this->modules;
	}

	/**
	 * Get a specific module instance.
	 *
	 * @param string $module_id Module identifier.
	 * @return Module|null
	 */
	public function module( string $module_id ): ?Module {
		return $this->modules->get( $module_id );
	}
}
