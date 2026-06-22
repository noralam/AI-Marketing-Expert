/**
 * Notice component for admin notifications.
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { isProActive, ProUpgradeButton } from './ProLock';

const Notice = ( { type = 'info', message, dismissible = true, onDismiss, showUpgrade = false } ) => {
	const [ visible, setVisible ] = useState( true );
	const messageText = typeof message === 'string' ? message : '';
	const shouldShowUpgrade = showUpgrade || ( ! isProActive() && /\b(pro|upgrade)\b/i.test( messageText ) );

	if ( ! visible ) {
		return null;
	}

	const handleDismiss = () => {
		setVisible( false );
		if ( onDismiss ) {
			onDismiss();
		}
	};

	return (
		<div className={ `aime-notice aime-notice-${ type }` }>
			<p>{ message }</p>
			<div className="aime-notice-actions">
				{ shouldShowUpgrade && <ProUpgradeButton /> }
				{ dismissible && (
					<button
						className="aime-notice-dismiss"
						onClick={ handleDismiss }
						aria-label={ __( 'Dismiss', 'ai-marketing-expert' ) }
					>
						×
					</button>
				) }
			</div>
		</div>
	);
};

export default Notice;
