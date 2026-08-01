/**
 * SEO Page — main entry point with internal sidebar navigation.
 *
 * Returns { sidebar, content } to be rendered inside AppLayout.
 */

import { useState, useCallback, lazy, Suspense } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	search,
	category,
	page,
	calendar,
	link,
	chartBar,
	cog,
	postContent,
	backup,
} from '@wordpress/icons';
import AppLayout from '../../Layout/AppLayout';
import InternalSidebar from '../../Layout/InternalSidebar';
import Loader from '../../common/Loader';

const SeoDashboard = lazy( () => import( './views/SeoDashboard' ) );
const KeywordResearch = lazy( () => import( './views/KeywordResearch' ) );
const KeywordVault = lazy( () => import( './views/KeywordVault' ) );
const TopicMap = lazy( () => import( './views/TopicMap' ) );
const OnPageAudit = lazy( () => import( './views/OnPageAudit' ) );
const ContentCalendar = lazy( () => import( './views/ContentCalendar' ) );
const LinkBuilding = lazy( () => import( './views/LinkBuilding' ) );
const RankTracker = lazy( () => import( './views/RankTracker' ) );
const SeoAutomation = lazy( () => import( './views/SeoAutomation' ) );
const SeoSettings = lazy( () => import( './views/SeoSettings' ) );

const SeoPage = () => {
	const parseHash = () => {
		const hash = window.location.hash.replace( '#', '' );
		if ( ! hash ) return { key: 'dashboard', params: {} };
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
		{ key: 'dashboard', label: __( 'Analytics', 'ai-marketing-expert' ), icon: chartBar },
		{ key: 'keyword-research', label: __( 'Keyword Research', 'ai-marketing-expert' ), icon: search },
		{ key: 'keyword-vault', label: __( 'Keyword Vault', 'ai-marketing-expert' ), icon: postContent },
		{ key: 'topic-map', label: __( 'Topic Map', 'ai-marketing-expert' ), icon: category },
		{ key: 'on-page-audit', label: __( 'On-Page Audit', 'ai-marketing-expert' ), icon: page },
		{ key: 'content-calendar', label: __( 'Content Calendar', 'ai-marketing-expert' ), icon: calendar },
		{ key: 'link-building', label: __( 'Link Building', 'ai-marketing-expert' ), icon: link },
		{ key: 'rank-tracker', label: __( 'Rank Tracker', 'ai-marketing-expert' ), icon: chartBar },
		{ key: 'automation', label: __( 'Automation', 'ai-marketing-expert' ), icon: backup },
		{ key: 'settings', label: __( 'Settings', 'ai-marketing-expert' ), icon: cog },
	];

	// Keep heavy views mounted so state persists across navigation.
	const PERSIST_VIEWS = [ 'keyword-research', 'keyword-vault' ];
	const [ mounted, setMounted ] = useState( () => {
		const set = new Set();
		set.add( initial.key );
		return set;
	} );

	// Track which persistent views have been visited.
	const navigateWrapped = useCallback( ( key, params = {} ) => {
		navigate( key, params );
		if ( PERSIST_VIEWS.includes( key ) ) {
			setMounted( ( prev ) => {
				if ( prev.has( key ) ) return prev;
				const next = new Set( prev );
				next.add( key );
				return next;
			} );
		}
	}, [ navigate ] );

	const renderEphemeral = () => {
		if ( PERSIST_VIEWS.includes( view ) ) return null;
		switch ( view ) {
			case 'dashboard':
				return <SeoDashboard onNavigate={ navigateWrapped } />;
			case 'topic-map':
				return <TopicMap onNavigate={ navigateWrapped } />;
			case 'on-page-audit':
				return <OnPageAudit onNavigate={ navigateWrapped } />;
			case 'content-calendar':
				return <ContentCalendar onNavigate={ navigateWrapped } />;
			case 'link-building':
				return <LinkBuilding onNavigate={ navigateWrapped } />;
			case 'rank-tracker':
				return <RankTracker onNavigate={ navigateWrapped } />;
			case 'automation':
				return <SeoAutomation onNavigate={ navigateWrapped } />;
			case 'settings':
				return <SeoSettings />;
			default:
				return <SeoDashboard onNavigate={ navigateWrapped } />;
		}
	};

	// The chunk that is loading decides the shape of the wait: routing every SEO
	// view through one dashboard skeleton promises stats to a settings page.
	const FALLBACK_SHAPE = {
		'keyword-vault': 'table',
		'link-building': 'table',
		'on-page-audit': 'table',
		'rank-tracker': 'table',
		'content-calendar': 'calendar',
		settings: 'form',
		automation: 'form',
		'topic-map': 'cards',
		'keyword-research': 'cards',
	};

	const sidebar = (
		<InternalSidebar
			items={ sidebarItems }
			activeKey={ view }
			onNavigate={ navigateWrapped }
		/>
	);

	return (
		<AppLayout module="seo" sidebar={ sidebar } subHeading={ __( 'SEO', 'ai-marketing-expert' ) }>
			<Suspense fallback={ <Loader variant={ FALLBACK_SHAPE[ view ] || 'dashboard' } text={ __( 'Loading SEO view…', 'ai-marketing-expert' ) } /> }>
			{ /* Persistent views — stay mounted, hidden via CSS */ }
			{ mounted.has( 'keyword-research' ) && (
				<div style={ view !== 'keyword-research' ? { display: 'none' } : undefined }>
					<KeywordResearch onNavigate={ navigateWrapped } />
				</div>
			) }
			{ mounted.has( 'keyword-vault' ) && (
				<div style={ view !== 'keyword-vault' ? { display: 'none' } : undefined }>
					<KeywordVault onNavigate={ navigateWrapped } isActive={ view === 'keyword-vault' } />
				</div>
			) }
			{ /* Ephemeral views — mount/unmount normally */ }
			{ renderEphemeral() }
			</Suspense>
		</AppLayout>
	);
};

export default SeoPage;
