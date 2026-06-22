/**
 * PoweredBy — branding footer (hidden when Pro + config.hide_branding).
 */
const PoweredBy = ( { hideBranding } ) => {
	if ( hideBranding ) return null;

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
