/**
 * Custom hook for API calls with loading and error states.
 */

import { useState, useCallback, useRef, useEffect } from '@wordpress/element';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { toast } from '../components/common/Toast';

const useApi = ( { toastErrors = false } = {} ) => {
	const [ loading, setLoading ] = useState( false );
	const [ error, setError ] = useState( null );

	// Guard against setState after unmount (e.g. user navigates away mid-request).
	const mountedRef = useRef( true );
	useEffect( () => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, [] );

	const request = useCallback( async ( method, endpoint, dataOrParams ) => {
		setLoading( true );
		setError( null );

		try {
			let response;
			switch ( method ) {
				case 'GET':
					response = await apiGet( endpoint, dataOrParams );
					break;
				case 'POST':
					response = await apiPost( endpoint, dataOrParams );
					break;
				case 'PUT':
					response = await apiPut( endpoint, dataOrParams );
					break;
				case 'DELETE':
					response = await apiDelete( endpoint );
					break;
				default:
					throw new Error( `Unknown method: ${ method }` );
			}
			return response;
		} catch ( err ) {
			const message = err?.message || 'An error occurred.';
			if ( mountedRef.current ) {
				setError( message );
			}
			if ( toastErrors ) {
				toast( message, 'error' );
			}
			throw err;
		} finally {
			if ( mountedRef.current ) {
				setLoading( false );
			}
		}
	}, [ toastErrors ] );

	const get = useCallback(
		( endpoint, params ) => request( 'GET', endpoint, params ),
		[ request ]
	);

	const post = useCallback(
		( endpoint, data ) => request( 'POST', endpoint, data ),
		[ request ]
	);

	const put = useCallback(
		( endpoint, data ) => request( 'PUT', endpoint, data ),
		[ request ]
	);

	const del = useCallback(
		( endpoint ) => request( 'DELETE', endpoint ),
		[ request ]
	);

	const clearError = useCallback( () => setError( null ), [] );

	return { loading, error, get, post, put, del, clearError };
};

export default useApi;
