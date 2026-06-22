/**
 * Chatbot Widget — entry point.
 * Mounts the chat widget into #aime-chatbot-widget.
 *
 * Config is provided via window.aimeChatbot (wp_localize_script).
 */

import { render } from '@wordpress/element';
import ChatWidget from './ChatWidget';
import './styles/widget.scss';

document.addEventListener( 'DOMContentLoaded', () => {
	const container = document.getElementById( 'aime-chatbot-widget' );
	if ( ! container ) return;

	const raw = window.aimeChatbot || {};
	if ( ! raw.botId ) return;

	// Normalize config keys for internal usage.
	const tc = raw.themeConfig || {};
	const config = {
		restUrl: raw.restUrl || '',
		nonce: raw.nonce || '',
		botId: raw.botId,
		bot_name: raw.botName || 'Chat Assistant',
		welcome_message: raw.welcomeMsg || '',
		offline_message: raw.offlineMsg || '',
		theme: raw.themeId || 'default',
		primary_color: tc.primary_color || tc.primaryColor || '#4f46e5',
		position: tc.position || 'bottom-right',
		offset_y: Number( tc.offset_y || 0 ),
		offset_x: Number( tc.offset_x || 0 ),
		bubble_icon: tc.bubble_icon || 'chat',
		hide_branding: tc.hide_branding || false,
		poll_interval: tc.poll_interval || 5,
		max_message_length: tc.max_message_length || 500,
		gdpr_enabled: tc.gdpr_enabled || false,
		consent_message: tc.consent_message || '',
		sound_enabled: tc.sound_enabled || false,
		enable_typing_indicator: tc.enable_typing_indicator !== false,
		enable_read_receipts: tc.enable_read_receipts !== false,
		leadConfig: raw.leadConfig || {},
		visitorId: raw.visitorId || '',
		hasPro: raw.hasPro || false,
		// Theme colours (from preset + overrides)
		headerBg: tc.headerBg || '',
		headerText: tc.headerText || '',
		bubbleBg: tc.bubbleBg || '',
		bubbleText: tc.bubbleText || '',
		aiBubbleBg: tc.aiBubbleBg || '',
		aiBubbleText: tc.aiBubbleText || '',
		userBubbleBg: tc.userBubbleBg || '',
		userBubbleText: tc.userBubbleText || '',
		bgColor: tc.bgColor || '',
		inputBg: tc.inputBg || '',
		borderRadius: tc.borderRadius ?? 12,
		fontFamily: tc.fontFamily || '',
	};

	render( <ChatWidget config={ config } />, container );
} );
