/**
 * Workflow Automation Page — main entry with internal sidebar navigation.
 *
 * Routes are hash-based with a hashchange listener so browser back/forward
 * works: workflows (default), new-workflow → TemplatePicker,
 * edit-workflow/{id} → WorkflowBuilder, history/{id}, upcoming.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { list, plus, calendar, cog } from '@wordpress/icons';
import AppLayout from '../../Layout/AppLayout';
import InternalSidebar from '../../Layout/InternalSidebar';
import Card from '../../common/Card';
import { toast } from '../../common/Toast';
import { CheckboxControl } from '../../common/WpComponents';
import { apiGet, apiPost } from '../../../utils/api';
import WorkflowList from './WorkflowList';
import WorkflowBuilder from './WorkflowBuilder';
import TemplatePicker from './TemplatePicker';
import UpcomingRuns from './UpcomingRuns';
import WorkflowHistory from './WorkflowHistory';

const parseHash = () => {
	const hash = window.location.hash.replace( '#', '' );
	if ( ! hash ) {
		return { key: 'workflows', params: {} };
	}
	const [ key, id ] = hash.split( '/' );
	return { key, params: id ? { id: parseInt( id, 10 ) || id } : {} };
};

/**
 * Module settings (persisted to the 'aime_workflow-automation_settings'
 * option via GET/POST /workflow-automation/settings).
 */
const WorkflowSettings = () => {
	const [ settings, setSettings ] = useState( null );

	useEffect( () => {
		( async () => {
			try {
				const res = await apiGet( '/workflow-automation/settings' );
				setSettings( res?.settings || { failure_notifications: true } );
			} catch ( e ) {
				setSettings( { failure_notifications: true } );
			}
		} )();
	}, [] );

	const save = async ( patch ) => {
		const next = { ...settings, ...patch };
		setSettings( next );
		try {
			await apiPost( '/workflow-automation/settings', next );
			toast( __( 'Settings saved.', 'ai-marketing-expert' ), 'success' );
		} catch ( e ) {
			toast( e?.message || __( 'Could not save settings.', 'ai-marketing-expert' ), 'error' );
		}
	};

	if ( ! settings ) {
		return null;
	}

	return (
		<Card title={ __( 'Settings', 'ai-marketing-expert' ) } className="aime-wf-settings">
			<CheckboxControl
				label={ __( 'Email me when a workflow run fails', 'ai-marketing-expert' ) }
				checked={ settings.failure_notifications !== false }
				onChange={ ( c ) => save( { failure_notifications: !! c } ) }
				help={ __( 'Sends a notification to the site admin email when a run finishes with failures.', 'ai-marketing-expert' ) }
			/>
		</Card>
	);
};

const WorkflowAutomationPage = () => {
	const initial = parseHash();
	const [ view, setView ] = useState( initial.key );
	const [ viewParams, setViewParams ] = useState( initial.params );

	// Keep state in sync with the hash so back/forward works.
	useEffect( () => {
		const onHashChange = () => {
			const { key, params } = parseHash();
			setView( key );
			setViewParams( params );
		};
		window.addEventListener( 'hashchange', onHashChange );
		return () => window.removeEventListener( 'hashchange', onHashChange );
	}, [] );

	const navigate = useCallback( ( key, params = {} ) => {
		setView( key );
		setViewParams( params );
		const next = params.id ? `${ key }/${ params.id }` : key;
		if ( window.location.hash.replace( '#', '' ) !== next ) {
			window.location.hash = next;
		}
	}, [] );

	const sidebarItems = [
		{ key: 'workflows', label: __( 'Workflows', 'ai-marketing-expert' ), icon: list },
		{ key: 'new-workflow', label: __( 'New Workflow', 'ai-marketing-expert' ), icon: plus },
		{ key: 'upcoming', label: __( 'Upcoming Runs', 'ai-marketing-expert' ), icon: calendar },
		{ key: 'settings', label: __( 'Settings', 'ai-marketing-expert' ), icon: cog },
	];

	const renderContent = () => {
		switch ( view ) {
			case 'new-workflow':
				return (
					<TemplatePicker
						onBack={ () => navigate( 'workflows' ) }
						onNavigate={ navigate }
					/>
				);
			case 'edit-workflow':
				return (
					<WorkflowBuilder
						key={ viewParams.id ? `edit-${ viewParams.id }` : 'new' }
						id={ viewParams.id }
						onBack={ () => navigate( 'workflows' ) }
						onNavigate={ navigate }
					/>
				);
			case 'upcoming':
				return <UpcomingRuns onNavigate={ navigate } />;
			case 'settings':
				return <WorkflowSettings />;
			case 'history':
				return (
					<WorkflowHistory
						id={ viewParams.id }
						onBack={ () => navigate( 'workflows' ) }
					/>
				);
			case 'workflows':
			default:
				return <WorkflowList onNavigate={ navigate } />;
		}
	};

	const sidebar = (
		<InternalSidebar items={ sidebarItems } activeKey={ view } onNavigate={ navigate } />
	);

	return (
		<AppLayout
			module="workflow-automation"
			sidebar={ sidebar }
			subHeading={ __( 'Workflow Automation', 'ai-marketing-expert' ) }
		>
			{ renderContent() }
		</AppLayout>
	);
};

export default WorkflowAutomationPage;
