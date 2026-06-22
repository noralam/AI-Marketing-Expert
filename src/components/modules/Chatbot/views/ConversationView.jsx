/**
 * Conversation View - message thread with admin reply (human takeover).
 */

import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextareaControl, Spinner } from '@aime/wp-components';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ProGate from '../../../common/ProGate';
import { ProUpgradeButton } from '../../../common/ProLock';
import { toast } from '../../../common/Toast';
import { renderMarkdown } from '../../../../utils/renderMessage';

const SENDER_COLORS = {
	visitor: '#e3f2fd',
	ai: '#f3e5f5',
	bot: '#f3e5f5',
	agent: '#e8f5e9',
	system: '#fff3e0',
};

const SENDER_LABELS = {
	visitor: 'Visitor',
	ai: 'AI Bot',
	bot: 'AI Bot',
	agent: 'Agent',
	system: 'System',
};

const ConversationView = ( { id, onBack } ) => {
	const { get, post, loading, error, clearError } = useApi();
	const { hasPro } = usePro();
	const [ conversation, setConversation ] = useState( null );
	const [ messages, setMessages ] = useState( [] );
	const [ reply, setReply ] = useState( '' );
	const [ sending, setSending ] = useState( false );
	const messagesEndRef = useRef( null );
	const threadRef = useRef( null );
	// Only auto-scroll when the admin is already near the bottom, so reading
	// earlier messages is not interrupted by the 5s polling refresh.
	const isNearBottomRef = useRef( true );
	const prevCountRef = useRef( 0 );

	const fetchConversation = useCallback( async () => {
		try {
			const res = await get( `/chatbot/conversations/${ id }` );
			setConversation( res.conversation || res );
			setMessages( res.messages || [] );
		} catch ( e ) {
			// silent
		}
	}, [ get, id ] );

	useEffect( () => {
		fetchConversation();
	}, [ fetchConversation ] );

	/* Auto-refresh messages every 5 seconds for live chat experience */
	const fetchRef = useRef( fetchConversation );
	fetchRef.current = fetchConversation;
	useEffect( () => {
		const interval = setInterval( () => {
			fetchRef.current();
		}, 5000 );
		return () => clearInterval( interval );
	}, [] );

	const handleThreadScroll = useCallback( () => {
		const el = threadRef.current;
		if ( ! el ) return;
		const distanceFromBottom =
			el.scrollHeight - el.scrollTop - el.clientHeight;
		isNearBottomRef.current = distanceFromBottom < 80;
	}, [] );

	useEffect( () => {
		const grew = messages.length > prevCountRef.current;
		const isFirstLoad = prevCountRef.current === 0;
		prevCountRef.current = messages.length;
		// Scroll on first load, or on new messages only while near the bottom.
		if ( isFirstLoad || ( grew && isNearBottomRef.current ) ) {
			messagesEndRef.current?.scrollIntoView( {
				behavior: isFirstLoad ? 'auto' : 'smooth',
			} );
		}
	}, [ messages ] );

	const handleTakeover = async () => {
		try {
			await post( `/chatbot/conversations/${ id }/takeover` );
			toast( __( 'You have taken over this conversation.', 'ai-marketing-expert' ) );
			fetchConversation();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleClose = async () => {
		try {
			await post( `/chatbot/conversations/${ id }/close` );
			toast( __( 'Conversation closed.', 'ai-marketing-expert' ) );
			fetchConversation();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleSendReply = async () => {
		if ( ! reply.trim() ) return;
		setSending( true );
		try {
			await post( `/chatbot/conversations/${ id }/message`, { content: reply } );
			setReply( '' );
			fetchConversation();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSending( false );
		}
	};

	const handleExport = async () => {
		try {
			const res = await get( `/chatbot/conversations/${ id }/export` );
			const blob = new Blob( [ res.csv || '' ], { type: 'text/csv' } );
			const url = URL.createObjectURL( blob );
			const a = document.createElement( 'a' );
			a.href = url;
			a.download = `conversation-${ id }.csv`;
			a.click();
			URL.revokeObjectURL( url );
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	if ( loading && ! conversation ) {
		return <Loader text={ __( 'Loading conversation...', 'ai-marketing-expert' ) } />;
	}

	if ( ! conversation ) return null;

	const isActive = conversation.status === 'active' || conversation.status === 'human_takeover';
	const isTakeover = conversation.status === 'human_takeover';

	return (
		<div className="aime-conversation-view">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<h2>
					<Button variant="link" onClick={ onBack } style={ { marginRight: 8 } }>
						{ '\u2190' } { __( 'Back', 'ai-marketing-expert' ) }
					</Button>
					{ __( 'Conversation', 'ai-marketing-expert' ) }
					{ conversation.visitor_name && ` \u2014 ${ conversation.visitor_name }` }
				</h2>
				<div className="aime-page-header-actions">
					<Button variant="secondary" onClick={ hasPro ? handleExport : undefined } disabled={ ! hasPro }>
						{ hasPro ? __( 'Export CSV', 'ai-marketing-expert' ) : __( 'Export CSV (Pro)', 'ai-marketing-expert' ) }
					</Button>
					{ isActive && ! isTakeover && (
						<Button variant="primary" onClick={ hasPro ? handleTakeover : undefined } disabled={ ! hasPro }>
							{ hasPro ? __( 'Take Over', 'ai-marketing-expert' ) : __( 'Take Over (Pro)', 'ai-marketing-expert' ) }
						</Button>
					) }
					{ ! hasPro && <ProUpgradeButton /> }
					{ isActive && (
						<Button variant="secondary" isDestructive onClick={ handleClose }>
							{ __( 'Close Conversation', 'ai-marketing-expert' ) }
						</Button>
					) }
				</div>
			</div>

			{ /* Visitor info */ }
			<Card className="aime-conversation-info">
				<div className="aime-form-grid aime-form-grid-4">
					<div>
						<strong>{ __( 'Visitor', 'ai-marketing-expert' ) }</strong>
						<div>{ conversation.visitor_name || __( 'Anonymous', 'ai-marketing-expert' ) }</div>
					</div>
					<div>
						<strong>{ __( 'Email', 'ai-marketing-expert' ) }</strong>
						<div>{ conversation.visitor_email || '\u2014' }</div>
					</div>
					<div>
						<strong>{ __( 'Status', 'ai-marketing-expert' ) }</strong>
						<div>
							<span
								className="aime-status-badge"
								style={ { background: conversation.status === 'active' ? '#4caf50' : conversation.status === 'human_takeover' ? '#ff9800' : '#9e9e9e' } }
							>
								{ conversation.status === 'human_takeover' ? 'Human Takeover' : conversation.status }
							</span>
						</div>
					</div>
					<div>
						<strong>{ __( 'Started', 'ai-marketing-expert' ) }</strong>
						<div>{ conversation.created_at }</div>
					</div>
				</div>
			</Card>

			{ /* Messages thread */ }
			<Card title={ __( 'Messages', 'ai-marketing-expert' ) }>
				<div ref={ threadRef } onScroll={ handleThreadScroll } className="aime-messages-thread" style={ { maxHeight: 500, overflowY: 'auto', padding: '16px 0' } }>
					{ messages.length === 0 ? (
						<p className="aime-empty-msg">{ __( 'No messages in this conversation.', 'ai-marketing-expert' ) }</p>
					) : (
						messages.map( ( msg ) => (
							<div
								key={ msg.id }
								className={ `aime-message-bubble aime-message-${ msg.sender_type }` }
								style={ {
									background: SENDER_COLORS[ msg.sender_type ] || '#f5f5f5',
									padding: '12px 16px',
									borderRadius: 12,
									marginBottom: 8,
									maxWidth: '80%',
									marginLeft: msg.sender_type === 'visitor' ? 0 : 'auto',
									marginRight: msg.sender_type === 'visitor' ? 'auto' : 0,
								} }
							>
								<div style={ { fontSize: 11, color: '#666', marginBottom: 4 } }>
									<strong>{ SENDER_LABELS[ msg.sender_type ] || msg.sender_type }</strong>
									<span style={ { marginLeft: 8 } }>{ msg.created_at }</span>
								</div>
								<div
									className="aime-message-content"
									style={ { fontSize: 14, lineHeight: 1.5 } }
									/* eslint-disable-next-line react/no-danger */
									dangerouslySetInnerHTML={ { __html: renderMarkdown( msg.content ) } }
								/>
							</div>
						) )
					) }
					<div ref={ messagesEndRef } />
				</div>

				{ /* Admin reply input (requires human takeover) */ }
				{ isActive && (
					<div style={ { borderTop: '1px solid #e0e0e0', paddingTop: 16, marginTop: 16 } }>
						{ isTakeover || ! hasPro ? (
							<>
								{ ! hasPro && ! isTakeover ? (
									<ProGate
										feature={ __( 'Human Takeover', 'ai-marketing-expert' ) }
										description={ __( 'Reply to visitors directly by taking over conversations from the AI.', 'ai-marketing-expert' ) }
									/>
								) : (
									<div className="aime-reply-box">
										<TextareaControl
											label={ __( 'Reply as Agent', 'ai-marketing-expert' ) }
											value={ reply }
											onChange={ setReply }
											rows={ 3 }
											placeholder={ __( 'Type your message...', 'ai-marketing-expert' ) }
										/>
										<Button
											variant="primary"
											onClick={ handleSendReply }
											isBusy={ sending }
											disabled={ sending || ! reply.trim() }
										>
											{ sending
												? <><Spinner style={ { marginRight: 4 } } />{ __( 'Sending...', 'ai-marketing-expert' ) }</>
												: __( 'Send Reply', 'ai-marketing-expert' )
											}
										</Button>
									</div>
								) }
							</>
						) : (
							<Notice
								type="info"
								message={ __( 'Click "Take Over" to reply to this conversation as an agent. The AI will stop responding.', 'ai-marketing-expert' ) }
							/>
						) }
					</div>
				) }

				{ conversation.status === 'closed' && (
					<Notice type="info" message={ __( 'This conversation is closed.', 'ai-marketing-expert' ) } />
				) }
			</Card>
		</div>
	);
};

export default ConversationView;
