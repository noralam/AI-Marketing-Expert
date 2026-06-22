/**
 * Toast notification system.
 */

import { useState, useCallback, useEffect } from '@wordpress/element';

let _addToast = () => {};

export const toast = ( message, type = 'success', duration = 4000 ) => {
	_addToast( { message, type, duration, id: Date.now() } );
};

const ToastContainer = () => {
	const [ toasts, setToasts ] = useState( [] );

	const addToast = useCallback( ( t ) => {
		setToasts( ( prev ) => [ ...prev, t ] );
	}, [] );

	useEffect( () => {
		_addToast = addToast;
		return () => { _addToast = () => {}; };
	}, [ addToast ] );

	const removeToast = useCallback( ( id ) => {
		setToasts( ( prev ) => prev.filter( ( t ) => t.id !== id ) );
	}, [] );

	useEffect( () => {
		const timers = toasts.map( ( t ) => {
			return setTimeout( () => removeToast( t.id ), t.duration || 4000 );
		} );
		return () => timers.forEach( clearTimeout );
	}, [ toasts, removeToast ] );

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
