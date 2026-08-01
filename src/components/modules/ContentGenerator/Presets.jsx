/**
 * Presets - manage generation presets (custom presets are PRO).
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import { trash, edit } from '@wordpress/icons';
import useApi from '../../../hooks/useApi';
// import usePro from '../../../hooks/usePro';
import Card from '../../common/Card';
import EmptyState from '../../common/EmptyState';
import { SkeletonBlock } from '../../common/Skeleton';
// import ProGate from '../../common/ProGate';
import ConfirmModal from '../../common/ConfirmModal';
import { toast } from '../../common/Toast';
import { isProActive, ProLabel, ProUpgradeButton } from '../../common/ProLock';

const TONES = [
	{ label: 'Professional', value: 'professional' },
	{ label: 'Casual', value: 'casual' },
	{ label: 'Friendly', value: 'friendly' },
	{ label: 'Authoritative', value: 'authoritative' },
	{ label: 'Humorous', value: 'humorous' },
	{ label: 'Formal', value: 'formal' },
	{ label: 'Conversational', value: 'conversational' },
];

const STYLES = [
	{ label: 'Blog Post', value: 'blog_post' },
	{ label: 'How-To Guide', value: 'how_to' },
	{ label: 'Listicle', value: 'listicle' },
	{ label: 'Product Review', value: 'product_review' },
	{ label: 'Case Study', value: 'case_study' },
	{ label: 'Tutorial', value: 'tutorial' },
	{ label: 'Opinion Piece', value: 'opinion' },
	{ label: 'News Article', value: 'news' },
];

const defaultPreset = {
	name: '',
	tone: 'professional',
	style: 'blog_post',
	language: 'en',
	word_count: 1000,
	prompt_template: '',
	system_instructions: '',
};

const Presets = () => {
	const { get, post, put, del, loading } = useApi();
	const hasPro = isProActive();
	const [ presets, setPresets ] = useState( [] );
	const [ editPreset, setEditPreset ] = useState( null );
	const [ confirmDelete, setConfirmDelete ] = useState( null );

	const fetchPresets = useCallback( async () => {
		try {
			const res = await get( '/content/presets' );
			setPresets( res || [] );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	useEffect( () => {
		fetchPresets();
	}, [ fetchPresets ] );

	const handleSave = async () => {
		if ( ! hasPro && ! editPreset.id ) {
			toast( __( 'New presets are available in Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		try {
			if ( editPreset.id ) {
				await put( `/content/presets/${ editPreset.id }`, editPreset );
				toast( __( 'Preset updated.', 'ai-marketing-expert' ) );
			} else {
				await post( '/content/presets', editPreset );
				toast( __( 'Preset created.', 'ai-marketing-expert' ) );
			}
			setEditPreset( null );
			fetchPresets();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleDelete = async ( id ) => {
		const preset = presets.find( ( item ) => item.id === id );
		if ( ! hasPro && preset && ! Number( preset.is_default ) ) {
			toast( __( 'Custom presets are available in Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		try {
			await del( `/content/presets/${ id }` );
			toast( __( 'Preset deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			fetchPresets();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	return (
		<div className="aime-presets">
			<div className="aime-page-header">
				<h2>{ __( 'Generation Presets', 'ai-marketing-expert' ) }</h2>
				{ /* ProGate removed for dev mode */ }
				<span className="aime-pro-inline-action">
					<Button variant="primary" disabled={ ! hasPro } onClick={ () => setEditPreset( { ...defaultPreset } ) }>
						{ __( 'New Preset', 'ai-marketing-expert' ) }
					</Button>
					{ ! hasPro && <><ProLabel /><ProUpgradeButton /></> }
				</span>
			</div>

			{ loading && ! presets.length ? (
				<div className="aime-presets-grid" aria-busy="true" aria-live="polite">
					<span className="screen-reader-text">{ __( 'Loading presets…', 'ai-marketing-expert' ) }</span>
					{ [ 0, 1, 2 ].map( ( i ) => (
						<Card key={ i } className="aime-preset-card">
							<SkeletonBlock height={ 15 } width="50%" style={ { marginBottom: 14 } } />
							<SkeletonBlock height={ 22 } width="85%" style={ { marginBottom: 14 } } />
							<SkeletonBlock height={ 13 } width="100%" style={ { marginBottom: 6 } } />
							<SkeletonBlock height={ 13 } width="65%" />
						</Card>
					) ) }
				</div>
			) : presets.length === 0 ? (
				<EmptyState
					title={ __( 'No presets yet', 'ai-marketing-expert' ) }
					description={ __( 'A preset saves the tone, style, length, and prompt instructions you use most, so a new article starts from your settings instead of the defaults.', 'ai-marketing-expert' ) }
				/>
			) : (
				<div className="aime-presets-grid">
					{ presets.map( ( preset ) => {
						const isCustomLocked = ! hasPro && ! Number( preset.is_default );
						return (
						<Card key={ preset.id } className="aime-preset-card">
							<div className="aime-preset-header">
								<h3>{ preset.name }</h3>
								{ preset.is_default ? (
									<span className="aime-badge-default">{ __( 'Default', 'ai-marketing-expert' ) }</span>
								) : null }
							</div>
							<div className="aime-preset-details">
								<span>{ __( 'Tone:', 'ai-marketing-expert' ) } { preset.tone }</span>
								<span>{ __( 'Style:', 'ai-marketing-expert' ) } { preset.style }</span>
								<span>{ __( 'Words:', 'ai-marketing-expert' ) } { preset.word_count }</span>
							</div>
							{ preset.prompt_template && (
								// Clamped in CSS at three lines — a 100-char substring cut
								// mid-word and then added an ellipsis of its own.
								<p className="aime-preset-template">{ preset.prompt_template }</p>
							) }
							<div className="aime-preset-actions">
								<Button
									icon={ edit }
									label={ __( 'Edit', 'ai-marketing-expert' ) }
									disabled={ isCustomLocked }
									onClick={ () => isCustomLocked ? toast( __( 'Custom presets are available in Pro.', 'ai-marketing-expert' ), 'warning' ) : setEditPreset( { ...preset } ) }
									size="small"
								/>
								{ isCustomLocked && <ProLabel /> }
								{ ! preset.is_default && (
									<Button
										icon={ trash }
										label={ __( 'Delete', 'ai-marketing-expert' ) }
										isDestructive
										onClick={ () => setConfirmDelete( preset.id ) }
										size="small"
									/>
								) }
							</div>
						</Card>
					); } ) }
				</div>
			) }

			{ /* Edit / create modal - premium style */ }
			{ editPreset && (
				<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) setEditPreset( null ); } }>
					<div className="aime-premium-modal">
						<div className="aime-premium-modal-header">
							<h3>
								<span className="aime-premium-modal-icon">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM9 13h6v2H9v-2zm0 4h6v2H9v-2zm0-8h2v2H9V9z"/></svg>
								</span>
								{ editPreset.id ? __( 'Edit Preset', 'ai-marketing-expert' ) : __( 'New Preset', 'ai-marketing-expert' ) }
							</h3>
							<button className="aime-modal-close" onClick={ () => setEditPreset( null ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Name', 'ai-marketing-expert' ) } *</label>
								<input
									type="text"
									className="aime-premium-input"
									placeholder={ __( 'Enter preset name', 'ai-marketing-expert' ) }
									value={ editPreset.name }
									onChange={ ( e ) => setEditPreset( { ...editPreset, name: e.target.value } ) }
								/>
							</div>

							<div className="aime-premium-form-row">
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Tone', 'ai-marketing-expert' ) }</label>
									<select
										className="aime-premium-select"
										value={ editPreset.tone }
										onChange={ ( e ) => setEditPreset( { ...editPreset, tone: e.target.value } ) }
									>
										{ TONES.map( ( opt ) => (
											<option key={ opt.value } value={ opt.value }>{ opt.label }</option>
										) ) }
									</select>
								</div>
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Style', 'ai-marketing-expert' ) }</label>
									<select
										className="aime-premium-select"
										value={ editPreset.style }
										onChange={ ( e ) => setEditPreset( { ...editPreset, style: e.target.value } ) }
									>
										{ STYLES.map( ( opt ) => (
											<option key={ opt.value } value={ opt.value }>{ opt.label }</option>
										) ) }
									</select>
								</div>
							</div>

							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Default Word Count', 'ai-marketing-expert' ) }</label>
								<input
									type="number"
									className="aime-premium-input"
									value={ editPreset.word_count }
									onChange={ ( e ) => setEditPreset( { ...editPreset, word_count: parseInt( e.target.value ) || 1000 } ) }
								/>
							</div>

							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Prompt Template', 'ai-marketing-expert' ) }</label>
								<textarea
									className="aime-premium-textarea"
									rows={ 4 }
									placeholder={ __( 'Additional instructions appended to the AI prompt.', 'ai-marketing-expert' ) }
									value={ editPreset.prompt_template || '' }
									onChange={ ( e ) => setEditPreset( { ...editPreset, prompt_template: e.target.value } ) }
								/>
								<span className="aime-premium-form-help">{ __( 'Additional instructions appended to the AI prompt.', 'ai-marketing-expert' ) }</span>
							</div>

							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'System Instructions', 'ai-marketing-expert' ) }</label>
								<textarea
									className="aime-premium-textarea"
									rows={ 4 }
									placeholder={ __( 'Custom system-level instructions for the AI model.', 'ai-marketing-expert' ) }
									value={ editPreset.system_instructions || '' }
									onChange={ ( e ) => setEditPreset( { ...editPreset, system_instructions: e.target.value } ) }
								/>
								<span className="aime-premium-form-help">{ __( 'Custom system-level instructions for the AI model.', 'ai-marketing-expert' ) }</span>
							</div>
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => setEditPreset( null ) }>
								{ __( 'Cancel', 'ai-marketing-expert' ) }
							</button>
							<button className="aime-btn-primary" onClick={ handleSave } disabled={ ! editPreset.name || loading }>
								{ editPreset.id ? __( 'Update Preset', 'ai-marketing-expert' ) : __( 'Create Preset', 'ai-marketing-expert' ) }
							</button>
						</div>
					</div>
				</div>
			) }

			{ /* Confirm delete */ }
			{ confirmDelete && (
				<ConfirmModal
					title={ __( 'Delete Preset', 'ai-marketing-expert' ) }
					message={ __( 'Are you sure you want to delete this preset?', 'ai-marketing-expert' ) }
					confirmLabel={ __( 'Delete', 'ai-marketing-expert' ) }
					isDestructive
					onConfirm={ () => handleDelete( confirmDelete ) }
					onCancel={ () => setConfirmDelete( null ) }
				/>
			) }
		</div>
	);
};

export default Presets;
