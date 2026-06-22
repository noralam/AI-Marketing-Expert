/**
 * Automations - list view for funnels/automations.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SearchControl, SelectControl } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import { menuUrl } from '../../../utils/menuUrl';

const STATUS_OPTIONS = [
	{ label: __( 'All Statuses', 'ai-marketing-expert' ), value: '' },
	{ label: __( 'Draft', 'ai-marketing-expert' ), value: 'draft' },
	{ label: __( 'Published', 'ai-marketing-expert' ), value: 'published' },
];

const BADGE = { draft: 'warning', published: 'success' };

const Automations = ( { onNavigate } ) => {
	const { get, post, put, del, loading, error, clearError } = useApi();
	const [ automations, setAutomations ] = useState( [] );
	const [ search, setSearch ] = useState( '' );
	const [ status, setStatus ] = useState( '' );
	const [ page, setPage ] = useState( 1 );
	const [ total, setTotal ] = useState( 0 );
	const [ cronStatus, setCronStatus ] = useState( null );

	const fetchList = useCallback( async () => {
		const params = new URLSearchParams( { page, per_page: 20 } );
		if ( search ) params.set( 'search', search );
		if ( status ) params.set( 'status', status );
		try {
			const res = await get( `/email/automations?${ params }` );
			setAutomations( res.items || [] );
			setTotal( res.total || 0 );
		} catch ( e ) { /* */ }
	}, [ get, page, search, status ] );

	useEffect( () => { fetchList(); }, [ fetchList ] );

	useEffect( () => {
		const fetchCronStatus = async () => {
			try {
				const res = await get( '/system/cron-status' );
				setCronStatus( res || null );
			} catch ( e ) { /* Keep automations usable if status check fails. */ }
		};

		fetchCronStatus();
	}, [ get ] );

	const handleDuplicate = async ( aid ) => {
		try {
			await post( `/email/automations/${ aid }/duplicate` );
			fetchList();
		} catch ( e ) { /* */ }
	};

	const handleDelete = async ( aid ) => {
		if ( ! window.confirm( __( 'Delete this automation?', 'ai-marketing-expert' ) ) ) return;
		try {
			await del( `/email/automations/${ aid }` );
			fetchList();
		} catch ( e ) { /* */ }
	};

	const handleToggleStatus = async ( a ) => {
		const newStatus = a.status === 'published' ? 'draft' : 'published';
		try {
			await put( `/email/automations/${ a.id }`, { status: newStatus } );
			fetchList();
		} catch ( e ) { /* */ }
	};

	const totalPages = Math.ceil( total / 20 );

	return (
		<Card
			title={ __( 'Automations', 'ai-marketing-expert' ) }
			actions={
				<Button variant="primary" onClick={ () => onNavigate( 'automation-editor' ) }>
					{ __( '+ New Automation', 'ai-marketing-expert' ) }
				</Button>
			}
		>
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ cronStatus?.has_overdue && (
				<Notice
					type="warning"
					message={ <>
						{ __( 'Automations may run late because WordPress cron is overdue or missing.', 'ai-marketing-expert' ) }{ ' ' }
						<a href={ `${ menuUrl( 'settings' ) }&tab=system` }>{ __( 'View System Status', 'ai-marketing-expert' ) }</a>
					</> }
					dismissible={ false }
				/>
			) }

			<div className="aime-table-toolbar">
				<SearchControl value={ search } onChange={ ( v ) => { setSearch( v ); setPage( 1 ); } } placeholder={ __( 'Search automations...', 'ai-marketing-expert' ) } />
				<SelectControl value={ status } options={ STATUS_OPTIONS } onChange={ ( v ) => { setStatus( v ); setPage( 1 ); } } __nextHasNoMarginBottom />
			</div>

			{ loading && <Loader /> }

			{ ! loading && automations.length === 0 && (
				<p className="aime-empty-msg">{ __( 'No automations found. Create your first automation!', 'ai-marketing-expert' ) }</p>
			) }

			{ ! loading && automations.length > 0 && (
				<table className="aime-table">
					<thead>
						<tr>
							<th>{ __( 'Title', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Trigger', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Steps', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Updated', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
						</tr>
					</thead>
					<tbody>
						{ automations.map( ( a ) => (
							<tr key={ a.id }>
								<td>
									<button className="aime-link-btn" onClick={ () => onNavigate( 'automation-editor', { id: a.id } ) }>
										{ a.title }
									</button>
								</td>
								<td>{ a.trigger_name || '\u2014' }</td>
								<td>
									<span className={ `aime-badge aime-badge-${ BADGE[ a.status ] || 'default' }` }>{ a.status }</span>
								</td>
								<td>{ a.sequences_count ?? '\u2014' }</td>
								<td>{ a.updated_at ? new Date( a.updated_at ).toLocaleDateString() : '\u2014' }</td>
								<td className="aime-actions">
									<Button variant="tertiary" size="small" onClick={ () => handleToggleStatus( a ) }>
										{ a.status === 'published' ? __( 'Pause', 'ai-marketing-expert' ) : __( 'Activate', 'ai-marketing-expert' ) }
									</Button>
									<Button variant="tertiary" size="small" onClick={ () => onNavigate( 'automation-editor', { id: a.id } ) }>
										{ __( 'Edit', 'ai-marketing-expert' ) }
									</Button>
									<Button variant="tertiary" size="small" onClick={ () => handleDuplicate( a.id ) }>
										{ __( 'Duplicate', 'ai-marketing-expert' ) }
									</Button>
									<Button isDestructive variant="tertiary" size="small" onClick={ () => handleDelete( a.id ) }>
										{ __( 'Delete', 'ai-marketing-expert' ) }
									</Button>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			) }

			{ totalPages > 1 && (
				<div className="aime-pagination">
					<Button variant="secondary" disabled={ page <= 1 } onClick={ () => setPage( page - 1 ) }>{ __( '\u2190 Prev', 'ai-marketing-expert' ) }</Button>
					<span>{ page } / { totalPages }</span>
					<Button variant="secondary" disabled={ page >= totalPages } onClick={ () => setPage( page + 1 ) }>{ __( 'Next \u2192', 'ai-marketing-expert' ) }</Button>
				</div>
			) }
		</Card>
	);
};

export default Automations;
