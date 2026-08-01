/**
 * Link Building - backlink pipeline CRUD + AI outreach email (Pro).
 */

import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import { trash, edit } from '@wordpress/icons';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import UsageNotice from '../../../common/UsageNotice';
import ConfirmModal from '../../../common/ConfirmModal';
import { toast } from '../../../common/Toast';
import { DonutChart, HBarChart, SortArrow } from './SeoCharts';

const STATUS_COLORS = {
	prospect: '#2196f3',
	contacted: '#ff9800',
	replied: '#9c27b0',
	acquired: '#4caf50',
	rejected: '#f44336',
};

const STATUS_OPTIONS = [
	{ label: __( 'Prospect', 'ai-marketing-expert' ), value: 'prospect' },
	{ label: __( 'Contacted', 'ai-marketing-expert' ), value: 'contacted' },
	{ label: __( 'Replied', 'ai-marketing-expert' ), value: 'replied' },
	{ label: __( 'Acquired', 'ai-marketing-expert' ), value: 'acquired' },
	{ label: __( 'Rejected', 'ai-marketing-expert' ), value: 'rejected' },
];

const TYPE_OPTIONS = [
	{ label: __( 'Guest Post', 'ai-marketing-expert' ), value: 'guest_post' },
	{ label: __( 'Resource Page', 'ai-marketing-expert' ), value: 'resource_page' },
	{ label: __( 'Broken Link', 'ai-marketing-expert' ), value: 'broken_link' },
	{ label: __( 'Skyscraper', 'ai-marketing-expert' ), value: 'skyscraper' },
	{ label: __( 'Directory', 'ai-marketing-expert' ), value: 'directory' },
	{ label: __( 'Other', 'ai-marketing-expert' ), value: 'other' },
];

const emptyForm = {
	source_url: '',
	target_url: '',
	contact_email: '',
	link_type: 'guest_post',
	status: 'prospect',
	response_notes: '',
	anchor_text: '',
};

