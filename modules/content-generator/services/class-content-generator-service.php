<?php
/**
 * Content Generator Service — AI prompt engineering for blog content.
 *
 * @package WPSpace\AiMarketingExpert\Modules\ContentGenerator\Services
 */

namespace WPSpace\AiMarketingExpert\Modules\ContentGenerator\Services;

use WPSpace\AiMarketingExpert\AiProvider;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class ContentGeneratorService {

	use ParsesAiJson;

	/* ── GENERATE full article ───────────────────────── */

	public function generate_article( string $topic, array $keywords, string $tone, int $word_count, string $language, string $outline = '', ?object $preset = null, bool $include_table_of_contents = false ): array {
		$system = $this->build_system_prompt( $tone, $language, $preset );

		$keywords_str = $keywords ? implode( ', ', $keywords ) : 'none specified';

		$prompt = "Write a comprehensive blog article about: \"{$topic}\"\n\n"
			. "Target keywords: {$keywords_str}\n"
			. "Target word count: approximately {$word_count} words — THIS IS CRITICAL, the article MUST be at least {$word_count} words long. Write detailed, in-depth content for every section.\n"
			. "Language: {$language}\n"
			. "Tone: {$tone}\n\n";

		if ( $outline ) {
			$prompt .= "Follow this outline structure:\n{$outline}\n\n";
		}

		if ( $preset && ! empty( $preset->prompt_template ) ) {
			$prompt .= "Additional instructions:\n{$preset->prompt_template}\n\n";
		}

		if ( $include_table_of_contents ) {
			$prompt .= "Table of contents requirements:\n"
				. "- Add a table of contents near the top of the body after the introduction and before the first h2 section.\n"
				. "- Use valid HTML: <nav class=\"aime-article-toc\"><h2>Table of Contents</h2><ul><li><a href=\"#section-id\">Section title</a></li></ul></nav>.\n"
				. "- Add matching id attributes to each main h2 section included in the TOC.\n"
				. "- Do not include the TOC inside JSON metadata; it must be inside the body HTML only.\n\n";
		}

		$prompt .= "Return a JSON object with these keys:\n"
			. "- \"title\": a compelling SEO-friendly title that includes the primary keyword\n"
			. "- \"body\": the full article in HTML format using h2, h3, p, ul, ol, li, strong, em tags\n"
			. "- \"excerpt\": a 1-2 sentence summary (max 160 characters)\n"
			. "- \"outline\": array of {heading, level} objects representing the article structure (level should be a number: 2 or 3)\n"
			. "Return ONLY the JSON object. No thinking, no reasoning, no commentary, no explanation before or after the JSON.\n"
			. "The body must be valid HTML.\n"
			. "KEYWORD REQUIREMENTS: The target keywords MUST appear naturally in the title, in headings (h2/h3), and throughout the body text. "
			. "Use the primary keyword in the first paragraph and aim for 0.5-2%% keyword density.\n"
			. "IMPORTANT: Write ALL content in full. Do NOT use placeholders like \"...\", \"[content]\", or ellipsis. Every section must contain complete, detailed text.";

		$max_tokens = min( 16384, max( 2048, (int) ( $word_count * 2.5 ) ) );
		$result     = AiProvider::generate( $system . "\n\n" . $prompt, 'text', $max_tokens );

		if ( ! $result['success'] ) {
			return array( 'success' => false, 'error' => $result['content'] ?? __( 'AI generation failed.', 'ai-marketing-expert' ) );
		}

		$parsed = $this->parse_json_response( $result['content'] );

		if ( ! $parsed ) {
			// Check if the raw response contains real HTML content (not thinking text).
			$has_html = preg_match( '/<(p|h[1-6]|ul|ol|div|article|section)\b/i', $result['content'] );

			if ( $has_html ) {
				// Model returned HTML directly without JSON wrapper — use it.
				$parsed = array(
					'title'   => $topic,
					'body'    => $result['content'],
					'excerpt' => '',
					'outline' => array(),
				);
			} else {
				// No JSON and no HTML — likely thinking/reasoning text. Fail clearly.
				aime_log( 'AI returned non-JSON, non-HTML response (possible thinking/reasoning output). Retrying or failing.', 'warning', 'content-generator' );
				return array(
					'success' => false,
					'error'   => __( 'The AI model returned reasoning text instead of article content. Please try again or switch to a different model.', 'ai-marketing-expert' ),
				);
			}
		}

		return array(
			'success'  => true,
			'content'  => $result['content'],
			'parsed'   => $parsed,
			'provider' => $result['provider'] ?? '',
			'model'    => $result['model'] ?? '',
		);
	}

	/* ── GENERATE outline ────────────────────────────── */

	public function generate_outline( string $topic, array $keywords, string $tone, string $style ): array {
		$keywords_str = $keywords ? implode( ', ', $keywords ) : 'none specified';

		$prompt = "You are a content strategist. Create a detailed article outline for the following topic.\n\n"
			. "Topic: \"{$topic}\"\n"
			. "Style: {$style}\n"
			. "Tone: {$tone}\n"
			. "Target keywords: {$keywords_str}\n\n"
			. "Return a JSON object with:\n"
			. "- \"title\": suggested article title\n"
			. "- \"sections\": array of objects with {heading, level (2 or 3), description, estimated_words}\n"
			. "- \"total_estimated_words\": total estimated word count\n"
			. "- \"key_points\": array of 3-5 key points the article should cover\n"
			. "Return ONLY the JSON object. No thinking, no reasoning, no commentary.";

		$result = AiProvider::generate( $prompt, 'text', 2048 );

		if ( ! $result['success'] ) {
			return array( 'success' => false, 'error' => $result['content'] ?? '' );
		}

		$parsed = $this->parse_json_response( $result['content'] );

		return array(
			'success' => true,
			'outline' => $parsed ?: array( 'raw' => $result['content'] ),
		);
	}

	/* ── GENERATE single section ─────────────────────── */

	public function generate_section( string $topic, string $section_title, string $context, string $tone ): array {
		$prompt = "You are an expert content writer. Write a detailed section for a blog article.\n\n"
			. "Article topic: \"{$topic}\"\n"
			. "Section heading: \"{$section_title}\"\n"
			. "Tone: {$tone}\n";

		if ( $context ) {
			$prompt .= "Context (surrounding content):\n{$context}\n\n";
		}

		$prompt .= "Write 2-4 paragraphs for this section. Use HTML tags (p, ul, ol, li, strong, em). "
			. "Do NOT include the section heading itself — just the body content. "
			. "Return ONLY the HTML content, no JSON wrapper.";

		$result = AiProvider::generate( $prompt, 'text', 2048 );

		if ( ! $result['success'] ) {
			return array( 'success' => false, 'error' => $result['content'] ?? '' );
		}

		return array(
			'success' => true,
			'content' => aime_strip_thinking_text( $result['content'] ),
		);
	}

	/* ── IMPROVE content ─────────────────────────────── */

	public function improve_content( string $content, string $instruction, string $tone ): array {
		$word_count = str_word_count( wp_strip_all_tags( $content ) );
		$max_tokens = min( 16384, max( 2048, (int) ( $word_count * 2.5 ) ) );

		$prompt = "You are a professional editor. Improve the following content based on this instruction.\n\n"
			. "Instruction: {$instruction}\n"
			. "Tone: {$tone}\n\n"
			. "Original content:\n{$content}\n\n"
			. "IMPORTANT: The original content has approximately {$word_count} words. "
			. "Your output MUST have approximately the same word count. Do NOT shorten, truncate, or remove any sections. "
			. "Return the improved content in HTML format using p, h2, h3, ul, ol, li, strong, em tags. "
			. "Return ONLY the improved HTML content.";

		$result = AiProvider::generate( $prompt, 'text', $max_tokens );

		if ( ! $result['success'] ) {
			return array( 'success' => false, 'error' => $result['content'] ?? '' );
		}

		return array(
			'success' => true,
			'content' => aime_strip_thinking_text( $result['content'] ),
		);
	}

	/* ── GENERATE meta title & description ───────────── */

	public function generate_meta( string $title, string $content, array $keywords ): array {
		$stripped     = mb_substr( wp_strip_all_tags( $content ), 0, 2000 );
		$keywords_str = $keywords ? implode( ', ', $keywords ) : 'none';

		$prompt = "You are an SEO expert. Generate optimized meta title and meta description for this article.\n\n"
			. "Article title: \"{$title}\"\n"
			. "Target keywords: {$keywords_str}\n"
			. "Article excerpt: {$stripped}\n\n"
			. "Return a JSON object:\n"
			. "- \"meta_title\": SEO-optimized title (max 60 characters, include primary keyword)\n"
			. "- \"meta_description\": compelling meta description (max 160 characters, include keywords naturally)\n"
			. "- \"title_alternatives\": array of 3 alternative title suggestions\n"
			. "Return ONLY the JSON object. No thinking, no reasoning, no commentary.";

		$result = AiProvider::generate( $prompt, 'text', 1024 );

		if ( ! $result['success'] ) {
			return array( 'success' => false, 'error' => $result['content'] ?? '' );
		}

		$parsed = $this->parse_json_response( $result['content'] );

		// If parsing failed, try regex extraction for meta fields.
		if ( ! $parsed || ( empty( $parsed['meta_title'] ) && empty( $parsed['meta_description'] ) ) ) {
			$fallback = array();
			if ( preg_match( '/"meta_title"\s*:\s*"((?:[^"\\\\]|\\\\.)*?)"/s', $result['content'], $m ) ) {
				$fallback['meta_title'] = stripcslashes( $m[1] );
			}
			if ( preg_match( '/"meta_description"\s*:\s*"((?:[^"\\\\]|\\\\.)*?)"/s', $result['content'], $m ) ) {
				$fallback['meta_description'] = stripcslashes( $m[1] );
			}
			if ( ! empty( $fallback ) ) {
				$parsed = array_merge( $parsed ?: array(), $fallback );
			}
		}

		return array(
			'success' => true,
			'meta'    => $parsed ?: array( 'raw' => $result['content'] ),
		);
	}

	/* ── GENERATE excerpt ────────────────────────────── */

	public function generate_excerpt( string $title, string $content ): array {
		$stripped = mb_substr( wp_strip_all_tags( $content ), 0, 2000 );

		$prompt = "You are a professional content writer. Generate a concise, compelling excerpt for the following article.\n\n"
			. "Article title: \"{$title}\"\n"
			. "Article content:\n{$stripped}\n\n"
			. "Return a JSON object with:\n"
			. "- \"excerpt\": a 1-2 sentence summary (max 160 characters) that captures the main point and entices readers\n"
			. "Return ONLY the JSON object. No thinking, no reasoning, no commentary.";

		$result = AiProvider::generate( $prompt, 'text', 512 );

		if ( ! $result['success'] ) {
			return array( 'success' => false, 'error' => $result['content'] ?? '' );
		}

		$parsed = $this->parse_json_response( $result['content'] );

		$excerpt_text = '';
		if ( is_array( $parsed ) && ! empty( $parsed['excerpt'] ) ) {
			$excerpt_text = $parsed['excerpt'];
		} elseif ( is_string( $parsed ) && strlen( $parsed ) > 0 ) {
			$excerpt_text = $parsed;
		}

		// If parsing failed but the raw response looks like a plain sentence (not JSON/thinking), use it.
		if ( empty( $excerpt_text ) && ! empty( $result['content'] ) ) {
			$raw_clean = trim( $result['content'], " \t\n\r\0\x0B\"'" );
			if ( strlen( $raw_clean ) <= 300 && ! preg_match( '/[{}\[\]]/', $raw_clean ) ) {
				$excerpt_text = $raw_clean;
			}
		}

		return array(
			'success' => true,
			'excerpt' => $excerpt_text,
		);
	}

	/* ── GENERATE image prompt (PRO) ─────────────────── */

	public function generate_image_prompt( string $title, string $content ): array {
		$stripped = mb_substr( wp_strip_all_tags( $content ), 0, 1000 );

		$prompt = "You are a creative director specializing in blog featured images. "
			. "Generate detailed image prompts for AI image generators (DALL-E, Midjourney, etc.).\n\n"
			. "Article title: \"{$title}\"\n"
			. "Article summary: {$stripped}\n\n"
			. "Return a JSON object:\n"
			. "- \"prompts\": array of 3 detailed image generation prompts (each 1-2 sentences, descriptive)\n"
			. "- \"style_suggestions\": array of 3 style keywords (e.g., 'photorealistic', 'illustration', 'minimalist')\n"
			. "Return ONLY the JSON object. No thinking, no reasoning, no commentary.";

		$result = AiProvider::generate( $prompt, 'text', 1024 );

		if ( ! $result['success'] ) {
			return array( 'success' => false, 'error' => $result['content'] ?? '' );
		}

		$parsed = $this->parse_json_response( $result['content'] );

		return array(
			'success' => true,
			'data'    => $parsed ?: array( 'raw' => $result['content'] ),
		);
	}

	/* ── HELPERS ─────────────────────────────────────── */

	private function build_system_prompt( string $tone, string $language, ?object $preset = null ): string {
		$system = "You are an expert content writer and SEO specialist. "
			. "Write high-quality, original, engaging blog content. "
			. "Use proper HTML formatting with semantic heading tags (h2, h3), paragraphs, lists, and emphasis where appropriate. "
			. "Always write complete, detailed content — never use placeholders, ellipsis (\"...\"), or abbreviated text. "
			. "IMPORTANT: Output ONLY the requested JSON or HTML. Do NOT include any thinking, reasoning, planning, commentary, or explanation. "
			. "Tone: {$tone}. Language: {$language}.";

		if ( $preset && ! empty( $preset->system_instructions ) ) {
			$system .= "\n\nAdditional instructions from preset:\n" . $preset->system_instructions;
		}

		return $system;
	}
}
