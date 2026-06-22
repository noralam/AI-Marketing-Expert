/**
 * Pro Badge component - small indicator for pro features.
 */

import { __ } from '@wordpress/i18n';

const ProBadge = () => {
	return (
		<span className="aime-pro-badge">
			{ __( 'PRO', 'ai-marketing-expert' ) }
		</span>
	);
};

export default ProBadge;
