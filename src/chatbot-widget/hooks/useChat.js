/**
 * useChat — core chat state management hook.
 *
 * Manages messages, conversation lifecycle, polling, and lead capture
 * using the public REST API endpoints.
 */
import { useState, useCallback, useRef } from '@wordpress/element';
import {
	getVisitorId,
	getConversationId,
	setConversationId,
	getConversationToken,
	setConversationToken,
	hasConsent,
	setConsent,
	hasLeadSubmitted,
	setLeadSubmitted as persistLeadSubmitted,
} from '../utils/storage';

// Single shared AudioContext, created lazily. Browsers cap the number of
// contexts per page, so we must never create a new one per beep.
let sharedAudioCtx = null;

/**
 * Lazily create the shared AudioContext and arm a one-time user-gesture
 * listener to resume it. Browsers block an AudioContext from starting until
 * the user has interacted with the page (autoplay policy), so creating/resuming
 * it on the first gesture avoids the "AudioContext was not allowed to start"
 * console warning.
 */
const getAudioCtx = () => {
	if ( sharedAudioCtx ) {
		return sharedAudioCtx;
	}
	const Ctx = window.AudioContext || window.webkitAudioContext;
	if ( ! Ctx ) {
		return null;
	}
	try {
		sharedAudioCtx = new Ctx();
	} catch ( e ) {
		return null;
	}

	// Resume the context on the first user gesture, then stop listening.
	const unlock = () => {
		if ( sharedAudioCtx && sharedAudioCtx.state === 'suspended' ) {
			sharedAudioCtx.resume().catch( () => {} );
		}
		document.removeEventListener( 'pointerdown', unlock );
		document.removeEventListener( 'keydown', unlock );
	};
	document.addEventListener( 'pointerdown', unlock, { once: true } );
	document.addEventListener( 'keydown', unlock, { once: true } );

	return sharedAudioCtx;
};

/**
 * Play a short notification beep using the Web Audio API.
 *
 * Silently no-ops if the AudioContext is still suspended (no user gesture yet),
 * which both prevents the autoplay-policy warning and avoids leaking contexts.
 */
const playNotificationSound = () => {
	try {
		const ctx = getAudioCtx();
		// Without a prior user gesture the context stays suspended; skip the
		// beep rather than trigger a blocked-autoplay warning.
		if ( ! ctx || ctx.state !== 'running' ) {
			return;
		}
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect( gain );
		gain.connect( ctx.destination );
		osc.type = 'sine';
		osc.frequency.setValueAtTime( 800, ctx.currentTime );
		osc.frequency.setValueAtTime( 600, ctx.currentTime + 0.1 );
		gain.gain.setValueAtTime( 0.3, ctx.currentTime );
		gain.gain.exponentialRampToValueAtTime( 0.01, ctx.currentTime + 0.3 );
		osc.start( ctx.currentTime );
		osc.stop( ctx.currentTime + 0.3 );
	} catch ( e ) {
		// Web Audio not supported or blocked — silent fallback.
	}
};

