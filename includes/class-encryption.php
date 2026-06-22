<?php
/**
 * Encryption utility for API keys and sensitive data.
 *
 * @package WPSpace\AiMarketingExpert
 */

namespace WPSpace\AiMarketingExpert;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Encryption {

	/**
	 * Encryption method.
	 */
	private const METHOD = 'aes-256-cbc';

	/**
	 * Prefix on every freshly-encrypted value. Decryption accepts the new
	 * format and falls back to legacy un-prefixed ciphertext written before
	 * the version tag was introduced, so existing rows continue to decrypt.
	 */
	private const CIPHERTEXT_PREFIX = 'v2:';

	/**
	 * Get the encryption key derived from WordPress salts.
	 *
	 * @return string
	 */
	private static function get_key(): string {
		$salt = ( defined( 'AUTH_KEY' ) && '' !== AUTH_KEY ) ? AUTH_KEY : self::get_fallback_secret( 'key' );
		return hash( 'sha256', $salt . 'aime_encryption', true );
	}

	/**
	 * Get IV from WordPress salts.
	 *
	 * @return string
	 */
	private static function get_iv(): string {
		$salt = ( defined( 'SECURE_AUTH_KEY' ) && '' !== SECURE_AUTH_KEY ) ? SECURE_AUTH_KEY : self::get_fallback_secret( 'iv' );
		return substr( hash( 'sha256', $salt . 'aime_iv' ), 0, 16 );
	}

	/**
	 * Get a persistent, per-site fallback secret.
	 *
	 * Used only when WordPress salts (AUTH_KEY / SECURE_AUTH_KEY) are unavailable,
	 * so encryption never relies on a publicly-known default string.
	 *
	 * @param string $suffix Secret identifier ('key' or 'iv').
	 * @return string
	 */
	private static function get_fallback_secret( string $suffix = 'key' ): string {
		$option = 'aime_enc_fallback_' . $suffix;
		$secret = get_option( $option );
		if ( empty( $secret ) ) {
			$secret = wp_generate_password( 64, true, true );
			update_option( $option, $secret, false );
		}
		return (string) $secret;
	}

	/**
	 * Encrypt a value.
	 *
	 * Output format: 'v2:' + base64( random_iv . ciphertext ). The prefix lets
	 * future migrations distinguish ciphertext versions without losing access
	 * to data written by older code.
	 *
	 * @param string $value Plain text value.
	 * @return string Encoded ciphertext.
	 */
	public static function encrypt( string $value ): string {
		if ( '' === $value ) {
			return '';
		}

		$iv        = openssl_random_pseudo_bytes( openssl_cipher_iv_length( self::METHOD ) );
		$encrypted = openssl_encrypt(
			$value,
			self::METHOD,
			self::get_key(),
			OPENSSL_RAW_DATA,
			$iv
		);

		if ( false === $encrypted ) {
			return '';
		}

		return self::CIPHERTEXT_PREFIX . base64_encode( $iv . $encrypted );
	}

	/**
	 * Decrypt a value.
	 *
	 * Accepts the new 'v2:' prefixed format and, for backward compatibility,
	 * the legacy un-prefixed format produced before the version tag was added.
	 * The legacy fallback exists only so existing rows continue to decrypt;
	 * new code should always call encrypt() above.
	 *
	 * @param string $value Encoded ciphertext.
	 * @return string Decrypted plain text value, or '' on failure.
	 */
	public static function decrypt( string $value ): string {
		if ( '' === $value ) {
			return '';
		}

		// New format: v2:base64( iv . ciphertext )
		if ( 0 === strpos( $value, self::CIPHERTEXT_PREFIX ) ) {
			$payload = base64_decode( substr( $value, strlen( self::CIPHERTEXT_PREFIX ) ), true );
			if ( ! is_string( $payload ) || '' === $payload ) {
				return '';
			}

			$iv_len = openssl_cipher_iv_length( self::METHOD );
			if ( strlen( $payload ) < $iv_len ) {
				return '';
			}

			$iv  = substr( $payload, 0, $iv_len );
			$raw = substr( $payload, $iv_len );

			$result = openssl_decrypt( $raw, self::METHOD, self::get_key(), OPENSSL_RAW_DATA, $iv );
			return false !== $result ? $result : '';
		}

		// Legacy format: base64( iv . ciphertext ), no prefix. Best-effort
		// decode only — fall through to '' on any failure.
		$decoded = base64_decode( $value, true );
		if ( ! is_string( $decoded ) || '' === $decoded ) {
			return '';
		}

		$iv_len = openssl_cipher_iv_length( self::METHOD );
		if ( strlen( $decoded ) < $iv_len ) {
			return '';
		}

		$iv  = substr( $decoded, 0, $iv_len );
		$raw = substr( $decoded, $iv_len );

		$result = openssl_decrypt( $raw, self::METHOD, self::get_key(), OPENSSL_RAW_DATA, $iv );
		return false !== $result ? $result : '';
	}
}
