/**
 * Notice component for admin notifications.
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const Notice = ( { type = 'info', message, dismissible = true, onDismiss } ) => {
	const [ visible, setVisible ] = useState( true );

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
	);
};

export default Notice;
