/**
 * Hook to show a warning toast when an AI API call takes too long.
 *
 * Usage:
 *   const slowWarning = useSlowWarning();
 *   // In your async handler:
 *   slowWarning.start();
 *   try { await apiCall(); } finally { slowWarning.stop(); }
 */

import { useRef, useCallback, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { toast } from '../components/common/Toast';

const DEFAULT_DELAY = 15000; // 15 seconds

const useSlowWarning = ( delay = DEFAULT_DELAY ) => {
	const timerRef = useRef( null );

	const stop = useCallback( () => {
		if ( timerRef.current ) {
			clearTimeout( timerRef.current );
			timerRef.current = null;
		}
	}, [] );

	const start = useCallback( () => {
		stop();
		timerRef.current = setTimeout( () => {
			toast(
				__( 'Please wait — your AI provider may need more time to respond.', 'ai-marketing-expert' ),
				'warning',
				8000
			);
		}, delay );
	}, [ delay, stop ] );

	// Cleanup on unmount.
	useEffect( () => {
		return () => stop();
	}, [ stop ] );

	return { start, stop };
};

export default useSlowWarning;