const useChat = ( config ) => {
	const { restUrl, nonce, botId } = config;
	const visitorIdRef = useRef( config.visitorId || getVisitorId() );

	const [ messages, setMessages ] = useState( [] );
	const [ conversationId, setConversationIdState ] = useState(
		() => getConversationId( botId ) || null
	);
	const [ isTyping, setIsTyping ] = useState( false );
	const [ isSending, setIsSending ] = useState( false );
	const [ unreadCount, setUnreadCount ] = useState( 0 );
	const [ consentGiven, setConsentGiven ] = useState(
		() => ! config.gdpr_enabled || hasConsent( botId )
	);
	const [ showLeadForm, setShowLeadForm ] = useState( () => {
		const lc = config.leadConfig || {};
		// "start" trigger: gate the chat with the lead form as soon as it opens.
		return !! ( lc.enabled && lc.trigger === 'start' && ! hasLeadSubmitted( botId ) );
	} );
	const [ leadSubmitted, setLeadSubmittedState ] = useState( () => hasLeadSubmitted( botId ) );
	const [ readReceiptId, setReadReceiptId ] = useState( 0 );
	const conversationTokenRef = useRef( getConversationToken( botId ) );

	// Keep a ref to the highest message ID we have, for polling.
	const lastMessageIdRef = useRef( 0 );
	// Track message count for lead form trigger.
	const visitorMsgCountRef = useRef( 0 );
	// Mirror conversationId in a ref for pollMessages (avoids stale closures).
	const conversationIdRef = useRef( conversationId );
	conversationIdRef.current = conversationId;
	// Prevent overlapping poll requests.
	const pollInFlightRef = useRef( false );
	// Mirror the window-open state so polls don't count messages the
	// visitor is already looking at (set via setWindowOpen from ChatWidget).
	const windowOpenRef = useRef( false );

	/**
	 * Generic fetch helper.
	 * Uses cache: 'no-store' to prevent browser from caching API responses.
	 */
	const apiFetch = useCallback(
		async ( endpoint, options = {} ) => {
			const base = restUrl.replace( /\/+$/, '' );
			// If restUrl already contains "?" (e.g. index.php?rest_route=...),
			// query params in the endpoint must be appended with "&" not "?".
			let url;
			const qIdx = endpoint.indexOf( '?' );
			if ( qIdx !== -1 ) {
				const path = endpoint.substring( 0, qIdx );
				const query = endpoint.substring( qIdx + 1 );
				const sep = base.indexOf( '?' ) !== -1 ? '&' : '?';
				url = base + path + sep + query;
			} else {
				url = base + endpoint;
			}
			const headers = {
				'Content-Type': 'application/json',
			};
			if ( nonce ) {
				headers[ 'X-WP-Nonce' ] = nonce;
			}
			const res = await fetch( url, {
				credentials: 'same-origin',
				cache: 'no-store',
				...options,
				headers: { ...headers, ...( options.headers || {} ) },
			} );
			const data = await res.json();
			if ( ! res.ok ) {
				throw new Error( data?.message || 'Request failed' );
			}
			return data;
		},
		[ restUrl, nonce ]
	);

	/**
	 * Update last message ID from a messages array.
	 */
	const updateLastId = ( msgs ) => {
		if ( msgs && msgs.length ) {
			const max = Math.max( ...msgs.map( ( m ) => Number( m.id ) || 0 ) );
			if ( max > lastMessageIdRef.current ) {
				lastMessageIdRef.current = max;
			}
		}
	};

	/**
	 * Start or resume a conversation.
	 */
	const startConversation = useCallback( async () => {
		try {
			const data = await apiFetch( '/start', {
				method: 'POST',
				body: JSON.stringify( {
					bot_id: botId,
					visitor_id: visitorIdRef.current,
					conversation_token: conversationTokenRef.current,
					page_url: window.location.href,
					source: 'widget',
				} ),
			} );

			const convId = String( data.conversation_id );
			conversationTokenRef.current = data.conversation_token || null;
			setConversationToken( botId, data.conversation_token );
			setConversationIdState( convId );
			setConversationId( botId, convId );
			// Update the ref immediately so callers awaiting this function
			// (e.g. submitLead) see the new ID before the next render.
			conversationIdRef.current = convId;

			if ( data.messages && data.messages.length ) {
				// Merge: use the server's ordered list as canonical,
				// keeping any newer messages from concurrent polls.
				setMessages( ( prev ) => {
					if ( ! prev.length ) return data.messages;
					const serverMaxId = Math.max(
						...data.messages.map( ( m ) => Number( m.id ) || 0 )
					);
					const newer = prev.filter( ( m ) => {
						const n = Number( m.id );
						return ! isNaN( n ) && n > serverMaxId;
					} );
					return newer.length
						? [ ...data.messages, ...newer ]
						: data.messages;
				} );
				updateLastId( data.messages );

				// Derive read receipt from resumed messages.
				const readMax = Math.max(
					0,
					...data.messages
						.filter( ( m ) => m.sender_type === 'visitor' && Number( m.is_read ) === 1 )
						.map( ( m ) => Number( m.id ) || 0 )
				);
				if ( readMax > 0 ) {
					setReadReceiptId( readMax );
				}
			}
		} catch ( err ) {
			// eslint-disable-next-line no-console
			console.error( '[AIME Chatbot] Start error:', err.message );
			return null;
		}
		return conversationIdRef.current;
	}, [ apiFetch, botId ] );
	/**
	 * Send a visitor message.
	 */
	const sendMessage = useCallback(
		async ( text ) => {
			if ( ! conversationId || ! text.trim() || isSending ) return;

			setIsSending( true );
			setIsTyping( true );

			// Optimistically add visitor message.
			const tempId = 'temp-' + Date.now();
			const visitorMsg = {
				id: tempId,
				sender_type: 'visitor',
				content: text,
				content_type: 'text',
				metadata: {},
				created_at: new Date().toISOString(),
			};
			setMessages( ( prev ) => [ ...prev, visitorMsg ] );

			try {
				const data = await apiFetch( '/message', {
					method: 'POST',
					body: JSON.stringify( {
						conversation_id: Number( conversationId ),
						visitor_id: visitorIdRef.current,
						conversation_token: conversationTokenRef.current,
						content: text,
					} ),
				} );

				// Replace temp with real ID.
				setMessages( ( prev ) =>
					prev.map( ( m ) =>
						m.id === tempId
							? { ...m, id: data.visitor_message_id }
							: m
					)
				);

				// Append AI response if present.
				if ( data.ai_response ) {
					setMessages( ( prev ) => [ ...prev, data.ai_response ] );
					updateLastId( [ data.ai_response ] );

					// Play sound for AI reply.
					if ( config.sound_enabled ) {
						playNotificationSound();
					}
				}

				if ( data.visitor_message_id ) {
					lastMessageIdRef.current = Math.max(
						lastMessageIdRef.current,
						data.visitor_message_id
					);
				}

				// Track visitor message count for lead form trigger.
				visitorMsgCountRef.current += 1;
				const leadConfig = config.leadConfig || {};
				const trigger = leadConfig.trigger || 'after_messages';
				const triggerAfter = leadConfig.trigger_count || leadConfig.trigger_after_messages || 3;
				if (
					leadConfig.enabled &&
					! leadSubmitted &&
					trigger === 'after_messages' &&
					visitorMsgCountRef.current >= triggerAfter
				) {
					setShowLeadForm( true );
				}

				if (
					leadConfig.enabled &&
					! leadSubmitted &&
					trigger === 'ai_intent' &&
					data.ai_response?.actions?.some( ( action ) => action.type === 'lead_capture' )
				) {
					setShowLeadForm( true );
				}
			} catch ( err ) {
				// Remove optimistic message on error.
				setMessages( ( prev ) =>
					prev.filter( ( m ) => m.id !== tempId )
				);
				// eslint-disable-next-line no-console
				console.error( '[AIME Chatbot] Send error:', err.message );
			} finally {
				setIsSending( false );
				setIsTyping( false );
			}
		},
		[ conversationId, isSending, apiFetch, config.leadConfig, leadSubmitted ]
	);

	/**
	 * Poll for new messages (AI/agent responses, system messages).
	 *
	 * Reads conversationId from a ref (not closure state) so it always
	 * uses the latest value even if the callback hasn't been recreated.
	 * Guarded against concurrent in-flight requests.
	 */
	const pollMessages = useCallback( async () => {
		const cid = conversationIdRef.current;
		// Wait for a valid conversation token before polling. On page reload the
		// conversation ID is restored from storage immediately, but the token is
		// fetched asynchronously by startConversation(); polling without it yields
		// a 403 "Invalid conversation token".
		if ( ! cid || ! conversationTokenRef.current || pollInFlightRef.current ) return;

		pollInFlightRef.current = true;

		try {
			const data = await apiFetch(
				`/poll/${ cid }?visitor_id=${ encodeURIComponent(
					visitorIdRef.current
				) }&conversation_token=${ encodeURIComponent(
					conversationTokenRef.current || ''
				) }&after=${ lastMessageIdRef.current }&_=${ Date.now() }`,
				{ method: 'GET' }
			);

			if ( data.messages && data.messages.length ) {
				let freshCount = 0;
				setMessages( ( prev ) => {
					const existingIds = new Set( prev.map( ( m ) => Number( m.id ) ).filter( Boolean ) );
					const fresh = data.messages.filter( ( m ) => ! existingIds.has( Number( m.id ) ) );
					if ( fresh.length ) {
						freshCount = fresh.length;
						// Play sound notification for new incoming messages.
						if ( config.sound_enabled ) {
							playNotificationSound();
						}
						return [ ...prev, ...fresh ];
					}
					return prev;
				} );
				updateLastId( data.messages );
				// Badge only counts genuinely new messages, and only while
				// the window is closed (open window = already read).
				if ( freshCount && ! windowOpenRef.current ) {
					setUnreadCount( ( prev ) => prev + freshCount );
				}
			}

			// Update read receipt ID from poll response.
			if ( data.read_receipt_id ) {
				setReadReceiptId( ( prev ) => Math.max( prev, Number( data.read_receipt_id ) || 0 ) );
			}

			// Auto-close if conversation was closed server-side.
			if ( data.status === 'closed' ) {
				setMessages( ( prev ) => {
					if ( prev.some( ( m ) => m.id === 'system-closed' ) ) return prev;
					return [
						...prev,
						{
							id: 'system-closed',
							sender_type: 'system',
							content: 'This conversation has ended.',
							created_at: new Date().toISOString(),
						},
					];
				} );
			}
		} catch ( err ) {
			// eslint-disable-next-line no-console
			console.error( '[AIME Chatbot] Poll error:', err.message );
		} finally {
			pollInFlightRef.current = false;
		}
	}, [ apiFetch ] ); // Stable — no state in deps, reads from refs

	/**
	 * Submit lead information.
	 */
	const submitLead = useCallback(
		async ( formData ) => {
			// The "start" lead gate can render before the conversation exists —
			// create/resume one on demand so the lead has somewhere to attach.
			let cid = conversationIdRef.current;
			if ( ! cid ) {
				cid = await startConversation();
			}
			if ( ! cid ) {
				throw new Error( 'Could not start the conversation. Please try again.' );
			}

			try {
				await apiFetch( '/lead', {
					method: 'POST',
					body: JSON.stringify( {
						conversation_id: Number( cid ),
						visitor_id: visitorIdRef.current,
						conversation_token: conversationTokenRef.current,
						email: formData.email,
						name: formData.name || '',
						phone: formData.phone || '',
						company: formData.company || '',
					} ),
				} );

				setLeadSubmittedState( true );
				persistLeadSubmitted( botId );
				setShowLeadForm( false );
			} catch ( err ) {
				// eslint-disable-next-line no-console
				console.error( '[AIME Chatbot] Lead error:', err.message );
				throw err;
			}
		},
		[ apiFetch, botId, startConversation ]
	);

	/**
	 * GDPR consent.
	 */
	const giveConsent = useCallback( () => {
		setConsentGiven( true );
		setConsent( botId );
	}, [ botId ] );

	/**
	 * Dismiss lead form.
	 */
	const dismissLeadForm = useCallback( () => {
		setShowLeadForm( false );
	}, [] );

	/**
	 * Reset unread count (called when user opens the window).
	 */
	const clearUnread = useCallback( () => {
		setUnreadCount( 0 );
	}, [] );

	/**
	 * Inform the hook whether the chat window is open, so polls don't
	 * count messages the visitor is already reading.
	 */
	const setWindowOpen = useCallback( ( open ) => {
		windowOpenRef.current = open;
		if ( open ) {
			setUnreadCount( 0 );
		}
	}, [] );

	return {
		messages,
		conversationId,
		isTyping,
		isSending,
		unreadCount,
		consentGiven,
		showLeadForm,
		leadSubmitted,
		readReceiptId,
		startConversation,
		sendMessage,
		pollMessages,
		submitLead,
		giveConsent,
		dismissLeadForm,
		clearUnread,
		setWindowOpen,
	};
};

export default useChat;
