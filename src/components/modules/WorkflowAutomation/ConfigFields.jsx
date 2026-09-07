/**
 * Schema-driven config field renderer, extracted from the former
 * WorkflowEditor. Renders one field from an action/trigger `fields` schema.
 *
 * Supported types: text, number, textarea, checkbox, select, tokens
 * (FormTokenField chips), range (RangeControl slider), tone (shared tone
 * dropdown with Pro gating) and language (shared language dropdown) — the
 * latter four matching the Content Generator module's editor UX.
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
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
import PromptLibraryModal from './PromptLibraryModal';
import { SKILL_LIBRARY } from './skillLibrary';

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

/** Workflow tokens offered as clickable chips under token-capable fields. */
const TOKEN_HINTS = [
	'{topic}',
	'{workflow_name}',
	'{previous_preview}',
	'{previous.link}',
	'{event.email}',
	'{event.first_name}',
	'{event.post_title}',
];

const TokenHints = ( { onInsert } ) => (
	<div className="aime-wf-tokens">
		<span className="aime-wf-tokens__label">{ __( 'Tokens:', 'ai-marketing-expert' ) }</span>
		{ TOKEN_HINTS.map( ( t ) => (
			<button
				key={ t }
				type="button"
				className="aime-wf-tokens__chip"
				title={ __( 'Click to insert', 'ai-marketing-expert' ) }
				onClick={ () => onInsert( t ) }
			>
				{ t }
			</button>
		) ) }
	</div>
);

