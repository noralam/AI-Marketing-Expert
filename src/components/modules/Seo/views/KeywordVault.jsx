/**
 * Keyword Vault - saved keywords CRUD table with search, filter, pagination.
 */

import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl, SearchControl, CheckboxControl } from '@aime/wp-components';
import { trash, pencil } from '@wordpress/icons';
import { navigateToNewArticle } from '../../../../utils/seoContentBridge';
import useApi from '../../../../hooks/useApi';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import ConfirmModal from '../../../common/ConfirmModal';
import { toast } from '../../../common/Toast';
import { PER_PAGE } from '../../../../utils/constants';

const INTENT_COLORS = {
	informational: '#2196f3',
	commercial: '#ff9800',
	transactional: '#4caf50',
	navigational: '#9c27b0',
};

const KD_COLOR = ( score ) => {
	if ( score <= 14 ) return '#4caf50';
	if ( score <= 29 ) return '#8bc34a';
	if ( score <= 49 ) return '#ff9800';
	if ( score <= 69 ) return '#ff5722';
	if ( score <= 84 ) return '#f44336';
	return '#b71c1c';
};

const STATUS_OPTIONS = [
	{ label: __( 'All Statuses', 'ai-marketing-expert' ), value: '' },
	{ label: __( 'Researched', 'ai-marketing-expert' ), value: 'researched' },
	{ label: __( 'Targeted', 'ai-marketing-expert' ), value: 'targeted' },
	{ label: __( 'Ranking', 'ai-marketing-expert' ), value: 'ranking' },
	{ label: __( 'Archived', 'ai-marketing-expert' ), value: 'archived' },
];

const INTENT_OPTIONS = [
	{ label: __( 'All Intents', 'ai-marketing-expert' ), value: '' },
	{ label: __( 'Informational', 'ai-marketing-expert' ), value: 'informational' },
	{ label: __( 'Commercial', 'ai-marketing-expert' ), value: 'commercial' },
	{ label: __( 'Transactional', 'ai-marketing-expert' ), value: 'transactional' },
	{ label: __( 'Navigational', 'ai-marketing-expert' ), value: 'navigational' },
];

