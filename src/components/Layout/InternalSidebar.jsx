/**
 * Internal Sidebar - Magical Shop Builder style.
 * Renders a list of navigation items within a module page.
 * Active item is highlighted. Uses hash-based navigation.
 */

import { Icon } from '@aime/wp-components';

const InternalSidebar = ( { items, activeKey, onNavigate, footer } ) => {
	return (
		<nav className="aime-sidebar-nav">
			{ items.map( ( item ) => {
				const isActive = item.key === activeKey;
				return (
					<button
						key={ item.key }
						type="button"
						className={ `aime-sidebar-item ${ isActive ? 'aime-sidebar-active' : '' }` }
						onClick={ () => onNavigate( item.key ) }
					>
						{ item.icon && (
							<span className="aime-sidebar-item-icon">
								<Icon icon={ item.icon } size={ 20 } />
							</span>
						) }
						<span className="aime-sidebar-item-label">{ item.label }</span>
						{ item.badge > 0 && (
							<span className="aime-sidebar-badge">{ item.badge }</span>
						) }
						{ item.badgeLabel && (
							<span className="aime-sidebar-badge">{ item.badgeLabel }</span>
						) }
					</button>
				);
			} ) }

			{ footer && (
				<div className="aime-sidebar-footer">
					{ footer }
				</div>
			) }
		</nav>
	);
};

export default InternalSidebar;
