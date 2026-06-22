/**
 * MessageList — scrollable message thread with auto-scroll.
 */

import { useRef, useEffect } from '@wordpress/element';
import MessageBubble from './MessageBubble';

const MessageList = ( { messages, isTyping, readReceiptId } ) => {
	const listRef = useRef( null );
	const isNearBottomRef = useRef( true );
	const prevCountRef = useRef( 0 );

	const handleScroll = () => {
		const el = listRef.current;
		if ( ! el ) return;
		const distanceFromBottom =
			el.scrollHeight - el.scrollTop - el.clientHeight;
		isNearBottomRef.current = distanceFromBottom < 80;
	};

	useEffect( () => {
		if ( ! listRef.current ) return;
		const grew = messages.length > prevCountRef.current;
		const isFirstLoad = prevCountRef.current === 0;
		prevCountRef.current = messages.length;
		// Scroll on first load, when typing, or on new messages only while the
		// visitor is near the bottom — so scrolling up to read is not interrupted.
		if ( isFirstLoad || isTyping || ( grew && isNearBottomRef.current ) ) {
			listRef.current.scrollTop = listRef.current.scrollHeight;
		}
	}, [ messages, isTyping ] );

	return (
		<div className="aime-chat-messages" ref={ listRef } onScroll={ handleScroll } role="log" aria-live="polite">
			{ messages.map( ( msg ) => (
				<MessageBubble
					key={ msg.id || msg.tempId }
					message={ msg }
					readReceiptId={ readReceiptId }
				/>
			) ) }
			{ isTyping && (
				<div className="aime-chat-msg aime-chat-msg--bot">
					<div className="aime-chat-msg-avatar">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
							<path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
						</svg>
					</div>
					<div className="aime-chat-typing-dots">
						<span className="aime-chat-typing-dot" />
						<span className="aime-chat-typing-dot" />
						<span className="aime-chat-typing-dot" />
					</div>
				</div>
			) }
		</div>
	);
};

export default MessageList;
