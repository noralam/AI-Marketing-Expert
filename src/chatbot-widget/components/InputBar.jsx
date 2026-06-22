/**
 * InputBar — message input with send button.
 */
import { useState, useRef, useId } from '@wordpress/element';

const InputBar = ( { onSend, disabled, maxLength, placeholder } ) => {
	const [ text, setText ] = useState( '' );
	const inputRef = useRef();
	const fieldId = useId();

	const handleSend = () => {
		const trimmed = text.trim();
		if ( ! trimmed || disabled ) return;
		onSend( trimmed );
		setText( '' );
		inputRef.current?.focus();
	};

	const handleKeyDown = ( e ) => {
		if ( e.key === 'Enter' && ! e.shiftKey ) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="aime-chat-input">
			<textarea
				ref={ inputRef }
				id={ `aime-chat-message-${ fieldId }` }
				name="aime_chat_message"
				className="aime-chat-input-field"
				rows="1"
				value={ text }
				onChange={ ( e ) => setText( e.target.value.slice( 0, maxLength || 500 ) ) }
				onKeyDown={ handleKeyDown }
				placeholder={ placeholder || 'Type a message…' }
				disabled={ disabled }
				aria-label="Message input"
			/>
			<button
				className="aime-chat-input-send"
				onClick={ handleSend }
				disabled={ disabled || ! text.trim() }
				aria-label="Send message"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
					<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
				</svg>
			</button>
		</div>
	);
};

export default InputBar;