const LinkBuilding = ( { onNavigate } ) => {
	const { get, post, put, del, loading, error, clearError } = useApi();
	const { proUrl } = usePro();
	const [ backlinks, setBacklinks ] = useState( [] );
	const [ usage, setUsage ] = useState( null );
	const [ total, setTotal ] = useState( 0 );
	const [ showForm, setShowForm ] = useState( false );
	const [ form, setForm ] = useState( { ...emptyForm } );
	const [ editId, setEditId ] = useState( null );
	const [ outreach, setOutreach ] = useState( null );
	const [ generating, setGenerating ] = useState( false );
	const [ confirmDelete, setConfirmDelete ] = useState( null );
	const [ sortKey, setSortKey ] = useState( null );
	const [ sortDir, setSortDir ] = useState( 'asc' );

	const handleSort = ( key ) => {
		if ( sortKey === key ) {
			setSortDir( sortDir === 'asc' ? 'desc' : 'asc' );
		} else {
			setSortKey( key );
			setSortDir( 'asc' );
		}
	};

	const sortedBacklinks = useMemo( () => {
		if ( ! sortKey ) return backlinks;
		return [ ...backlinks ].sort( ( a, b ) => {
			let aVal, bVal;
			if ( sortKey === 'domain' ) {
				try { aVal = new URL( a.source_url ).hostname; } catch ( e ) { aVal = ''; }
				try { bVal = new URL( b.source_url ).hostname; } catch ( e ) { bVal = ''; }
			} else if ( sortKey === 'domain_authority' ) {
				aVal = Number( a.domain_authority ) || 0;
				bVal = Number( b.domain_authority ) || 0;
			} else {
				aVal = ( a[ sortKey ] || '' ).toString().toLowerCase();
				bVal = ( b[ sortKey ] || '' ).toString().toLowerCase();
			}
			if ( aVal < bVal ) return sortDir === 'asc' ? -1 : 1;
			if ( aVal > bVal ) return sortDir === 'asc' ? 1 : -1;
			return 0;
		} );
	}, [ backlinks, sortKey, sortDir ] );

	const statusCounts = useMemo( () => {
		const c = {};
		backlinks.forEach( ( bl ) => { c[ bl.status || 'prospect' ] = ( c[ bl.status || 'prospect' ] || 0 ) + 1; } );
		return c;
	}, [ backlinks ] );

	const typeCounts = useMemo( () => {
		const c = {};
		backlinks.forEach( ( bl ) => { c[ bl.link_type || 'other' ] = ( c[ bl.link_type || 'other' ] || 0 ) + 1; } );
		return c;
	}, [ backlinks ] );

	const fetchBacklinks = useCallback( async () => {
		try {
			const res = await get( '/seo/backlinks', { per_page: 50 } );
			setBacklinks( res.items || res.data || [] );
			setTotal( res.total || 0 );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	const fetchUsage = useCallback( async () => {
		try {
			const res = await get( '/seo/backlinks/usage' );
			setUsage( res.usage || null );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	useEffect( () => {
		fetchBacklinks();
		fetchUsage();
	}, [ fetchBacklinks, fetchUsage ] );

	const setField = ( key, value ) => {
		setForm( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const handleSave = async () => {
		if ( ! form.source_url ) return;
		try {
			if ( editId ) {
				await put( `/seo/backlinks/${ editId }`, form );
				toast( __( 'Backlink updated.', 'ai-marketing-expert' ) );
			} else {
				await post( '/seo/backlinks', form );
				toast( __( 'Backlink added.', 'ai-marketing-expert' ) );
			}
			setShowForm( false );
			setEditId( null );
			setForm( { ...emptyForm } );
			fetchBacklinks();
			fetchUsage();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleEdit = ( bl ) => {
		setForm( {
			source_url: bl.source_url || '',
			target_url: bl.target_url || '',
			contact_email: bl.contact_email || '',
			link_type: bl.link_type || 'guest_post',
			status: bl.status || 'prospect',
			response_notes: bl.response_notes || '',
			anchor_text: bl.anchor_text || '',
		} );
		setEditId( bl.id );
		setShowForm( true );
	};

	const handleDelete = async ( id ) => {
		try {
			await del( `/seo/backlinks/${ id }` );
			toast( __( 'Backlink deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			fetchBacklinks();
			fetchUsage();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleGenerateOutreach = async ( id ) => {
		setGenerating( true );
		setOutreach( null );
		try {
			const res = await post( '/seo/backlinks/generate-outreach', { backlink_id: id } );
			setOutreach( res.data || res );
			fetchUsage();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setGenerating( false );
		}
	};

	const prospectsFull = !! usage?.prospects && usage.prospects.limit != null
		&& usage.prospects.used >= usage.prospects.limit;
	const outreachExhausted = !! usage?.outreach && usage.outreach.limit != null
		&& usage.outreach.used >= usage.outreach.limit;

	return (
		<>
			<div className="aime-seo-link-building">
				{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

				<div className="aime-page-header">
					<h2>{ __( 'Link Building', 'ai-marketing-expert' ) } ({ total })</h2>
					<Button
						variant="primary"
						disabled={ prospectsFull }
						onClick={ () => {
							setForm( { ...emptyForm } );
							setEditId( null );
							setShowForm( true );
						} }
					>
						{ __( '+ Add Prospect', 'ai-marketing-expert' ) }
					</Button>
				</div>

				<UsageNotice
					usage={ usage?.prospects }
					featureLabel={ __( 'link prospects', 'ai-marketing-expert' ) }
					proUrl={ proUrl }
					kind="storage"
				/>

				<UsageNotice
					usage={ usage?.outreach }
					featureLabel={ __( 'AI outreach email', 'ai-marketing-expert' ) }
					proUrl={ proUrl }
				/>

				{ /* Add/Edit Form Modal */ }
				{ showForm && (
					<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) { setShowForm( false ); setEditId( null ); } } }>
						<div className="aime-premium-modal" style={ { maxWidth: 540 } } onClick={ ( e ) => e.stopPropagation() }>
							<div className="aime-premium-modal-header">
								<h3>{ editId ? __( 'Edit Backlink', 'ai-marketing-expert' ) : __( 'Add Backlink Prospect', 'ai-marketing-expert' ) }</h3>
								<button className="aime-premium-modal-close" onClick={ () => { setShowForm( false ); setEditId( null ); } }>&times;</button>
							</div>
							<div className="aime-premium-modal-body">
								<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Source URL (Prospect Page)', 'ai-marketing-expert' ) }</label>
								<input
									className="aime-premium-input"
									value={ form.source_url }
									onChange={ ( e ) => setField( 'source_url', e.target.value ) }
									placeholder="https://example.com/resource-page"
								/>
							</div>
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Target URL (Your Page)', 'ai-marketing-expert' ) }</label>
								<input
									className="aime-premium-input"
									value={ form.target_url }
									onChange={ ( e ) => setField( 'target_url', e.target.value ) }
									placeholder="https://yoursite.com/your-page"
									/>
								</div>
								<div className="aime-premium-form-row">
									<div className="aime-premium-form-group">
										<label className="aime-premium-form-label">{ __( 'Contact Email', 'ai-marketing-expert' ) }</label>
										<input
											type="email"
											className="aime-premium-input"
											value={ form.contact_email }
											onChange={ ( e ) => setField( 'contact_email', e.target.value ) }
										/>
									</div>
									<div className="aime-premium-form-group">
										<label className="aime-premium-form-label">{ __( 'Anchor Text', 'ai-marketing-expert' ) }</label>
										<input
											className="aime-premium-input"
											value={ form.anchor_text }
											onChange={ ( e ) => setField( 'anchor_text', e.target.value ) }
										/>
									</div>
								</div>
								<div className="aime-premium-form-row">
									<div className="aime-premium-form-group">
										<label className="aime-premium-form-label">{ __( 'Link Type', 'ai-marketing-expert' ) }</label>
										<select
											className="aime-premium-select"
											value={ form.link_type }
											onChange={ ( e ) => setField( 'link_type', e.target.value ) }
										>
											{ TYPE_OPTIONS.map( ( opt ) => (
												<option key={ opt.value } value={ opt.value }>{ opt.label }</option>
											) ) }
										</select>
									</div>
									<div className="aime-premium-form-group">
										<label className="aime-premium-form-label">{ __( 'Status', 'ai-marketing-expert' ) }</label>
										<select
											className="aime-premium-select"
											value={ form.status }
											onChange={ ( e ) => setField( 'status', e.target.value ) }
										>
											{ STATUS_OPTIONS.map( ( opt ) => (
												<option key={ opt.value } value={ opt.value }>{ opt.label }</option>
											) ) }
										</select>
									</div>
								</div>
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Notes', 'ai-marketing-expert' ) }</label>
									<textarea
										className="aime-premium-input"
									value={ form.response_notes }
									onChange={ ( e ) => setField( 'response_notes', e.target.value ) }
										rows={ 3 }
										style={ { resize: 'vertical' } }
									/>
								</div>
							</div>
							<div className="aime-premium-modal-footer">
								<button className="aime-btn-cancel" onClick={ () => { setShowForm( false ); setEditId( null ); } }>
									{ __( 'Cancel', 'ai-marketing-expert' ) }
								</button>
								<button className="aime-btn-primary" onClick={ handleSave } disabled={ loading }>
									{ editId ? __( 'Update', 'ai-marketing-expert' ) : __( 'Add Prospect', 'ai-marketing-expert' ) }
								</button>
							</div>
						</div>
					</div>
				) }

				{ /* Outreach modal */ }
				{ outreach && (
					<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) setOutreach( null ); } }>
						<div className="aime-premium-modal" style={ { maxWidth: 580 } } onClick={ ( e ) => e.stopPropagation() }>
							<div className="aime-premium-modal-header">
								<h3>{ __( 'AI Outreach Email', 'ai-marketing-expert' ) }</h3>
								<button className="aime-premium-modal-close" onClick={ () => setOutreach( null ) }>&times;</button>
							</div>
							<div className="aime-premium-modal-body">
								{ outreach.subject && (
									<p><strong>{ __( 'Subject:', 'ai-marketing-expert' ) }</strong> { outreach.subject }</p>
								) }
								<div style={ { whiteSpace: 'pre-wrap', background: 'var(--aime-bg)', padding: 16, borderRadius: 'var(--aime-radius-sm)', marginTop: 8, fontSize: 14, lineHeight: 1.6 } }>
									{ outreach.body || outreach.email || JSON.stringify( outreach, null, 2 ) }
								</div>
							</div>
							<div className="aime-premium-modal-footer">
								<button className="aime-btn-cancel" onClick={ () => setOutreach( null ) }>
									{ __( 'Close', 'ai-marketing-expert' ) }
								</button>
								<button
									className="aime-btn-primary"
									onClick={ () => {
										navigator.clipboard.writeText( outreach.body || outreach.email || '' ).catch( () => {} );
										toast( __( 'Copied to clipboard!', 'ai-marketing-expert' ) );
									} }
								>
									{ __( 'Copy to Clipboard', 'ai-marketing-expert' ) }
								</button>
							</div>
						</div>
					</div>
				) }

				{ /* Table */ }
				{ loading && ! backlinks.length ? (
					<Loader variant="table" text={ __( 'Loading backlinks\u2026', 'ai-marketing-expert' ) } />
				) : backlinks.length === 0 ? (
					<Card>
						<p className="aime-empty-text">
							{ __( 'No backlink prospects yet. Add your first prospect above.', 'ai-marketing-expert' ) }
						</p>
					</Card>
				) : (
					<>
						{ /* Summary Stats */ }
						<div className="aime-kw-summary-row">
							<div className="aime-kw-stat-card">
								<span className="aime-kw-stat-val">{ backlinks.length }</span>
								<span className="aime-kw-stat-label">{ __( 'Total Prospects', 'ai-marketing-expert' ) }</span>
							</div>
							{ STATUS_OPTIONS.map( ( opt ) => (
								<div className="aime-kw-stat-card" key={ opt.value }>
									<span className="aime-kw-stat-val" style={ { color: STATUS_COLORS[ opt.value ] } }>{ statusCounts[ opt.value ] || 0 }</span>
									<span className="aime-kw-stat-label">{ opt.label }</span>
								</div>
							) ) }
						</div>

						{ /* Charts */ }
						<div className="aime-analytics-charts-row">
							<Card title={ __( 'Status Pipeline', 'ai-marketing-expert' ) }>
								<DonutChart
									data={ STATUS_OPTIONS.map( ( opt ) => ( {
										label: opt.label,
										value: statusCounts[ opt.value ] || 0,
										color: STATUS_COLORS[ opt.value ],
									} ) ) }
								/>
							</Card>
							<Card title={ __( 'Link Types', 'ai-marketing-expert' ) }>
								<HBarChart
									data={ TYPE_OPTIONS.map( ( opt ) => ( {
										label: opt.label,
										value: typeCounts[ opt.value ] || 0,
										color: '#1565c0',
									} ) ).filter( ( d ) => d.value > 0 ) }
									title={ __( 'By Type', 'ai-marketing-expert' ) }
								/>
							</Card>
						</div>

						<Card>
						<table className="aime-kw-table">
							<thead>
								<tr>
									<th onClick={ () => handleSort( 'domain' ) } style={ { cursor: 'pointer' } }>{ __( 'Domain', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'domain' } dir={ sortDir } /></th>
									<th onClick={ () => handleSort( 'link_type' ) } style={ { cursor: 'pointer' } }>{ __( 'Type', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'link_type' } dir={ sortDir } /></th>
									<th onClick={ () => handleSort( 'status' ) } style={ { cursor: 'pointer' } }>{ __( 'Status', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'status' } dir={ sortDir } /></th>
									<th onClick={ () => handleSort( 'domain_authority' ) } style={ { cursor: 'pointer' } }>{ __( 'DA', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'domain_authority' } dir={ sortDir } /></th>
									<th>{ __( 'Contact', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ sortedBacklinks.map( ( bl ) => {
									let domain = '\u2014';
									try { domain = new URL( bl.source_url ).hostname; } catch ( e ) { /* ignore */ }
									return (
									<tr key={ bl.id }>
										<td>
											<strong>{ bl.source_url ? domain : '\u2014' }</strong>
											{ bl.source_url && (
												<small style={ { display: 'block', color: '#666' } }>{ bl.source_url }</small>
											) }
										</td>
										<td><span className="aime-tag">{ bl.link_type || 'other' }</span></td>
										<td>
											<span
												className="aime-status-badge"
												style={ { background: STATUS_COLORS[ bl.status ] || '#9e9e9e' } }
											>
												{ bl.status || 'prospect' }
											</span>
										</td>
										<td>
											{ bl.domain_authority
												? <span style={ { fontWeight: 'bold', color: bl.domain_authority >= 50 ? '#4caf50' : bl.domain_authority >= 20 ? '#ff9800' : '#f44336' } }>{ bl.domain_authority }</span>
												: '\u2014'
											}
										</td>
										<td>{ bl.contact_email || '\u2014' }</td>
										<td>
											<Button
												variant="secondary"
												onClick={ () => handleGenerateOutreach( bl.id ) }
												disabled={ generating || outreachExhausted }
												style={ { marginRight: 4 } }
												isSmall
											>
												{ __( 'Outreach', 'ai-marketing-expert' ) }
											</Button>
											<Button
												icon={ edit }
												label={ __( 'Edit', 'ai-marketing-expert' ) }
												onClick={ () => handleEdit( bl ) }
												style={ { marginRight: 4 } }
											/>
											<Button
												icon={ trash }
												isDestructive
												label={ __( 'Delete', 'ai-marketing-expert' ) }
												onClick={ () => setConfirmDelete( bl.id ) }
											/>
										</td>
									</tr>
								); } ) }
							</tbody>
						</table>
					</Card>
					</>
				) }

				{ generating && <Loader variant="lines" text={ __( 'AI is crafting your outreach email\u2026', 'ai-marketing-expert' ) } /> }

				{ confirmDelete && (
					<ConfirmModal
						title={ __( 'Delete Backlink', 'ai-marketing-expert' ) }
						message={ __( 'Are you sure you want to delete this backlink prospect?', 'ai-marketing-expert' ) }
						onConfirm={ () => handleDelete( confirmDelete ) }
						onCancel={ () => setConfirmDelete( null ) }
					/>
				) }
			</div>
		</>
	);
};

export default LinkBuilding;
