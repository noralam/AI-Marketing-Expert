/**
 * Articles list - browse, search, filter, bulk actions.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, SelectControl, SearchControl, CheckboxControl, TextControl } from '@aime/wp-components';
import { edit, seen, trash, copy, published } from '@wordpress/icons';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import ConfirmModal from '../../common/ConfirmModal';
import { toast } from '../../common/Toast';
import { ARTICLE_STATUS, ARTICLE_STATUS_LABELS, ARTICLE_STATUS_COLORS, PER_PAGE } from '../../../utils/constants';

const Articles = ( { onNavigate } ) => {
	const { get, post, del, loading } = useApi();
	const [ articles, setArticles ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ search, setSearch ] = useState( '' );
	const [ statusFilter, setStatusFilter ] = useState( '' );
	const [ selected, setSelected ] = useState( [] );
	const [ confirmDelete, setConfirmDelete ] = useState( null );
	const [ scheduleEdits, setScheduleEdits ] = useState( {} );
	const [ savingSchedule, setSavingSchedule ] = useState( 0 );

	const toDateTimeLocalValue = ( value ) => ( value ? value.replace( ' ', 'T' ).slice( 0, 16 ) : '' );
	const formatDateTime = ( value ) => ( value ? value.replace( 'T', ' ' ).slice( 0, 16 ) : '' );
	const getErrorMessage = ( error, fallback ) => error?.message || error?.data?.message || fallback;
	const canScheduleArticle = ( article ) => [
		ARTICLE_STATUS.DRAFT,
		ARTICLE_STATUS.READY,
		ARTICLE_STATUS.REVIEW,
		ARTICLE_STATUS.SCHEDULED,
	].includes( article.status );

	const fetchArticles = useCallback( async () => {
		try {
			const params = { page, per_page: PER_PAGE };
			if ( search ) params.search = search;
			if ( statusFilter ) params.status = statusFilter;
			const res = await get( '/content/articles', params );
			setArticles( res.items || res.data || [] );
			setTotal( res.total || 0 );
		} catch ( e ) {
			// silent
		}
	}, [ get, page, search, statusFilter ] );

	useEffect( () => {
		fetchArticles();
	}, [ fetchArticles ] );

	const handleDelete = async ( id ) => {
		try {
			await del( `/content/articles/${ id }` );
			toast( __( 'Article deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			fetchArticles();
		} catch ( e ) {
			toast( getErrorMessage( e, __( 'Could not delete article. Please try again.', 'ai-marketing-expert' ) ), 'error' );
		}
	};

	const handleDuplicate = async ( id ) => {
		try {
			await post( `/content/articles/${ id }/duplicate` );
			toast( __( 'Article duplicated.', 'ai-marketing-expert' ) );
			fetchArticles();
		} catch ( e ) {
			toast( getErrorMessage( e, __( 'Could not duplicate article. Please try again.', 'ai-marketing-expert' ) ), 'error' );
		}
	};

	const handlePublish = async ( id ) => {
		try {
			await post( `/content/articles/${ id }/publish`, { post_status: 'draft' } );
			toast( __( 'Article saved as a WordPress draft.', 'ai-marketing-expert' ) );
			fetchArticles();
		} catch ( e ) {
			toast( getErrorMessage( e, __( 'Could not send article to WordPress. Please try again.', 'ai-marketing-expert' ) ), 'error' );
		}
	};

	const handleScheduleChange = ( id, value ) => {
		setScheduleEdits( ( prev ) => ( { ...prev, [ id ]: value } ) );
	};

	const handleScheduleSave = async ( article ) => {
		const value = scheduleEdits[ article.id ] ?? toDateTimeLocalValue( article.scheduled_publish_at );
		if ( ! value ) {
			toast( __( 'Select a publish date and time.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		if ( ! canScheduleArticle( article ) ) {
			toast( __( 'Published articles cannot be scheduled again. Edit the WordPress post date instead.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		setSavingSchedule( article.id );
		try {
			await post( `/content/articles/${ article.id }/schedule`, { scheduled_publish_at: value } );
			toast( __( 'Schedule updated.', 'ai-marketing-expert' ), 'success' );
			fetchArticles();
		} catch ( e ) {
			toast( getErrorMessage( e, __( 'Could not update the schedule. Please try again.', 'ai-marketing-expert' ) ), 'error' );
		} finally {
			setSavingSchedule( 0 );
		}
	};

	const handleBulkDelete = async () => {
		if ( ! selected.length ) return;
		try {
			await post( '/content/articles/bulk', { action: 'delete', ids: selected } );
			toast( __( 'Articles deleted.', 'ai-marketing-expert' ) );
			setSelected( [] );
			fetchArticles();
		} catch ( e ) {
			toast( getErrorMessage( e, __( 'Could not delete selected articles. Please try again.', 'ai-marketing-expert' ) ), 'error' );
		}
	};

	const toggleSelect = ( id ) => {
		setSelected( ( prev ) =>
			prev.includes( id ) ? prev.filter( ( s ) => s !== id ) : [ ...prev, id ]
		);
	};

	const toggleSelectAll = () => {
		if ( selected.length === articles.length ) {
			setSelected( [] );
		} else {
			setSelected( articles.map( ( a ) => a.id ) );
		}
	};

	const totalPages = Math.ceil( total / PER_PAGE );

	const statusOptions = [
		{ label: __( 'All Statuses', 'ai-marketing-expert' ), value: '' },
		...Object.entries( ARTICLE_STATUS_LABELS ).map( ( [ val, lab ] ) => ( { label: lab, value: val } ) ),
	];

	return (
		<div className="aime-articles-list">
			<div className="aime-page-header">
				<h2>{ __( 'Articles', 'ai-marketing-expert' ) } <span className="aime-count">({ total })</span></h2>
				<div className="aime-page-header-actions">
					<Button variant="primary" onClick={ () => onNavigate( 'new-article' ) }>
						{ __( '+ New Article', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</div>

			<Card>
				{ /* Bulk actions */ }
				{ selected.length > 0 && (
					<div className="aime-bulk-actions">
						<span>{ selected.length } { __( 'selected', 'ai-marketing-expert' ) }</span>
						<Button isDestructive variant="secondary" size="small" onClick={ handleBulkDelete }>
							{ __( 'Delete', 'ai-marketing-expert' ) }
						</Button>
					</div>
				) }

				{ /* Filters - same pattern as Subscribers */ }
				<div className="aime-table-toolbar">
					<SearchControl
						value={ search }
						onChange={ ( v ) => { setSearch( v ); setPage( 1 ); } }
						placeholder={ __( 'Search articles...', 'ai-marketing-expert' ) }
						className="aime-search"
					/>
					<SelectControl
						value={ statusFilter }
						options={ statusOptions }
						onChange={ ( v ) => { setStatusFilter( v ); setPage( 1 ); } }
						__nextHasNoMarginBottom
					/>
				</div>

			{ /* Table */ }
			{ loading && ! articles.length ? (
				<Loader variant="table" text={ __( 'Loading articles...', 'ai-marketing-expert' ) } />
			) : articles.length === 0 ? (
				<p className="aime-empty-msg">
					{ __( 'No articles found. Create one to get started!', 'ai-marketing-expert' ) }
				</p>
			) : (
				<>
					<table className="aime-table">
						<thead>
							<tr>
								<th style={ { width: 32 } }>
									<CheckboxControl
										checked={ selected.length === articles.length && articles.length > 0 }
										onChange={ toggleSelectAll }
									/>
								</th>
								<th>{ __( 'Title', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Schedule', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'SEO', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Created', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ articles.map( ( article ) => (
								<tr key={ article.id }>
									<td>
										<CheckboxControl
											checked={ selected.includes( article.id ) }
											onChange={ () => toggleSelect( article.id ) }
										/>
									</td>
									<td
										className="aime-clickable-row"
										onClick={ () => onNavigate( 'edit-article', { id: article.id } ) }
									>
										{ article.title || __( 'Untitled', 'ai-marketing-expert' ) }
									</td>
									<td>
										<span
											className="aime-status-badge"
											style={ { background: ARTICLE_STATUS_COLORS[ article.status ] || '#9e9e9e' } }
										>
											{ ARTICLE_STATUS_LABELS[ article.status ] || article.status }
										</span>
									</td>
									<td>
										{ canScheduleArticle( article ) ? (
											<div className="aime-table-schedule-edit">
												<TextControl
													type="datetime-local"
													value={ scheduleEdits[ article.id ] ?? toDateTimeLocalValue( article.scheduled_publish_at ) }
													onChange={ ( value ) => handleScheduleChange( article.id, value ) }
													__nextHasNoMarginBottom
												/>
												<Button
													variant="secondary"
													size="small"
													isBusy={ savingSchedule === article.id }
													disabled={ savingSchedule === article.id }
													onClick={ () => handleScheduleSave( article ) }
												>
													{ article.status === ARTICLE_STATUS.SCHEDULED ? __( 'Update', 'ai-marketing-expert' ) : __( 'Schedule', 'ai-marketing-expert' ) }
												</Button>
											</div>
										) : (
											<span className="aime-schedule-static">
												{ article.published_at
													? sprintf( __( 'Published %s', 'ai-marketing-expert' ), formatDateTime( article.published_at ) )
													: __( 'Already published', 'ai-marketing-expert' ) }
											</span>
										) }
									</td>
									<td>{ article.seo_score || '\u2014' }</td>
									<td>{ article.created_at?.split( ' ' )[ 0 ] }</td>
									<td>
										<div className="aime-row-actions">
											<Button
												icon={ edit }
												label={ __( 'Edit', 'ai-marketing-expert' ) }
												onClick={ () => onNavigate( 'edit-article', { id: article.id } ) }
												size="small"
											/>
											<Button
												icon={ seen }
												label={ __( 'Preview', 'ai-marketing-expert' ) }
												onClick={ () => onNavigate( 'preview-article', { id: article.id } ) }
												size="small"
											/>
											<Button
												icon={ copy }
												label={ __( 'Duplicate', 'ai-marketing-expert' ) }
												onClick={ () => handleDuplicate( article.id ) }
												size="small"
											/>
											{ article.status !== 'published' && (
												<Button
													icon={ published }
													label={ __( 'Publish', 'ai-marketing-expert' ) }
													onClick={ () => handlePublish( article.id ) }
													size="small"
												/>
											) }
											<Button
												icon={ trash }
												label={ __( 'Delete', 'ai-marketing-expert' ) }
												isDestructive
												onClick={ () => setConfirmDelete( article.id ) }
												size="small"
											/>
										</div>
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
								onClick={ () => setPage( ( p ) => p - 1 ) }
							>
								{ __( '\u2190 Prev', 'ai-marketing-expert' ) }
							</Button>
							<span className="aime-pagination-info">
								{ page } / { totalPages } ({ total } { __( 'total', 'ai-marketing-expert' ) })
							</span>
							<Button
								variant="secondary"
								disabled={ page >= totalPages }
								onClick={ () => setPage( ( p ) => p + 1 ) }
							>
								{ __( 'Next \u2192', 'ai-marketing-expert' ) }
							</Button>
						</div>
					) }
				</>
			) }
			</Card>

			{ /* Confirm delete modal */ }
			{ confirmDelete && (
				<ConfirmModal
					title={ __( 'Delete Article', 'ai-marketing-expert' ) }
					message={ __( 'Are you sure you want to delete this article? This cannot be undone.', 'ai-marketing-expert' ) }
					confirmLabel={ __( 'Delete', 'ai-marketing-expert' ) }
					isDestructive
					onConfirm={ () => handleDelete( confirmDelete ) }
					onCancel={ () => setConfirmDelete( null ) }
				/>
			) }
		</div>
	);
};

export default Articles;
