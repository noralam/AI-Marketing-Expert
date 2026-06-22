/**
 * Knowledge Base - manage Q&A pairs and WP content indexing.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, SelectControl, SearchControl, TextControl, TextareaControl, Spinner } from '@aime/wp-components';
import { edit, trash } from '@wordpress/icons';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import useSlowWarning from '../../../../hooks/useSlowWarning';
import Card from '../../../common/Card';
import LoadingBtn from '../../../common/LoadingBtn';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ConfirmModal from '../../../common/ConfirmModal';
import { ProUpgradeButton } from '../../../common/ProLock';
import { toast } from '../../../common/Toast';
import { PER_PAGE } from '../../../../utils/constants';

const TYPE_OPTIONS = [
	{ label: 'All Types', value: '' },
	{ label: 'Q&A Pair', value: 'qa_pair' },
	{ label: 'WP Content', value: 'wp_content' },
	{ label: 'WooCommerce Product', value: 'woo_product' },
	{ label: 'Document', value: 'document' },
	{ label: 'URL', value: 'url' },
];

const TYPE_LABELS = {
	qa_pair: 'Q&A',
	wp_content: 'WordPress',
	woo_product: 'WooCommerce',
	document: 'Document',
	url: 'URL',
};

const TYPE_COLORS = {
	qa_pair: '#2196f3',
	wp_content: '#4caf50',
	woo_product: '#9c27b0',
	document: '#ff9800',
	url: '#607d8b',
};

const DEFAULT_ENTRY = {
	bot_id: '',
	source_type: 'qa_pair',
	title: '',
	content: '',
};

const KnowledgeBase = ( { onNavigate } ) => {
	const { get, post, put, del, loading } = useApi();
	const { hasPro, freeLimits } = usePro();
	const slowWarning = useSlowWarning();
	const [ items, setItems ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ search, setSearch ] = useState( '' );
	const [ typeFilter, setTypeFilter ] = useState( '' );
	const [ bots, setBots ] = useState( [] );
	const [ botFilter, setBotFilter ] = useState( '' );
	const [ editEntry, setEditEntry ] = useState( null );
	const [ confirmDelete, setConfirmDelete ] = useState( null );
	const [ indexStatus, setIndexStatus ] = useState( null );
	const [ indexing, setIndexing ] = useState( false );

	/* Load bots for filter + forms */
	useEffect( () => {
		const loadBots = async () => {
			try {
				const res = await get( '/chatbot/bots' );
				const arr = Array.isArray( res ) ? res : res.items || [];
				const list = arr.map( ( b ) => ( { label: b.name, value: String( b.id ) } ) );
				setBots( list );
				if ( list.length > 0 ) setBotFilter( list[ 0 ].value );
			} catch ( e ) {
				// silent
			}
		};
		loadBots();
	}, [ get ] );

	const fetchItems = useCallback( async () => {
		if ( ! botFilter ) {
			setItems( [] );
			setTotal( 0 );
			return;
		}
		try {
			const params = { page, per_page: PER_PAGE };
			if ( search ) params.search = search;
			if ( typeFilter ) params.type = typeFilter;
			const res = await get( `/chatbot/bots/${ botFilter }/knowledge`, params );
			setItems( res.items || res.data || [] );
			setTotal( res.total || 0 );
		} catch ( e ) {
			// silent
		}
	}, [ get, page, search, typeFilter, botFilter ] );

	const fetchIndexStatus = useCallback( async () => {
		if ( ! botFilter ) return;
		try {
			const res = await get( `/chatbot/bots/${ botFilter }/knowledge/status` );
			// API returns a flat array of stats, not wrapped in { types: [] }.
			setIndexStatus( Array.isArray( res ) ? res : res.types || null );
		} catch ( e ) {
			// silent
		}
	}, [ get, botFilter ] );

	useEffect( () => {
		fetchItems();
	}, [ fetchItems ] );

	useEffect( () => {
		fetchIndexStatus();
	}, [ fetchIndexStatus ] );

	const handleSave = async () => {
		if ( ! editEntry.title?.trim() ) {
			toast( __( 'Title is required.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		if ( ! editEntry.bot_id ) {
			toast( __( 'Please select a bot.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		// Map UI fields to PHP fields: question+answer for qa_pair.
		const payload = {
			...editEntry,
			type: editEntry.source_type || 'qa_pair',
			question: editEntry.title,
			answer: editEntry.content || '',
		};
		try {
			if ( editEntry.id ) {
				await put( `/chatbot/knowledge/${ editEntry.id }`, payload );
				toast( __( 'Knowledge entry updated.', 'ai-marketing-expert' ) );
			} else {
				await post( `/chatbot/bots/${ editEntry.bot_id }/knowledge`, payload );
				toast( __( 'Knowledge entry created.', 'ai-marketing-expert' ) );
			}
			setEditEntry( null );
			fetchItems();
			fetchIndexStatus();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleDelete = async ( id ) => {
		try {
			await del( `/chatbot/knowledge/${ id }` );
			toast( __( 'Knowledge entry deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			fetchItems();
			fetchIndexStatus();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleTriggerIndex = async ( type ) => {
		if ( ! botFilter ) {
			toast( __( 'Please select a bot first.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setIndexing( true );
		slowWarning.start();
		try {
			const res = await post( `/chatbot/bots/${ botFilter }/knowledge/index`, { type } );
			toast( `${ __( 'Indexed', 'ai-marketing-expert' ) } ${ res.result?.indexed || res.indexed || 0 } ${ __( 'items.', 'ai-marketing-expert' ) }` );
			fetchItems();
			fetchIndexStatus();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
			setIndexing( false );
		}
	};

	const totalPages = Math.ceil( total / PER_PAGE );
	const qaLimit = freeLimits?.chatbot_knowledge_qa || 50;
	const wpContentLimit = freeLimits?.chatbot_knowledge_pages || 50;

	const botOptions = [
		{ label: __( 'Select Bot', 'ai-marketing-expert' ), value: '' },
		...bots,
	];

	return (
		<div className="aime-knowledge-base">
			<div className="aime-page-header">
				<h2>{ __( 'Knowledge Base', 'ai-marketing-expert' ) } <span className="aime-count">({ total })</span></h2>
				<div className="aime-page-header-actions">
					<Button
						variant="primary"
						onClick={ () => setEditEntry( { ...DEFAULT_ENTRY, bot_id: botFilter || ( bots[ 0 ]?.value || '' ) } ) }
					>
						{ __( '+ Add Q&A', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</div>

			{ /* Index actions */ }
			<Card title={ __( 'Content Indexing', 'ai-marketing-expert' ) }>
				<p className="description" style={ { marginBottom: 16 } }>
					{ hasPro
						? __( 'Index your WordPress content so the chatbot can answer questions about your site.', 'ai-marketing-expert' )
						: sprintf( __( 'Free plan can index up to %d WordPress posts/pages. WooCommerce products, documents, URLs, and all-site indexing require Pro.', 'ai-marketing-expert' ), wpContentLimit ) }
				</p>

				{ ! botFilter && (
					<Notice type="info" message={ __( 'Select a bot to see indexing status and trigger indexing.', 'ai-marketing-expert' ) } />
				) }

				<div className="aime-form-grid aime-form-grid-2" style={ { marginBottom: 16 } }>
					<SelectControl
						label={ __( 'Bot', 'ai-marketing-expert' ) }
						value={ botFilter }
						options={ botOptions }
						onChange={ setBotFilter }
						__nextHasNoMarginBottom
					/>
				</div>

				{ botFilter && indexStatus && (
					<div style={ { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 } }>
						{ indexStatus.map( ( s ) => (
							<div
								key={ s.type }
								style={ { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#f6f7f7', borderRadius: 6, fontSize: 13 } }
							>
								<span style={ { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: TYPE_COLORS[ s.type ] || '#9e9e9e' } } />
								<span>{ TYPE_LABELS[ s.type ] || s.type }</span>
								<span style={ { fontWeight: 600, marginLeft: 4 } }>{ s.total } { __( 'entries', 'ai-marketing-expert' ) }</span>
							</div>
						) ) }
					</div>
				) }

				{ botFilter && (
					<div style={ { display: 'flex', gap: 8, flexWrap: 'wrap' } }>
						{ indexing ? (
							<LoadingBtn>{ __( 'Indexing...', 'ai-marketing-expert' ) }</LoadingBtn>
						) : (
							<Button
								variant="secondary"
								onClick={ () => handleTriggerIndex( 'wp_content' ) }
							>
								{ __( 'Index WordPress Content', 'ai-marketing-expert' ) }
							</Button>
						) }
						{ hasPro ? (
							<>
								{ indexing ? (
									<LoadingBtn>{ __( 'Indexing...', 'ai-marketing-expert' ) }</LoadingBtn>
								) : (
									<Button
										variant="secondary"
										onClick={ () => handleTriggerIndex( 'woo_product' ) }
									>
										{ __( 'Index WooCommerce Products', 'ai-marketing-expert' ) }
									</Button>
								) }
								{ indexing ? (
									<LoadingBtn primary>{ __( 'Indexing...', 'ai-marketing-expert' ) }</LoadingBtn>
								) : (
									<Button
										variant="primary"
										onClick={ async () => {
											await handleTriggerIndex( 'wp_content' );
											await handleTriggerIndex( 'woo_product' );
										} }
									>
										{ __( 'Index All Website Data', 'ai-marketing-expert' ) }
									</Button>
								) }
							</>
						) : (
							<>
								<Button variant="secondary" disabled>
									{ __( 'Index Products (Pro)', 'ai-marketing-expert' ) }
								</Button>
								<Button variant="secondary" disabled>
									{ __( 'Index All Website Data (Pro)', 'ai-marketing-expert' ) }
								</Button>
								<ProUpgradeButton />
							</>
						) }
					</div>
				) }
			</Card>

			{ /* Knowledge entries list */ }
			<Card>
				{ ! hasPro && (
					<Notice type="info" message={ sprintf( __( 'Free plan includes up to %1$d manual Q&A entries and %2$d WordPress posts/pages. Document, URL, and WooCommerce knowledge sources require Pro.', 'ai-marketing-expert' ), qaLimit, wpContentLimit ) } />
				) }
				<div className="aime-table-toolbar">
					<SearchControl
						value={ search }
						onChange={ ( v ) => { setSearch( v ); setPage( 1 ); } }
						placeholder={ __( 'Search knowledge...', 'ai-marketing-expert' ) }
						className="aime-search"
					/>
					<SelectControl
						value={ typeFilter }
						options={ TYPE_OPTIONS }
						onChange={ ( v ) => { setTypeFilter( v ); setPage( 1 ); } }
						__nextHasNoMarginBottom
					/>
				</div>

				{ loading && ! items.length ? (
					<Loader text={ __( 'Loading knowledge base...', 'ai-marketing-expert' ) } />
				) : items.length === 0 ? (
					<p className="aime-empty-msg">
						{ __( 'No knowledge entries found. Add Q&A pairs or index your content.', 'ai-marketing-expert' ) }
					</p>
				) : (
					<>
						<table className="aime-table">
							<thead>
								<tr>
									<th>{ __( 'Title', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Type', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Content Preview', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Updated', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ items.map( ( entry ) => {
									// Derive display title: Q&A uses question, wp_content uses metadata.title, fallback to question.
									const meta = typeof entry.metadata === 'string' ? JSON.parse( entry.metadata || '{}' ) : ( entry.metadata || {} );
									const displayTitle = entry.question || meta.title || __( 'Untitled', 'ai-marketing-expert' );
									const entryType = entry.type || entry.source_type || '';

									return (
										<tr key={ entry.id }>
											<td>
												<strong>{ displayTitle }</strong>
											</td>
											<td>
												<span
													className="aime-status-badge"
													style={ { background: TYPE_COLORS[ entryType ] || '#9e9e9e' } }
												>
													{ TYPE_LABELS[ entryType ] || entryType || '\u2014' }
												</span>
											</td>
											<td style={ { maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }>
												{ entry.content?.substring( 0, 80 ) || entry.answer?.substring( 0, 80 ) || '\u2014' }
											</td>
											<td>{ entry.updated_at?.split( ' ' )[ 0 ] }</td>
											<td>
												<div className="aime-row-actions">
													{ entryType === 'qa_pair' && (
														<Button
															icon={ edit }
															label={ __( 'Edit', 'ai-marketing-expert' ) }
															onClick={ () => setEditEntry( { ...entry, title: entry.question, content: entry.answer || entry.content } ) }
															size="small"
														/>
													) }
													<Button
														icon={ trash }
														label={ __( 'Delete', 'ai-marketing-expert' ) }
														isDestructive
														onClick={ () => setConfirmDelete( entry.id ) }
														size="small"
													/>
												</div>
											</td>
										</tr>
									);
								} ) }
							</tbody>
						</table>

						{ totalPages > 1 && (
							<div className="aime-pagination">
								<Button variant="secondary" disabled={ page <= 1 } onClick={ () => setPage( ( p ) => p - 1 ) }>
									{ __( '\u2190 Prev', 'ai-marketing-expert' ) }
								</Button>
								<span className="aime-pagination-info">
									{ page } / { totalPages } ({ total } { __( 'total', 'ai-marketing-expert' ) })
								</span>
								<Button variant="secondary" disabled={ page >= totalPages } onClick={ () => setPage( ( p ) => p + 1 ) }>
									{ __( 'Next \u2192', 'ai-marketing-expert' ) }
								</Button>
							</div>
						) }
					</>
				) }
			</Card>

			{ /* Create / Edit Q&A modal */ }
			{ editEntry && (
				<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) setEditEntry( null ); } }>
					<div className="aime-premium-modal" style={ { width: '560px' } }>
						<div className="aime-premium-modal-header">
							<h3>
								<span className="aime-premium-modal-icon">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
								</span>
								{ editEntry.id ? __( 'Edit Q&A Entry', 'ai-marketing-expert' ) : __( 'New Q&A Entry', 'ai-marketing-expert' ) }
							</h3>
							<button className="aime-modal-close" onClick={ () => setEditEntry( null ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<div className="aime-form-group">
								<SelectControl
									label={ __( 'Bot', 'ai-marketing-expert' ) }
									value={ String( editEntry.bot_id || '' ) }
									options={ botOptions }
									onChange={ ( v ) => setEditEntry( ( prev ) => ( { ...prev, bot_id: v } ) ) }
									__nextHasNoMarginBottom
								/>
							</div>
							<div className="aime-form-group">
								<TextControl
									label={ __( 'Question / Title', 'ai-marketing-expert' ) }
									value={ editEntry.title || '' }
									onChange={ ( v ) => setEditEntry( ( prev ) => ( { ...prev, title: v } ) ) }
									placeholder={ __( 'e.g. What are your business hours?', 'ai-marketing-expert' ) }
									__nextHasNoMarginBottom
								/>
							</div>
							<div className="aime-form-group">
								<TextareaControl
									label={ __( 'Answer / Content', 'ai-marketing-expert' ) }
									value={ editEntry.content || '' }
									onChange={ ( v ) => setEditEntry( ( prev ) => ( { ...prev, content: v } ) ) }
									rows={ 5 }
									placeholder={ __( 'e.g. We are open Monday-Friday 9am-5pm.', 'ai-marketing-expert' ) }
								/>
							</div>
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => setEditEntry( null ) }>
								{ __( 'Cancel', 'ai-marketing-expert' ) }
							</button>
							<button className="aime-btn-primary" onClick={ handleSave }>
								{ editEntry.id ? __( 'Update', 'ai-marketing-expert' ) : __( 'Create', 'ai-marketing-expert' ) }
							</button>
						</div>
					</div>
				</div>
			) }

			{ confirmDelete && (
				<ConfirmModal
					title={ __( 'Delete Knowledge Entry', 'ai-marketing-expert' ) }
					message={ __( 'Are you sure you want to delete this knowledge entry?', 'ai-marketing-expert' ) }
					confirmLabel={ __( 'Delete', 'ai-marketing-expert' ) }
					isDestructive
					onConfirm={ () => handleDelete( confirmDelete ) }
					onCancel={ () => setConfirmDelete( null ) }
				/>
			) }
		</div>
	);
};

export default KnowledgeBase;
