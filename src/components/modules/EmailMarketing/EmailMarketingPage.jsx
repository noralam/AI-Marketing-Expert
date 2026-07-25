/**
 * Email Marketing Page — main entry point with internal sidebar navigation.
 *
 * Returns { sidebar, content } to be rendered inside AppLayout.
 */

import { useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	envelope,
	people,
	megaphone,
	page,
	tag,
	category,
	chartBar,
	cog,
	commentContent,
	starFilled,
} from '@wordpress/icons';
import AppLayout from '../../Layout/AppLayout';
import InternalSidebar from '../../Layout/InternalSidebar';
import Subscribers from './Subscribers';
import SubscriberProfile from './SubscriberProfile';
import Campaigns from './Campaigns';
import CampaignEditor from './CampaignEditor';
import CampaignProgress from './CampaignProgress';
import Automations from './Automations';
import AutomationEditor from './AutomationEditor';
import EmailTemplates from './EmailTemplates';
import EmailLists from './EmailLists';
import EmailTags from './EmailTags';
import EmailAnalytics from './EmailAnalytics';
import ImportExport from './ImportExport';
import AiTools from './AiTools';
import SmtpSettings from './SmtpSettings';
import EmailSettings from './EmailSettings';
import { isProActive } from '../../common/ProLock';

const EmailMarketingPage = () => {
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
		{ key: 'subscribers', label: __( 'Contacts', 'ai-marketing-expert' ), icon: people },
		{ key: 'lists', label: __( 'Lists', 'ai-marketing-expert' ), icon: category },
		{ key: 'tags', label: __( 'Tags', 'ai-marketing-expert' ), icon: tag },
		{ key: 'campaigns', label: __( 'Campaigns', 'ai-marketing-expert' ), icon: megaphone },
		{ key: 'templates', label: __( 'Templates', 'ai-marketing-expert' ), icon: page },
		{ key: 'automations', label: __( 'Automations', 'ai-marketing-expert' ), icon: commentContent, badgeLabel: hasPro ? '' : __( 'PRO', 'ai-marketing-expert' ) },
		{ key: 'import-export', label: __( 'Import / Export', 'ai-marketing-expert' ), icon: envelope },
		{ key: 'ai-tools', label: __( 'AI Tools', 'ai-marketing-expert' ), icon: starFilled },
		{ key: 'smtp', label: __( 'SMTP', 'ai-marketing-expert' ), icon: envelope },
		{ key: 'settings', label: __( 'Settings', 'ai-marketing-expert' ), icon: cog },
	];

	const renderContent = () => {
		switch ( view ) {
			case 'subscribers':
				return <Subscribers onNavigate={ navigate } />;
			case 'subscriber-profile':
				return <SubscriberProfile id={ viewParams.id } onBack={ () => navigate( 'subscribers' ) } onNavigate={ navigate } />;
			case 'campaigns':
				return <Campaigns onNavigate={ navigate } />;
			case 'campaign-editor':
				return <CampaignEditor id={ viewParams.id } templateId={ viewParams.templateId } initialStep={ viewParams.initialStep } onBack={ () => navigate( 'campaigns' ) } onNavigate={ navigate } />;
			case 'campaign-progress':
				return <CampaignProgress id={ viewParams.id } sendStartedAt={ viewParams.sendStartedAt } onBack={ () => navigate( 'campaigns' ) } onNavigate={ navigate } />;
			case 'automations':
				return <Automations onNavigate={ navigate } />;
			case 'automation-editor':
				return <AutomationEditor id={ viewParams.id } onBack={ () => navigate( 'automations' ) } />;
			case 'templates':
				return <EmailTemplates onNavigate={ navigate } />;
			case 'lists':
				return <EmailLists />;
			case 'tags':
				return <EmailTags />;
			case 'analytics':
				return <EmailAnalytics onNavigate={ navigate } />;
			case 'import-export':
				return <ImportExport />;
			case 'ai-tools':
				return <AiTools />;
			case 'smtp':
				return <SmtpSettings />;
			case 'settings':
				return <EmailSettings />;
			default:
				return <EmailAnalytics onNavigate={ navigate } />;
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
		<AppLayout module="email-marketing" sidebar={ sidebar } subHeading={ __( 'Email Marketing', 'ai-marketing-expert' ) }>
			{ renderContent() }
		</AppLayout>
	);
};

export default EmailMarketingPage;
