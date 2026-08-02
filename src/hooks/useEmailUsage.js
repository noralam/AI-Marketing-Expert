/**
 * Free-plan usage snapshot for the Email Marketing module.
 *
 * Owns its own useApi instance on purpose: sharing the caller's would flip the
 * page-level `loading` flag and flash the list skeleton every time the quota is
 * refreshed after a create/delete.
 *
 * `usage` stays null until the first response lands, and stays null forever on
 * a request failure — the quota strip is an aid, never a gate, so a dead
 * endpoint must leave the list fully usable.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import useApi from './useApi';

const useEmailUsage = () => {
	const { get } = useApi();
	const [ usage, setUsage ] = useState( null );

	const refresh = useCallback( async () => {
		try {
			const res = await get( '/email/usage' );
			setUsage( res || null );
		} catch ( e ) { /* Quota display is optional; never block the page. */ }
	}, [ get ] );

	useEffect( () => { refresh(); }, [ refresh ] );

	return { usage, refresh };
};

export default useEmailUsage;
