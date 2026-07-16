/**
 * Schema-driven config field renderer, extracted from the former
 * WorkflowEditor. Renders one field from an action/trigger `fields` schema.
 *
 * Supported types: text, number, textarea, checkbox, select, tokens
 * (FormTokenField chips), range (RangeControl slider), tone (shared tone
 * dropdown with Pro gating) and language (shared language dropdown) — the
 * latter four matching the Content Generator module's editor UX.
 */

import { __ } from '@wordpress/i18n';
import {
	SelectControl,
	CheckboxControl,
	TextControl,
	TextareaControl,
	FormTokenField,
	RangeControl,
} from '../../common/WpComponents';
import { toast } from '../../common/Toast';
import { LANGUAGES, PRO_TONES, toneSelectOptions } from '../../../utils/aiOptions';

/** Normalize a tokens value: arrays pass through, legacy comma strings split. */
const toTokens = ( value ) => {
	if ( Array.isArray( value ) ) {
		return value;
	}
	if ( typeof value === 'string' && value.trim() !== '' ) {
		return value.split( ',' ).map( ( t ) => t.trim() ).filter( Boolean );
	}
	return [];
};

/** Render one config field based on its schema descriptor. */
export const ConfigField = ( { field, value, onChange: rawOnChange, hasPro = false, suggestions = [] } ) => {
	// Per-field Pro gate: the field stays visible (discoverable) but edits
	// are blocked with an upsell toast on the free tier.
	const locked = !! field.is_pro && ! hasPro;
	const label = ( field.label || field.key ) + ( field.is_pro ? ' (Pro)' : '' );
	const onChange = locked
		? () => toast( __( 'This setting requires Pro.', 'ai-marketing-expert' ), 'warning' )
		: rawOnChange;
	const val = value === undefined || value === null ? ( field.default ?? '' ) : value;

	if ( field.type === 'checkbox' ) {
		return (
			<CheckboxControl
				label={ label }
				checked={ !! val }
				onChange={ ( c ) => onChange( c ) }
				help={ field.help }
			/>
		);
	}
	if ( field.type === 'tokens' ) {
		const tokens = toTokens( val );
		return (
			<FormTokenField
				label={ label }
				value={ tokens }
				suggestions={ ( suggestions || [] ).filter( ( kw ) => ! tokens.includes( kw ) ) }
				onChange={ ( next ) => onChange( next ) }
				placeholder={ __( 'Type and press Enter…', 'ai-marketing-expert' ) }
				__experimentalExpandOnFocus
				__nextHasNoMarginBottom
			/>
		);
	}
	if ( field.type === 'range' ) {
		return (
			<RangeControl
				label={ label }
				value={ Number( val ) || Number( field.default ) || 0 }
				onChange={ ( v ) => onChange( v ) }
				min={ field.min ?? 0 }
				max={ field.max ?? 100 }
				step={ field.step ?? 1 }
				withInputField
				help={ field.help }
				__nextHasNoMarginBottom
			/>
		);
	}
	if ( field.type === 'tone' ) {
		return (
			<SelectControl
				label={ label }
				value={ val }
				options={ toneSelectOptions( hasPro ) }
				onChange={ ( v ) => {
					if ( ! hasPro && PRO_TONES.includes( v ) ) {
						toast( __( 'This tone is available in Pro.', 'ai-marketing-expert' ), 'warning' );
						return;
					}
					onChange( v );
				} }
				help={ field.help }
			/>
		);
	}
	if ( field.type === 'language' ) {
		return (
			<SelectControl
				label={ label }
				value={ val || 'en' }
				options={ LANGUAGES }
				onChange={ ( v ) => onChange( v ) }
				help={ field.help }
			/>
		);
	}
	if ( field.type === 'select' ) {
		const options = ( field.options || [] ).map( ( o ) =>
			typeof o === 'string' ? { value: o, label: o } : o
		);
		// Required select with nothing chosen yet: show an explicit placeholder
		// so the dropdown doesn't misleadingly display the first real option.
		if ( field.required && ( val === '' || val === undefined || val === null ) ) {
			options.unshift( { value: '', label: __( '— Select —', 'ai-marketing-expert' ) } );
		}
		// Keep a legacy/unknown saved value selectable instead of silently jumping.
		const known = options.some( ( o ) => String( o.value ) === String( val ) );
		if ( ! known && val !== '' && val !== undefined && val !== null ) {
			options.push( { value: val, label: `${ val }` } );
		}
		return (
			<SelectControl
				label={ label }
				value={ val }
				options={ options }
				onChange={ ( v ) => onChange( v ) }
				help={ field.help }
			/>
		);
	}
	if ( field.type === 'textarea' ) {
		return (
			<TextareaControl
				label={ label }
				value={ val }
				onChange={ ( v ) => onChange( v ) }
				help={ field.help }
			/>
		);
	}
	return (
		<TextControl
			type={ field.type === 'number' ? 'number' : 'text' }
			label={ label }
			value={ val }
			onChange={ ( v ) => onChange( field.type === 'number' && v !== '' ? Number( v ) : v ) }
			help={ field.help }
		/>
	);
};

/** Render a full schema fields list against a config object. */
const ConfigFields = ( { fields, config, onChange, hasPro = false, keywordSuggestions = [] } ) => (
	<>
		{ ( fields || [] ).map( ( field ) => (
			<ConfigField
				key={ field.key }
				field={ field }
				value={ config?.[ field.key ] }
				onChange={ ( v ) => onChange( field.key, v ) }
				hasPro={ hasPro }
				suggestions={ field.type === 'tokens' ? keywordSuggestions : [] }
			/>
		) ) }
	</>
);

export default ConfigFields;
