/**
 * AI Marketing Expert - React Dashboard Entry Point
 *
 * @package WPSpace\AiMarketingExpert
 */

import { createRoot } from '@wordpress/element';
import App from './App';
import './styles/global.scss';

// Mount the React app.
const container = document.getElementById( 'aime-app' );

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
 * fix is to make removeChild / insertBefore no-ops when the node isn't a child.
 * IMPORTANT: the no-op is scoped to nodes inside our own #aime-app container —
 * DOM operations elsewhere in wp-admin (core, other plugins) keep their native
 * throwing behavior so real bugs aren't silently masked.
 */
if ( container && typeof Node !== 'undefined' && Node.prototype ) {
	const inAppTree = ( node ) =>
		node instanceof Node && ( container === node || container.contains( node ) );

	const origRemoveChild = Node.prototype.removeChild;
	// eslint-disable-next-line func-names
	Node.prototype.removeChild = function ( child ) {
		if ( child.parentNode !== this && inAppTree( this ) ) {
			return child;
		}
		return origRemoveChild.apply( this, arguments );
	};

	const origInsertBefore = Node.prototype.insertBefore;
	// eslint-disable-next-line func-names
	Node.prototype.insertBefore = function ( newNode, refNode ) {
		if ( refNode && refNode.parentNode !== this && inAppTree( this ) ) {
			return newNode;
		}
		return origInsertBefore.apply( this, arguments );
	};
}

if ( container ) {
	const root = createRoot( container );
	root.render( <App /> );
}
