/**
 * REST API utility using @wordpress/api-fetch.
 */

import apiFetch from '@wordpress/api-fetch';

const API_NAMESPACE = '/aime/v1';

/**
 * Make an API request to the plugin's REST endpoints.
 *
 * @param {string} endpoint - API endpoint (e.g., '/email/campaigns').
 * @param {Object} options  - Request options.
 * @return {Promise} API response.
 */
export const apiRequest = async ( endpoint, options = {} ) => {
	const { method = 'GET', data, params } = options;

	const config = {
		path: `${ API_NAMESPACE }${ endpoint }`,
		method,
	};

	if ( data ) {
		config.data = data;
	}

	if ( params ) {
		const queryString = new URLSearchParams( params ).toString();
		config.path += `?${ queryString }`;
	}

	return apiFetch( config );
};

/**
 * GET request helper.
 */
export const apiGet = ( endpoint, params ) =>
	apiRequest( endpoint, { method: 'GET', params } );

/**
 * POST request helper.
 */
export const apiPost = ( endpoint, data ) =>
	apiRequest( endpoint, { method: 'POST', data } );

/**
 * PUT request helper.
 */
export const apiPut = ( endpoint, data ) =>
	apiRequest( endpoint, { method: 'PUT', data } );

/**
 * DELETE request helper.
 */
export const apiDelete = ( endpoint ) =>
	apiRequest( endpoint, { method: 'DELETE' } );

export default apiRequest;
