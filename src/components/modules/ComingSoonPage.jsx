/**
 * Coming Soon Module Page - placeholder for modules not yet available.
 */

import { __ } from '@wordpress/i18n';
import { Icon, Button } from '@aime/wp-components';
import { starFilled } from '@wordpress/icons';

const ComingSoonPage = ( { title, description, icon } ) => {
	const { proUrl } = window.aimeData || {};

	return (
		<div className="aime-coming-soon-page">
			<div className="aime-coming-soon-content">
				{ icon && (
					<div className="aime-coming-soon-icon">
						<Icon icon={ icon } size={ 48 } />
					</div>
				) }
				<h2>{ title }</h2>
				<p className="aime-coming-soon-desc">{ description }</p>
				<span className="aime-coming-soon-badge-large">
					{ __( 'Coming Soon', 'ai-marketing-expert' ) }
				</span>
				<p className="aime-coming-soon-note">
					{ __( 'This module is under active development and will be available in a future update.', 'ai-marketing-expert' ) }
				</p>
				<a href={ proUrl } target="_blank" rel="noopener noreferrer">
					<Button variant="secondary">
						{ __( 'Get notified when available', 'ai-marketing-expert' ) }
					</Button>
				</a>
			</div>
		</div>
	);
};

export default ComingSoonPage;
