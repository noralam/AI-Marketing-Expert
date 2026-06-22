/**
 * AiNotice — shared warning banner shown when AI is not configured.
 */
import { __ } from '@wordpress/i18n';

const AiNotice = () => {
	const aiConfigured = window.aimeData?.aiConfigured ?? false;
	if ( aiConfigured ) return null;

	return (
		<p className="aime-ai-notice">
			{ __( '⚠ AI features are disabled. Please configure an AI provider API key in', 'ai-marketing-expert' ) }{ ' ' }
			<a href={ `${ window.aimeData?.adminUrl || '/wp-admin/' }admin.php?page=ai-marketing-expert-ai-providers` }>
				{ __( 'Settings', 'ai-marketing-expert' ) }
			</a>.
		</p>
	);
};

export const isAiConfigured = () => window.aimeData?.aiConfigured ?? false;
export const aiDisabledTitle = () => __( 'Please set up an AI provider API key in Settings first.', 'ai-marketing-expert' );

export default AiNotice;
