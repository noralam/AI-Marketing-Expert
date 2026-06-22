/**
 * Custom hook for API calls with loading and error states.
 */

import { useState, useCallback } from '@wordpress/element';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

const useApi = () => {
	const [ loading, setLoading ] = useState( false );
	const [ error, setError ] = useState( null );

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
			setError( message );
			throw err;
		} finally {
			setLoading( false );
		}
	}, [] );

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
