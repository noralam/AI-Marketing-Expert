/**
 * PoweredBy — branding footer.
 *
 * Free: Powered by AI Marketing Expert (links to wordpress.org plugin).
 * Pro:  Powered by <Home URL> (links to the site's home URL).
 */
const getCleanUrl = ( url ) => {
	if ( ! url ) {
		return typeof window !== 'undefined' && window.location ? ( window.location.hostname || '' ) : '';
	}
	return url
		.replace( /^https?:\/\//i, '' )
		.replace( /^www\./i, '' )
		.replace( /\/$/, '' );
};

const PoweredBy = ( { hideBranding, hasPro, siteUrl, siteName } ) => {
	if ( hideBranding ) return null;

	if ( hasPro ) {
		const targetUrl = siteUrl || '/';
		const cleanUrl = getCleanUrl( siteUrl ) || siteName || 'Home';

		return (
			<div className="aime-chat-powered">
				<a
					href={ targetUrl }
					target="_blank"
					rel="noopener noreferrer"
				>
					Powered by <strong>{ cleanUrl }</strong>
				</a>
			</div>
		);
	}

	return (
		<div className="aime-chat-powered">
			<a
				href="https://wordpress.org/plugins/ai-marketing-expert/"
				target="_blank"
				rel="noopener noreferrer"
			>
				Powered by <strong>AI Marketing Expert</strong>
			</a>
		</div>
	);
};

export default PoweredBy;
