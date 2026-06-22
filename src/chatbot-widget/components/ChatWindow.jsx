/**
 * ChatWindow — expanded chat container with header, messages, input.
 */

import { useRef, useEffect } from '@wordpress/element';
import MessageList from './MessageList';
import InputBar from './InputBar';
import LeadForm from './LeadForm';
import PoweredBy from './PoweredBy';

const ChatWindow = ( { config, chat, onClose } ) => {
	const windowRef = useRef( null );

	// Focus trap
	useEffect( () => {
		const el = windowRef.current;
		if ( el ) {
			const focusable = el.querySelector( 'input, textarea, button' );
			focusable?.focus();
		}
	}, [] );

	return (
		<div className="aime-chat-window" ref={ windowRef } role="dialog" aria-label="Chat">
			{ /* Header */ }
			<div className="aime-chat-header">
				<div className="aime-chat-header-info">
					<div className="aime-chat-avatar">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
							<path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
						</svg>
					</div>
					<div>
						<div className="aime-chat-header-name">{ config.bot_name || 'Chat Assistant' }</div>
						<div className="aime-chat-header-status">
							{ chat.isTyping ? 'Typing…' : 'Online' }
						</div>
					</div>
				</div>
				<button className="aime-chat-header-close" onClick={ onClose } aria-label="Close" type="button">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
						<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
					</svg>
				</button>
			</div>

			{ /* GDPR consent gate */ }
			{ config.gdpr_enabled && ! chat.consentGiven ? (
				<div className="aime-chat-consent">
					<p>{ config.consent_message || 'We use cookies and chat data to provide you with the best support experience. By starting this chat, you consent to our collection and use of this data in accordance with our Privacy Policy. You can end the chat at any time.' }</p>
					<button
						className="aime-chat-consent-btn"
						onClick={ chat.giveConsent }
						type="button"
					>
						I agree, start chat
					</button>
				</div>
			) : (
				<>
					{ /* Messages */ }
					<MessageList
						messages={ chat.messages }
						isTyping={ config.enable_typing_indicator !== false && chat.isTyping }
						readReceiptId={ config.enable_read_receipts !== false ? chat.readReceiptId : 0 }
					/>

					{ /* Lead form (inline) */ }
					{ chat.showLeadForm && ! chat.leadSubmitted && (
						<LeadForm
							config={ config.leadConfig || {} }
							onSubmit={ chat.submitLead }
							onDismiss={ chat.dismissLeadForm }
						/>
					) }

					{ /* Input */ }
					<InputBar
						onSend={ chat.sendMessage }
						disabled={ chat.isSending }
						maxLength={ config.max_message_length || 500 }
					/>
				</>
			) }

			{ /* Powered by */ }
			{ ! config.hide_branding && <PoweredBy /> }
		</div>
	);
};

export default ChatWindow;
