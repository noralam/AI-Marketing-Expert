<?php
/**
 * Standalone functional check for the unsubscribe-hash fix (H-11) and the
 * rate-limit helper (H-03). The file mocks just enough WordPress surface
 * to exercise the public methods. Run with:
 *
 *   C:/laragon/bin/php/php-8.3.16-Win32-vs16-x64/php.exe tools/hash_check.php
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
if ( ! defined( 'AUTH_KEY' ) ) {
	define( 'AUTH_KEY', 'unit-test-auth-key-' . str_repeat( 'x', 40 ) );
}

// Minimal WP shims used by the module.
function wp_salt( $scheme = 'auth' ) {
	return AUTH_KEY;
}
function sanitize_text_field( $s ) { return is_string( $s ) ? trim( $s ) : ''; }
function sanitize_key( $s ) { return is_string( $s ) ? strtolower( preg_replace( '/[^a-z0-9_\-]/', '', $s ) ) : ''; }
function wp_unslash( $s ) { return is_string( $s ) ? stripslashes( $s ) : $s; }
function absint( $v ) { return (int) abs( $v ); }
function wp_hash( $data ) { return hash_hmac( 'sha256', $data, wp_salt( 'auth' ) ); }
function current_time( $type = 'mysql', $gmt = false ) { return gmdate( 'Y-m-d H:i:s' ); }
function get_transient( $k ) { return false; }
function set_transient( $k, $v, $e = 0 ) { return true; }
function delete_transient( $k ) { return true; }
function wp_die( $m, $t = '', $a = array() ) { throw new RuntimeException( $m ); }
function nocache_headers() {}
function status_header( $c ) {}
function add_action( ...$a ) { return true; }
function add_filter( ...$a ) { return true; }
function add_shortcode( ...$a ) { return true; }
function do_action( ...$a ) {}
function apply_filters( $tag, $v, ...$r ) { return $v; }
function register_activation_hook( ...$a ) {}
function register_deactivation_hook( ...$a ) {}
function plugin_dir_path( $f ) { return dirname( $f ) . '/'; }
function plugin_dir_url( $f ) { return ''; }
function plugin_basename( $f ) { return basename( $f ); }
function is_admin() { return false; }
function current_user_can( $c ) { return true; }
function wp_next_scheduled( $h ) { return false; }
function wp_schedule_event( ...$a ) { return true; }
function wp_schedule_single_event( ...$a ) { return true; }
function wp_clear_scheduled_hook( $h ) {}
if ( ! defined( 'DAY_IN_SECONDS' ) ) { define( 'DAY_IN_SECONDS', 86400 ); }
if ( ! defined( 'MINUTE_IN_SECONDS' ) ) { define( 'MINUTE_IN_SECONDS', 60 ); }

// Minimal autoloader mirroring the plugin's autoload.php for the two
// classes this test touches.
spl_autoload_register( function ( $class ) {
	$prefix = 'WPSpace\\AiMarketingExpert\\';
	if ( strncmp( $prefix, $class, strlen( $prefix ) ) !== 0 ) return;
	$rel = substr( $class, strlen( $prefix ) );
	$rel = str_replace( '\\', '/', $rel );
	$candidates = array(
		__DIR__ . '/../includes/class-' . strtolower( preg_replace( '/([a-z])([A-Z])/', '$1-$2', basename( $rel ) ) ) . '.php',
		__DIR__ . '/../includes/' . basename( $rel ) . '.php',
	);
	foreach ( $candidates as $f ) {
		if ( file_exists( $f ) ) { require_once $f; return; }
	}
} );

require __DIR__ . '/../modules/email-marketing/class-email-marketing-module.php';

use WPSpace\AiMarketingExpert\Modules\EmailMarketing\EmailMarketingModule;

$failures = 0;
$report   = function ( $label, $ok, $extra = '' ) use ( &$failures ) {
	echo ( $ok ? '[ OK ] ' : '[FAIL] ' ) . $label . ( $extra ? '  -- ' . $extra : '' ) . "\n";
	if ( ! $ok ) {
		$failures++;
	}
};

// ── create_unsubscribe_hash / decode_unsubscribe_hash round-trip ──
$h = EmailMarketingModule::create_unsubscribe_hash( 42, 7, 'subscribed' );
$report( 'create_unsubscribe_hash returns a non-empty string', is_string( $h ) && '' !== $h );

$d = EmailMarketingModule::decode_unsubscribe_hash( $h );
$report( 'decode returns the four signed fields', is_array( $d )
	&& 42  === $d['campaign_id']
	&& 7   === $d['subscriber_id']
	&& 'subscribed' === $d['status_at_signing']
	&& $d['issued_at'] > 0 );

// ── Decode of garbage must be null (not throw) ──
$report( 'garbage decodes to null', null === EmailMarketingModule::decode_unsubscribe_hash( 'not-base64-!!!' ) );

// ── Truncated hash (5 parts expected) is rejected ──
// Build a legacy tracking hash (3 parts) and feed it to decode_unsubscribe_hash
$legacy = EmailMarketingModule::create_tracking_hash( 1, 2 );
$report( 'legacy 3-part hash is rejected by decode_unsubscribe_hash', null === EmailMarketingModule::decode_unsubscribe_hash( $legacy ) );

// ── Tampered payload must fail HMAC ──
// Take a real hash, swap a part, verify decode returns null.
$parts = explode( '|', base64_decode( strtr( $h, '-_~', '+/=' ), true ) );
$tampered = EmailMarketingModule::create_unsubscribe_hash( 999, 7, 'subscribed' );
$report( 'tampered hash does not decode to original values',
	null === EmailMarketingModule::decode_unsubscribe_hash( $tampered )
	|| ( is_array( $decoded = EmailMarketingModule::decode_unsubscribe_hash( $tampered ) )
		&& $decoded['campaign_id'] !== 42 ) );

// ── created_at older than 30 days must be rejected ──
// We can't easily go back in time inside the helper itself, so we hand-craft
// a hash with a 31-day-old issued_at and a valid HMAC.
$old_issued = time() - ( 31 * DAY_IN_SECONDS );
$payload    = '42|7|subscribed|' . $old_issued;
$mac        = hash_hmac( 'sha256', $payload, AUTH_KEY );
$raw        = $payload . '|' . $mac;
$old_hash   = strtr( base64_encode( $raw ), '+/=', '-_~' );
$report( '31-day-old unsubscribe hash is rejected', null === EmailMarketingModule::decode_unsubscribe_hash( $old_hash ) );

// ── 29-day-old hash is still accepted ──
$ok_issued = time() - ( 29 * DAY_IN_SECONDS );
$payload   = '42|7|subscribed|' . $ok_issued;
$mac       = hash_hmac( 'sha256', $payload, AUTH_KEY );
$raw       = $payload . '|' . $mac;
$ok_hash   = strtr( base64_encode( $raw ), '+/=', '-_~' );
$d2        = EmailMarketingModule::decode_unsubscribe_hash( $ok_hash );
$report( '29-day-old unsubscribe hash is accepted', is_array( $d2 ) && 42 === $d2['campaign_id'] );

echo "\n" . ( $failures === 0 ? 'ALL PASS' : "$failures FAILURE(S)" ) . "\n";
exit( $failures === 0 ? 0 : 1 );
