/**
 * storage.js — localStorage helpers for visitor identity & conversation persistence.
 */

const PREFIX = 'aime_chat_';

/**
 * Generate a UUID v4.
 */
function uuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, ( c ) => {
		const r = ( Math.random() * 16 ) | 0;
		const v = c === 'x' ? r : ( r & 0x3 ) | 0x8;
		return v.toString( 16 );
	} );
}

/**
 * Get or create a visitor ID.
 */
export function getVisitorId() {
	const key = PREFIX + 'visitor_id';
	let id = null;
	try {
		id = localStorage.getItem( key );
	} catch ( e ) {
		// localStorage may be blocked
	}
	if ( ! id ) {
		id = uuid();
		try {
			localStorage.setItem( key, id );
		} catch ( e ) {
			// silent
		}
		// Also set as cookie for server-side access
		document.cookie = `aime_visitor_id=${ id };path=/;max-age=31536000;SameSite=Lax`;
	}
	return id;
}

/**
 * Get stored conversation ID for a given bot.
 */
export function getConversationId( botId ) {
	try {
		return localStorage.getItem( PREFIX + 'conv_' + botId ) || null;
	} catch ( e ) {
		return null;
	}
}

/**
 * Save conversation ID for a given bot.
 */
export function setConversationId( botId, convId ) {
	try {
		localStorage.setItem( PREFIX + 'conv_' + botId, convId );
	} catch ( e ) {
		// silent
	}
}

/**
 * Get stored conversation token for a given bot.
 */
export function getConversationToken( botId ) {
	try {
		return localStorage.getItem( PREFIX + 'token_' + botId ) || null;
	} catch ( e ) {
		return null;
	}
}

/**
 * Save conversation token for a given bot.
 */
export function setConversationToken( botId, token ) {
	try {
		if ( token ) {
			localStorage.setItem( PREFIX + 'token_' + botId, token );
		}
	} catch ( e ) {
		// silent
	}
}

/**
 * Clear conversation for a given bot.
 */
export function clearConversation( botId ) {
	try {
		localStorage.removeItem( PREFIX + 'conv_' + botId );
		localStorage.removeItem( PREFIX + 'token_' + botId );
		localStorage.removeItem( PREFIX + 'consent_' + botId );
	} catch ( e ) {
		// silent
	}
}

/**
 * GDPR consent state.
 */
export function hasConsent( botId ) {
	try {
		return localStorage.getItem( PREFIX + 'consent_' + botId ) === '1';
	} catch ( e ) {
		return false;
	}
}

export function setConsent( botId ) {
	try {
		localStorage.setItem( PREFIX + 'consent_' + botId, '1' );
	} catch ( e ) {
		// silent
	}
}

/**
 * Lead submitted state (persisted so the "start" lead gate doesn't reappear).
 */
export function hasLeadSubmitted( botId ) {
	try {
		return localStorage.getItem( PREFIX + 'lead_' + botId ) === '1';
	} catch ( e ) {
		return false;
	}
}

export function setLeadSubmitted( botId ) {
	try {
		localStorage.setItem( PREFIX + 'lead_' + botId, '1' );
	} catch ( e ) {
		// silent
	}
}
