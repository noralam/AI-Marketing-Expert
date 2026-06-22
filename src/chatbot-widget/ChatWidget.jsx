/**
 * Chat Widget — main component: bubble + window.
 */

import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import Bubble from './components/Bubble';
import ChatWindow from './components/ChatWindow';
import useChat from './hooks/useChat';

/**
 * Darken a hex colour by a percentage.
 */
function darkenColor( hex, percent ) {
	const num = parseInt( hex.replace( '#', '' ), 16 );
	const r = Math.max( 0, ( num >> 16 ) - Math.round( 2.55 * percent ) );
	const g = Math.max( 0, ( ( num >> 8 ) & 0x00ff ) - Math.round( 2.55 * percent ) );
	const b = Math.max( 0, ( num & 0x0000ff ) - Math.round( 2.55 * percent ) );
	return `#${ ( ( 1 << 24 ) | ( r << 16 ) | ( g << 8 ) | b ).toString( 16 ).slice( 1 ) }`;
}

function isDark( hex ) {
	const num = parseInt( hex.replace( '#', '' ), 16 );
	const r = num >> 16;
	const g = ( num >> 8 ) & 0x00ff;
	const b = num & 0x0000ff;
	// Perceived brightness formula.
	return ( r * 299 + g * 587 + b * 114 ) / 1000 < 128;
}

const ChatWidget = ( { config } ) => {
	const [ isOpen, setIsOpen ] = useState( false );
	const chat = useChat( config );

	// Resume an existing conversation on first mount so old messages show.
	const resumedRef = useRef( false );
	useEffect( () => {
		if ( ! resumedRef.current && chat.conversationId && chat.messages.length === 0 ) {
			resumedRef.current = true;
			chat.startConversation();
		}
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	const toggle = useCallback( () => {
		setIsOpen( ( prev ) => {
			if ( ! prev && ! chat.conversationId ) {
				chat.startConversation();
			}
			return ! prev;
		} );
	}, [ chat ] );

	// Poll for new messages — always when there's an active conversation,
	// so agent messages & sound notifications work even when minimised.
	const pollRef = useRef( chat.pollMessages );
	pollRef.current = chat.pollMessages;

	useEffect( () => {
		if ( ! chat.conversationId ) return;
		// Immediate poll to catch any missed messages.
		pollRef.current();
		const interval = setInterval( () => {
			pollRef.current();
		}, ( config.poll_interval || 5 ) * 1000 );
		return () => clearInterval( interval );
	}, [ chat.conversationId, config.poll_interval ] );

	const position = config.position || 'bottom-right';

	// Build CSS custom property overrides from theme config.
	const isDarkBg = config.bgColor && isDark( config.bgColor );
	const themeVars = {
		'--aime-chat-primary': config.primary_color || undefined,
		'--aime-chat-primary-hover': config.primary_color ? darkenColor( config.primary_color, 15 ) : undefined,
		'--aime-chat-offset-y': `${ Number( config.offset_y || 0 ) }px`,
		'--aime-chat-offset-x': `${ Number( config.offset_x || 0 ) }px`,
		'--aime-chat-bg': config.bgColor || undefined,
		'--aime-chat-surface': config.aiBubbleBg || undefined,
		'--aime-chat-text': isDarkBg ? '#e2e8f0' : undefined,
		'--aime-chat-text-muted': isDarkBg ? '#94a3b8' : undefined,
		'--aime-chat-border': isDarkBg ? 'rgba(255,255,255,0.1)' : undefined,
		'--aime-chat-radius': config.borderRadius != null ? `${ config.borderRadius }px` : undefined,
		'--aime-chat-header-bg': config.headerBg || undefined,
		'--aime-chat-header-text': config.headerText || undefined,
		'--aime-chat-user-bubble-bg': config.userBubbleBg || undefined,
		'--aime-chat-user-bubble-text': config.userBubbleText || undefined,
		'--aime-chat-ai-bubble-bg': config.aiBubbleBg || undefined,
		'--aime-chat-ai-bubble-text': config.aiBubbleText || undefined,
		'--aime-chat-bubble-bg': config.bubbleBg || undefined,
		'--aime-chat-bubble-text': config.bubbleText || undefined,
		'--aime-chat-input-bg': config.inputBg || undefined,
	};

	// Remove undefined values.
	Object.keys( themeVars ).forEach( ( k ) => {
		if ( themeVars[ k ] === undefined ) delete themeVars[ k ];
	} );

	return (
		<div
			className={ `aime-chat-widget aime-chat-widget--${ position } aime-chat-theme--${ config.theme || 'default' }` }
			style={ themeVars }
		>
			{ isOpen && (
				<ChatWindow
					config={ config }
					chat={ chat }
					onClose={ toggle }
				/>
			) }
			<Bubble
				isOpen={ isOpen }
				onClick={ toggle }
				unreadCount={ chat.unreadCount }
				icon={ config.bubble_icon || 'chat' }
			/>
		</div>
	);
};

export default ChatWidget;
