/**
 * ProGate component - wraps content that requires Pro.
 * Shows upgrade prompt for free users.
 */

import { __ } from '@wordpress/i18n';
import { Icon, Button } from '@aime/wp-components';
import { starFilled } from '@wordpress/icons';

const ProGate = ( { children, feature, description } ) => {
	const { hasPro, proUrl } = window.aimeData || {};

	if ( hasPro ) {
		return children;
	}

	return (
		<div className="aime-pro-gate">
			<div className="aime-pro-gate-content">
				<Icon icon={ starFilled } size={ 48 } />
				<h2>
					{ feature
						? `${ feature } \u2014 ${ __( 'Pro Feature', 'ai-marketing-expert' ) }`
						: __( 'Pro Feature', 'ai-marketing-expert' )
					}
				</h2>
				{ description && <p>{ description }</p> }
				<div className="aime-pro-gate-actions">
					<a href={ proUrl } target="_blank" rel="noopener noreferrer">
						<Button variant="primary" className="aime-btn-pro">
							{ __( 'Upgrade to Pro', 'ai-marketing-expert' ) }
						</Button>
					</a>
				</div>
			</div>
		</div>
	);
};

export default ProGate;
