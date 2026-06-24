/**
 * App Layout - Magical Shop Builder style layout.
 *
 * Top header bar: plugin icon + name + version + PRO badge + doc/support links.
 * Below: optional internal sidebar (for modules) + main content.
 */

import { __ } from '@wordpress/i18n';
import { Icon } from '@aime/wp-components';
import { megaphone } from '@wordpress/icons';
import ErrorBoundary from '../common/ErrorBoundary';
import ToastContainer from '../common/Toast';
import { ProUpgradeButton } from '../common/ProLock';

const AppLayout = ( { children, sidebar, subHeading, module } ) => {
	const { version, hasPro, proUrl, siteName } = window.aimeData || {};

	return (
		<div className="aime-app-layout" data-module={ module || 'overview' }>
			<ToastContainer />
			{ /* Top header bar */ }
			<header className="aime-top-bar">
				<div className="aime-top-bar-left">
					<span className="aime-top-bar-icon">
						<Icon icon={ megaphone } size={ 22 } />
					</span>
					<span className="aime-top-bar-name">
						{ __( 'AI Marketing Expert', 'ai-marketing-expert' ) }
					</span>
					<span className="aime-top-bar-version">
						v{ version || '1.0.0' }
					</span>
					{ hasPro ? (
						<span className="aime-top-bar-badge aime-badge-pro">PRO</span>
					) : (
						<span className="aime-top-bar-badge aime-badge-free">FREE</span>
					) }
					{ subHeading && (
						<span className="aime-top-bar-subheading">{ subHeading }</span>
					) }
				</div>
				<div className="aime-top-bar-right">
					{ ! hasPro && <ProUpgradeButton /> }
					<a
						href="https://wpthemespace.com/ai-marketing-expert-documentation/"
						target="_blank"
						rel="noopener noreferrer"
						className="aime-top-bar-link"
					>
						<span className="dashicons dashicons-editor-help"></span>
						{ __( 'Documentation', 'ai-marketing-expert' ) }
					</a>
					<a
						href="https://wordpress.org/support/plugin/ai-marketing-expert/"
						target="_blank"
						rel="noopener noreferrer"
						className="aime-top-bar-link"
					>
						<span className="dashicons dashicons-admin-users"></span>
						{ __( 'Support', 'ai-marketing-expert' ) }
					</a>
				</div>
			</header>

			{ /* Body: sidebar + content */ }
			<div className={ `aime-body ${ sidebar ? 'aime-body-with-sidebar' : '' }` }>
				{ sidebar && (
					<aside className="aime-internal-sidebar">
						{ sidebar }
					</aside>
				) }
				<main className="aime-main-content animate__animated animate__fadeIn animate__faster">
					<ErrorBoundary>
						{ children }
					</ErrorBoundary>
				</main>
			</div>

			{ /* Footer info */ }
			<footer className="aime-footer-info">
				<ul>
					<li>{ __( 'AI output quality depends on the selected model — use the latest model for best results. Free-tier models do not support image generation.', 'ai-marketing-expert' ) }</li>
					<li>{ __( 'Email delivery depends on your configured SMTP provider and its sending limits.', 'ai-marketing-expert' ) }</li>
					<li>{ __( "We're continuously improving this plugin. If you encounter any issues, please", 'ai-marketing-expert' ) }{ ' ' }<a href="https://wordpress.org/support/plugin/ai-marketing-expert/" target="_blank" rel="noopener noreferrer">{ __( 'contact support', 'ai-marketing-expert' ) }</a>{ __( " before drawing conclusions — we'll fix it as soon as possible.", 'ai-marketing-expert' ) }</li>
				</ul>
			</footer>
		</div>
	);
};

export default AppLayout;
