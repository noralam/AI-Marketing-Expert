/**
 * Posts - list, filter, and manage social media posts.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, SelectControl, SearchControl } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import ConfirmModal from '../../common/ConfirmModal';
import { toast } from '../../common/Toast';
import { SOCIAL_POST_STATUS, SOCIAL_PLATFORMS, FREE_LIMITS } from '../../../utils/constants';

const PER_PAGE = 20;

const Posts = ( { onNavigate } ) => {
	const { get, post, del, loading } = useApi();
	const [ posts, setPosts ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ search, setSearch ] = useState( '' );
	const [ statusFilter, setStatusFilter ] = useState( '' );
	const [ selected, setSelected ] = useState( [] );
	const [ confirmDelete, setConfirmDelete ] = useState( null );
	const hasPro = !! window.aimeData?.hasPro;
	const monthlyLimit = FREE_LIMITS.social_posts_per_month || 30;
	const scheduledLimit = FREE_LIMITS.social_scheduled_posts || 3;

	const fetchPosts = useCallback( async () => {
		try {
			const params = new URLSearchParams( {
				page,
				per_page: PER_PAGE,
				...( search && { search } ),
				...( statusFilter && { status: statusFilter } ),
			} );
			const res = await get( `/social/posts?${ params }` );
			setPosts( res.items || [] );
			setTotal( res.total || 0 );
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	}, [ get, page, search, statusFilter ] );

	useEffect( () => {
		fetchPosts();
	}, [ fetchPosts ] );

	const totalPages = Math.ceil( total / PER_PAGE );

	const handleDelete = async ( postId ) => {
		try {
			await del( `/social/posts/${ postId }` );
			toast( __( 'Post deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			fetchPosts();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handlePublish = async ( postId ) => {
		try {
			await post( `/social/posts/${ postId }/publish` );
			toast( __( 'Post published!', 'ai-marketing-expert' ) );
			fetchPosts();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const toggleSelect = ( postId ) => {
		setSelected( ( prev ) =>
			prev.includes( postId ) ? prev.filter( ( id ) => id !== postId ) : [ ...prev, postId ]
		);
	};

	const toggleSelectAll = () => {
		if ( selected.length === posts.length ) {
			setSelected( [] );
		} else {
			setSelected( posts.map( ( p ) => p.id ) );
		}
	};

	const handleBulkAction = async ( action ) => {
		if ( selected.length === 0 ) {
			toast( __( 'No posts selected.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		try {
			await post( '/social/posts/bulk', { ids: selected, action } );
			toast(
				action === 'delete'
					? __( 'Posts deleted.', 'ai-marketing-expert' )
					: __( 'Posts published.', 'ai-marketing-expert' )
			);
			setSelected( [] );
			fetchPosts();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const statusBadge = ( status ) => {
		const colors = {
			draft: { bg: '#E0E0E0', color: '#616161' },
			approval_pending: { bg: '#FFF8E1', color: '#8A6D00' },
			scheduled: { bg: '#E3F2FD', color: '#1565C0' },
			publishing: { bg: '#FFF3E0', color: '#E65100' },
			published: { bg: '#E8F5E9', color: '#2E7D32' },
			failed: { bg: '#FFEBEE', color: '#C62828' },
		};
		const s = colors[ status ] || colors.draft;
		return (
			<span style={ {
				display: 'inline-block', padding: '2px 10px', borderRadius: 12,
				fontSize: 12, fontWeight: 600, background: s.bg, color: s.color,
			} }>
				{ SOCIAL_POST_STATUS[ status ] || status }
			</span>
		);
	};

	const platformBadge = ( platform ) => {
		const info = SOCIAL_PLATFORMS[ platform ];
		if ( ! info ) return platform;
		return (
			<span style={ { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: info.color, fontWeight: 600 } }>
				<span>{ info.icon }</span> { info.label }
			</span>
		);
	};

	return (
		<div className="aime-posts-list">
			<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } }>
				<h2 style={ { margin: 0 } }>
					{ __( 'Posts', 'ai-marketing-expert' ) }
					<span style={ { fontSize: 13, fontWeight: 400, color: 'var(--aime-text-muted)', marginLeft: 8 } }>
						({ total })
					</span>
				</h2>
				<Button variant="primary" onClick={ () => onNavigate( 'new-post' ) }>
					{ __( '+ New Post', 'ai-marketing-expert' ) }
				</Button>
			</div>

			{ ! hasPro && (
				<Notice
					type="info"
					message={ sprintf( __( 'Free plan includes %1$d posts per month and %2$d scheduled posts at a time. Upgrade to Pro for unlimited posting and scheduling.', 'ai-marketing-expert' ), monthlyLimit, scheduledLimit ) }
				/>
			) }

			{ /* Filters */ }
			<Card>
				<div style={ { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' } }>
					<div style={ { flex: 1, minWidth: 200 } }>
						<SearchControl
							label={ __( 'Search', 'ai-marketing-expert' ) }
							value={ search }
							onChange={ ( v ) => { setSearch( v ); setPage( 1 ); } }
							__nextHasNoMarginBottom
						/>
					</div>
					<div style={ { minWidth: 160 } }>
						<SelectControl
							label={ __( 'Status', 'ai-marketing-expert' ) }
							value={ statusFilter }
							options={ [
								{ label: __( 'All Statuses', 'ai-marketing-expert' ), value: '' },
								...Object.entries( SOCIAL_POST_STATUS ).map( ( [ k, v ] ) => ( { label: v, value: k } ) ),
							] }
							onChange={ ( v ) => { setStatusFilter( v ); setPage( 1 ); } }
							__nextHasNoMarginBottom
						/>
					</div>
					{ selected.length > 0 && (
						<div style={ { display: 'flex', gap: 8 } }>
							<Button variant="secondary" size="compact" onClick={ () => handleBulkAction( 'publish' ) }>
								{ __( 'Publish Selected', 'ai-marketing-expert' ) }
							</Button>
							<Button variant="tertiary" size="compact" isDestructive onClick={ () => handleBulkAction( 'delete' ) }>
								{ __( 'Delete Selected', 'ai-marketing-expert' ) }
							</Button>
						</div>
					) }
				</div>
			</Card>

			{ /* Posts Table */ }
			{ loading ? (
				<Loader text={ __( 'Loading posts...', 'ai-marketing-expert' ) } />
			) : posts.length === 0 ? (
				<Card>
					<div style={ { textAlign: 'center', padding: '40px 20px' } }>
						<p style={ { fontSize: 15, color: 'var(--aime-text-muted)' } }>
							{ __( 'No posts found. Create your first social post!', 'ai-marketing-expert' ) }
						</p>
						<Button variant="primary" onClick={ () => onNavigate( 'new-post' ) }>
							{ __( '+ New Post', 'ai-marketing-expert' ) }
						</Button>
					</div>
				</Card>
			) : (
				<>
					<div className="aime-table-container" style={ { marginTop: 16 } }>
						<table className="aime-table" style={ { width: '100%', borderCollapse: 'collapse' } }>
							<thead>
								<tr style={ { borderBottom: '2px solid var(--aime-border)' } }>
									<th style={ { width: 40, padding: '10px 8px' } }>
										<input
											type="checkbox"
											checked={ selected.length === posts.length && posts.length > 0 }
											onChange={ toggleSelectAll }
										/>
									</th>
									<th style={ { textAlign: 'left', padding: '10px 8px', fontSize: 13, fontWeight: 600 } }>
										{ __( 'Content', 'ai-marketing-expert' ) }
									</th>
									<th style={ { textAlign: 'left', padding: '10px 8px', fontSize: 13, fontWeight: 600, width: 110 } }>
										{ __( 'Platform', 'ai-marketing-expert' ) }
									</th>
									<th style={ { textAlign: 'left', padding: '10px 8px', fontSize: 13, fontWeight: 600, width: 100 } }>
										{ __( 'Status', 'ai-marketing-expert' ) }
									</th>
									<th style={ { textAlign: 'left', padding: '10px 8px', fontSize: 13, fontWeight: 600, width: 160 } }>
										{ __( 'Date', 'ai-marketing-expert' ) }
									</th>
									<th style={ { textAlign: 'right', padding: '10px 8px', fontSize: 13, fontWeight: 600, width: 160 } }>
										{ __( 'Actions', 'ai-marketing-expert' ) }
									</th>
								</tr>
							</thead>
							<tbody>
								{ posts.map( ( p ) => (
									<tr key={ p.id } style={ { borderBottom: '1px solid var(--aime-border)' } }>
										<td style={ { padding: '10px 8px' } }>
											<input
												type="checkbox"
												checked={ selected.includes( p.id ) }
												onChange={ () => toggleSelect( p.id ) }
											/>
										</td>
										<td style={ { padding: '10px 8px', maxWidth: 300 } }>
											<div style={ { fontSize: 14, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }>
												{ p.content?.substring( 0, 80 ) || '—' }
												{ p.ai_generated ? (
													<span style={ { marginLeft: 6, fontSize: 11, color: '#1B5E20' } } title={ __( 'AI Generated', 'ai-marketing-expert' ) }>✨</span>
												) : null }
											</div>
											{ p.account_name && (
												<div style={ { fontSize: 12, color: 'var(--aime-text-muted)', marginTop: 2 } }>
													{ p.account_name }
												</div>
											) }
											{ p.status === 'failed' && p.error_message && (
												<div style={ { fontSize: 12, color: '#C62828', marginTop: 4, whiteSpace: 'normal' } }>
													{ p.error_message }
												</div>
											) }
										</td>
										<td style={ { padding: '10px 8px' } }>
											{ platformBadge( p.platform ) }
										</td>
										<td style={ { padding: '10px 8px' } }>
											{ statusBadge( p.status ) }
										</td>
										<td style={ { padding: '10px 8px', fontSize: 13, color: 'var(--aime-text-muted)' } }>
											{ p.scheduled_at || p.published_at || p.created_at || '—' }
										</td>
										<td style={ { padding: '10px 8px', textAlign: 'right' } }>
											<div style={ { display: 'flex', gap: 6, justifyContent: 'flex-end' } }>
												{ p.status !== 'published' && (
													<Button variant="tertiary" size="compact" onClick={ () => onNavigate( 'edit-post', { id: p.id } ) }>
														{ __( 'Edit', 'ai-marketing-expert' ) }
													</Button>
												) }
												{ ( p.status === 'draft' || p.status === 'failed' || p.status === 'approval_pending' ) && (
													<Button variant="secondary" size="compact" onClick={ () => handlePublish( p.id ) }>
														{ __( 'Publish', 'ai-marketing-expert' ) }
													</Button>
												) }
												<Button variant="tertiary" isDestructive size="compact" onClick={ () => setConfirmDelete( p ) }>
													{ __( 'Delete', 'ai-marketing-expert' ) }
												</Button>
											</div>
										</td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>

					{ /* Pagination */ }
					{ totalPages > 1 && (
						<div style={ { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 } }>
							<Button variant="secondary" size="compact" disabled={ page <= 1 } onClick={ () => setPage( page - 1 ) }>
								{ __( '← Prev', 'ai-marketing-expert' ) }
							</Button>
							<span style={ { fontSize: 13, lineHeight: '30px', color: 'var(--aime-text-muted)' } }>
								{ page } / { totalPages }
							</span>
							<Button variant="secondary" size="compact" disabled={ page >= totalPages } onClick={ () => setPage( page + 1 ) }>
								{ __( 'Next →', 'ai-marketing-expert' ) }
							</Button>
						</div>
					) }
				</>
			) }

			{ confirmDelete && (
				<ConfirmModal
					title={ __( 'Delete Post', 'ai-marketing-expert' ) }
					message={ __( 'Are you sure you want to delete this post? This action cannot be undone.', 'ai-marketing-expert' ) }
					confirmLabel={ __( 'Delete', 'ai-marketing-expert' ) }
					isDestructive
					onConfirm={ () => handleDelete( confirmDelete.id ) }
					onCancel={ () => setConfirmDelete( null ) }
				/>
			) }
		</div>
	);
};

export default Posts;
