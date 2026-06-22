/**
 * Subscribers / Contacts list - paginated table with bulk operations.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, SelectControl, SearchControl, CheckboxControl } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import CsvImportModal from '../../common/CsvImportModal';
import { isProActive, ProLabel, ProUpgradeButton } from '../../common/ProLock';

const STATUS_OPTIONS = [
	{ label: __( 'All Statuses', 'ai-marketing-expert' ), value: '' },
	{ label: __( 'Subscribed', 'ai-marketing-expert' ), value: 'subscribed' },
	{ label: __( 'Unsubscribed', 'ai-marketing-expert' ), value: 'unsubscribed' },
	{ label: __( 'Pending', 'ai-marketing-expert' ), value: 'pending' },
	{ label: __( 'Bounced', 'ai-marketing-expert' ), value: 'bounced' },
	{ label: __( 'Complained', 'ai-marketing-expert' ), value: 'complained' },
];

const STATUS_BADGES = {
	subscribed: 'aime-badge-success',
	unsubscribed: 'aime-badge-error',
	pending: 'aime-badge-warning',
	bounced: 'aime-badge-error',
	complained: 'aime-badge-error',
};

const DEFAULT_VALIDATION = {
	skip_invalid_format: true,
	skip_disposable: true,
	skip_test_fake: true,
	skip_role_based: false,
	skip_spam_patterns: true,
	check_mx: false,
};

const Subscribers = ( { onNavigate } ) => {
	const { get, post, del, loading, error, clearError } = useApi();
	const hasPro = isProActive();
	const [ items, setItems ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ perPage ] = useState( 20 );
	const [ search, setSearch ] = useState( '' );
	const [ status, setStatus ] = useState( '' );
	const [ audienceFilter, setAudienceFilter ] = useState( '' ); // "list:3" | "tag:5" | ""
	const [ selected, setSelected ] = useState( [] );
	const [ allMatchingSelected, setAllMatchingSelected ] = useState( false );
	const [ notice, setNotice ] = useState( null );
	const [ showAddModal, setShowAddModal ] = useState( false );
	const [ newContact, setNewContact ] = useState( { email: '', first_name: '', last_name: '', status: 'subscribed', phone: '', list_ids: [], tag_ids: [] } );
	const [ tags, setTags ] = useState( [] );
	const [ lists, setLists ] = useState( [] );
	const [ showBulkModal, setShowBulkModal ] = useState( null );
	const [ bulkTagIds, setBulkTagIds ] = useState( [] );
	const [ bulkListIds, setBulkListIds ] = useState( [] );
	const [ showExportModal, setShowExportModal ] = useState( false );
	const [ exportMode, setExportMode ] = useState( 'all' );
	const [ exportListId, setExportListId ] = useState( '' );
	const [ exportTagId, setExportTagId ] = useState( '' );
	const [ exporting, setExporting ] = useState( false );
	/* Import modal */
	const [ showImportModal, setShowImportModal ] = useState( false );
	const [ importSource, setImportSource ] = useState( '' );
	const [ showCsvModal, setShowCsvModal ] = useState( false );
	const [ importValidation, setImportValidation ] = useState( DEFAULT_VALIDATION );
	const [ importDoubleOptin, setImportDoubleOptin ] = useState( false );
	const [ importListIds, setImportListIds ] = useState( [] );
	const [ importTagIds, setImportTagIds ] = useState( [] );
	const [ importUpdateExisting, setImportUpdateExisting ] = useState( false );
	const [ importNewStatus, setImportNewStatus ] = useState( 'subscribed' );

	const updateImportValidation = ( key, value ) => {
		if ( ! hasPro && [ 'skip_disposable', 'skip_role_based', 'skip_spam_patterns', 'check_mx' ].includes( key ) ) {
			setNotice( { type: 'warning', message: __( 'Advanced import cleanup filters are available in Pro.', 'ai-marketing-expert' ) } );
			return;
		}
		setImportValidation( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const importValidationForRequest = () => hasPro ? importValidation : {
		...importValidation,
		skip_disposable: false,
		skip_role_based: false,
		skip_spam_patterns: false,
		check_mx: false,
	};

	const resetImportOptions = () => {
		setImportSource( '' );
		setImportDoubleOptin( false );
		setImportListIds( [] );
		setImportTagIds( [] );
		setImportUpdateExisting( false );
		setImportNewStatus( 'subscribed' );
	};

	const fetchItems = useCallback( async () => {
		try {
			const params = { page, per_page: perPage, search, status };
			if ( audienceFilter ) {
				const [ type, id ] = audienceFilter.split( ':' );
				if ( type === 'list' ) params.list_id = id;
				else if ( type === 'tag' ) params.tag_id = id;
			}
			const res = await get( '/email/subscribers', params );
			setItems( res.items || [] );
			setTotal( res.total || 0 );
		} catch ( e ) { /* useApi sets error */ }
	}, [ get, page, perPage, search, status, audienceFilter ] );

	const fetchMeta = useCallback( async () => {
		try {
			const [ t, l ] = await Promise.all( [
				get( '/email/tags' ),
				get( '/email/lists' ),
			] );
			setTags( t || [] );
			setLists( l || [] );
		} catch ( e ) { /* */ }
	}, [ get ] );

	useEffect( () => { fetchItems(); }, [ fetchItems ] );
	useEffect( () => { fetchMeta(); }, [ fetchMeta ] );

	const handleAdd = async () => {
		try {
			await post( '/email/subscribers', newContact );
			setShowAddModal( false );
			setNewContact( { email: '', first_name: '', last_name: '', status: 'subscribed', phone: '', list_ids: [], tag_ids: [] } );
			setNotice( { type: 'success', message: __( 'Contact added.', 'ai-marketing-expert' ) } );
			fetchItems();
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
		}
	};

	const handleBulk = async ( action, extras = {} ) => {
		if ( ! selected.length && ! allMatchingSelected ) return;
		if ( ! hasPro && [ 'complained', 'remove_tags', 'remove_lists' ].includes( action ) ) {
			setNotice( { type: 'warning', message: __( 'This bulk action is available in Pro.', 'ai-marketing-expert' ) } );
			return;
		}

		const count = allMatchingSelected ? total : selected.length;
		if ( action === 'delete' && ! window.confirm( sprintf( __( 'Delete %d selected contact(s)? This cannot be undone.', 'ai-marketing-expert' ), count ) ) ) {
			return;
		}

		try {
			const payload = allMatchingSelected
			? (() => {
				const base = { action, all_matching: true, search, status };
				if ( audienceFilter ) {
					const [ type, id ] = audienceFilter.split( ':' );
					if ( type === 'list' ) base.list_id = id;
					else if ( type === 'tag' ) base.tag_id = id;
				}
				return { ...base, ...extras };
			} )()
			: { action, ids: selected, ...extras };
			const res = await post( '/email/subscribers/bulk', payload );
			setSelected( [] );
			setAllMatchingSelected( false );
			setNotice( { type: 'success', message: res?.message || __( 'Bulk action completed.', 'ai-marketing-expert' ) } );
			fetchItems();
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
		}
	};

	const handleDelete = async ( id ) => {
		if ( ! window.confirm( __( 'Delete this contact?', 'ai-marketing-expert' ) ) ) return;
		try {
			await del( `/email/subscribers/${ id }` );
			setNotice( { type: 'success', message: __( 'Contact deleted.', 'ai-marketing-expert' ) } );
			fetchItems();
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
		}
	};

	const handleImport = ( res ) => {
		setShowImportModal( false );
		setShowCsvModal( false );
		resetImportOptions();
		const parts = [ `${ __( 'Imported:', 'ai-marketing-expert' ) } ${ res.imported || 0 }` ];
		if ( res.updated ) parts.push( `${ __( 'Updated:', 'ai-marketing-expert' ) } ${ res.updated }` );
		parts.push( `${ __( 'Skipped:', 'ai-marketing-expert' ) } ${ res.skipped || 0 }` );
		setNotice( { type: 'success', message: `${ __( 'Import complete!', 'ai-marketing-expert' ) } ${ parts.join( ', ' ) }` } );
		fetchItems();
	};

	const handleSourceImport = async () => {
		if ( importSource === 'csv' ) {
			setShowImportModal( false );
			setShowCsvModal( true );
			return;
		}
		try {
			const res = await post( '/email/subscribers/import', {
				source: importSource,
				double_optin: importDoubleOptin,
				validation: importValidationForRequest(),
				list_ids: importListIds,
				tag_ids: importTagIds,
				update_existing: importUpdateExisting,
				new_status: importNewStatus,
			} );
			handleImport( res );
		} catch ( e ) {
			if ( hasPro && importValidation.check_mx ) {
				clearError();
				setShowImportModal( false );
				resetImportOptions();
				await fetchItems();
				setNotice( {
					type: 'warning',
					message: __( 'The import request took longer than the browser expected while checking MX records. Contacts were refreshed; please review the list before importing again.', 'ai-marketing-expert' ),
				} );
				return;
			}

			setNotice( { type: 'error', message: e.message || __( 'Import failed.', 'ai-marketing-expert' ) } );
		}
	};

	const csvValue = ( value ) => {
		const text = value === null || value === undefined ? '' : String( value );
		return /[",\n\r]/.test( text ) ? `"${ text.replace( /"/g, '""' ) }"` : text;
	};

	const handleExport = async () => {
		if ( ! hasPro ) {
			setNotice( { type: 'warning', message: __( 'Export contacts is available in Pro.', 'ai-marketing-expert' ) } );
			return;
		}

		const params = { per_page: 99999 };
		let suffix = 'all';

		if ( exportMode === 'list' ) {
			if ( ! exportListId ) return;
			params.list_id = exportListId;
			suffix = `list-${ exportListId }`;
		}

		if ( exportMode === 'tag' ) {
			if ( ! exportTagId ) return;
			params.tag_id = exportTagId;
			suffix = `tag-${ exportTagId }`;
		}

		setExporting( true );
		try {
			const res = await get( '/email/subscribers', params );
			const rows = ( res.items || [] ).map( ( sub ) => [
				sub.email,
				sub.first_name,
				sub.last_name,
				sub.phone,
				sub.status,
				( sub.lists || [] ).map( ( list ) => list.title || list ).join( '; ' ),
				( sub.tags || [] ).map( ( tag ) => tag.title || tag ).join( '; ' ),
				sub.created_at,
			].map( csvValue ).join( ',' ) );
			const csv = [ 'email,first_name,last_name,phone,status,lists,tags,created_at', ...rows ].join( '\n' );
			const blob = new Blob( [ csv ], { type: 'text/csv;charset=utf-8' } );
			const url = URL.createObjectURL( blob );
			const a = document.createElement( 'a' );
			a.href = url;
			a.download = `subscribers-${ suffix }-${ new Date().toISOString().slice( 0, 10 ) }.csv`;
			a.click();
			URL.revokeObjectURL( url );
			setShowExportModal( false );
			setNotice( { type: 'success', message: sprintf( __( 'Exported %d contact(s).', 'ai-marketing-expert' ), rows.length ) } );
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
		}
		setExporting( false );
	};

	const toggleAll = () => {
		if ( selected.length === items.length ) {
			setSelected( [] );
			setAllMatchingSelected( false );
		} else {
			setSelected( items.map( ( i ) => i.id ) );
			setAllMatchingSelected( false );
		}
	};

	const toggleOne = ( id ) => {
		setAllMatchingSelected( false );
		setSelected( ( prev ) => prev.includes( id ) ? prev.filter( ( x ) => x !== id ) : [ ...prev, id ] );
	};

	const totalPages = Math.ceil( total / perPage );

	const resetFiltersAndReload = ( updater ) => ( v ) => {
		updater( v );
		setPage( 1 );
		setSelected( [] );
		setAllMatchingSelected( false );
	};

	const audienceFilterOptions = [
		{ label: __( 'All Contacts', 'ai-marketing-expert' ), value: '' },
		...( lists.length > 0 ? [ { label: __( 'Lists', 'ai-marketing-expert' ), disabled: true } ] : [] ),
		...lists.map( ( l ) => ( { label: `\u00A0\u00A0${ l.title || l.name || `List #${ l.id }` }`, value: `list:${ l.id }` } ) ),
		...( tags.length > 0 ? [ { label: __( 'Tags', 'ai-marketing-expert' ), disabled: true } ] : [] ),
		...tags.map( ( t ) => ( { label: `\u00A0\u00A0${ t.title || t.name || `Tag #${ t.id }` }`, value: `tag:${ t.id }` } ) ),
	];

	return (
		<div className="aime-subscribers-page">
			<div className="aime-page-header">
				<h2>{ __( 'Contacts', 'ai-marketing-expert' ) } <span className="aime-count">({ total })</span></h2>
				<div className="aime-page-header-actions">
					<Button variant="secondary" onClick={ () => hasPro ? setShowExportModal( true ) : handleExport() }>
						<span className="aime-pro-inline-action">{ __( 'Export Contacts', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span>
					</Button>
					<Button variant="secondary" onClick={ () => setShowImportModal( true ) }>
						{ __( 'Import Contacts', 'ai-marketing-expert' ) }
					</Button>
					<Button variant="primary" onClick={ () => setShowAddModal( true ) }>
						{ __( '+ Add Contact', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</div>

			{ notice && <Notice type={ notice.type } message={ notice.message } onDismiss={ () => setNotice( null ) } /> }
			{ error && <Notice type="error" message={ error } onDismiss={ clearError } /> }

			<Card>
				{ /* Bulk actions bar - separate row above toolbar */ }
				{ selected.length > 0 && (
					<div className="aime-bulk-actions">
						<span>{ allMatchingSelected ? total : selected.length } { __( 'selected', 'ai-marketing-expert' ) }</span>
						{ selected.length === items.length && total > items.length && ! allMatchingSelected && (
							<Button variant="link" size="small" onClick={ () => setAllMatchingSelected( true ) }>
								{ sprintf( __( 'Select all %d matching contacts', 'ai-marketing-expert' ), total ) }
							</Button>
						) }
						{ allMatchingSelected && (
							<Button variant="link" size="small" onClick={ () => setAllMatchingSelected( false ) }>
								{ sprintf( __( 'Only select this page (%d)', 'ai-marketing-expert' ), selected.length ) }
							</Button>
						) }
						<Button isDestructive variant="secondary" size="small" onClick={ () => handleBulk( 'delete' ) }>
							{ __( 'Delete', 'ai-marketing-expert' ) }
						</Button>
						<Button variant="secondary" size="small" onClick={ () => handleBulk( 'subscribe' ) }>
							{ __( 'Subscribe', 'ai-marketing-expert' ) }
						</Button>
						<Button variant="secondary" size="small" onClick={ () => handleBulk( 'unsubscribe' ) }>
							{ __( 'Unsubscribe', 'ai-marketing-expert' ) }
						</Button>
						<Button variant="secondary" size="small" onClick={ () => handleBulk( 'pending' ) }>
							{ __( 'Pending', 'ai-marketing-expert' ) }
						</Button>
						<Button variant="secondary" size="small" onClick={ () => handleBulk( 'bounced' ) }>
							{ __( 'Bounced', 'ai-marketing-expert' ) }
						</Button>
						<Button variant="secondary" size="small" onClick={ () => handleBulk( 'complained' ) }>
							<span className="aime-pro-inline-action">{ __( 'Complained', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span>
						</Button>
						<Button variant="secondary" size="small" onClick={ () => setShowBulkModal( 'assign_tags' ) }>
							{ __( 'Assign Tags', 'ai-marketing-expert' ) }
						</Button>
						<Button variant="secondary" size="small" onClick={ () => hasPro ? setShowBulkModal( 'remove_tags' ) : handleBulk( 'remove_tags' ) }>
							<span className="aime-pro-inline-action">{ __( 'Remove Tags', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span>
						</Button>
						<Button variant="secondary" size="small" onClick={ () => setShowBulkModal( 'assign_lists' ) }>
							{ __( 'Assign Lists', 'ai-marketing-expert' ) }
						</Button>
						<Button variant="secondary" size="small" onClick={ () => hasPro ? setShowBulkModal( 'remove_lists' ) : handleBulk( 'remove_lists' ) }>
							<span className="aime-pro-inline-action">{ __( 'Remove Lists', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span>
						</Button>
					</div>
				) }

				{ /* Filters */ }
				<div className="aime-table-toolbar">
					<SearchControl
						value={ search }
					onChange={ resetFiltersAndReload( setSearch ) }
					placeholder={ __( 'Search contacts...', 'ai-marketing-expert' ) }
					className="aime-search"
				/>
				<SelectControl
					value={ audienceFilter }
					options={ audienceFilterOptions }
					onChange={ resetFiltersAndReload( setAudienceFilter ) }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					value={ status }
					options={ STATUS_OPTIONS }
					onChange={ resetFiltersAndReload( setStatus ) }
					__nextHasNoMarginBottom
				/>
			</div>

			{ loading ? (
					<Loader />
				) : (
					<>
						<table className="aime-table">
							<thead>
								<tr>
									<th className="aime-col-check">
										<CheckboxControl
											checked={ selected.length === items.length && items.length > 0 }
											onChange={ toggleAll }
											__nextHasNoMarginBottom
										/>
									</th>
									<th>{ __( 'Contact', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Tags', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Lists', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Created', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ items.length === 0 ? (
									<tr><td colSpan="7" className="aime-empty-row">{ __( 'No contacts found.', 'ai-marketing-expert' ) }</td></tr>
								) : items.map( ( sub ) => (
									<tr key={ sub.id }>
										<td className="aime-col-check">
											<CheckboxControl checked={ selected.includes( sub.id ) } onChange={ () => toggleOne( sub.id ) } __nextHasNoMarginBottom />
										</td>
										<td>
											<button className="aime-link-btn aime-contact-cell" onClick={ () => onNavigate( 'subscriber-profile', { id: sub.id } ) }>
												{ ( sub.first_name || sub.last_name ) && (
													<strong className="aime-contact-name">{ sub.first_name } { sub.last_name }</strong>
												) }
												<span className="aime-sub-email">{ sub.email }</span>
											</button>
										</td>
										<td><span className={ `aime-badge ${ STATUS_BADGES[ sub.status ] || '' }` }>{ sub.status }</span></td>
										<td>
											{ ( sub.tags || [] ).map( ( t ) => (
												<span key={ t.id || t } className="aime-tag-pill">{ t.title || t }</span>
											) ) }
										</td>
										<td>
											{ ( sub.lists || [] ).map( ( l ) => (
												<span key={ l.id || l } className="aime-tag-pill aime-list-pill">{ l.title || l }</span>
											) ) }
										</td>
										<td className="aime-date-cell">{ sub.created_at ? sub.created_at.split( ' ' )[ 0 ] : '\u2014' }</td>
										<td>
											<Button variant="tertiary" size="small" onClick={ () => onNavigate( 'subscriber-profile', { id: sub.id } ) }>
												{ __( 'View', 'ai-marketing-expert' ) }
											</Button>
											<Button isDestructive variant="tertiary" size="small" onClick={ () => handleDelete( sub.id ) }>
												{ __( 'Delete', 'ai-marketing-expert' ) }
											</Button>
										</td>
									</tr>
								) ) }
							</tbody>
						</table>

						{ totalPages > 1 && (
							<div className="aime-pagination">
								<Button variant="secondary" size="small" disabled={ page <= 1 } onClick={ () => setPage( page - 1 ) }>
									{ __( '\u2190 Prev', 'ai-marketing-expert' ) }
								</Button>
								<span>{ page } / { totalPages }</span>
								<Button variant="secondary" size="small" disabled={ page >= totalPages } onClick={ () => setPage( page + 1 ) }>
									{ __( 'Next \u2192', 'ai-marketing-expert' ) }
								</Button>
							</div>
						) }
					</>
				) }
			</Card>

			{ /* Premium Add Contact Modal */ }
			{ showAddModal && (
				<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) setShowAddModal( false ); } }>
					<div className="aime-premium-modal">
						<div className="aime-premium-modal-header">
							<h3>
								<span className="aime-premium-modal-icon">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
								</span>
								{ __( 'Add Contact', 'ai-marketing-expert' ) }
							</h3>
							<button className="aime-modal-close" onClick={ () => setShowAddModal( false ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Email Address', 'ai-marketing-expert' ) } *</label>
								<input
									type="email"
									className="aime-premium-input"
									placeholder="email@example.com"
									value={ newContact.email }
									onChange={ ( e ) => setNewContact( { ...newContact, email: e.target.value } ) }
									required
								/>
							</div>

							<div className="aime-premium-form-row">
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'First Name', 'ai-marketing-expert' ) }</label>
									<input
										type="text"
										className="aime-premium-input"
										placeholder={ __( 'Enter first name', 'ai-marketing-expert' ) }
										value={ newContact.first_name }
										onChange={ ( e ) => setNewContact( { ...newContact, first_name: e.target.value } ) }
									/>
								</div>
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Last Name', 'ai-marketing-expert' ) }</label>
									<input
										type="text"
										className="aime-premium-input"
										placeholder={ __( 'Enter last name', 'ai-marketing-expert' ) }
										value={ newContact.last_name }
										onChange={ ( e ) => setNewContact( { ...newContact, last_name: e.target.value } ) }
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
										value={ newContact.phone || '' }
										onChange={ ( e ) => setNewContact( { ...newContact, phone: e.target.value } ) }
									/>
								</div>
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Status', 'ai-marketing-expert' ) }</label>
									<select
										className="aime-premium-select"
										value={ newContact.status }
										onChange={ ( e ) => setNewContact( { ...newContact, status: e.target.value } ) }
									>
										{ STATUS_OPTIONS.filter( ( o ) => o.value !== '' ).map( ( opt ) => (
											<option key={ opt.value } value={ opt.value }>{ opt.label }</option>
										) ) }
									</select>
								</div>
							</div>

							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Lists', 'ai-marketing-expert' ) }</label>
								<fieldset className="aime-premium-fieldset-label">
									<legend className="aime-premium-fieldset-legend">{ __( 'Assign to lists', 'ai-marketing-expert' ) }</legend>
									{ lists.length === 0 && (
										<p className="aime-muted" style={ { margin: '4px 0' } }>{ __( 'No lists available. Create lists first.', 'ai-marketing-expert' ) }</p>
									) }
									<div className="aime-toggle-buttons">
										{ lists.map( ( l ) => {
											const isSelected = ( newContact.list_ids || [] ).includes( l.id );
											return (
												<button
													key={ l.id }
													type="button"
													className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` }
													onClick={ () => {
														const current = newContact.list_ids || [];
														const ids = isSelected
															? current.filter( ( x ) => x !== l.id )
															: [ ...current, l.id ];
														setNewContact( { ...newContact, list_ids: ids } );
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
									{ tags.length === 0 && (
										<p className="aime-muted" style={ { margin: '4px 0' } }>{ __( 'No tags available. Create tags first.', 'ai-marketing-expert' ) }</p>
									) }
									<div className="aime-toggle-buttons">
										{ tags.map( ( t ) => {
											const isSelected = ( newContact.tag_ids || [] ).includes( t.id );
											return (
												<button
													key={ t.id }
													type="button"
													className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` }
													onClick={ () => {
														const current = newContact.tag_ids || [];
														const ids = isSelected
															? current.filter( ( x ) => x !== t.id )
															: [ ...current, t.id ];
														setNewContact( { ...newContact, tag_ids: ids } );
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
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => setShowAddModal( false ) }>
								{ __( 'Cancel', 'ai-marketing-expert' ) }
							</button>
							<button className="aime-btn-primary" onClick={ handleAdd } disabled={ ! newContact.email }>
								{ __( 'Add Contact', 'ai-marketing-expert' ) }
							</button>
						</div>
					</div>
				</div>
			) }

			{ /* Bulk tag/list assign/remove Modal */ }
			{ showBulkModal && (
				<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) { setShowBulkModal( null ); setBulkTagIds( [] ); setBulkListIds( [] ); } } }>
					<div className="aime-premium-modal" style={ { width: '440px' } }>
						<div className="aime-premium-modal-header">
							<h3>
								<span className="aime-premium-modal-icon">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>
								</span>
								{ showBulkModal === 'assign_tags' && __( 'Assign Tags', 'ai-marketing-expert' ) }
								{ showBulkModal === 'remove_tags' && __( 'Remove Tags', 'ai-marketing-expert' ) }
								{ showBulkModal === 'assign_lists' && __( 'Assign Lists', 'ai-marketing-expert' ) }
								{ showBulkModal === 'remove_lists' && __( 'Remove Lists', 'ai-marketing-expert' ) }
							</h3>
							<button className="aime-modal-close" onClick={ () => { setShowBulkModal( null ); setBulkTagIds( [] ); setBulkListIds( [] ); } }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">
									{ showBulkModal === 'assign_tags' || showBulkModal === 'remove_tags' ? __( 'Select Tags', 'ai-marketing-expert' ) : __( 'Select Lists', 'ai-marketing-expert' ) }
								</label>
								<fieldset className="aime-premium-fieldset-label">
									<legend className="aime-premium-fieldset-legend">
										{ showBulkModal === 'assign_tags' && __( 'Choose tags to assign', 'ai-marketing-expert' ) }
										{ showBulkModal === 'remove_tags' && __( 'Choose tags to remove', 'ai-marketing-expert' ) }
										{ showBulkModal === 'assign_lists' && __( 'Choose lists to assign', 'ai-marketing-expert' ) }
										{ showBulkModal === 'remove_lists' && __( 'Choose lists to remove', 'ai-marketing-expert' ) }
									</legend>
									<div className="aime-toggle-buttons">
										{ showBulkModal === 'assign_tags' || showBulkModal === 'remove_tags' ? (
											tags.map( ( t ) => {
												const isSelected = bulkTagIds.includes( t.id );
												return (
													<button
														key={ t.id }
														type="button"
														className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` }
														onClick={ () => setBulkTagIds( isSelected ? bulkTagIds.filter( ( x ) => x !== t.id ) : [ ...bulkTagIds, t.id ] ) }
														style={ t.color ? { '--tag-color': t.color } : {} }
													>
														{ t.color && <span className="aime-toggle-btn-dot" style={ { background: t.color } } /> }
														{ t.title }
													</button>
												);
											} )
										) : (
											lists.map( ( l ) => {
												const isSelected = bulkListIds.includes( l.id );
												return (
													<button
														key={ l.id }
														type="button"
														className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` }
														onClick={ () => setBulkListIds( isSelected ? bulkListIds.filter( ( x ) => x !== l.id ) : [ ...bulkListIds, l.id ] ) }
													>
														{ l.title }
													</button>
												);
											} )
										) }
									</div>
								</fieldset>
							</div>
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => { setShowBulkModal( null ); setBulkTagIds( [] ); setBulkListIds( [] ); } }>
								{ __( 'Cancel', 'ai-marketing-expert' ) }
							</button>
							<button
								className="aime-btn-primary"
								onClick={ () => {
									const extras = showBulkModal === 'assign_tags' || showBulkModal === 'remove_tags' ? { tag_ids: bulkTagIds } : { list_ids: bulkListIds };
									handleBulk( showBulkModal, extras );
									setShowBulkModal( null );
									setBulkTagIds( [] );
									setBulkListIds( [] );
								} }
							>
								{ __( 'Apply', 'ai-marketing-expert' ) }
							</button>
						</div>
					</div>
				</div>
			) }

			{ /* Export Contacts Modal */ }
			{ showExportModal && (
				<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) setShowExportModal( false ); } }>
					<div className="aime-premium-modal" onClick={ ( e ) => e.stopPropagation() } style={ { maxWidth: 520 } }>
						<div className="aime-premium-modal-header">
							<h3>
								<span className="aime-premium-modal-icon" style={ { background: 'var(--aime-gradient)' } }>
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
								</span>
								{ __( 'Export Contacts', 'ai-marketing-expert' ) }
							</h3>
							<button className="aime-premium-modal-close" onClick={ () => setShowExportModal( false ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Export Type', 'ai-marketing-expert' ) }</label>
								<div className="aime-import-source-cards">
									<button type="button" className={ `aime-import-source-card${ exportMode === 'all' ? ' is-selected' : '' }` } onClick={ () => setExportMode( 'all' ) }>
										<span className="dashicons dashicons-groups" />
										<span className="aime-import-source-title">{ __( 'All Contacts', 'ai-marketing-expert' ) }</span>
										<span className="aime-import-source-desc">{ __( 'Export every contact in the database', 'ai-marketing-expert' ) }</span>
									</button>
									<button type="button" className={ `aime-import-source-card${ exportMode === 'list' ? ' is-selected' : '' }` } onClick={ () => setExportMode( 'list' ) }>
										<span className="dashicons dashicons-list-view" />
										<span className="aime-import-source-title">{ __( 'By List', 'ai-marketing-expert' ) }</span>
										<span className="aime-import-source-desc">{ __( 'Export contacts assigned to one list', 'ai-marketing-expert' ) }</span>
									</button>
									<button type="button" className={ `aime-import-source-card${ exportMode === 'tag' ? ' is-selected' : '' }` } onClick={ () => setExportMode( 'tag' ) }>
										<span className="dashicons dashicons-tag" />
										<span className="aime-import-source-title">{ __( 'By Tag', 'ai-marketing-expert' ) }</span>
										<span className="aime-import-source-desc">{ __( 'Export contacts assigned to one tag', 'ai-marketing-expert' ) }</span>
									</button>
								</div>
							</div>

							{ exportMode === 'list' && (
								<SelectControl
									label={ __( 'List', 'ai-marketing-expert' ) }
									value={ exportListId }
									options={ [ { label: __( 'Select a list', 'ai-marketing-expert' ), value: '' }, ...lists.map( ( list ) => ( { label: list.title, value: String( list.id ) } ) ) ] }
									onChange={ setExportListId }
									__nextHasNoMarginBottom
								/>
							) }

							{ exportMode === 'tag' && (
								<SelectControl
									label={ __( 'Tag', 'ai-marketing-expert' ) }
									value={ exportTagId }
									options={ [ { label: __( 'Select a tag', 'ai-marketing-expert' ), value: '' }, ...tags.map( ( tag ) => ( { label: tag.title, value: String( tag.id ) } ) ) ] }
									onChange={ setExportTagId }
									__nextHasNoMarginBottom
								/>
							) }
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => setShowExportModal( false ) }>{ __( 'Cancel', 'ai-marketing-expert' ) }</button>
							{ hasPro ? (
								<button className="aime-btn-primary" disabled={ exporting || ( exportMode === 'list' && ! exportListId ) || ( exportMode === 'tag' && ! exportTagId ) } onClick={ handleExport }>
									{ exporting ? __( 'Exporting...', 'ai-marketing-expert' ) : __( 'Download CSV', 'ai-marketing-expert' ) }
								</button>
							) : <ProUpgradeButton /> }
						</div>
					</div>
				</div>
			) }

			{ /* Import Source Selection Modal */ }
			{ showImportModal && (
				<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) { setShowImportModal( false ); resetImportOptions(); } } }>
					<div className="aime-premium-modal" onClick={ ( e ) => e.stopPropagation() } style={ { maxWidth: 520 } }>
						<div className="aime-premium-modal-header">
							<h3>
								<span className="aime-premium-modal-icon" style={ { background: 'var(--aime-gradient)' } }>
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
								</span>
								{ __( 'Import Contacts', 'ai-marketing-expert' ) }
							</h3>
							<button className="aime-premium-modal-close" onClick={ () => { setShowImportModal( false ); resetImportOptions(); } }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Select Import Source', 'ai-marketing-expert' ) }</label>
								<div className="aime-import-source-cards">
									<button type="button" className={ `aime-import-source-card${ importSource === 'csv' ? ' is-selected' : '' }` } onClick={ () => setImportSource( 'csv' ) }>
										<span className="dashicons dashicons-media-spreadsheet" />
										<span className="aime-import-source-title">{ __( 'CSV File', 'ai-marketing-expert' ) }</span>
										<span className="aime-import-source-desc">{ __( 'Upload a CSV file with contacts', 'ai-marketing-expert' ) }</span>
									</button>
									<button type="button" className={ `aime-import-source-card${ importSource === 'wp_users' ? ' is-selected' : '' }` } onClick={ () => setImportSource( 'wp_users' ) }>
										<span className="dashicons dashicons-admin-users" />
										<span className="aime-import-source-title">{ __( 'WordPress Users', 'ai-marketing-expert' ) }</span>
										<span className="aime-import-source-desc">{ __( 'Import all WordPress users', 'ai-marketing-expert' ) }</span>
									</button>
									<button type="button" className={ `aime-import-source-card${ importSource === 'woocommerce' ? ' is-selected' : '' }` } onClick={ () => setImportSource( 'woocommerce' ) }>
										<span className="dashicons dashicons-cart" />
										<span className="aime-import-source-title">{ __( 'WooCommerce Customers', 'ai-marketing-expert' ) }</span>
										<span className="aime-import-source-desc">{ __( 'Import all WooCommerce customers', 'ai-marketing-expert' ) }</span>
									</button>
								</div>
							</div>

							{ importSource && importSource !== 'csv' && (
								<>
								<div className="aime-csv-options-grid">
									<div className="aime-csv-option">
										<label className="aime-premium-form-label">{ __( 'Lists', 'ai-marketing-expert' ) }</label>
										<div className="aime-toggle-buttons">
											{ lists.map( ( list ) => {
												const isSelected = importListIds.includes( list.id );
												return (
													<button key={ list.id } type="button" className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` } onClick={ () => setImportListIds( isSelected ? importListIds.filter( ( id ) => id !== list.id ) : [ ...importListIds, list.id ] ) }>{ list.title }</button>
												);
											} ) }
											{ lists.length === 0 && <span className="aime-muted">{ __( 'No lists available.', 'ai-marketing-expert' ) }</span> }
										</div>
									</div>
									<div className="aime-csv-option">
										<label className="aime-premium-form-label">{ __( 'Tags', 'ai-marketing-expert' ) }</label>
										<div className="aime-toggle-buttons">
											{ tags.map( ( tag ) => {
												const isSelected = importTagIds.includes( tag.id );
												return (
													<button key={ tag.id } type="button" className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` } onClick={ () => setImportTagIds( isSelected ? importTagIds.filter( ( id ) => id !== tag.id ) : [ ...importTagIds, tag.id ] ) }>{ tag.color && <span className="aime-toggle-btn-dot" style={ { background: tag.color } } /> }{ tag.title }</button>
												);
											} ) }
											{ tags.length === 0 && <span className="aime-muted">{ __( 'No tags available.', 'ai-marketing-expert' ) }</span> }
										</div>
									</div>
									<div className="aime-csv-option">
										<label className="aime-premium-form-label">{ __( 'Update Subscribers', 'ai-marketing-expert' ) }</label>
										<div className="aime-radio-group">
											<label className="aime-radio-label"><input type="radio" name="source_update_existing" checked={ importUpdateExisting } onChange={ () => setImportUpdateExisting( true ) } /> <span>{ __( 'Yes', 'ai-marketing-expert' ) }</span></label>
											<label className="aime-radio-label"><input type="radio" name="source_update_existing" checked={ ! importUpdateExisting } onChange={ () => setImportUpdateExisting( false ) } /> <span>{ __( 'No', 'ai-marketing-expert' ) }</span></label>
										</div>
									</div>
									<div className="aime-csv-option">
										<SelectControl label={ __( 'New Subscriber Status', 'ai-marketing-expert' ) } value={ importNewStatus } options={ STATUS_OPTIONS.filter( ( option ) => option.value ) } onChange={ setImportNewStatus } __nextHasNoMarginBottom />
									</div>
								</div>
								</>
							) }

							{ importSource && importSource !== 'csv' && (
								<div className="aime-import-validation-options">
									<label className="aime-premium-form-label">{ __( 'Validation & Cleanup', 'ai-marketing-expert' ) }</label>
									<CheckboxControl label={ __( 'Skip invalid email format', 'ai-marketing-expert' ) } checked={ importValidation.skip_invalid_format } onChange={ ( v ) => updateImportValidation( 'skip_invalid_format', v ) } />
									<CheckboxControl label={ <ProLabel>{ __( 'Skip disposable or temporary email', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && importValidation.skip_disposable } onChange={ ( v ) => updateImportValidation( 'skip_disposable', v ) } disabled={ ! hasPro } />
									<CheckboxControl label={ __( 'Skip test, fake, localhost, and placeholder emails', 'ai-marketing-expert' ) } checked={ importValidation.skip_test_fake } onChange={ ( v ) => updateImportValidation( 'skip_test_fake', v ) } />
									<CheckboxControl label={ <ProLabel>{ __( 'Skip role-based emails like info@, support@, admin@', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && importValidation.skip_role_based } onChange={ ( v ) => updateImportValidation( 'skip_role_based', v ) } disabled={ ! hasPro } />
									<CheckboxControl label={ <ProLabel>{ __( 'Skip suspicious spam-pattern emails', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && importValidation.skip_spam_patterns } onChange={ ( v ) => updateImportValidation( 'skip_spam_patterns', v ) } disabled={ ! hasPro } />
									<CheckboxControl label={ <ProLabel>{ __( 'Check MX records before import', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && importValidation.check_mx } onChange={ ( v ) => updateImportValidation( 'check_mx', v ) } disabled={ ! hasPro } />
								</div>
							) }

							{ importSource && importSource !== 'csv' && (
								<CheckboxControl
									label={ __( 'Send double opt-in confirmation', 'ai-marketing-expert' ) }
									checked={ importDoubleOptin }
									onChange={ setImportDoubleOptin }
								/>
							) }
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => { setShowImportModal( false ); resetImportOptions(); } }>{ __( 'Cancel', 'ai-marketing-expert' ) }</button>
							<button className="aime-btn-primary" disabled={ ! importSource || loading } onClick={ handleSourceImport }>
								{ loading ? __( 'Importing...', 'ai-marketing-expert' ) : importSource === 'csv' ? __( 'Next \u2192', 'ai-marketing-expert' ) : __( 'Import', 'ai-marketing-expert' ) }
							</button>
						</div>
					</div>
				</div>
			) }

			{ /* CSV Import Modal */ }
			{ showCsvModal && (
				<CsvImportModal
					lists={ lists }
					tags={ tags }
					validation={ importValidation }
					onValidationChange={ setImportValidation }
					hasPro={ hasPro }
					onClose={ () => { setShowCsvModal( false ); resetImportOptions(); } }
					onImported={ handleImport }
				/>
			) }
		</div>
	);
};

export default Subscribers;
