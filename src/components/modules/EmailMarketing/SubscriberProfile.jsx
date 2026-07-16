/**
 * Subscriber Profile - contact detail page with tabs.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextareaControl, TabPanel } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';

const STATUS_OPTIONS = [
	{ label: 'Subscribed', value: 'subscribed' },
	{ label: 'Unsubscribed', value: 'unsubscribed' },
	{ label: 'Pending', value: 'pending' },
	{ label: 'Bounced', value: 'bounced' },
	{ label: 'Complained', value: 'complained' },
];

const SubscriberProfile = ( { id, onBack, onNavigate } ) => {
	const { get, put, post, del, loading } = useApi( { toastErrors: true } );
	const [ sub, setSub ] = useState( null );
	const [ editing, setEditing ] = useState( false );
	const [ form, setForm ] = useState( {} );
	const [ notice, setNotice ] = useState( null );
	const [ noteText, setNoteText ] = useState( '' );
	const [ activity, setActivity ] = useState( null );
	const [ allTags, setAllTags ] = useState( [] );
	const [ allLists, setAllLists ] = useState( [] );

	const fetch = useCallback( async () => {
		try {
			const data = await get( `/email/subscribers/${ id }` );
			setSub( data );
			setForm( {
				first_name: data.first_name || '',
				last_name: data.last_name || '',
				email: data.email || '',
				status: data.status || 'subscribed',
				phone: data.phone || '',
				address_line_1: data.address_line_1 || '',
				city: data.city || '',
				state: data.state || '',
				postal_code: data.postal_code || '',
				country: data.country || '',
				tag_ids: ( data.tags || [] ).map( ( t ) => t.id ),
				list_ids: ( data.lists || [] ).map( ( l ) => l.id ),
			} );
		} catch ( e ) { /* */ }
	}, [ get, id ] );

	const fetchActivity = useCallback( async () => {
		try {
			const data = await get( `/email/analytics/subscribers/${ id }` );
			setActivity( data );
		} catch ( e ) { /* */ }
	}, [ get, id ] );

	const fetchTagsLists = useCallback( async () => {
		try {
			const [ t, l ] = await Promise.all( [
				get( '/email/tags' ),
				get( '/email/lists' ),
			] );
			setAllTags( t || [] );
			setAllLists( l || [] );
		} catch ( e ) { /* */ }
	}, [ get ] );

	useEffect( () => { fetch(); }, [ fetch ] );
	useEffect( () => { fetchActivity(); }, [ fetchActivity ] );
	useEffect( () => { fetchTagsLists(); }, [ fetchTagsLists ] );

	const handleSave = async () => {
		try {
			await put( `/email/subscribers/${ id }`, form );
			setEditing( false );
			setNotice( { type: 'success', message: __( 'Contact updated.', 'ai-marketing-expert' ) } );
			fetch();
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
		}
	};

	const handleAddNote = async () => {
		if ( ! noteText.trim() ) return;
		try {
			await post( `/email/subscribers/${ id }/notes`, { description: noteText, type: 'note' } );
			setNoteText( '' );
			fetch();
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
		}
	};

	const handleDeleteNote = async ( noteId ) => {
		try {
			await del( `/email/subscribers/${ id }/notes/${ noteId }` );
			fetch();
		} catch ( e ) { /* */ }
	};

	if ( loading && ! sub ) {
		return <Loader text={ __( 'Loading contact...', 'ai-marketing-expert' ) } />;
	}

	if ( ! sub ) {
		return <Notice type="error" message={ __( 'Contact not found.', 'ai-marketing-expert' ) } />;
	}

	return (
		<div className="aime-profile-page">
			<div className="aime-page-header">
				<div>
					<Button variant="link" onClick={ onBack }>{ __( '\u2190 Back to Contacts', 'ai-marketing-expert' ) }</Button>
					<h2>{ sub.first_name } { sub.last_name } <span className="aime-sub-email">{ sub.email }</span></h2>
				</div>
				<div className="aime-header-actions">
					{ ! editing ? (
						<Button variant="primary" onClick={ () => setEditing( true ) }>{ __( 'Edit', 'ai-marketing-expert' ) }</Button>
					) : (
						<>
							<Button variant="secondary" onClick={ () => setEditing( false ) }>{ __( 'Cancel', 'ai-marketing-expert' ) }</Button>
							<Button variant="primary" onClick={ handleSave }>{ __( 'Save', 'ai-marketing-expert' ) }</Button>
						</>
					) }
				</div>
			</div>

			{ notice && <Notice type={ notice.type } message={ notice.message } onDismiss={ () => setNotice( null ) } /> }

			<TabPanel
				tabs={ [
					{ name: 'overview', title: __( 'Overview', 'ai-marketing-expert' ) },
					{ name: 'emails', title: __( 'Emails', 'ai-marketing-expert' ) },
					{ name: 'notes', title: __( 'Notes', 'ai-marketing-expert' ) },
					{ name: 'activity', title: __( 'Activity', 'ai-marketing-expert' ) },
				] }
			>
				{ ( tab ) => {
					if ( tab.name === 'overview' ) {
						return (
							<div className="aime-profile-grid">
								<Card title={ __( 'Contact Details', 'ai-marketing-expert' ) }>
									{ editing ? (
										<>
											<div className="aime-premium-form-group">
												<label className="aime-premium-form-label">{ __( 'Email Address', 'ai-marketing-expert' ) } *</label>
												<input
													type="email"
													className="aime-premium-input"
													placeholder="email@example.com"
													value={ form.email }
													onChange={ ( e ) => setForm( { ...form, email: e.target.value } ) }
												/>
											</div>

											<div className="aime-premium-form-row">
												<div className="aime-premium-form-group">
													<label className="aime-premium-form-label">{ __( 'First Name', 'ai-marketing-expert' ) }</label>
													<input
														type="text"
														className="aime-premium-input"
														placeholder={ __( 'Enter first name', 'ai-marketing-expert' ) }
														value={ form.first_name }
														onChange={ ( e ) => setForm( { ...form, first_name: e.target.value } ) }
													/>
												</div>
												<div className="aime-premium-form-group">
													<label className="aime-premium-form-label">{ __( 'Last Name', 'ai-marketing-expert' ) }</label>
													<input
														type="text"
														className="aime-premium-input"
														placeholder={ __( 'Enter last name', 'ai-marketing-expert' ) }
														value={ form.last_name }
														onChange={ ( e ) => setForm( { ...form, last_name: e.target.value } ) }
													/>
												</div>
											</div>

											<div className="aime-premium-form-row">
												<div className="aime-premium-form-group">
													<label className="aime-premium-form-label">{ __( 'Phone Number', 'ai-marketing-expert' ) }</label>
													<input
														type="tel"
														className="aime-premium-input"
														placeholder="+(000) 0000 0000"
														value={ form.phone }
														onChange={ ( e ) => setForm( { ...form, phone: e.target.value } ) }
													/>
												</div>
												<div className="aime-premium-form-group">
													<label className="aime-premium-form-label">{ __( 'Status', 'ai-marketing-expert' ) }</label>
													<select
														className="aime-premium-select"
														value={ form.status }
														onChange={ ( e ) => setForm( { ...form, status: e.target.value } ) }
													>
														{ STATUS_OPTIONS.map( ( opt ) => (
															<option key={ opt.value } value={ opt.value }>{ opt.label }</option>
														) ) }
													</select>
												</div>
											</div>

											<div className="aime-premium-form-row">
												<div className="aime-premium-form-group">
													<label className="aime-premium-form-label">{ __( 'City', 'ai-marketing-expert' ) }</label>
													<input
														type="text"
														className="aime-premium-input"
														placeholder={ __( 'Enter city', 'ai-marketing-expert' ) }
														value={ form.city }
														onChange={ ( e ) => setForm( { ...form, city: e.target.value } ) }
													/>
												</div>
												<div className="aime-premium-form-group">
													<label className="aime-premium-form-label">{ __( 'Country', 'ai-marketing-expert' ) }</label>
													<input
														type="text"
														className="aime-premium-input"
														placeholder={ __( 'Enter country', 'ai-marketing-expert' ) }
														value={ form.country }
														onChange={ ( e ) => setForm( { ...form, country: e.target.value } ) }
													/>
												</div>
											</div>
										</>
									) : (
										<div className="aime-detail-grid">
											<div className="aime-detail-row"><span>{ __( 'Email', 'ai-marketing-expert' ) }</span><strong>{ sub.email }</strong></div>
											<div className="aime-detail-row"><span>{ __( 'Status', 'ai-marketing-expert' ) }</span><strong>{ sub.status }</strong></div>
											<div className="aime-detail-row"><span>{ __( 'Phone', 'ai-marketing-expert' ) }</span><strong>{ sub.phone || '\u2014' }</strong></div>
											<div className="aime-detail-row"><span>{ __( 'Source', 'ai-marketing-expert' ) }</span><strong>{ sub.source || '\u2014' }</strong></div>
											<div className="aime-detail-row"><span>{ __( 'City', 'ai-marketing-expert' ) }</span><strong>{ sub.city || '\u2014' }</strong></div>
											<div className="aime-detail-row"><span>{ __( 'Country', 'ai-marketing-expert' ) }</span><strong>{ sub.country || '\u2014' }</strong></div>
											<div className="aime-detail-row"><span>{ __( 'Created', 'ai-marketing-expert' ) }</span><strong>{ sub.created_at || '\u2014' }</strong></div>
										</div>
									) }
								</Card>
								<Card title={ __( 'Tags & Lists', 'ai-marketing-expert' ) }>
									{ editing ? (
										<>
											<div className="aime-premium-form-group">
												<label className="aime-premium-form-label">{ __( 'Lists', 'ai-marketing-expert' ) }</label>
												<fieldset className="aime-premium-fieldset-label">
													<legend className="aime-premium-fieldset-legend">{ __( 'Assign to lists', 'ai-marketing-expert' ) }</legend>
													{ allLists.length === 0 && (
														<p className="aime-muted" style={ { margin: '4px 0' } }>{ __( 'No lists available. Create lists first.', 'ai-marketing-expert' ) }</p>
													) }
													<div className="aime-toggle-buttons">
														{ allLists.map( ( l ) => {
															const isSelected = ( form.list_ids || [] ).includes( l.id );
															return (
																<button
																	key={ l.id }
																	type="button"
																	className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` }
																	onClick={ () => {
																		const current = form.list_ids || [];
																		const ids = isSelected
																			? current.filter( ( x ) => x !== l.id )
																			: [ ...current, l.id ];
																		setForm( { ...form, list_ids: ids } );
																	} }
																>
																	{ l.title }
																</button>
															);
														} ) }
													</div>
												</fieldset>
											</div>

											<div className="aime-premium-form-group">
												<label className="aime-premium-form-label">{ __( 'Tags', 'ai-marketing-expert' ) }</label>
												<fieldset className="aime-premium-fieldset-label">
													<legend className="aime-premium-fieldset-legend">{ __( 'Assign tags', 'ai-marketing-expert' ) }</legend>
													{ allTags.length === 0 && (
														<p className="aime-muted" style={ { margin: '4px 0' } }>{ __( 'No tags available. Create tags first.', 'ai-marketing-expert' ) }</p>
													) }
													<div className="aime-toggle-buttons">
														{ allTags.map( ( t ) => {
															const isSelected = ( form.tag_ids || [] ).includes( t.id );
															return (
																<button
																	key={ t.id }
																	type="button"
																	className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` }
																	onClick={ () => {
																		const current = form.tag_ids || [];
																		const ids = isSelected
																			? current.filter( ( x ) => x !== t.id )
																			: [ ...current, t.id ];
																		setForm( { ...form, tag_ids: ids } );
																	} }
																	style={ t.color ? { '--tag-color': t.color } : {} }
																>
																	{ t.color && <span className="aime-toggle-btn-dot" style={ { background: t.color } } /> }
																	{ t.title }
																</button>
															);
														} ) }
													</div>
												</fieldset>
											</div>
										</>
									) : (
										<div className="aime-pills-section">
											<div className="aime-premium-form-group">
												<label className="aime-premium-form-label">{ __( 'Tags', 'ai-marketing-expert' ) }</label>
												<div className="aime-pills">
													{ ( sub.tags || [] ).map( ( t ) => <span key={ t.id } className="aime-tag-pill">{ t.title }</span> ) }
													{ ( sub.tags || [] ).length === 0 && <span className="aime-muted">{ __( 'No tags', 'ai-marketing-expert' ) }</span> }
												</div>
											</div>
											<div className="aime-premium-form-group">
												<label className="aime-premium-form-label">{ __( 'Lists', 'ai-marketing-expert' ) }</label>
												<div className="aime-pills">
													{ ( sub.lists || [] ).map( ( l ) => <span key={ l.id } className="aime-tag-pill aime-list-pill">{ l.title }</span> ) }
													{ ( sub.lists || [] ).length === 0 && <span className="aime-muted">{ __( 'No lists', 'ai-marketing-expert' ) }</span> }
												</div>
											</div>
										</div>
									) }
								</Card>
							</div>
						);
					}

					if ( tab.name === 'emails' ) {
						const emails = activity?.emails || [];
						return (
							<Card title={ __( 'Email History', 'ai-marketing-expert' ) }>
								{ emails.length === 0 ? (
									<p className="aime-muted">{ __( 'No emails sent yet.', 'ai-marketing-expert' ) }</p>
								) : (
									<table className="aime-table aime-table-compact">
										<thead><tr><th>{ __( 'Campaign', 'ai-marketing-expert' ) }</th><th>{ __( 'Subject', 'ai-marketing-expert' ) }</th><th>{ __( 'Status', 'ai-marketing-expert' ) }</th><th>{ __( 'Opened', 'ai-marketing-expert' ) }</th><th>{ __( 'Clicks', 'ai-marketing-expert' ) }</th><th>{ __( 'Date', 'ai-marketing-expert' ) }</th></tr></thead>
										<tbody>
											{ emails.map( ( e ) => (
												<tr key={ e.id }>
													<td><button className="aime-link-btn" onClick={ () => onNavigate( 'campaign-progress', { id: e.campaign_id } ) }>{ e.campaign_title || `#${ e.campaign_id }` }</button></td>
													<td>{ e.email_subject || '\u2014' }</td>
													<td><span className={ `aime-badge ${ e.status === 'sent' ? 'aime-badge-success' : 'aime-badge-warning' }` }>{ e.status }</span></td>
													<td>{ e.is_open ? '\u2713' : '\u2014' }</td>
													<td>{ e.click_counter || 0 }</td>
													<td className="aime-date-cell">{ e.created_at?.split( ' ' )[ 0 ] || '\u2014' }</td>
												</tr>
											) ) }
										</tbody>
									</table>
								) }
							</Card>
						);
					}

					if ( tab.name === 'notes' ) {
						return (
							<Card title={ __( 'Notes', 'ai-marketing-expert' ) }>
								<div className="aime-notes-add">
									<TextareaControl
										value={ noteText }
										onChange={ setNoteText }
										placeholder={ __( 'Add a note...', 'ai-marketing-expert' ) }
										__nextHasNoMarginBottom
									/>
									<Button variant="primary" size="small" onClick={ handleAddNote } disabled={ ! noteText.trim() }>
										{ __( 'Add Note', 'ai-marketing-expert' ) }
									</Button>
								</div>
								<div className="aime-notes-list">
									{ ( sub.notes || [] ).map( ( n ) => (
										<div key={ n.id } className="aime-note-item">
											<p>{ n.description }</p>
											<div className="aime-note-meta">
												<span>{ n.created_at }</span>
												<Button isDestructive variant="link" size="small" onClick={ () => handleDeleteNote( n.id ) }>
													{ __( 'Delete', 'ai-marketing-expert' ) }
												</Button>
											</div>
										</div>
									) ) }
								</div>
							</Card>
						);
					}

					if ( tab.name === 'activity' ) {
						const metrics = activity?.metrics || [];
						return (
							<Card title={ __( 'Activity Log', 'ai-marketing-expert' ) }>
								{ metrics.length === 0 ? (
									<p className="aime-muted">{ __( 'No activity yet.', 'ai-marketing-expert' ) }</p>
								) : (
									<div className="aime-activity-timeline">
										{ metrics.map( ( m, i ) => (
											<div key={ i } className="aime-activity-item">
												<span className={ `aime-activity-dot aime-activity-${ m.type }` } />
												<div>
													<strong>{ m.type }</strong>
													{ m.url && <span className="aime-muted"> \u2014 { m.url }</span> }
													<div className="aime-date-cell">{ m.created_at }</div>
												</div>
											</div>
										) ) }
									</div>
								) }
							</Card>
						);
					}

					return null;
				} }
			</TabPanel>
		</div>
	);
};

export default SubscriberProfile;
