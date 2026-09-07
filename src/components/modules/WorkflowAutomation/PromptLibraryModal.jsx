/**
 * Library modal — single-purpose popup, no tabs.
 *
 * UX contract:
 *  - mode="prompts": browse pre-made prompts, "Use" inserts text via onUse().
 *    Entries tagged with the current step's action type list first
 *    under "Recommended", rest under "All prompts".
 *  - mode="skills": browse reusable skill blocks, click toggles selection
 *    via onToggleSkill() and keeps modal open for multi-select.
 *  - Search filters current list only. Closing without choosing changes
 *    nothing for prompts; skill toggles apply instantly.
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Modal, SearchControl } from '../../common/WpComponents';
import { toast } from '../../common/Toast';
import { splitPromptsForAction } from './promptLibrary';
import { SKILL_LIBRARY } from './skillLibrary';

/** One selectable prompt card. */
const PromptCard = ( { entry, onUse } ) => (
	<button
		type="button"
		className="aime-wf-promptlib__card"
		onClick={ () => onUse( entry ) }
		title={ __( 'Use this prompt', 'ai-marketing-expert' ) }
	>
		<span className="aime-wf-promptlib__card-title">{ entry.title }</span>
		<span className="aime-wf-promptlib__card-text">{ entry.text || entry.description }</span>
	</button>
);

const SkillCard = ( { entry, active, locked, onToggle } ) => (
	<button
		type="button"
		className={ `aime-wf-promptlib__card${ active ? ' is-active' : '' }` }
		onClick={ () => onToggle( entry ) }
		title={
			locked
				? __( 'This skill requires Pro.', 'ai-marketing-expert' )
				: active
					? __( 'Remove skill', 'ai-marketing-expert' )
					: __( 'Add skill', 'ai-marketing-expert' )
		}
	>
		<span className="aime-wf-promptlib__card-title">
			{ locked ? '🔒 ' : active ? '✓ ' : '+ ' }
			{ entry.title }
		</span>
		<span className="aime-wf-promptlib__card-text">{ entry.description }</span>
	</button>
);

const PromptLibraryModal = ( {
	open,
	actionType = '',
	mode = 'prompts',
	skills = [],
	customSkills = [],
	activeSkillIds = [],
	hasPro = false,
	onClose,
	onUse,
	onToggleSkill,
} ) => {
	const [ query, setQuery ] = useState( '' );
	const isSkills = mode === 'skills';

	if ( ! open ) {
		return null;
	}

	// Pro gate for skill toggles (server re-enforces in resolve()).
	// REST skills use `is_pro`, static catalog uses `isPro`; customs lock too.
	const isSkillPro = ( entry ) => !! ( entry.isPro || entry.is_pro || entry.custom );
	const handleSkillToggle = ( entry ) => {
		if ( isSkillPro( entry ) && ! hasPro ) {
			toast( __( 'This skill requires Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		onToggleSkill && onToggleSkill( entry );
	};

	const needle = query.trim().toLowerCase();
	const matchesPrompt = ( entry ) =>
		! needle ||
		entry.title.toLowerCase().includes( needle ) ||
		( entry.text || '' ).toLowerCase().includes( needle );
	const matchesSkill = ( entry ) =>
		! needle ||
		entry.title.toLowerCase().includes( needle ) ||
		( entry.description || '' ).toLowerCase().includes( needle );

	const { recommended, others } = splitPromptsForAction( actionType );
	const rec = recommended.filter( matchesPrompt );
	const rest = others.filter( matchesPrompt );
	const nothingFound = ! rec.length && ! rest.length;

	const pick = ( entry ) => {
		onUse( entry.text, entry );
		setQuery( '' );
		onClose();
	};

	const allSkills = [ ...SKILL_LIBRARY, ...( skills || [] ), ...( customSkills || [] ) ];
	const seen = new Set();
	const dedupedSkills = allSkills.filter( ( s ) => {
		if ( ! s || ! s.id || seen.has( s.id ) ) {
			return false;
		}
		seen.add( s.id );
		return true;
	} );
	const filteredSkills = dedupedSkills.filter( matchesSkill );

	return (
		<Modal
			title={ isSkills ? __( 'Skill library', 'ai-marketing-expert' ) : __( 'Prompt library', 'ai-marketing-expert' ) }
			onRequestClose={ () => {
				setQuery( '' );
				onClose();
			} }
			className="aime-wf-promptlib"
			overlayClassName="aime-modal-overlay"
		>
			{ ! isSkills && (
				<>
					<p className="aime-wf-promptlib__intro">
						{ __(
							'Pick a professionally written starting point, then edit it freely. Skip this dialog to keep writing your own.',
							'ai-marketing-expert'
						) }
					</p>

					<SearchControl
						value={ query }
						onChange={ setQuery }
						placeholder={ __( 'Search prompts…', 'ai-marketing-expert' ) }
						className="aime-wf-promptlib__search"
					/>

					<div className="aime-wf-promptlib__list">
						{ !! rec.length && (
							<>
								<h3 className="aime-wf-promptlib__group">
									{ __( 'Recommended for this step', 'ai-marketing-expert' ) }
								</h3>
								{ rec.map( ( entry ) => (
									<PromptCard key={ entry.id } entry={ entry } onUse={ pick } />
								) ) }
							</>
						) }

						{ !! rest.length && (
							<>
								{ !! rec.length && (
									<h3 className="aime-wf-promptlib__group">
										{ __( 'All prompts', 'ai-marketing-expert' ) }
									</h3>
								) }
								{ rest.map( ( entry ) => (
									<PromptCard key={ entry.id } entry={ entry } onUse={ pick } />
								) ) }
							</>
						) }

						{ nothingFound && (
							<p className="aime-wf-promptlib__empty">
								{ __( 'No prompts match your search.', 'ai-marketing-expert' ) }
							</p>
						) }
					</div>
				</>
			) }

			{ isSkills && (
				<>
					<p className="aime-wf-promptlib__intro">
						{ __(
							'Skills are reusable rule blocks merged into the Brain prompt. Toggle 2–4 per workflow.',
							'ai-marketing-expert'
						) }
					</p>

					<SearchControl
						value={ query }
						onChange={ setQuery }
						placeholder={ __( 'Search skills…', 'ai-marketing-expert' ) }
						className="aime-wf-promptlib__search"
					/>

					<div className="aime-wf-promptlib__list">
						{ filteredSkills.map( ( entry ) => (
							<SkillCard
								key={ entry.id }
								entry={ entry }
								active={ ( activeSkillIds || [] ).includes( entry.id ) }
								locked={ isSkillPro( entry ) && ! hasPro }
								onToggle={ handleSkillToggle }
							/>
						) ) }
						{ ! filteredSkills.length && (
							<p className="aime-wf-promptlib__empty">
								{ __( 'No skills match your search.', 'ai-marketing-expert' ) }
							</p>
						) }
					</div>
				</>
			) }
		</Modal>
	);
};

export default PromptLibraryModal;
