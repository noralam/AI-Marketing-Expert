/**
 * Bubble — floating trigger button.
 */

const ICONS = {
	chat: (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
			<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
		</svg>
	),
	help: (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
			<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
		</svg>
	),
	bot: (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
			<path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM9.5 16a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
		</svg>
	),
	support: (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
			<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-1.85 0-3.55-.63-4.9-1.69L12 14l4.9 4.31A7.96 7.96 0 0112 20zm6.32-3.12L12 11.56l-6.32 5.32A7.95 7.95 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8c0 1.85-.63 3.55-1.68 4.88z"/>
		</svg>
	),
	close: (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
			<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
		</svg>
	),
};

const Bubble = ( { isOpen, onClick, unreadCount, icon, buttonRef } ) => {
	let label = 'Open chat';
	if ( isOpen ) {
		label = 'Close chat';
	} else if ( unreadCount > 0 ) {
		label = `Open chat, ${ unreadCount } unread message${ unreadCount === 1 ? '' : 's' }`;
	}

	return (
		<button
			ref={ buttonRef }
			className={ `aime-chat-bubble${ isOpen ? ' aime-chat-bubble--open' : '' }` }
			onClick={ onClick }
			aria-label={ label }
			aria-expanded={ isOpen }
			aria-haspopup="dialog"
			type="button"
		>
			<span aria-hidden="true" style={ { display: 'contents' } }>
				{ isOpen ? ICONS.close : ( ICONS[ icon ] || ICONS.chat ) }
			</span>
			{ ! isOpen && unreadCount > 0 && (
				<span className="aime-chat-bubble-badge" aria-hidden="true">{ unreadCount }</span>
			) }
		</button>
	);
};

export default Bubble;
