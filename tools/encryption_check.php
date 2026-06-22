<?php
/**
 * Standalone functional check for the Encryption fix (H-07).
 * Run with: C:/laragon/bin/php/php-8.3.16-Win32-vs16-x64/php.exe tools/encryption_check.php
 *
 * The file mocks just enough WordPress to exercise the encrypt/decrypt
 * pair and the legacy compatibility path. If everything passes, exit 0.
 */

// Minimal WordPress shim for the encryption class.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
if ( ! defined( 'AUTH_KEY' ) ) {
	define( 'AUTH_KEY', 'unit-test-auth-key-' . str_repeat( 'x', 40 ) );
}
if ( ! defined( 'SECURE_AUTH_KEY' ) ) {
	define( 'SECURE_AUTH_KEY', 'unit-test-secure-key-' . str_repeat( 'y', 40 ) );
}
function wp_generate_password( $length = 12, $special = true, $extra = true ) {
	return bin2hex( random_bytes( max( 8, (int) ( $length / 2 ) ) ) );
}
function get_option( $name, $default = false ) {
	static $opts = array();
	return $opts[ $name ] ?? $default;
}
function update_option( $name, $value, $autoload = null ) {
	return true;
}

require __DIR__ . '/../includes/class-encryption.php';

use WPSpace\AiMarketingExpert\Encryption;

$failures = 0;
$report   = function ( $label, $ok, $extra = '' ) use ( &$failures ) {
	echo ( $ok ? '[ OK ] ' : '[FAIL] ' ) . $label . ( $extra ? '  -- ' . $extra : '' ) . "\n";
	if ( ! $ok ) {
		$failures++;
	}
};

// 1. Round-trip the new v2: format.
$plain     = 'sk-live-test-' . bin2hex( random_bytes( 8 ) );
$enc       = Encryption::encrypt( $plain );
$report( 'new ciphertext has v2: prefix', strpos( $enc, 'v2:' ) === 0 );
$report( 'new round-trip decrypts', Encryption::decrypt( $enc ) === $plain );

// 2. Two encryptions of the same value must produce different ciphertexts
//    (random IV).
$e1 = Encryption::encrypt( $plain );
$e2 = Encryption::encrypt( $plain );
$report( 'random IV produces different ciphertexts', $e1 !== $e2 );
$report( 'both still decrypt to the same plaintext', Encryption::decrypt( $e1 ) === $plain && Encryption::decrypt( $e2 ) === $plain );

// 3. Empty input round-trips to empty.
$report( 'encrypt empty returns empty', Encryption::encrypt( '' ) === '' );
$report( 'decrypt empty returns empty', Encryption::decrypt( '' ) === '' );

// 4. Legacy (un-prefixed) base64( iv . ciphertext ) still decrypts.
$iv_len = openssl_cipher_iv_length( 'aes-256-cbc' );
$key    = hash( 'sha256', AUTH_KEY . 'aime_encryption', true );
$iv     = openssl_random_pseudo_bytes( $iv_len );
$cipher = openssl_encrypt( $plain, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv );
$legacy = base64_encode( $iv . $cipher );
$report( 'legacy un-prefixed ciphertext still decrypts', Encryption::decrypt( $legacy ) === $plain );

// 5. Garbage input returns '' (no exception).
$report( 'garbage in decrypt returns empty', Encryption::decrypt( 'not-valid-base64-!!!' ) === '' );

// 6. Wrong prefix returns empty.
$report( 'unknown version prefix returns empty', Encryption::decrypt( 'v9:' . $enc ) === '' );

echo "\n" . ( $failures === 0 ? 'ALL PASS' : "$failures FAILURE(S)" ) . "\n";
exit( $failures === 0 ? 0 : 1 );
