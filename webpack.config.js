/**
 * Custom webpack configuration.
 *
 * Extends @wordpress/scripts default config to add a second entry
 * point for the chatbot frontend widget.
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	entry: {
		index: path.resolve( __dirname, 'src', 'index.js' ),
		'chatbot-widget': path.resolve( __dirname, 'src', 'chatbot-widget', 'index.js' ),
	},
	resolve: {
		...defaultConfig.resolve,
		alias: {
			...( defaultConfig.resolve?.alias || {} ),
			'@aime/wp-components': path.resolve( __dirname, 'src', 'components', 'common', 'WpComponents.jsx' ),
		},
	},
};
