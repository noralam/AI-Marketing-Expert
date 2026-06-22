/**
 * MessageBubble — individual message display.
 */

import { renderMarkdown } from '../../utils/renderMessage';

/**
 * Parse a created_at timestamp. Server sends MySQL UTC datetime
 * ("2026-03-02 06:51:34") while optimistic messages use ISO.
 */
const formatTime = ( dt ) => {
	if ( ! dt ) return '';
	// Already ISO with timezone → use as-is; otherwise append Z for UTC.
	const d = ( dt.includes( 'T' ) || dt.endsWith( 'Z' ) )
		? new Date( dt )
		: new Date( dt.replace( ' ', 'T' ) + 'Z' );
	if ( isNaN( d.getTime() ) ) return '';
	return d.toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
};

const MessageBubble = ( { message, readReceiptId } ) => {
	const { sender_type, content, created_at } = message;
	const isVisitor = sender_type === 'visitor';
	const isSystem = sender_type === 'system';

	if ( isSystem ) {
		return (
			<div className="aime-chat-msg aime-chat-msg--system">
				<div className="aime-chat-msg-system">{ content }</div>
			</div>
		);
	}
	// Read receipt: show double-check if visitor message ID ≤ readReceiptId.
	const isRead = isVisitor && readReceiptId > 0 && Number( message.id ) <= readReceiptId;

	return (
		<div className={ `aime-chat-msg aime-chat-msg--${ isVisitor ? 'visitor' : 'bot' }` }>
			{ ! isVisitor && (
				<div className="aime-chat-msg-avatar">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
						<path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
					</svg>
				</div>
			) }
			<div className="aime-chat-msg-bubble">
				<div
					className="aime-chat-msg-text"
					/* eslint-disable-next-line react/no-danger */
					dangerouslySetInnerHTML={ { __html: renderMarkdown( content ) } }
				/>
				<div className="aime-chat-msg-meta">
					{ created_at && (
						<span className="aime-chat-msg-time">
							{ formatTime( created_at ) }
						</span>
					) }
					{ isVisitor && (
						<span className={ `aime-chat-msg-status${ isRead ? ' aime-chat-msg-status--read' : '' }` }>
							{ isRead ? (
								/* Double checkmark — read */
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<path d="M18 7l-8 8-3-3" />
									<path d="M22 7l-8 8" />
								</svg>
							) : (
								/* Single checkmark — sent */
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<path d="M20 6L9 17l-5-5" />
								</svg>
							) }
						</span>
					) }
				</div>
			</div>
		</div>
	);
};

export default MessageBubble;
