/**
 * EmailTemplates - premium template library with SVG card views and management.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SearchControl } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import useSlowWarning from '../../../hooks/useSlowWarning';
import Card from '../../common/Card';
import { isAiConfigured, aiDisabledTitle } from '../../common/AiNotice';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import { isProActive, ProLabel, ProUpgradeButton } from '../../common/ProLock';

const CATEGORY_OPTIONS = [
	{ label: __( 'All Categories', 'ai-marketing-expert' ), value: '' },
	{ label: __( 'Marketing', 'ai-marketing-expert' ), value: 'marketing' },
	{ label: __( 'Transactional', 'ai-marketing-expert' ), value: 'transactional' },
	{ label: __( 'Notification', 'ai-marketing-expert' ), value: 'notification' },
	{ label: __( 'Welcome', 'ai-marketing-expert' ), value: 'welcome' },
	{ label: __( 'Newsletter', 'ai-marketing-expert' ), value: 'newsletter' },
	{ label: __( 'Promotional', 'ai-marketing-expert' ), value: 'promotional' },
];

const CATEGORY_COLORS = {
	marketing: '#BE123C',
	transactional: '#0D47A1',
	notification: '#E65100',
	welcome: '#4A148C',
	newsletter: '#00695C',
	promotional: '#B71C1C',
};

const TEMPLATE_IMAGE_MAP = [
	{ keys: [ 'digest', 'roundup' ], file: 'template-digest-roundup.webp' },
	{ keys: [ 'event', 'invitation', 'invite' ], file: 'template-event-invitation.webp' },
	{ keys: [ 'feedback', 'survey' ], file: 'template-feedback-request.webp' },
	{ keys: [ 'minimal', 'dark' ], file: 'template-minimal-dark.webp' },
	{ keys: [ 'modern', 'card' ], file: 'template-modern-card.webp' },
	{ keys: [ 'newsletter', 'classic' ], file: 'template-newsletter-classic.webp' },
	{ keys: [ 'notification', 'alert' ], file: 'template-notification-alert.webp' },
	{ keys: [ 'product', 'launch' ], file: 'template-product-launch.webp' },
	{ keys: [ 'promotional', 'promotion', 'offer' ], file: 'template-promotional-offer.webp' },
	{ keys: [ 're-engagement', 'reengagement', 'winback' ], file: 'template-re-engagement.webp' },
	{ keys: [ 'seasonal', 'sale' ], file: 'template-seasonal-sale.webp' },
	{ keys: [ 'simple', 'text' ], file: 'template-simple-text.webp' },
	{ keys: [ 'transactional', 'receipt' ], file: 'template-transactional-receipt.webp' },
	{ keys: [ 'welcome' ], file: 'template-welcome-email.webp' },
];

const getTemplateImage = ( template ) => {
	const haystack = `${ template.title || '' } ${ template.name || '' } ${ template.category || '' }`.toLowerCase();
	const match = TEMPLATE_IMAGE_MAP.find( ( item ) => item.keys.some( ( key ) => haystack.includes( key ) ) );
	return `${ window.aimeData?.pluginUrl || '' }assets/img/templates/${ match?.file || 'template-modern-card.webp' }`;
};

const EmailTemplates = ( { onNavigate } ) => {
	const { get, post, del, loading, error, clearError } = useApi();
	const slowWarning = useSlowWarning();
	const hasPro = isProActive();
	const freeTemplateLimit = Number( window.aimeData?.freeLimits?.email_template_imports_free || 4 );
	const [ templates, setTemplates ] = useState( [] );
	const [ search, setSearch ] = useState( '' );
	const [ category, setCategory ] = useState( '' );
	const [ page, setPage ] = useState( 1 );
	const [ total, setTotal ] = useState( 0 );
	const [ previewId, setPreviewId ] = useState( null );
	const [ previewHtml, setPreviewHtml ] = useState( '' );
	const [ showCreate, setShowCreate ] = useState( false );
	const [ form, setForm ] = useState( { name: '', category: 'marketing', subject: '', content: '' } );
	const [ aiLoading, setAiLoading ] = useState( false );

	const fetchList = useCallback( async () => {
		const params = new URLSearchParams( { page, per_page: 20 } );
		if ( search ) params.set( 'search', search );
		if ( category ) params.set( 'category', category );
		try {
			const res = await get( `/email/templates?${ params }` );
			setTemplates( res.items || [] );
			setTotal( res.total || 0 );
		} catch ( e ) { /* */ }
	}, [ get, page, search, category ] );

	useEffect( () => { fetchList(); }, [ fetchList ] );

	const handlePreview = async ( tid, locked = false ) => {
		if ( locked ) {
			return;
		}
		try {
			const res = await get( `/email/templates/${ tid }` );
			setPreviewHtml( res.content || '' );
			setPreviewId( tid );
		} catch ( e ) { /* */ }
	};

	const handleDuplicate = async ( tid, locked = false ) => {
		if ( locked ) {
			return;
		}
		try {
			await post( `/email/templates/${ tid }/duplicate` );
			fetchList();
		} catch ( e ) { /* */ }
	};

	const handleDelete = async ( tid ) => {
		if ( ! window.confirm( __( 'Delete this template?', 'ai-marketing-expert' ) ) ) return;
		try {
			await del( `/email/templates/${ tid }` );
			fetchList();
		} catch ( e ) { /* */ }
	};

	const handleCreate = async () => {
		try {
			await post( '/email/templates', form );
			setShowCreate( false );
			setForm( { name: '', category: 'marketing', subject: '', content: '' } );
			fetchList();
		} catch ( e ) { /* */ }
	};

	const handleAiGenerate = async () => {
		setAiLoading( true );
		slowWarning.start();
		try {
			const res = await post( '/email/ai/generate-template', {
				prompt: form.name || 'professional email template',
				style: form.category || 'marketing',
			} );
			if ( res.html ) {
				setForm( { ...form, content: res.html } );
			}
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setAiLoading( false );
		}
	};

	const handleInstallDefaults = async () => {
		try {
			await post( '/email/templates/install-defaults' );
			fetchList();
		} catch ( e ) { /* */ }
	};

	const totalPages = Math.ceil( total / 20 );

	return (
		<Card
			title={ __( 'Template Library', 'ai-marketing-expert' ) }
			actions={
				<div className="aime-header-actions">
					<Button variant="secondary" onClick={ handleInstallDefaults }>{ __( 'Install Defaults', 'ai-marketing-expert' ) }</Button>
					<Button variant="primary" onClick={ () => setShowCreate( true ) }>{ __( '+ New Template', 'ai-marketing-expert' ) }</Button>
				</div>
			}
		>
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-table-toolbar">
				<SearchControl value={ search } onChange={ ( v ) => { setSearch( v ); setPage( 1 ); } } placeholder={ __( 'Search templates...', 'ai-marketing-expert' ) } />
				<div className="aime-category-pills">
					{ CATEGORY_OPTIONS.map( ( opt ) => (
						<button
							key={ opt.value }
							className={ `aime-category-pill ${ category === opt.value ? 'active' : '' }` }
							onClick={ () => { setCategory( opt.value ); setPage( 1 ); } }
						>
							{ opt.label }
						</button>
					) ) }
				</div>
			</div>

			{ loading && <Loader /> }

			{ ! loading && templates.length === 0 && (
				<div className="aime-empty-state">
					<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="8" y="12" width="64" height="56" rx="6" stroke="var(--aime-primary)" strokeWidth="2" fill="var(--aime-primary-light)" opacity="0.15" />
						<rect x="16" y="20" width="48" height="8" rx="4" fill="var(--aime-primary)" opacity="0.3" />
						<rect x="16" y="34" width="32" height="4" rx="2" fill="var(--aime-primary)" opacity="0.2" />
						<rect x="16" y="42" width="48" height="4" rx="2" fill="var(--aime-primary)" opacity="0.2" />
						<rect x="16" y="50" width="24" height="4" rx="2" fill="var(--aime-primary)" opacity="0.2" />
						<circle cx="60" cy="56" r="14" fill="var(--aime-primary)" opacity="0.15" />
						<text x="55" y="61" fontSize="16" fill="var(--aime-primary)" fontWeight="bold">+</text>
					</svg>
					<p style={ { marginTop: 12, color: 'var(--aime-text-light)' } }>
						{ __( 'No templates found. Create one or install defaults.', 'ai-marketing-expert' ) }
					</p>
				</div>
			) }

			{ ! loading && templates.length > 0 && (
				<div className="aime-template-svg-grid">
					{ templates.map( ( t, index ) => {
						const isLocked = ! hasPro && index >= freeTemplateLimit;
						return (
						<div key={ t.id } className="aime-template-svg-card">
							<div className="aime-svg-card-preview" onClick={ () => handlePreview( t.id, isLocked ) }>
								<img src={ getTemplateImage( t ) } alt={ t.title || t.name } loading="lazy" />
								<div className="aime-svg-card-overlay">
									{ isLocked ? (
										<span className="aime-svg-overlay-btn aime-svg-overlay-btn--disabled"><ProLabel /></span>
									) : (
										<>
											<button className="aime-svg-overlay-btn" onClick={ ( e ) => { e.stopPropagation(); handlePreview( t.id ); } }>
												<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
												{ __( 'Preview', 'ai-marketing-expert' ) }
											</button>
											<button className="aime-svg-overlay-btn" onClick={ ( e ) => { e.stopPropagation(); handleDuplicate( t.id ); } }>
												<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
												{ __( 'Duplicate', 'ai-marketing-expert' ) }
											</button>
										</>
									) }
								</div>
							</div>
							<div className="aime-svg-card-body">
								<h4 className="aime-svg-card-title aime-pro-card-header">{ t.title || t.name }{ isLocked && <ProLabel /> }</h4>
								<div className="aime-svg-card-meta">
									<span
										className="aime-svg-card-category"
										style={ { background: `${ CATEGORY_COLORS[ t.category ] || '#1B5E20' }18`, color: CATEGORY_COLORS[ t.category ] || '#1B5E20' } }
									>
										{ t.category }
									</span>
									{ t.created_at && (
										<span className="aime-svg-card-date">
											{ new Date( t.created_at ).toLocaleDateString() }
										</span>
									) }
								</div>
							</div>
							<div className="aime-svg-card-footer">
								<Button variant="secondary" size="small" disabled={ isLocked } onClick={ () => handlePreview( t.id ) }>
									{ __( 'Use Template', 'ai-marketing-expert' ) }
								</Button>
								{ isLocked && <ProUpgradeButton /> }
								<Button isDestructive variant="tertiary" size="small" onClick={ () => handleDelete( t.id ) }>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
								</Button>
							</div>
						</div>
					); } ) }
				</div>
			) }

			{ totalPages > 1 && (
				<div className="aime-pagination">
					<Button variant="secondary" disabled={ page <= 1 } onClick={ () => setPage( page - 1 ) }>{ __( '\u2190 Prev', 'ai-marketing-expert' ) }</Button>
					<span>{ page } / { totalPages }</span>
					<Button variant="secondary" disabled={ page >= totalPages } onClick={ () => setPage( page + 1 ) }>{ __( 'Next \u2192', 'ai-marketing-expert' ) }</Button>
				</div>
			) }

			{ /* Preview modal - premium overlay */ }
			{ previewId && (
				<div className="aime-premium-modal-overlay" onClick={ () => setPreviewId( null ) }>
					<div className="aime-premium-modal" style={ { maxWidth: 720, maxHeight: '90vh' } } onClick={ ( e ) => e.stopPropagation() }>
						<div className="aime-premium-modal-header">
							<div>
								<h3>{ __( 'Template Preview', 'ai-marketing-expert' ) }</h3>
							</div>
							<button className="aime-premium-modal-close" onClick={ () => setPreviewId( null ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body" style={ { padding: 0, overflow: 'auto' } }>
							<div style={ { background: '#f5f5f5', padding: 24, minHeight: 400 } }>
								<div style={ { maxWidth: 600, margin: '0 auto', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } }
									dangerouslySetInnerHTML={ { __html: previewHtml } }
								/>
							</div>
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => setPreviewId( null ) }>{ __( 'Close', 'ai-marketing-expert' ) }</button>
							<button className="aime-btn-primary" onClick={ () => {
								setPreviewId( null );
								onNavigate( 'campaign-editor', { id: 'new', templateId: previewId } );
							} }>{ __( 'Use This Template', 'ai-marketing-expert' ) }</button>
						</div>
					</div>
				</div>
			) }

			{ /* Create modal - premium overlay */ }
			{ showCreate && (
				<div className="aime-premium-modal-overlay" onClick={ () => setShowCreate( false ) }>
					<div className="aime-premium-modal" style={ { maxWidth: 580 } } onClick={ ( e ) => e.stopPropagation() }>
						<div className="aime-premium-modal-header">
							<div>
								<div className="aime-premium-modal-icon" style={ { background: 'var(--aime-gradient)' } }>
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
								</div>
								<h3>{ __( 'Create New Template', 'ai-marketing-expert' ) }</h3>
								<p className="aime-premium-modal-desc">{ __( 'Design your email template from scratch or generate with AI', 'ai-marketing-expert' ) }</p>
							</div>
							<button className="aime-premium-modal-close" onClick={ () => setShowCreate( false ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<div className="aime-premium-form-row">
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Template Name', 'ai-marketing-expert' ) }</label>
									<input className="aime-premium-input" placeholder={ __( 'e.g. Welcome Series #1', 'ai-marketing-expert' ) } value={ form.name } onChange={ ( e ) => setForm( { ...form, name: e.target.value } ) } />
								</div>
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Category', 'ai-marketing-expert' ) }</label>
									<select className="aime-premium-select" value={ form.category } onChange={ ( e ) => setForm( { ...form, category: e.target.value } ) }>
										{ CATEGORY_OPTIONS.filter( ( o ) => o.value ).map( ( opt ) => (
											<option key={ opt.value } value={ opt.value }>{ opt.label }</option>
										) ) }
									</select>
								</div>
							</div>
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Subject Line', 'ai-marketing-expert' ) }</label>
								<input className="aime-premium-input" placeholder={ __( 'Email subject line...', 'ai-marketing-expert' ) } value={ form.subject } onChange={ ( e ) => setForm( { ...form, subject: e.target.value } ) } />
							</div>
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Body (HTML)', 'ai-marketing-expert' ) }</label>
								<textarea
									className="aime-html-editor"
									style={ { height: 180 } }
									value={ form.content }
									onChange={ ( e ) => setForm( { ...form, content: e.target.value } ) }
									placeholder={ __( 'Paste your HTML email code here...', 'ai-marketing-expert' ) }
									spellCheck={ false }
								/>
							</div>
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => setShowCreate( false ) }>{ __( 'Cancel', 'ai-marketing-expert' ) }</button>
						<button className="aime-btn-secondary" onClick={ handleAiGenerate } disabled={ ! isAiConfigured() || aiLoading } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }>
								{ aiLoading ? __( '\u2728 Generating...', 'ai-marketing-expert' ) : __( '\u2728 AI Generate', 'ai-marketing-expert' ) }
							</button>
							<button className="aime-btn-primary" onClick={ handleCreate }>{ __( 'Create Template', 'ai-marketing-expert' ) }</button>
						</div>
					</div>
				</div>
			) }
		</Card>
	);
};

export default EmailTemplates;
