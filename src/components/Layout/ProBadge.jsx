/**
 * Pro Badge component - small indicator for pro features.
 *
 * The badge is an upsell, so it renders nothing once Pro is active. Suppressing
 * it here rather than at each call site is deliberate: there are ~60 render
 * sites across the plugin and several of them were already showing the badge to
 * paying customers because their own `hasPro` guard was missing or wrong. A
 * single gate at the leaf means a new call site cannot reintroduce the bug.
 */

import { __ } from '@wordpress/i18n';

const ProBadge = () => {
	if ( window.aimeData?.hasPro ) {
		return null;
	}

	return (
		<span className="aime-pro-badge">
			{ __( 'PRO', 'ai-marketing-expert' ) }
		</span>
	);
};

export default ProBadge;
