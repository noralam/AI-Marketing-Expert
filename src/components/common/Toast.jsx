/**
 * Toast notification system.
 */

import { useState, useCallback, useEffect, useRef } from '@wordpress/element';

let _addToast = () => {};
let _seq = 0;

export const toast = ( message, type = 'success', duration = 4000 ) => {
	_seq += 1;
	_addToast( { message, type, duration, id: `${ Date.now() }-${ _seq }` } );
};

const ToastContainer = () => {
	const [ toasts, setToasts ] = useState( [] );
	const timersRef = useRef( {} );

	const removeToast = useCallback( ( id ) => {
		if ( timersRef.current[ id ] ) {
			clearTimeout( timersRef.current[ id ] );
			delete timersRef.current[ id ];
		}
		setToasts( ( prev ) => prev.filter( ( t ) => t.id !== id ) );
	}, [] );

	const addToast = useCallback( ( t ) => {
		setToasts( ( prev ) => {
			// Collapse repeats: an identical notice already on screen is not
			// stacked again (duplicate polls, double clicks, retried requests).
			if ( prev.some( ( p ) => p.message === t.message && p.type === t.type ) ) {
				return prev;
			}
			return [ ...prev, t ];
		} );
	}, [] );

	useEffect( () => {
		_addToast = addToast;
		return () => { _addToast = () => {}; };
	}, [ addToast ] );

	// One timer per toast, created once — a newly added toast must not reset
	// the countdown of the ones already showing.
	useEffect( () => {
		toasts.forEach( ( t ) => {
			if ( ! timersRef.current[ t.id ] ) {
				timersRef.current[ t.id ] = setTimeout( () => removeToast( t.id ), t.duration || 4000 );
			}
		} );
	}, [ toasts, removeToast ] );

	useEffect( () => () => {
		Object.values( timersRef.current ).forEach( clearTimeout );
		timersRef.current = {};
	}, [] );

	if ( ! toasts.length ) {
		return null;
	}

	return (
		<div className="aime-toast-container">
			{ toasts.map( ( t ) => (
				<div key={ t.id } className={ `aime-toast aime-toast--${ t.type }` }>
					<span>{ t.message }</span>
					<button className="aime-toast-dismiss" onClick={ () => removeToast( t.id ) }>&times;</button>
				</div>
			) ) }
		</div>
	);
};

export default ToastContainer;
