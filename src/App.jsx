/**
 * Main App component — routes based on WordPress submenu slug.
 *
 * WordPress sidebar: Dashboard, Email Marketing, Content Generator,
 * Social Media, Chatbot, Settings.
 *
 * Each module page has its own internal sidebar for sub-navigation.
 */

import { __ } from '@wordpress/i18n';
import AppLayout from './components/Layout/AppLayout';
import OverviewPage from './components/modules/Overview/OverviewPage';
import EmailMarketingPage from './components/modules/EmailMarketing/EmailMarketingPage';
import ContentGeneratorPage from './components/modules/ContentGenerator/ContentGeneratorPage';
import SocialMediaPage from './components/modules/SocialMedia/SocialMediaPage';
import SeoPage from './components/modules/Seo/SeoPage';
import ChatbotPage from './components/modules/Chatbot/ChatbotPage';
import WorkflowAutomationPage from './components/modules/WorkflowAutomation/WorkflowAutomationPage';
import AiProvidersPage from './components/modules/Settings/AiProvidersPage';
import SettingsPage from './components/modules/Settings/SettingsPage';

const App = () => {
	const currentPage = window.aimeData?.currentPage || 'ai-marketing-expert';

	// ── Dashboard ────────────────────────────────────────────
	if ( currentPage === 'ai-marketing-expert' ) {
		return (
			<AppLayout>
				<OverviewPage />
			</AppLayout>
		);
	}

	// ── Email Marketing (with internal sidebar) ──────────────
	if ( currentPage === 'ai-marketing-expert-email' ) {
		return <EmailMarketingPage />;
	}

	// ── Content Generator (with internal sidebar) ───────────
	if ( currentPage === 'ai-marketing-expert-content' ) {
		return <ContentGeneratorPage />;
	}

	// ── Social Media (with internal sidebar) ─────────────────
	if ( currentPage === 'ai-marketing-expert-social' ) {
		return <SocialMediaPage />;
	}

	// ── SEO (with internal sidebar) ──────────────────────────
	if ( currentPage === 'ai-marketing-expert-seo' ) {
		return <SeoPage />;
	}

	// ── Chatbot (with internal sidebar) ─────────────────────
	if ( currentPage === 'ai-marketing-expert-chatbot' ) {
		return <ChatbotPage />;
	}

	// ── Workflow Automation (with internal sidebar) ─────────
	if ( currentPage === 'ai-marketing-expert-automation' ) {
		return <WorkflowAutomationPage />;
	}

	// ── AI Providers ─────────────────────────────────────────
	if ( currentPage === 'ai-marketing-expert-ai-providers' ) {
		return (
			<AppLayout>
				<AiProvidersPage />
			</AppLayout>
		);
	}

	// ── Settings ─────────────────────────────────────────────
	if ( currentPage === 'ai-marketing-expert-settings' ) {
		return (
			<AppLayout>
				<SettingsPage />
			</AppLayout>
		);
	}

	// ── Fallback to Dashboard ────────────────────────────────
	return (
		<AppLayout>
			<OverviewPage />
		</AppLayout>
	);
};

export default App;
