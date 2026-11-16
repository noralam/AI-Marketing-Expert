<?php
/**
 * Trait ParsesAiJson — shared JSON parsing for AI responses (SEO module copy).
 *
 * @package WPSpace\AiMarketingExpert\Modules\Seo\Services
 */

namespace WPSpace\AiMarketingExpert\Modules\Seo\Services;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

trait ParsesAiJson {

	/**
	 * Attempt to parse a JSON string returned by an AI model.
	 *
	 * Stages:
	 *  1. Direct json_decode.
	 *  2. Extract from fenced code block.
	 *  3. Extract first { … } or [ … ] top-level structure.
	 *  4. Fix unescaped newlines inside JSON string values, then re-try.
	 *  5. Regex extraction of individual fields (last resort).
	 *
	 * @param string $raw The raw response string.
	 * @return array|null Decoded array or null on failure.
	 */
	private function parse_json_response( string $raw ): ?array {
		// Use the global parser which handles thinking-model output.
		$result = aime_parse_ai_json( $raw );
		if ( $result ) {
			return $result;
		}

		// Stage 5 — Regex extraction of individual fields (last resort).
		return $this->extract_fields_fallback( $raw );
	}

	/**
	 * Last-resort field extraction via regex.
	 */
	private function extract_fields_fallback( string $raw ): ?array {
		$result = array();

		// Title.
		if ( preg_match( '/"title"\s*:\s*"((?:[^"\\\\]|\\\\.)*?)"/s', $raw, $m ) ) {
			$result['title'] = stripcslashes( $m[1] );
		}

		// Meta description / excerpt.
		if ( preg_match( '/"(?:meta_description|description|excerpt)"\s*:\s*"((?:[^"\\\\]|\\\\.)*?)"/s', $raw, $m ) ) {
			$result['meta_description'] = stripcslashes( $m[1] );
		}

		// Body / content.
		if ( preg_match( '/"(?:body|content)"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"(?:excerpt|outline|title|meta)"|}\s*$)/s', $raw, $m ) ) {
			$body = $m[1];
			$body = str_replace( array( '\\n', '\n' ), "\n", $body );
			$body = stripcslashes( $body );
			$result['body'] = $body;
		}

		return ! empty( $result ) ? $result : null;
	}
}
