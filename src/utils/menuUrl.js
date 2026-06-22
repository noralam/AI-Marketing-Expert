/**
 * Menu URL helpers — generate WordPress admin URLs for plugin submenus.
 */

const adminUrl = window.aimeData?.adminUrl || '/wp-admin/';

/**
 * Get admin URL for a submenu page.
 *
 * @param {string} slug - Submenu slug suffix (e.g., 'email', 'settings', 'content').
 * @return {string} Full admin URL.
 */
export const menuUrl = ( slug = '' ) => {
	const base = 'ai-marketing-expert';
	const page = slug ? `${ base }-${ slug }` : base;
	return `${ adminUrl }admin.php?page=${ page }`;
};

export default menuUrl;
