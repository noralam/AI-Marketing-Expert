/**
 * Social Media Page — main entry point with internal sidebar navigation.
 *
 * Returns { sidebar, content } to be rendered inside AppLayout.
 */

import { useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	people,
	postContent,
	calendar,
	chartBar,
	cog,
	edit,
	reusableBlock,
} from '@wordpress/icons';
import AppLayout from '../../Layout/AppLayout';
import InternalSidebar from '../../Layout/InternalSidebar';
import SocialDashboard from './SocialDashboard';
import Accounts from './Accounts';
import Posts from './Posts';
import PostComposer from './PostComposer';
import Calendar from './Calendar';
import Repurpose from './Repurpose';
import SocialSettings from './SocialSettings';

const SocialMediaPage = () => {
	const parseHash = () => {
		const hash = window.location.hash.replace( '#', '' );
		if ( ! hash ) return { key: 'analytics', params: {} };
		const [ key, id ] = hash.split( '/' );
		return { key, params: id ? { id: parseInt( id ) || id } : {} };
	};

	const initial = parseHash();
	const [ view, setView ] = useState( initial.key );
	const [ viewParams, setViewParams ] = useState( initial.params );

	const navigate = useCallback( ( key, params = {} ) => {
		setView( key );
		setViewParams( params );
		window.location.hash = params.id ? `${ key }/${ params.id }` : key;
	}, [] );

	const sidebarItems = [
		{ key: 'analytics', label: __( 'Analytics', 'ai-marketing-expert' ), icon: chartBar },
		{ key: 'accounts', label: __( 'Accounts', 'ai-marketing-expert' ), icon: people },
		{ key: 'posts', label: __( 'Posts', 'ai-marketing-expert' ), icon: postContent },
		{ key: 'new-post', label: __( 'New Post', 'ai-marketing-expert' ), icon: edit },
		{ key: 'calendar', label: __( 'Calendar', 'ai-marketing-expert' ), icon: calendar },
		{ key: 'repurpose', label: __( 'Repurpose', 'ai-marketing-expert' ), icon: reusableBlock },
		{ key: 'settings', label: __( 'Settings', 'ai-marketing-expert' ), icon: cog },
	];

	const renderContent = () => {
		switch ( view ) {
			case 'analytics':
				return <SocialDashboard onNavigate={ navigate } />;
			case 'accounts':
				return <Accounts onNavigate={ navigate } />;
			case 'posts':
				return <Posts onNavigate={ navigate } />;
			case 'new-post':
				return <PostComposer key="new" onBack={ () => navigate( 'posts' ) } onNavigate={ navigate } />;
			case 'edit-post':
				return <PostComposer key={ `edit-${ viewParams.id }` } id={ viewParams.id } onBack={ () => navigate( 'posts' ) } onNavigate={ navigate } />;
			case 'calendar':
				return <Calendar onNavigate={ navigate } />;
			case 'repurpose':
				return <Repurpose onNavigate={ navigate } />;
			case 'settings':
				return <SocialSettings />;
			default:
				return <SocialDashboard onNavigate={ navigate } />;
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
		<AppLayout module="social-media" sidebar={ sidebar } subHeading={ __( 'Social Media', 'ai-marketing-expert' ) }>
			{ renderContent() }
		</AppLayout>
	);
};

export default SocialMediaPage;
