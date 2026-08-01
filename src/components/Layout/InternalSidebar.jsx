/**
 * Internal Sidebar — the module rail.
 *
 * Operate-mode navigation: the visitor is mid-task, so the rail stays quiet
 * until it is the thing being used. One item carries the accent, everything
 * else is a label.
 *
 * The rail collapses to icons only. The choice is per-browser and persists
 * across modules — someone who works in a narrow window should not have to
 * re-collapse on every page. Collapsed items keep their name reachable: the
 * label is exposed to assistive tech via aria-label and to sighted users via
 * a hover/focus tooltip, so nothing becomes a guessable glyph.
 */

import { useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon } from '@aime/wp-components';
import { chevronLeft, chevronRight } from '@wordpress/icons';

const STORAGE_KEY = 'aime:sidebar-collapsed';

const readCollapsed = () => {
	try {
		return window.localStorage.getItem( STORAGE_KEY ) === '1';
	} catch ( e ) {
		return false;
	}
};

const InternalSidebar = ( { items, activeKey, onNavigate, footer, label } ) => {
	const [ collapsed, setCollapsed ] = useState( readCollapsed );

	const toggle = useCallback( () => {
		setCollapsed( ( prev ) => {
			const next = ! prev;
			try {
				window.localStorage.setItem( STORAGE_KEY, next ? '1' : '0' );
			} catch ( e ) {
				// A locked-down storage policy costs persistence, not the toggle.
			}
			return next;
		} );
	}, [] );

	const toggleLabel = collapsed
		? __( 'Expand menu', 'ai-marketing-expert' )
		: __( 'Collapse menu', 'ai-marketing-expert' );

	return (
		<nav
			className={ `aime-sidebar-nav${ collapsed ? ' is-collapsed' : '' }` }
			aria-label={ label || __( 'Module navigation', 'ai-marketing-expert' ) }
		>
			<div className="aime-sidebar-rail-head">
				<button
					type="button"
					className="aime-nav-toggle"
					onClick={ toggle }
					aria-expanded={ ! collapsed }
					aria-label={ toggleLabel }
					data-tip={ toggleLabel }
				>
					<Icon icon={ collapsed ? chevronRight : chevronLeft } size={ 18 } />
				</button>
			</div>

			<ul className="aime-sidebar-list">
				{ items.map( ( item ) => {
					const isActive = item.key === activeKey;
					const badge = item.badgeLabel || ( item.badge > 0 ? item.badge : null );

					return (
						<li key={ item.key }>
							<button
								type="button"
								className={ `aime-sidebar-item${ isActive ? ' aime-sidebar-active' : '' }` }
								onClick={ () => onNavigate( item.key ) }
								aria-current={ isActive ? 'page' : undefined }
								aria-label={ collapsed ? item.label : undefined }
								data-tip={ item.label }
							>
								{ item.icon && (
									<span className="aime-sidebar-item-icon">
										<Icon icon={ item.icon } size={ 20 } />
									</span>
								) }
								<span className="aime-sidebar-item-label">{ item.label }</span>
								{ badge !== null && (
									<span className="aime-sidebar-badge">{ badge }</span>
								) }
							</button>
						</li>
					);
				} ) }
			</ul>

			{ footer && (
				<div className="aime-sidebar-footer">
					{ footer }
				</div>
			) }
		</nav>
	);
};

export default InternalSidebar;
