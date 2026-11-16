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
import apiFetch from '@wordpress/api-fetch';
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

const SkillCard = ( { entry, active, onToggle } ) => (
	<button
		type="button"
		className={ `aime-wf-promptlib__card${ active ? ' is-active' : '' }` }
		onClick={ () => onToggle( entry ) }
		title={
			active
				? __( 'Remove skill', 'ai-marketing-expert' )
				: __( 'Add skill', 'ai-marketing-expert' )
		}
	>
		<span className="aime-wf-promptlib__card-title">
			{ active ? '✓ ' : '+ ' }
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
	onClose,
	onUse,
	onToggleSkill,
} ) => {
	const [ query, setQuery ] = useState( '' );
	const [ showAddCustom, setShowAddCustom ] = useState( false );
	const [ newTitle, setNewTitle ] = useState( '' );
	const [ newDesc, setNewDesc ] = useState( '' );
	const [ newInstructions, setNewInstructions ] = useState( '' );
	const [ savingCustom, setSavingCustom ] = useState( false );
	const [ createdSkills, setCreatedSkills ] = useState( [] );
	const isSkills = mode === 'skills';

	if ( ! open ) {
		return null;
	}

	const isSkillPro = () => false;
	const handleSkillToggle = ( entry ) => {
		onToggleSkill && onToggleSkill( entry );
	};

	const handleCreateCustomSkill = () => {
		if ( ! newTitle.trim() || ! newInstructions.trim() ) {
			toast( __( 'Title and instructions are required.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setSavingCustom( true );
		apiFetch( {
			path: '/aime/v1/workflow-automation/skills',
			method: 'POST',
			data: {
				title: newTitle.trim(),
				description: newDesc.trim(),
				instructions: newInstructions.trim(),
			},
		} )
			.then( ( res ) => {
				setSavingCustom( false );
				if ( res?.id ) {
					const entry = {
						id: res.id,
						title: newTitle.trim(),
						description: newDesc.trim(),
						instructions: newInstructions.trim(),
						custom: true,
					};
					setCreatedSkills( ( prev ) => [ ...prev, entry ] );
					onToggleSkill && onToggleSkill( entry );
					setNewTitle( '' );
					setNewDesc( '' );
					setNewInstructions( '' );
					setShowAddCustom( false );
					toast( __( 'Custom skill created and selected!', 'ai-marketing-expert' ), 'success' );
				}
			} )
			.catch( ( err ) => {
				setSavingCustom( false );
				toast( err?.message || __( 'Could not create skill.', 'ai-marketing-expert' ), 'error' );
			} );
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

	const allSkills = [ ...SKILL_LIBRARY, ...( skills || [] ), ...( customSkills || [] ), ...createdSkills ];
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

					<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' } }>
						<SearchControl
							value={ query }
							onChange={ setQuery }
							placeholder={ __( 'Search skills…', 'ai-marketing-expert' ) }
							className="aime-wf-promptlib__search"
						/>
						<button
							type="button"
							className="button button-secondary"
							style={ { whiteSpace: 'nowrap', height: '36px' } }
							onClick={ () => setShowAddCustom( ! showAddCustom ) }
						>
							{ showAddCustom ? __( 'Cancel', 'ai-marketing-expert' ) : __( '+ Add Custom Skill', 'ai-marketing-expert' ) }
						</button>
					</div>

					{ showAddCustom && (
						<div style={ { background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #cbd5e1' } }>
							<h4 style={ { margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 } }>{ __( 'Create Custom Brain Skill', 'ai-marketing-expert' ) }</h4>
							<input
								type="text"
								placeholder={ __( 'Skill Title (e.g. Technical SEO Guard)', 'ai-marketing-expert' ) }
								value={ newTitle }
								onChange={ ( e ) => setNewTitle( e.target.value ) }
								style={ { width: '100%', marginBottom: '8px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc' } }
							/>
							<input
								type="text"
								placeholder={ __( 'Short Description', 'ai-marketing-expert' ) }
								value={ newDesc }
								onChange={ ( e ) => setNewDesc( e.target.value ) }
								style={ { width: '100%', marginBottom: '8px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc' } }
							/>
							<textarea
								placeholder={ __( 'Prompt instructions/rules to inject into AI Brain...', 'ai-marketing-expert' ) }
								value={ newInstructions }
								onChange={ ( e ) => setNewInstructions( e.target.value ) }
								rows={ 3 }
								style={ { width: '100%', marginBottom: '8px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc' } }
							/>
							<button
								type="button"
								className="button button-primary"
								disabled={ savingCustom || ! newTitle.trim() || ! newInstructions.trim() }
								onClick={ handleCreateCustomSkill }
							>
								{ savingCustom ? __( 'Saving…', 'ai-marketing-expert' ) : __( 'Save & Select Skill', 'ai-marketing-expert' ) }
							</button>
						</div>
					) }

					<div className="aime-wf-promptlib__list">
						{ filteredSkills.map( ( entry ) => (
							<SkillCard
								key={ entry.id }
								entry={ entry }
								active={ ( activeSkillIds || [] ).includes( entry.id ) }
								locked={ false }
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
