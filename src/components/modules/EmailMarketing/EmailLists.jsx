/**
 * EmailLists - CRUD for subscriber lists.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';

const EmailLists = () => {
	const { get, post, put, del, loading, error, clearError } = useApi();
	const [ lists, setLists ] = useState( [] );
	const [ showModal, setShowModal ] = useState( false );
	const [ editId, setEditId ] = useState( null );
	const [ form, setForm ] = useState( { title: '', description: '' } );

	const fetchLists = useCallback( async () => {
		try {
			const res = await get( '/email/lists' );
			setLists( res.data || res || [] );
		} catch ( e ) { /* */ }
	}, [ get ] );

	useEffect( () => { fetchLists(); }, [ fetchLists ] );

	const openCreate = () => {
		setEditId( null );
		setForm( { title: '', description: '' } );
		setShowModal( true );
	};

	const openEdit = ( l ) => {
		setEditId( l.id );
		setForm( { title: l.title, description: l.description || '' } );
		setShowModal( true );
	};

	const handleSave = async () => {
		try {
			if ( editId ) {
				await put( `/email/lists/${ editId }`, form );
			} else {
				await post( '/email/lists', form );
			}
			setShowModal( false );
			fetchLists();
		} catch ( e ) { /* */ }
	};

	const handleDelete = async ( lid ) => {
		if ( ! window.confirm( __( 'Delete this list?', 'ai-marketing-expert' ) ) ) return;
		try {
			await del( `/email/lists/${ lid }` );
			fetchLists();
		} catch ( e ) { /* */ }
	};

	return (
		<Card
			title={ __( 'Lists', 'ai-marketing-expert' ) }
			actions={
				<Button variant="primary" onClick={ openCreate }>{ __( '+ New List', 'ai-marketing-expert' ) }</Button>
			}
		>
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ loading && <Loader /> }

			{ ! loading && lists.length === 0 && (
				<p className="aime-empty-msg">{ __( 'No lists yet. Create your first list.', 'ai-marketing-expert' ) }</p>
			) }

			{ ! loading && lists.length > 0 && (
				<table className="aime-table">
					<thead>
						<tr>
							<th>{ __( 'ID', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Title', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Subscribers', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Description', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Created', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
						</tr>
					</thead>
					<tbody>
						{ lists.map( ( l ) => (
							<tr key={ l.id }>
								<td><code>{ l.id }</code></td>
								<td><strong>{ l.title }</strong></td>
								<td>{ l.subscribers_count ?? 0 }</td>
								<td>{ l.description || '\u2014' }</td>
								<td>{ l.created_at ? new Date( l.created_at ).toLocaleDateString() : '\u2014' }</td>
								<td className="aime-actions">
									<Button variant="tertiary" size="small" onClick={ () => openEdit( l ) }>{ __( 'Edit', 'ai-marketing-expert' ) }</Button>
									<Button isDestructive variant="tertiary" size="small" onClick={ () => handleDelete( l.id ) }>{ __( 'Delete', 'ai-marketing-expert' ) }</Button>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			) }

			{ showModal && (
				<div className="aime-premium-modal-overlay" onClick={ () => setShowModal( false ) }>
					<div className="aime-premium-modal" style={ { maxWidth: 480 } } onClick={ ( e ) => e.stopPropagation() }>
						<div className="aime-premium-modal-header">
							<div>
								<div className="aime-premium-modal-icon" style={ { background: 'var(--aime-gradient)' } }>
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" /></svg>
								</div>
								<h3>{ editId ? __( 'Edit List', 'ai-marketing-expert' ) : __( 'New List', 'ai-marketing-expert' ) }</h3>
							</div>
							<button className="aime-premium-modal-close" onClick={ () => setShowModal( false ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Title', 'ai-marketing-expert' ) }</label>
								<input className="aime-premium-input" value={ form.title } onChange={ ( e ) => setForm( { ...form, title: e.target.value } ) } placeholder={ __( 'List name...', 'ai-marketing-expert' ) } />
							</div>
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Description', 'ai-marketing-expert' ) }</label>
								<textarea className="aime-premium-input" style={ { minHeight: 80 } } value={ form.description } onChange={ ( e ) => setForm( { ...form, description: e.target.value } ) } placeholder={ __( 'Optional description...', 'ai-marketing-expert' ) } />
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

export default EmailLists;