/** Render one config field based on its schema descriptor. */
export const ConfigField = ( {
	field,
	value,
	onChange: rawOnChange,
	hasPro = false,
	suggestions = [],
	actionType = '',
	legacyValue,
} ) => {
	// Per-field Pro gate: the field stays visible (discoverable) but edits
	// are blocked with an upsell toast on the free tier.
	const locked = !! field.is_pro && ! hasPro;
	const label = ( field.label || field.key ) + ( locked ? ' (Pro)' : '' );
	const onChange = locked
		? () => toast( __( 'This setting requires Pro.', 'ai-marketing-expert' ), 'warning' )
		: rawOnChange;
	const val = value === undefined || value === null ? ( field.default ?? '' ) : value;
	const [ libraryOpen, setLibraryOpen ] = useState( false );
	const [ libraryMode, setLibraryMode ] = useState( 'prompts' );

	// Skills field: selection lives ONLY in the Skill library popup.
	// Sidebar shows a compact summary + browse button, no duplicated list.
	// SEO + Readability are free; other skills require Pro (server enforces
	// in SkillRegistry::resolve(), UI gates with upsell toast).
	if ( field.type === 'skills' ) {
		const rawList = Array.isArray( val )
			? val
			: typeof val === 'string' && val.trim() !== ''
				? val.split( ',' ).map( ( s ) => s.trim() ).filter( Boolean )
				: [];
		const isSkillLocked = ( entry ) => !! entry.isPro && ! hasPro;
		const toggleSkill = ( entry ) => {
			if ( locked || isSkillLocked( entry ) ) {
				toast( __( 'This skill requires Pro.', 'ai-marketing-expert' ), 'warning' );
				return;
			}
			const next = rawList.includes( entry.id )
				? rawList.filter( ( id ) => id !== entry.id )
				: [ ...rawList, entry.id ];
			onChange( next );
		};
		const openSkills = () => {
			setLibraryMode( 'skills' );
			setLibraryOpen( true );
		};
		const selectedNames = rawList.map( ( id ) => {
			const found = SKILL_LIBRARY.find( ( s ) => s.id === id );
			return ( found ? `${ found.title }${ found.isPro ? ' (Pro)' : '' }` : id );
		} );
		return (
			<div className="aime-wf-skills">
				<div className="aime-wf-promptfield__head">
					<span className="aime-wf-promptfield__label">{ label }</span>
					<button
						type="button"
						className="aime-wf-promptfield__browse"
						onClick={ openSkills }
						disabled={ locked }
					>
						{ __( 'Skill library', 'ai-marketing-expert' ) }
					</button>
				</div>
				{ field.help && <p className="aime-wf-config__hint">{ field.help }</p> }
				<p className="aime-wf-config__hint">
					{ selectedNames.length
						? sprintf(
							_n( '%d skill selected: %s', '%d skills selected: %s', selectedNames.length, 'ai-marketing-expert' ),
							selectedNames.length,
							selectedNames.join( ', ' )
						)
						: __( 'No skills selected. Open Skill library to add SEO, readability, image rules.', 'ai-marketing-expert' ) }
				</p>
				<PromptLibraryModal
					open={ libraryOpen }
					actionType={ actionType }
					mode={ libraryMode }
					activeSkillIds={ rawList }
					hasPro={ hasPro }
					onClose={ () => setLibraryOpen( false ) }
					onUse={ () => {} }
					onToggleSkill={ toggleSkill }
				/>
			</div>
		);
	}

	// Apply a prompt picked from the library. Empty fields fill directly;
	// existing text is never destroyed silently — confirm to replace, or
	// cancel to append below what is already there.
	const applyPrompt = ( text ) => {
		if ( locked ) {
			toast( __( 'This setting requires Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		const current = typeof val === 'string' ? val : '';
		if ( current.trim() !== '' && ! window.confirm(
			__( 'Replace the existing prompt with this one?', 'ai-marketing-expert' )
		) ) {
			onChange( `${ current.replace( /\s+$/, '' ) }\n\n${ text }` );
			return;
		}
		onChange( text );
	};

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
		// An explicit 0 is a real value for some ranges (e.g. "no upper bound"),
		// so it must not fall through to the default.
		const num = Number( val );
		const resolved = Number.isFinite( num ) && val !== '' ? num : ( Number( field.default ) || 0 );
		return (
			<RangeControl
				label={ label }
				value={ resolved }
				onChange={ ( v ) => onChange( Number.isFinite( Number( v ) ) ? Number( v ) : ( field.min ?? 0 ) ) }
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
	if ( field.type === 'select' && field.multiple ) {
		const options = ( field.options || [] ).map( ( o ) =>
			typeof o === 'string' ? { value: o, label: o } : o
		);
		// Legacy single-select configs: seed the multi from the old key until
		// the user changes the selection (which then writes only the new key).
		let effective = Array.isArray( val ) ? val : [];
		const legacyRaw =
			field.legacy_key && ! effective.length ? legacyValue ?? null : null;
		if ( legacyRaw !== null && legacyRaw !== '' && legacyRaw !== 0 && legacyRaw !== undefined ) {
			effective = [ legacyRaw ];
		}
		const selectedVals = effective.map( String );
		const selectedLabels = selectedVals.map(
			( v ) => options.find( ( o ) => String( o.value ) === String( v ) )?.label ?? v
		);
		return (
			<>
				<FormTokenField
					label={ label }
					value={ selectedLabels }
					suggestions={ options
						.filter( ( o ) => ! selectedVals.includes( String( o.value ) ) )
						.map( ( o ) => o.label ) }
					onChange={ ( nextLabels ) => {
						onChange(
							nextLabels.map( ( l ) => {
								const match = options.find( ( o ) => o.label === l );
								return match ? match.value : l;
							} )
						);
					} }
					placeholder={ __( 'Type to search, Enter to add…', 'ai-marketing-expert' ) }
					__experimentalExpandOnFocus
					__nextHasNoMarginBottom
				/>
				{ field.help && <p className="aime-wf-config__hint">{ field.help }</p> }
			</>
		);
	}
	if ( field.type === 'select' ) {
		const options = ( field.options || [] ).map( ( o ) =>
			typeof o === 'string' ? { value: o, label: o } : o
		);
		// Legacy configs can store 0 for entity selects (e.g. funnel_id) where
		// no option has value 0. Treat that as "nothing chosen" instead of
		// rendering a meaningless "0" entry.
		const hasZeroOption = options.some( ( o ) => String( o.value ) === '0' );
		const isEmptyish =
			val === '' || val === undefined || val === null || ( val === 0 && ! hasZeroOption );
		// Required select with nothing chosen yet: show an explicit placeholder
		// so the dropdown doesn't misleadingly display the first real option.
		// Optional selects also get a placeholder to allow deselection.
		if ( isEmptyish || ! field.required ) {
			const placeholder = field.required
				? { value: '', label: __( '— Select —', 'ai-marketing-expert' ) }
				: { value: '', label: __( '— None —', 'ai-marketing-expert' ) };
			// Only add if not already present
			if ( ! options.some( ( o ) => o.value === '' ) ) {
				options.unshift( placeholder );
			}
		}
		// Keep a legacy/unknown saved value selectable instead of silently jumping.
		const known = options.some( ( o ) => String( o.value ) === String( val ) );
		if ( ! known && ! isEmptyish ) {
			options.push( { value: val, label: `${ val }` } );
		}
		return (
			<SelectControl
				label={ label }
				value={ isEmptyish ? '' : val }
				options={ options }
				onChange={ ( v ) => onChange( v ) }
				help={ field.help }
			/>
		);
	}
	// Append a clicked token at the end of the current value.
	const insertToken = ( token ) => {
		if ( locked ) {
			toast( __( 'This setting requires Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		const current = typeof val === 'string' ? val : '';
		onChange( current ? `${ current.replace( /\s+$/, '' ) } ${ token }` : token );
	};

	if ( field.type === 'textarea' && field.prompt_library ) {
		return (
			<div className="aime-wf-promptfield">
				<div className="aime-wf-promptfield__head">
					<span className="aime-wf-promptfield__label">{ label }</span>
					<button
						type="button"
						className="aime-wf-promptfield__browse"
						onClick={ () => setLibraryOpen( true ) }
						disabled={ locked }
					>
						{ __( 'Prompt library', 'ai-marketing-expert' ) }
					</button>
				</div>
				<TextareaControl
					value={ val }
					onChange={ ( v ) => onChange( v ) }
					help={ field.help }
					rows={ 6 }
				/>
				{ field.token_hints && <TokenHints onInsert={ insertToken } /> }
				<PromptLibraryModal
					open={ libraryOpen }
					actionType={ actionType }
					onClose={ () => setLibraryOpen( false ) }
					onUse={ applyPrompt }
				/>
			</div>
		);
	}
	if ( field.type === 'textarea' ) {
		return (
			<>
				<TextareaControl
					label={ label }
					value={ val }
					onChange={ ( v ) => onChange( v ) }
					help={ field.help }
				/>
				{ field.token_hints && <TokenHints onInsert={ insertToken } /> }
			</>
		);
	}
	return (
		<>
			<TextControl
				type={ field.type === 'number' ? 'number' : 'text' }
				label={ label }
				value={ val }
				onChange={ ( v ) => onChange( field.type === 'number' && v !== '' ? Number( v ) : v ) }
				help={ field.help }
			/>
			{ field.token_hints && <TokenHints onInsert={ insertToken } /> }
		</>
	);
};

/** Render a full schema fields list against a config object. */
const ConfigFields = ( { fields, config, onChange, hasPro = false, keywordSuggestions = [], tagSuggestions = [], parentActionType = '' } ) => {
	// Filter fields based on visibility rules. Rules come in two shapes:
	//  - string markers (legacy third-party serialization), e.g. 'not_parent_ai_brain'
	//  - declarative objects the server cannot evaluate: { type: 'parent_not'|'parent_is', action }
	// Static rules (class_exists / module_active) are already resolved
	// server-side into a boolean `visible` flag and dropped fields never arrive.
	const visibleFields = ( fields || [] ).filter( ( field ) => {
		if ( field.visible === false ) {
			return false;
		}
		const rule = field.visible_rule;
		if ( ! rule ) {
			return true;
		}
		if ( typeof rule === 'string' ) {
			if ( rule === 'not_parent_ai_brain' ) {
				return parentActionType !== 'ai_brain';
			}
			return true;
		}
		switch ( rule.type ) {
			case 'parent_not':
				return parentActionType !== rule.action;
			case 'parent_is':
				return parentActionType === rule.action;
			default:
				return true;
		}
	} );

	return (
		<>
			{ visibleFields.map( ( field ) => (
				<ConfigField
					key={ field.key }
					field={ field }
					value={ config?.[ field.key ] }
					legacyValue={ field.legacy_key ? config?.[ field.legacy_key ] : undefined }
					onChange={ ( v ) => onChange( field.key, v ) }
					hasPro={ hasPro }
					suggestions={
						field.type === 'tokens'
							? ( field.suggest === 'post_tags' ? tagSuggestions : keywordSuggestions )
							: []
					}
					actionType={ parentActionType }
				/>
			) ) }
		</>
	);
};

export default ConfigFields;
