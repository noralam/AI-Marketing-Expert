/**
 * Chatbot Page — main entry point with internal sidebar navigation.
 *
 * Returns { sidebar, content } to be rendered inside AppLayout.
 */

import { useState, useCallback, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	commentContent,
	people,
	help,
	chartBar,
	cog,
	postContent,
} from '@wordpress/icons';
import AppLayout from '../../Layout/AppLayout';
import InternalSidebar from '../../Layout/InternalSidebar';
import BotList from './views/BotList';
import BotEditor from './views/BotEditor';
import Conversations from './views/Conversations';
import ConversationView from './views/ConversationView';
import KnowledgeBase from './views/KnowledgeBase';
import ChatbotAnalytics from './views/Analytics';
import ChatbotSettings from './views/Settings';
import useApi from '../../../hooks/useApi';

const ChatbotPage = () => {
	const parseHash = () => {
		const hash = window.location.hash.replace( '#', '' );
		if ( ! hash ) return { key: 'analytics', params: {} };
		const [ key, id ] = hash.split( '/' );
		return { key, params: id ? { id: parseInt( id ) || id } : {} };
	};

	const initial = parseHash();
	const [ view, setView ] = useState( initial.key );
	const [ viewParams, setViewParams ] = useState( initial.params );
	const { get } = useApi();
	const [ activeCount, setActiveCount ] = useState( 0 );

	/* Fetch active conversation count for sidebar badge */
	const fetchActiveCount = useCallback( async () => {
		try {
			const res = await get( '/chatbot/conversations/active' );
			setActiveCount( Array.isArray( res ) ? res.length : ( res.count || 0 ) );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	useEffect( () => {
		fetchActiveCount();
	}, [ fetchActiveCount ] );

	/* Refresh badge count every 15 seconds */
	const acRef = useRef( fetchActiveCount );
	acRef.current = fetchActiveCount;
	useEffect( () => {
		const interval = setInterval( () => acRef.current(), 15000 );
		return () => clearInterval( interval );
	}, [] );

	const navigate = useCallback( ( key, params = {} ) => {
		setView( key );
		setViewParams( params );
		window.location.hash = params.id ? `${ key }/${ params.id }` : key;
	}, [] );

	const sidebarItems = [
		{ key: 'analytics', label: __( 'Analytics', 'ai-marketing-expert' ), icon: chartBar },
		{ key: 'bots', label: __( 'Chatbots', 'ai-marketing-expert' ), icon: commentContent },
		{
			key: 'conversations',
			label: __( 'Conversations', 'ai-marketing-expert' ),
			icon: people,
			badge: activeCount || 0,
		},
		{ key: 'knowledge', label: __( 'Knowledge Base', 'ai-marketing-expert' ), icon: postContent },
		{ key: 'settings', label: __( 'Settings', 'ai-marketing-expert' ), icon: cog },
	];

	const renderContent = () => {
		switch ( view ) {
			case 'analytics':
				return <ChatbotAnalytics onNavigate={ navigate } />;
			case 'bots':
				return <BotList onNavigate={ navigate } />;
			case 'edit-bot':
				return <BotEditor key={ `edit-${ viewParams.id }` } id={ viewParams.id } onBack={ () => navigate( 'bots' ) } onNavigate={ navigate } />;
			case 'new-bot':
				return <BotEditor key="new" onBack={ () => navigate( 'bots' ) } onNavigate={ navigate } />;
			case 'conversations':
				return <Conversations onNavigate={ navigate } />;
			case 'conversation':
				return <ConversationView id={ viewParams.id } onBack={ () => navigate( 'conversations' ) } onNavigate={ navigate } />;
			case 'knowledge':
				return <KnowledgeBase onNavigate={ navigate } />;
			case 'settings':
				return <ChatbotSettings />;
			default:
				return <ChatbotAnalytics onNavigate={ navigate } />;
		}
	};

	const sidebar = (
		<InternalSidebar
			items={ sidebarItems }
			activeKey={ view }
			onNavigate={ navigate }
		/>
	);

	return (
		<AppLayout module="chatbot" sidebar={ sidebar } subHeading={ __( 'AI Chatbot', 'ai-marketing-expert' ) }>
			{ renderContent() }
		</AppLayout>
	);
};

export default ChatbotPage;
