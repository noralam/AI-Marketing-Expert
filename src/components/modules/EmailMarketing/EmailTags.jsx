/**
 * EmailTags - CRUD for subscriber tags.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, ColorPicker } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';

const EmailTags = () => {
	const { get, post, put, del, loading, error, clearError } = useApi();
	const [ tags, setTags ] = useState( [] );
	const [ showModal, setShowModal ] = useState( false );
	const [ editId, setEditId ] = useState( null );
	const [ form, setForm ] = useState( { title: '', description: '', color: '#1B5E20' } );

	const fetchTags = useCallback( async () => {
		try {
			const res = await get( '/email/tags' );
			setTags( res.data || res || [] );
		} catch ( e ) { /* */ }
	}, [ get ] );

	useEffect( () => { fetchTags(); }, [ fetchTags ] );

	const openCreate = () => {
		setEditId( null );
		setForm( { title: '', description: '', color: '#1B5E20' } );
		setShowModal( true );
	};

	const openEdit = ( t ) => {
		setEditId( t.id );
		setForm( { title: t.title, description: t.description || '', color: t.color || '#1B5E20' } );
		setShowModal( true );
	};

	const handleSave = async () => {
		try {
			if ( editId ) {
				await put( `/email/tags/${ editId }`, form );
			} else {
				await post( '/email/tags', form );
			}
			setShowModal( false );
			fetchTags();
		} catch ( e ) { /* */ }
	};

	const handleDelete = async ( tid ) => {
		if ( ! window.confirm( __( 'Delete this tag?', 'ai-marketing-expert' ) ) ) return;
		try {
			await del( `/email/tags/${ tid }` );
			fetchTags();
		} catch ( e ) { /* */ }
	};

	return (
		<Card
			title={ __( 'Tags', 'ai-marketing-expert' ) }
			actions={
				<Button variant="primary" onClick={ openCreate }>{ __( '+ New Tag', 'ai-marketing-expert' ) }</Button>
			}
		>
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ loading && <Loader /> }

			{ ! loading && tags.length === 0 && (
				<p className="aime-empty-msg">{ __( 'No tags yet. Create your first tag.', 'ai-marketing-expert' ) }</p>
			) }

			{ ! loading && tags.length > 0 && (
				<div className="aime-tag-grid">
					{ tags.map( ( t ) => (
					<div key={ t.id } className="aime-tag-card" style={ { borderLeftColor: t.color || '#1B5E20' } }>
						<div className="aime-tag-card-header">
							<span className="aime-tag-dot" style={ { background: t.color || '#1B5E20' } } />
								<strong>{ t.title }</strong>
								<code style={ { fontSize: 11, color: '#94a3b8', marginLeft: 4 } }>ID: { t.id }</code>
								<span className="aime-muted">{ t.subscribers_count ?? 0 } { __( 'contacts', 'ai-marketing-expert' ) }</span>
							</div>
							{ t.description && <p className="aime-muted">{ t.description }</p> }
							<div className="aime-tag-card-actions">
								<Button variant="tertiary" size="small" onClick={ () => openEdit( t ) }>{ __( 'Edit', 'ai-marketing-expert' ) }</Button>
								<Button isDestructive variant="tertiary" size="small" onClick={ () => handleDelete( t.id ) }>{ __( 'Delete', 'ai-marketing-expert' ) }</Button>
							</div>
						</div>
					) ) }
				</div>
			) }

			{ showModal && (
				<div className="aime-premium-modal-overlay" onClick={ () => setShowModal( false ) }>
					<div className="aime-premium-modal" style={ { maxWidth: 480 } } onClick={ ( e ) => e.stopPropagation() }>
						<div className="aime-premium-modal-header">
							<h3>
								<span className="aime-premium-modal-icon">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
								</span>
								{ editId ? __( 'Edit Tag', 'ai-marketing-expert' ) : __( 'New Tag', 'ai-marketing-expert' ) }
							</h3>
							<button className="aime-modal-close" onClick={ () => setShowModal( false ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Title', 'ai-marketing-expert' ) }</label>
								<input className="aime-premium-input" value={ form.title } onChange={ ( e ) => setForm( { ...form, title: e.target.value } ) } placeholder={ __( 'Tag name...', 'ai-marketing-expert' ) } />
							</div>
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Description', 'ai-marketing-expert' ) }</label>
								<textarea className="aime-premium-input" style={ { minHeight: 60 } } value={ form.description } onChange={ ( e ) => setForm( { ...form, description: e.target.value } ) } placeholder={ __( 'Optional description...', 'ai-marketing-expert' ) } />
							</div>
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Color', 'ai-marketing-expert' ) }</label>
								<ColorPicker color={ form.color } onChange={ ( color ) => {
									// Ensure we only store 6-char hex (strip alpha channel if present).
									let hex = typeof color === 'string' ? color : '';
									if ( hex.length === 9 && hex.startsWith( '#' ) ) {
										hex = hex.substring( 0, 7 );
									}
									setForm( { ...form, color: hex } );
								} } />
							</div>
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => setShowModal( false ) }>{ __( 'Cancel', 'ai-marketing-expert' ) }</button>
							<button className="aime-btn-primary" onClick={ handleSave }>{ editId ? __( 'Update', 'ai-marketing-expert' ) : __( 'Create', 'ai-marketing-expert' ) }</button>
						</div>
					</div>
				</div>
			) }
		</Card>
	);
};

export default EmailTags;
