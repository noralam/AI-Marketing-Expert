/**
 * Shared AI generation option constants.
 *
 * Mirrors the Content Generator module's ArticleEditor options so other
 * modules (e.g. Workflow Automation) present the same tones/languages
 * without touching the released editor component.
 */

export const TONES = [
	{ label: 'Professional', value: 'professional' },
	{ label: 'Casual', value: 'casual' },
	{ label: 'Friendly', value: 'friendly' },
	{ label: 'Authoritative', value: 'authoritative' },
	{ label: 'Humorous', value: 'humorous' },
	{ label: 'Formal', value: 'formal' },
	{ label: 'Conversational', value: 'conversational' },
];

export const PRO_TONES = [ 'humorous', 'formal', 'conversational' ];

export const LANGUAGES = [
	{ label: 'English', value: 'en' },
	{ label: 'Bengali', value: 'bn' },
	{ label: 'Spanish', value: 'es' },
	{ label: 'French', value: 'fr' },
	{ label: 'German', value: 'de' },
	{ label: 'Hindi', value: 'hi' },
	{ label: 'Arabic', value: 'ar' },
	{ label: 'Portuguese', value: 'pt' },
	{ label: 'Chinese', value: 'zh' },
	{ label: 'Japanese', value: 'ja' },
	{ label: 'Korean', value: 'ko' },
	{ label: 'Russian', value: 'ru' },
	{ label: 'Italian', value: 'it' },
	{ label: 'Dutch', value: 'nl' },
	{ label: 'Turkish', value: 'tr' },
	{ label: 'Indonesian', value: 'id' },
	{ label: 'Vietnamese', value: 'vi' },
	{ label: 'Thai', value: 'th' },
	{ label: 'Polish', value: 'pl' },
	{ label: 'Swedish', value: 'sv' },
	{ label: 'Urdu', value: 'ur' },
	{ label: 'Malay', value: 'ms' },
];

/**
 * Build SelectControl-ready tone options, tagging Pro-only tones.
 *
 * @param {boolean} hasPro Whether Pro is active.
 * @return {Array<{label: string, value: string}>}
 */
export function toneSelectOptions( hasPro ) {
	return TONES.map( ( t ) => ( {
		value: t.value,
		label: ! hasPro && PRO_TONES.includes( t.value ) ? `${ t.label } (PRO)` : t.label,
	} ) );
}
