/**
 * Content Generator Page — main entry point with internal sidebar navigation.
 *
 * Returns { sidebar, content } to be rendered inside AppLayout.
 */

import { useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	postContent,
	page,
	chartBar,
	cog,
	edit,
	seen,
	starFilled,
} from '@wordpress/icons';
import AppLayout from '../../Layout/AppLayout';
import InternalSidebar from '../../Layout/InternalSidebar';
import Articles from './Articles';
import ArticleEditor from './ArticleEditor';
import ArticlePreview from './ArticlePreview';
import Presets from './Presets';
import ContentAnalytics from './ContentAnalytics';
import ContentSettings from './ContentSettings';
import BrandVoices from './BrandVoices';
import { isProActive } from '../../common/ProLock';

const ContentGeneratorPage = () => {
	const hasPro = isProActive();
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
		{ key: 'articles', label: __( 'Articles', 'ai-marketing-expert' ), icon: postContent },
		{ key: 'new-article', label: __( 'New Article', 'ai-marketing-expert' ), icon: edit },
		{ key: 'brand-voices', label: __( 'Brand Voices', 'ai-marketing-expert' ), icon: starFilled, badgeLabel: hasPro ? '' : __( 'PRO', 'ai-marketing-expert' ) },
		{ key: 'presets', label: __( 'Presets', 'ai-marketing-expert' ), icon: page },
		{ key: 'settings', label: __( 'Settings', 'ai-marketing-expert' ), icon: cog },
	];

	const renderContent = () => {
		switch ( view ) {
			case 'analytics':
				return <ContentAnalytics onNavigate={ navigate } />;
			case 'articles':
				return <Articles onNavigate={ navigate } />;
			case 'new-article':
				return <ArticleEditor key="new" onBack={ () => navigate( 'articles' ) } onNavigate={ navigate } />;
			case 'brand-voices':
				return <BrandVoices />;
			case 'edit-article':
				return <ArticleEditor key={ `edit-${ viewParams.id }` } id={ viewParams.id } onBack={ () => navigate( 'articles' ) } onNavigate={ navigate } />;
			case 'preview-article':
				return <ArticlePreview id={ viewParams.id } onBack={ () => navigate( 'articles' ) } onNavigate={ navigate } />;
			case 'presets':
				return <Presets />;
			case 'settings':
				return <ContentSettings />;
			default:
				return <ContentAnalytics onNavigate={ navigate } />;
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
		<AppLayout module="content-generator" sidebar={ sidebar } subHeading={ __( 'Content Generator', 'ai-marketing-expert' ) }>
			{ renderContent() }
		</AppLayout>
	);
};

export default ContentGeneratorPage;
