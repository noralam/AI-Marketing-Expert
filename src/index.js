/**
 * AI Marketing Expert - React Dashboard Entry Point
 *
 * @package JEHAN\AiMarketingExpert
 */

import { createRoot } from '@wordpress/element';
import App from './App';
import './styles/global.scss';

/**
 * DOM compatibility patch — React 18 + third-party DOM manipulation.
 *
 * WordPress's wp.editor (TinyMCE) restructures the DOM tree (wrapping the
 * textarea inside toolbar/container divs, inserting quicktags, media buttons).
 * When React later tries to reconcile or unmount, it calls removeChild /
 * insertBefore on nodes that have been moved to a different parent, triggering
 * a NotFoundError.
 *
 * This is a well-known React limitation (facebook/react#11538). The standard
 * fix is to make removeChild / insertBefore no-ops when the node isn't a child,
 * which is safe because React already considers the node removed from its tree.
 */
if ( typeof Node !== 'undefined' && Node.prototype ) {
	const origRemoveChild = Node.prototype.removeChild;
	// eslint-disable-next-line func-names
	Node.prototype.removeChild = function ( child ) {
		if ( child.parentNode !== this ) {
			return child;
		}
		return origRemoveChild.apply( this, arguments );
	};

	const origInsertBefore = Node.prototype.insertBefore;
	// eslint-disable-next-line func-names
	Node.prototype.insertBefore = function ( newNode, refNode ) {
		if ( refNode && refNode.parentNode !== this ) {
			return newNode;
		}
		return origInsertBefore.apply( this, arguments );
	};
}

// Mount the React app.
const container = document.getElementById( 'aime-app' );

if ( container ) {
	const root = createRoot( container );
	root.render( <App /> );
}
