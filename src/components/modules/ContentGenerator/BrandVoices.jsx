/**
 * Brand Voices - reusable voice profiles for content generation.
 */

import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, TextareaControl, ToggleControl, Spinner } from '@aime/wp-components';
import { edit, trash, starFilled } from '@wordpress/icons';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import { toast } from '../../common/Toast';
import { isProActive, ProLabel, ProUpgradeButton } from '../../common/ProLock';

const emptyVoice = { name: '', description: '', tone_rules: '', style_rules: '', avoid_rules: '', is_default: false };

const BrandVoices = () => {
	const { get, post, put, del, loading } = useApi();
	const hasPro = isProActive();
	const [ voices, setVoices ] = useState( [] );
	const [ editing, setEditing ] = useState( null );
	const [ generating, setGenerating ] = useState( null );
	const [ saving, setSaving ] = useState( false );
	const [ aiWorking, setAiWorking ] = useState( false );

	const fetchVoices = useCallback( async () => {
		const res = await get( '/content/brand-voices' );
		setVoices( res.items || [] );
	}, [ get ] );

	useEffect( () => { fetchVoices(); }, [ fetchVoices ] );

	const saveVoice = async () => {
		if ( ! hasPro ) {
			toast( __( 'Brand Voices are available in Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		if ( ! editing?.name?.trim() ) {
			toast( __( 'Brand voice name is required.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setSaving( true );
		try {
			if ( editing.id ) await put( `/content/brand-voices/${ editing.id }`, editing );
			else await post( '/content/brand-voices', editing );
			toast( __( 'Brand voice saved.', 'ai-marketing-expert' ) );
			setEditing( null );
			fetchVoices();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSaving( false );
		}
	};

	const deleteVoice = async ( id ) => {
		if ( ! hasPro ) {
			toast( __( 'Brand Voices are available in Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		if ( ! window.confirm( __( 'Delete this brand voice?', 'ai-marketing-expert' ) ) ) return;
		try {
			await del( `/content/brand-voices/${ id }` );
			toast( __( 'Brand voice deleted.', 'ai-marketing-expert' ) );
			fetchVoices();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const generateVoice = async () => {
		if ( ! hasPro ) {
			toast( __( 'AI Brand Voice generation is available in Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		setAiWorking( true );
		try {
			const res = await post( '/content/brand-voices/generate', generating || {} );
			if ( res?.voice ) {
				setEditing( { ...emptyVoice, ...res.voice } );
				setGenerating( null );
				toast( __( 'Brand voice generated. Review and save it.', 'ai-marketing-expert' ), 'success' );
			}
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setAiWorking( false );
		}
	};

	const previewText = ( value, fallback = '' ) => ( value || fallback || __( 'Not set.', 'ai-marketing-expert' ) ).slice( 0, 150 );

	return (
		<div className="aime-brand-voices">
			<div className="aime-page-header">
				<h2 className="aime-pro-card-header">{ __( 'Brand Voices', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</h2>
				<div className="aime-page-header-actions">
					{ ! hasPro && <ProUpgradeButton /> }
					<Button variant="secondary" icon={ starFilled } disabled={ ! hasPro } onClick={ () => setGenerating( { business_name: '', industry: '', audience: '', personality: '', goals: '' } ) }>
						{ __( 'Generate with AI', 'ai-marketing-expert' ) }
					</Button>
					<Button variant="primary" disabled={ ! hasPro } onClick={ () => setEditing( { ...emptyVoice } ) }>{ __( 'New Voice', 'ai-marketing-expert' ) }</Button>
				</div>
			</div>

			{ loading && ! voices.length ? <Loader text={ __( 'Loading brand voices...', 'ai-marketing-expert' ) } /> : (
				<div className="aime-presets-grid aime-brand-voice-grid">
					{ voices.length === 0 && <p className="aime-empty-text">{ __( 'No brand voices yet. Create one to keep generated content consistent.', 'ai-marketing-expert' ) }</p> }
					{ voices.map( ( voice ) => (
						<Card key={ voice.id } className="aime-preset-card aime-brand-voice-card">
							<div className="aime-preset-header">
								<h3>{ voice.name }</h3>
								{ Number( voice.is_default ) === 1 ? <span className="aime-badge-default">{ __( 'Default', 'ai-marketing-expert' ) }</span> : null }
							</div>
							<p className="aime-brand-voice-description">{ voice.description || __( 'No description.', 'ai-marketing-expert' ) }</p>
							<div className="aime-preset-details aime-brand-voice-values">
								<span>{ __( 'Tone:', 'ai-marketing-expert' ) } { previewText( voice.tone_rules ) }</span>
								<span>{ __( 'Style:', 'ai-marketing-expert' ) } { previewText( voice.style_rules ) }</span>
								<span>{ __( 'Avoid:', 'ai-marketing-expert' ) } { previewText( voice.avoid_rules ) }</span>
							</div>
							<div className="aime-preset-actions">
								<Button icon={ edit } label={ __( 'Edit', 'ai-marketing-expert' ) } onClick={ () => setEditing( { ...voice, is_default: Number( voice.is_default ) === 1 } ) } size="small" />
								<Button icon={ trash } label={ __( 'Delete', 'ai-marketing-expert' ) } isDestructive onClick={ () => deleteVoice( voice.id ) } size="small" />
							</div>
						</Card>
					) ) }
				</div>
			) }

			{ generating && (
				<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) setGenerating( null ); } }>
					<div className="aime-premium-modal aime-brand-voice-modal">
						<div className="aime-premium-modal-header">
							<h3>{ __( 'Generate Brand Voice with AI', 'ai-marketing-expert' ) }</h3>
							<button className="aime-modal-close" onClick={ () => setGenerating( null ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<TextControl label={ __( 'Business / Brand Name', 'ai-marketing-expert' ) } placeholder={ __( 'Example: PluginPulse', 'ai-marketing-expert' ) } value={ generating.business_name } onChange={ ( value ) => setGenerating( { ...generating, business_name: value } ) } />
							<TextControl label={ __( 'Industry / Niche', 'ai-marketing-expert' ) } placeholder={ __( 'Example: WordPress plugins, SaaS, ecommerce, local services', 'ai-marketing-expert' ) } value={ generating.industry } onChange={ ( value ) => setGenerating( { ...generating, industry: value } ) } />
							<TextareaControl label={ __( 'Target Audience', 'ai-marketing-expert' ) } placeholder={ __( 'Example: WordPress site owners, agencies, and non-technical business owners who want simple automation.', 'ai-marketing-expert' ) } value={ generating.audience } onChange={ ( value ) => setGenerating( { ...generating, audience: value } ) } rows={ 2 } />
							<TextareaControl label={ __( 'Personality / Style Direction', 'ai-marketing-expert' ) } placeholder={ __( 'Example: helpful expert, friendly, practical, confident, no hype.', 'ai-marketing-expert' ) } value={ generating.personality } onChange={ ( value ) => setGenerating( { ...generating, personality: value } ) } rows={ 2 } />
							<TextareaControl label={ __( 'Content Goals', 'ai-marketing-expert' ) } placeholder={ __( 'Example: educate readers, build trust, explain benefits clearly, and encourage trial signups.', 'ai-marketing-expert' ) } value={ generating.goals } onChange={ ( value ) => setGenerating( { ...generating, goals: value } ) } rows={ 2 } />
						</div>
						<div className="aime-premium-modal-footer">
							<Button variant="secondary" onClick={ () => setGenerating( null ) }>{ __( 'Cancel', 'ai-marketing-expert' ) }</Button>
							<Button variant="primary" onClick={ generateVoice } disabled={ aiWorking }>{ aiWorking ? <><Spinner style={ { marginRight: 4 } } />{ __( 'Generating...', 'ai-marketing-expert' ) }</> : __( 'Generate Voice', 'ai-marketing-expert' ) }</Button>
						</div>
					</div>
				</div>
			) }

			{ editing && (
				<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) setEditing( null ); } }>
					<div className="aime-premium-modal aime-brand-voice-modal">
						<div className="aime-premium-modal-header">
							<h3>{ editing.id ? __( 'Edit Brand Voice', 'ai-marketing-expert' ) : __( 'New Brand Voice', 'ai-marketing-expert' ) }</h3>
							<button className="aime-modal-close" onClick={ () => setEditing( null ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<TextControl label={ __( 'Name', 'ai-marketing-expert' ) } placeholder={ __( 'Example: Expert Advisor', 'ai-marketing-expert' ) } value={ editing.name } onChange={ ( value ) => setEditing( { ...editing, name: value } ) } />
							<TextareaControl label={ __( 'Description', 'ai-marketing-expert' ) } placeholder={ __( 'Example: Confident, practical, and educational voice for authority-building content.', 'ai-marketing-expert' ) } value={ editing.description || '' } onChange={ ( value ) => setEditing( { ...editing, description: value } ) } rows={ 2 } />
							<TextareaControl label={ __( 'Tone Rules', 'ai-marketing-expert' ) } placeholder={ __( 'Example: Be clear, credible, calm, and helpful. Use confident language without sounding arrogant.', 'ai-marketing-expert' ) } value={ editing.tone_rules || '' } onChange={ ( value ) => setEditing( { ...editing, tone_rules: value } ) } rows={ 3 } />
							<TextareaControl label={ __( 'Style Rules', 'ai-marketing-expert' ) } placeholder={ __( 'Example: Use short paragraphs, practical examples, and actionable takeaways. Prefer direct sentences over hype.', 'ai-marketing-expert' ) } value={ editing.style_rules || '' } onChange={ ( value ) => setEditing( { ...editing, style_rules: value } ) } rows={ 3 } />
							<TextareaControl label={ __( 'Avoid', 'ai-marketing-expert' ) } placeholder={ __( 'Example: Avoid vague claims, filler intros, unsupported guarantees, and generic buzzwords.', 'ai-marketing-expert' ) } value={ editing.avoid_rules || '' } onChange={ ( value ) => setEditing( { ...editing, avoid_rules: value } ) } rows={ 2 } />
							<ToggleControl label={ __( 'Use as default brand voice', 'ai-marketing-expert' ) } checked={ !! editing.is_default } onChange={ ( value ) => setEditing( { ...editing, is_default: value } ) } />
						</div>
						<div className="aime-premium-modal-footer">
							<Button variant="secondary" onClick={ () => setEditing( null ) }>{ __( 'Cancel', 'ai-marketing-expert' ) }</Button>
							<Button variant="primary" onClick={ saveVoice } disabled={ saving }>{ saving ? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</> : __( 'Save Voice', 'ai-marketing-expert' ) }</Button>
						</div>
					</div>
				</div>
			) }
		</div>
	);
};

export default BrandVoices;
