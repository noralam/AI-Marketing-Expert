/**
 * Conversations - paginated list with status / bot / search filters.
 */

import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, SelectControl, SearchControl, CheckboxControl } from '@aime/wp-components';
import { trash, seen, globe, lock } from '@wordpress/icons';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import { apiGet } from '../../../../utils/api';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import ConfirmModal from '../../../common/ConfirmModal';
import { ProUpgradeButton } from '../../../common/ProLock';
import { toast } from '../../../common/Toast';
import { PER_PAGE } from '../../../../utils/constants';

const STATUS_OPTIONS = [
	{ label: 'All Statuses', value: '' },
	{ label: 'Active', value: 'active' },
	{ label: 'Closed', value: 'closed' },
	{ label: 'Human Takeover', value: 'human_takeover' },
];

const VISITOR_OPTIONS = [
	{ label: 'All Visitors', value: '' },
	{ label: 'Leads Only', value: 'lead' },
	{ label: 'Anonymous Only', value: 'anonymous' },
];

const STATUS_COLORS = {
	active: '#4caf50',
	closed: '#9e9e9e',
	human_takeover: '#ff9800',
};

const STATUS_LABELS = {
	active: 'Active',
	closed: 'Closed',
	human_takeover: 'Human Takeover',
};

const Conversations = ( { onNavigate } ) => {
	const { get, post, del, loading } = useApi();
	const { hasPro } = usePro();
	const [ items, setItems ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ search, setSearch ] = useState( '' );
	const [ statusFilter, setStatusFilter ] = useState( '' );
	const [ botFilter, setBotFilter ] = useState( '' );
	const [ visitorFilter, setVisitorFilter ] = useState( '' );
	const [ bots, setBots ] = useState( [] );
	const [ confirmDelete, setConfirmDelete ] = useState( null );
	const [ selected, setSelected ] = useState( [] );

	/* Load bot options for filter */
	useEffect( () => {
		const loadBots = async () => {
			try {
				const res = await get( '/chatbot/bots' );
				const arr = Array.isArray( res ) ? res : res.items || [];
				setBots( arr.map( ( b ) => ( { label: b.name, value: String( b.id ) } ) ) );
			} catch ( e ) {
				// silent
			}
		};
		loadBots();
	}, [ get ] );

	const fetchItems = useCallback( async () => {
		try {
			const params = { page, per_page: PER_PAGE };
			if ( search ) params.search = search;
			if ( statusFilter ) params.status = statusFilter;
			if ( botFilter ) params.bot_id = botFilter;
			if ( visitorFilter ) params.visitor_type = visitorFilter;
			const res = await get( '/chatbot/conversations', params );
			setItems( res.items || res.data || [] );
			setTotal( res.total || 0 );
		} catch ( e ) {
			// silent
		}
	}, [ get, page, search, statusFilter, botFilter, visitorFilter ] );

	useEffect( () => {
		fetchItems();
	}, [ fetchItems ] );

	/*
	 * Smart auto-refresh: only when a NEW conversation appears.
	 * Every 10 s a silent check (no loading state) fetches per_page=1
	 * to get the total count, then compares against the known total.
	 * Uses apiGet directly to avoid useApi's setLoading side-effects.
	 */
	const knownTotalRef = useRef( null );
	const fetchRef = useRef( fetchItems );
	fetchRef.current = fetchItems;

	// Sync the known total after every full fetch.
	useEffect( () => {
		knownTotalRef.current = total;
	}, [ total ] );

	useEffect( () => {
		const checkForNew = async () => {
			try {
				const params = { page: 1, per_page: 1 };
				if ( search ) params.search = search;
				if ( statusFilter ) params.status = statusFilter;
				if ( botFilter ) params.bot_id = botFilter;
				if ( visitorFilter ) params.visitor_type = visitorFilter;
				// Use apiGet directly - no loading/error state changes.
				const res = await apiGet( '/chatbot/conversations', params );
				const serverTotal = res.total || 0;

				if (
					knownTotalRef.current !== null &&
					serverTotal !== knownTotalRef.current
				) {
					fetchRef.current();
				}
			} catch ( e ) {
				// silent
			}
		};
		const interval = setInterval( checkForNew, 10000 );
		return () => clearInterval( interval );
	}, [ search, statusFilter, botFilter, visitorFilter ] );

	const handleClose = async ( id ) => {
		try {
			await post( `/chatbot/conversations/${ id }/close` );
			toast( __( 'Conversation closed.', 'ai-marketing-expert' ) );
			fetchItems();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleDelete = async ( id ) => {
		try {
			await del( `/chatbot/conversations/${ id }` );
			toast( __( 'Conversation deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			fetchItems();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleTogglePublic = async ( id ) => {
		try {
			const res = await post( `/chatbot/conversations/${ id }/toggle-public` );
			toast( res.message );
			setItems( ( prev ) =>
				prev.map( ( c ) =>
					c.id === id ? { ...c, is_public: res.is_public ? '1' : '0' } : c
				)
			);
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	/* Bulk selection */

	const toggleAll = () => {
		if ( selected.length === items.length ) {
			setSelected( [] );
		} else {
			setSelected( items.map( ( i ) => i.id ) );
		}
	};

	const toggleOne = ( id ) => {
		setSelected( ( prev ) => prev.includes( id ) ? prev.filter( ( x ) => x !== id ) : [ ...prev, id ] );
	};

	const handleBulk = async ( action ) => {
		if ( ! selected.length ) return;
		try {
			await post( '/chatbot/conversations/bulk', { action, ids: selected } );
			setSelected( [] );
			toast( __( 'Bulk action completed.', 'ai-marketing-expert' ) );
			fetchItems();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	/* Export leads from selected conversations as CSV download (Pro). */
	const handleExportLeads = async () => {
		if ( ! selected.length ) return;
		try {
			const res = await post( '/chatbot/conversations/bulk', {
				action: 'export_leads',
				ids: selected,
			} );
			const blob = new Blob( [ res.csv ], { type: 'text/csv;charset=utf-8;' } );
			const url = URL.createObjectURL( blob );
			const a = document.createElement( 'a' );
			a.href = url;
			a.download = res.filename || 'chatbot-leads.csv';
			document.body.appendChild( a );
			a.click();
			document.body.removeChild( a );
			URL.revokeObjectURL( url );
			toast(
				sprintf(
					/* translators: %d: number of leads exported */
					__( '%d lead(s) exported.', 'ai-marketing-expert' ),
					res.count || 0
				)
			);
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const totalPages = Math.ceil( total / PER_PAGE );

	const botOptions = [
		{ label: __( 'All Bots', 'ai-marketing-expert' ), value: '' },
		...bots,
	];

	const [ copied, setCopied ] = useState( false );

	const copyShortcode = () => {
		navigator.clipboard.writeText( '[aime_discussions]' ).then( () => {
			setCopied( true );
			setTimeout( () => setCopied( false ), 2000 );
		} ).catch( () => {} );
	};

	return (
		<div className="aime-conversations-list">
			<div className="aime-page-header">
				<h2>{ __( 'Conversations', 'ai-marketing-expert' ) } <span className="aime-count">({ total })</span></h2>
			</div>

			<Card className="aime-shortcode-info">
				<div className="aime-shortcode-info__inner">
					<div className="aime-shortcode-info__text">
						<strong>{ __( 'Public Discussions', 'ai-marketing-expert' ) }{ ! hasPro ? ' - Pro' : '' }</strong>
						<p style={ { margin: '4px 0 0', color: '#555', fontSize: '13px' } }>
							{ hasPro
								? __( 'Show conversations on any page as a community discussion board. Add the shortcode below to a page or post. Use the', 'ai-marketing-expert' )
								: __( 'Show conversations on any page as a community discussion board. Upgrade to Pro to use this shortcode and public visibility controls.', 'ai-marketing-expert' )
							}{ ' ' }
							<span style={ { verticalAlign: 'middle' } }>{ '\uD83C\uDF10' }</span> { __( 'icon in the table to show/hide individual conversations.', 'ai-marketing-expert' ) }
						</p>
					</div>
					<div className="aime-shortcode-info__code">
						<code>[aime_discussions]</code>
						{ hasPro ? (
							<Button
								variant="secondary"
								size="small"
								onClick={ copyShortcode }
							>
								{ copied ? __( 'Copied!', 'ai-marketing-expert' ) : __( 'Copy', 'ai-marketing-expert' ) }
							</Button>
						) : <ProUpgradeButton /> }
					</div>
				</div>
			</Card>

			<Card>
				{ /* Bulk actions bar */ }
				{ selected.length > 0 && (
					<div className="aime-bulk-actions">
						<span>{ selected.length } { __( 'selected', 'ai-marketing-expert' ) }</span>
						<Button isDestructive variant="secondary" size="small" onClick={ () => handleBulk( 'delete' ) }>
							{ __( 'Delete', 'ai-marketing-expert' ) }
						</Button>
						<Button variant="secondary" size="small" onClick={ () => handleBulk( 'close' ) }>
							{ __( 'Close', 'ai-marketing-expert' ) }
						</Button>
						{ hasPro && (
							<Button variant="secondary" size="small" onClick={ () => handleBulk( 'make_public' ) }>
								{ __( 'Make Public', 'ai-marketing-expert' ) }
							</Button>
						) }
						{ hasPro && (
							<Button variant="secondary" size="small" onClick={ () => handleBulk( 'make_private' ) }>
								{ __( 'Make Private', 'ai-marketing-expert' ) }
							</Button>
						) }
						<Button
							variant="secondary"
							size="small"
							onClick={ hasPro ? handleExportLeads : undefined }
							disabled={ ! hasPro }
						>
							{ hasPro
								? __( 'Export Leads', 'ai-marketing-expert' )
								: __( 'Export Leads (Pro)', 'ai-marketing-expert' ) }
						</Button>
					</div>
				) }

				<div className="aime-table-toolbar">
					<SearchControl
						value={ search }
						onChange={ ( v ) => { setSearch( v ); setPage( 1 ); } }
						placeholder={ __( 'Search by visitor name or email...', 'ai-marketing-expert' ) }
						className="aime-search"
					/>
					<SelectControl
						value={ statusFilter }
						options={ STATUS_OPTIONS }
						onChange={ ( v ) => { setStatusFilter( v ); setPage( 1 ); } }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						value={ visitorFilter }
						options={ VISITOR_OPTIONS }
						onChange={ ( v ) => { setVisitorFilter( v ); setPage( 1 ); } }
						__nextHasNoMarginBottom
					/>
					{ bots.length > 1 && (
						<SelectControl
							value={ botFilter }
							options={ botOptions }
							onChange={ ( v ) => { setBotFilter( v ); setPage( 1 ); } }
							__nextHasNoMarginBottom
						/>
					) }
				</div>

				{ loading && ! items.length ? (
					<Loader text={ __( 'Loading conversations...', 'ai-marketing-expert' ) } />
				) : items.length === 0 ? (
					<p className="aime-empty-msg">
						{ __( 'No conversations found.', 'ai-marketing-expert' ) }
					</p>
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
									<th>{ __( 'Visitor', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Bot', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Messages', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Last Message', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Started', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ items.map( ( conv ) => (
									<tr key={ conv.id }>
										<td className="aime-col-check">
											<CheckboxControl checked={ selected.includes( conv.id ) } onChange={ () => toggleOne( conv.id ) } __nextHasNoMarginBottom />
										</td>
										<td
											className="aime-clickable-row"
											onClick={ () => onNavigate( 'conversation', { id: conv.id } ) }
										>
											<div className="aime-contact-cell">
												<strong>{ conv.visitor_name || __( 'Anonymous', 'ai-marketing-expert' ) }</strong>
												{ conv.visitor_email && <small>{ conv.visitor_email }</small> }
											</div>
										</td>
										<td>{ conv.bot_name || '\u2014' }</td>
										<td>
											<span
												className="aime-status-badge"
												style={ { background: STATUS_COLORS[ conv.status ] || '#9e9e9e' } }
											>
												{ STATUS_LABELS[ conv.status ] || conv.status }
											</span>
										</td>
										<td>{ conv.message_count || 0 }</td>
										<td>{ conv.last_message?.substring( 0, 60 ) || '\u2014' }</td>
										<td>{ conv.created_at?.split( ' ' )[ 0 ] }</td>
										<td>
											<div className="aime-row-actions">
												<Button
													icon={ seen }
													label={ __( 'View', 'ai-marketing-expert' ) }
													onClick={ () => onNavigate( 'conversation', { id: conv.id } ) }
													size="small"
												/>
												<Button
													icon={ String( conv.is_public ) === '1' ? globe : lock }
													label={ hasPro ? ( String( conv.is_public ) === '1' ? __( 'Public - click to hide', 'ai-marketing-expert' ) : __( 'Hidden - click to show', 'ai-marketing-expert' ) ) : __( 'Public Discussions (Pro)', 'ai-marketing-expert' ) }
													onClick={ hasPro ? () => handleTogglePublic( conv.id ) : undefined }
													disabled={ ! hasPro }
													size="small"
													className={ String( conv.is_public ) === '1' ? 'aime-btn-public' : 'aime-btn-hidden' }
												/>
												{ conv.status !== 'closed' && (
													<Button
														icon={ lock }
														label={ __( 'Close', 'ai-marketing-expert' ) }
														variant="secondary"
														size="small"
														onClick={ () => handleClose( conv.id ) }
													/>
												) }
												<Button
													icon={ trash }
													label={ __( 'Delete', 'ai-marketing-expert' ) }
													isDestructive
													onClick={ () => setConfirmDelete( conv.id ) }
													size="small"
												/>
											</div>
										</td>
									</tr>
								) ) }
							</tbody>
						</table>

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

			{ confirmDelete && (
				<ConfirmModal
					title={ __( 'Delete Conversation', 'ai-marketing-expert' ) }
					message={ __( 'Are you sure you want to delete this conversation and all its messages? This cannot be undone.', 'ai-marketing-expert' ) }
					confirmLabel={ __( 'Delete', 'ai-marketing-expert' ) }
					isDestructive
					onConfirm={ () => handleDelete( confirmDelete ) }
					onCancel={ () => setConfirmDelete( null ) }
				/>
			) }
		</div>
	);
};

export default Conversations;
