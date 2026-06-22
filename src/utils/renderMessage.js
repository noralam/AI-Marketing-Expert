/**
 * renderMessage — safely convert a limited Markdown subset to HTML.
 *
 * Chatbot/AI responses are returned as Markdown (bold, links, lists). Rendering
 * them as plain text shows raw syntax like **Bold** and [label](url). This
 * helper escapes all HTML first (XSS-safe), then applies a small, whitelisted
 * set of Markdown transforms so links/buttons render and stay clickable.
 *
 * Only http(s) and mailto links are allowed; everything else is left as text.
 */

const escapeHtml = ( str ) =>
	String( str )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#39;' );

const isSafeUrl = ( url ) => /^(https?:\/\/|mailto:)/i.test( url.trim() );

/**
 * Convert a Markdown string into a sanitized HTML string.
 *
 * @param {string} text Raw message content (Markdown).
 * @return {string} Safe HTML string.
 */
export const renderMarkdown = ( text ) => {
	if ( text === null || text === undefined ) return '';

	// 1. Escape everything so no raw HTML from the source survives.
	let html = escapeHtml( text );

	// 2. Links: [label](url) — only safe URLs become anchors.
	html = html.replace(
		/\[([^\]]+)\]\(([^)\s]+)\)/g,
		( match, label, url ) => {
			// URL was HTML-escaped above; decode entities for the check/href.
			const rawUrl = url
				.replace( /&amp;/g, '&' )
				.replace( /&#39;/g, "'" )
				.replace( /&quot;/g, '"' );
			if ( ! isSafeUrl( rawUrl ) ) {
				return match;
			}
			const safeHref = escapeHtml( rawUrl );
			return `<a class="aime-msg-link" href="${ safeHref }" target="_blank" rel="noopener noreferrer nofollow">${ label }</a>`;
		}
	);

	// 3. Bold (**text** or __text__).
	html = html.replace( /\*\*([^*]+)\*\*/g, '<strong>$1</strong>' );
	html = html.replace( /__([^_]+)__/g, '<strong>$1</strong>' );

	// 4. Italic (*text* or _text_), avoiding already-handled bold markers.
	html = html.replace( /(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>' );

	// 5. Inline code (`code`).
	html = html.replace( /`([^`]+)`/g, '<code>$1</code>' );

	// 6. Unordered list items ("* item" or "- item" at line start).
	html = html.replace( /^[ \t]*[*-][ \t]+(.+)$/gm, '<li>$1</li>' );
	html = html.replace( /(<li>[\s\S]*?<\/li>)/g, ( m ) =>
		m.includes( '</li>\n<li>' ) || m.includes( '</li><li>' )
			? `<ul>${ m }</ul>`
			: `<ul>${ m }</ul>`
	);

	// 7. Line breaks → <br> (after list handling so list lines stay grouped).
	html = html.replace( /\n/g, '<br>' );
	// Clean up <br> directly wrapping list markup.
	html = html
		.replace( /<br>\s*<ul>/g, '<ul>' )
		.replace( /<\/ul>\s*<br>/g, '</ul>' )
		.replace( /<\/li>\s*<br>\s*<li>/g, '</li><li>' );

	return html;
};

export default renderMarkdown;
