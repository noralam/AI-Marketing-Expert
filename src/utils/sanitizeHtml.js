/**
 * sanitizeHtml — single choke point for every dangerouslySetInnerHTML sink.
 *
 * DOMPurify with the standard HTML profile: strips <script>, event-handler
 * attributes (onerror, onclick, …), javascript: URLs, and other executable
 * vectors while preserving presentational HTML — tables, inline styles and
 * <style> blocks (needed for email previews), images, links.
 *
 * `target` is re-allowed so chat links keep opening in a new tab; DOMPurify
 * pairs it with a forced noopener via the afterSanitizeAttributes hook below.
 */

import DOMPurify from 'dompurify';

const CONFIG = {
	USE_PROFILES: { html: true },
	ADD_ATTR: [ 'target' ],
};

// Any element with target must also carry rel="noopener noreferrer" so a
// sanitized link can never reach window.opener.
DOMPurify.addHook( 'afterSanitizeAttributes', ( node ) => {
	if ( node.tagName === 'A' && node.getAttribute( 'target' ) ) {
		node.setAttribute( 'rel', 'noopener noreferrer nofollow' );
	}
} );

/**
 * Sanitize an HTML string for safe injection via dangerouslySetInnerHTML.
 *
 * @param {string} html Untrusted HTML (AI output, stored templates, …).
 * @return {string} Sanitized HTML.
 */
const sanitizeHtml = ( html ) =>
	DOMPurify.sanitize( String( html ?? '' ), CONFIG );

export default sanitizeHtml;
