/**
 * Inline Pro lock helpers for individual controls and actions.
 */

import { __ } from '@wordpress/i18n';
import ProBadge from '../Layout/ProBadge';

export const isProActive = () => !! window.aimeData?.hasPro;

export const openProUpgrade = () => {
	const url = window.aimeData?.proUrl || '#/pro';
	window.open( url, '_blank', 'noopener,noreferrer' );
};

export const proFeatureMessage = () => __( 'This is a Pro feature. Upgrade to Pro to unlock it.', 'ai-marketing-expert' );

export const ProLabel = ( { children } ) => (
	<span className="aime-pro-label">
		<span>{ children }</span>
		<ProBadge />
	</span>
);

export const ProUpgradeButton = ( { children, size = 'small' } ) => (
	<button type="button" className={ `aime-pro-upgrade-btn aime-pro-upgrade-btn--${ size }` } onClick={ openProUpgrade }>
		{ children || __( 'Upgrade Pro', 'ai-marketing-expert' ) }
	</button>
);

const ProLock = ( { children, locked, className = '' } ) => {
	if ( ! locked ) {
		return children;
	}

	return (
		<div className={ `aime-pro-lock ${ className }`.trim() }>
			<div className="aime-pro-lock__content" aria-disabled="true">
				{ children }
			</div>
			<div className="aime-pro-lock__overlay">
				<ProBadge />
				<ProUpgradeButton />
			</div>
		</div>
	);
};

export default ProLock;