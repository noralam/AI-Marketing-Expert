/**
 * SEO ↔ Content Generator bridge — pass pre-fill data across module page loads.
 *
 * Uses sessionStorage so data survives the full page reload when navigating
 * from the SEO admin page to the Content Generator admin page.
 */

import menuUrl from './menuUrl';

const STORAGE_KEY = 'aime_prefill_article';

/**
 * Navigate to Content Generator's "New Article" page with pre-filled SEO data.
 *
 * @param {Object} data — fields to pre-fill in ArticleEditor.
 * @param {string} [data.topic]    — article topic / subject.
 * @param {string} [data.title]    — suggested title.
 * @param {string[]} [data.keywords] — target keywords.
 * @param {string} [data.intent]   — keyword intent (informational, transactional, etc.).
 * @param {string} [data.content_type] — pillar_page, blog_post, listicle, etc.
 * @param {string} [data.outline]  — suggested outline / description.
 * @param {number} [data.word_count_target] — target article length.
 * @param {string} [data.meta_title] — SEO meta title.
 * @param {string} [data.meta_description] — SEO meta description.
 * @param {string} [data.excerpt] — article excerpt / summary.
 * @param {string} [data.source]   — where the prefill came from (keyword-vault, content-calendar, topic-map).
 */
export const navigateToNewArticle = ( data = {} ) => {
	try {
		sessionStorage.setItem( STORAGE_KEY, JSON.stringify( data ) );
	} catch ( e ) {
		// Storage full or blocked — navigate anyway.
	}
	window.location.href = menuUrl( 'content' ) + '#new-article';
};

/**
 * Read and consume prefill data (call once on ArticleEditor mount).
 *
 * @return {Object|null} Prefill data or null if nothing stored.
 */
export const consumePrefillData = () => {
	try {
		const raw = sessionStorage.getItem( STORAGE_KEY );
		if ( ! raw ) return null;
		sessionStorage.removeItem( STORAGE_KEY );
		return JSON.parse( raw );
	} catch ( e ) {
		return null;
	}
};