const KeywordVault = ( { onNavigate, isActive } ) => {
	const { get, put, del, post, loading } = useApi();
	const [ keywords, setKeywords ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ search, setSearch ] = useState( '' );
	const [ statusFilter, setStatusFilter ] = useState( '' );
	const [ intentFilter, setIntentFilter ] = useState( '' );
	const [ selected, setSelected ] = useState( [] );
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

	const sortedKeywords = useMemo( () => {
		if ( ! sortKey ) return keywords;
		return [ ...keywords ].sort( ( a, b ) => {
			let aVal = a[ sortKey ] ?? '';
			let bVal = b[ sortKey ] ?? '';
			if ( typeof aVal === 'string' ) aVal = aVal.toLowerCase();
			if ( typeof bVal === 'string' ) bVal = bVal.toLowerCase();
			if ( aVal < bVal ) return sortDir === 'asc' ? -1 : 1;
			if ( aVal > bVal ) return sortDir === 'asc' ? 1 : -1;
			return 0;
		} );
	}, [ keywords, sortKey, sortDir ] );

	const SortArrow = ( { active, dir } ) => (
		<span className={ `aime-sort-arrow${ active ? ' aime-sort-arrow--active' : '' }` }>
			{ active ? ( dir === 'asc' ? '\u2191' : '\u2193' ) : '\u21C5' }
		</span>
	);

	const fetchKeywords = useCallback( async () => {
		try {
			const params = { page, per_page: PER_PAGE };
			if ( search ) params.search = search;
			if ( statusFilter ) params.status = statusFilter;
			if ( intentFilter ) params.intent = intentFilter;
			const res = await get( '/seo/keywords', params );
			setKeywords( res.items || res.data || [] );
			setTotal( res.total || 0 );
		} catch ( e ) {
			// silent
		}
	}, [ get, page, search, statusFilter, intentFilter ] );

	useEffect( () => {
		fetchKeywords();
	}, [ fetchKeywords ] );

	// Refetch when tab becomes active (e.g. after saving from Keyword Research).
	useEffect( () => {
		if ( isActive ) fetchKeywords();
	}, [ isActive ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const handleDelete = async ( id ) => {
		try {
			await del( `/seo/keywords/${ id }` );
			toast( __( 'Keyword deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			fetchKeywords();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleBulkDelete = async () => {
		if ( ! selected.length ) return;
		try {
			await post( '/seo/keywords/bulk-delete', { ids: selected } );
			toast( __( 'Keywords deleted.', 'ai-marketing-expert' ) );
			setSelected( [] );
			fetchKeywords();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleStatusChange = async ( id, status ) => {
		try {
			await put( `/seo/keywords/${ id }`, { status } );
			toast( __( 'Status updated.', 'ai-marketing-expert' ) );
			fetchKeywords();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const toggleSelect = ( id ) => {
		setSelected( ( prev ) =>
			prev.includes( id ) ? prev.filter( ( s ) => s !== id ) : [ ...prev, id ]
		);
	};

	const toggleSelectAll = () => {
		if ( selected.length === keywords.length ) {
			setSelected( [] );
		} else {
			setSelected( keywords.map( ( k ) => k.id ) );
		}
	};

	const totalPages = Math.ceil( total / PER_PAGE );

	return (
		<div className="aime-seo-keyword-vault">
			<div className="aime-page-header">
				<h2>{ __( 'Keyword Vault', 'ai-marketing-expert' ) } ({ total })</h2>
				<div className="aime-page-header-actions">
					{ selected.length > 0 && (
						<Button variant="secondary" isDestructive onClick={ handleBulkDelete }>
							{ __( 'Delete Selected', 'ai-marketing-expert' ) } ({ selected.length })
						</Button>
					) }
					<Button variant="primary" onClick={ () => onNavigate( 'keyword-research' ) }>
						{ __( '+ Research Keywords', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</div>

			{ /* Filters */ }
			<Card>
				<div className="aime-table-toolbar">
					<SearchControl
						value={ search }
						onChange={ ( v ) => { setSearch( v ); setPage( 1 ); } }
						placeholder={ __( 'Search keywords\u2026', 'ai-marketing-expert' ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						value={ statusFilter }
						options={ STATUS_OPTIONS }
						onChange={ ( v ) => { setStatusFilter( v ); setPage( 1 ); } }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						value={ intentFilter }
						options={ INTENT_OPTIONS }
						onChange={ ( v ) => { setIntentFilter( v ); setPage( 1 ); } }
						__nextHasNoMarginBottom
					/>
				</div>
			</Card>

			{ /* Table */ }
			<Card>
				{ loading && ! keywords.length ? (
					<Loader text={ __( 'Loading keywords\u2026', 'ai-marketing-expert' ) } />
				) : keywords.length === 0 ? (
					<p className="aime-empty-text">
						{ __( 'No keywords found.', 'ai-marketing-expert' ) }{ ' ' }
						<Button variant="link" onClick={ () => onNavigate( 'keyword-research' ) }>
							{ __( 'Start researching', 'ai-marketing-expert' ) }
						</Button>
					</p>
				) : (
					<>
						<table className="aime-table aime-kw-table">
							<thead>
								<tr>
									<th>
										<CheckboxControl
											checked={ selected.length === keywords.length && keywords.length > 0 }
											onChange={ toggleSelectAll }
											__nextHasNoMarginBottom
										/>
									</th>
									<th onClick={ () => handleSort( 'keyword' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>{ __( 'Keyword', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'keyword' } dir={ sortDir } /></th>
									<th onClick={ () => handleSort( 'search_volume' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>{ __( 'Volume', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'search_volume' } dir={ sortDir } /></th>
									<th onClick={ () => handleSort( 'difficulty_score' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>{ __( 'KD%', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'difficulty_score' } dir={ sortDir } /></th>
									<th onClick={ () => handleSort( 'cpc_estimate' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>{ __( 'CPC', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'cpc_estimate' } dir={ sortDir } /></th>
									<th onClick={ () => handleSort( 'intent' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>{ __( 'Intent', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'intent' } dir={ sortDir } /></th>
									<th onClick={ () => handleSort( 'current_rank' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>{ __( 'Rank', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'current_rank' } dir={ sortDir } /></th>
									<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ sortedKeywords.map( ( kw ) => (
									<tr key={ kw.id }>
										<td>
											<CheckboxControl
												checked={ selected.includes( kw.id ) }
												onChange={ () => toggleSelect( kw.id ) }
												__nextHasNoMarginBottom
											/>
										</td>
										<td><strong>{ kw.keyword }</strong></td>
										<td>{ kw.search_volume ? Number( kw.search_volume ).toLocaleString() : '\u2014' }</td>
										<td>
											{ kw.difficulty_score != null ? (
												<span style={ { color: KD_COLOR( kw.difficulty_score ), fontWeight: 600 } }>{ kw.difficulty_score }%</span>
											) : '\u2014' }
										</td>
										<td>{ kw.cpc_estimate ? `$${ kw.cpc_estimate }` : '\u2014' }</td>
										<td>
											{ kw.intent ? (
												<span
													className="aime-intent-dot"
													title={ kw.intent }
													style={ { background: INTENT_COLORS[ kw.intent ] || '#607d8b' } }
												>
													{ kw.intent?.charAt( 0 ).toUpperCase() }
												</span>
											) : '\u2014' }
										</td>
										<td>{ kw.current_rank || '\u2014' }</td>
										<td>
											<SelectControl
												value={ kw.status || 'researched' }
												options={ STATUS_OPTIONS.filter( ( o ) => o.value !== '' ) }
												onChange={ ( v ) => handleStatusChange( kw.id, v ) }
												__nextHasNoMarginBottom
											/>
										</td>
										<td>
											<Button
												icon={ trash }
												isDestructive
												label={ __( 'Delete', 'ai-marketing-expert' ) }
												onClick={ () => setConfirmDelete( kw.id ) }
											/>
										</td>
									</tr>
								) ) }
							</tbody>
						</table>

						{ /* Pagination */ }
						{ totalPages > 1 && (
							<div className="aime-pagination">
								<Button
									variant="secondary"
									disabled={ page <= 1 }
									onClick={ () => setPage( page - 1 ) }
								>
									{ __( '\u2190 Previous', 'ai-marketing-expert' ) }
								</Button>
								<span className="aime-pagination-info">
									{ page } / { totalPages }
								</span>
								<Button
									variant="secondary"
									disabled={ page >= totalPages }
									onClick={ () => setPage( page + 1 ) }
								>
									{ __( 'Next \u2192', 'ai-marketing-expert' ) }
								</Button>
							</div>
						) }
					</>
				) }
			</Card>

			{ confirmDelete && (
				<ConfirmModal
					title={ __( 'Delete Keyword', 'ai-marketing-expert' ) }
					message={ __( 'Are you sure you want to delete this keyword?', 'ai-marketing-expert' ) }
					onConfirm={ () => handleDelete( confirmDelete ) }
					onCancel={ () => setConfirmDelete( null ) }
				/>
			) }
		</div>
	);
};

export default KeywordVault;
