/**
 * Campaigns list with actions.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl, SearchControl } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';

const STATUS_OPTIONS = [
	{ label: __( 'All', 'ai-marketing-expert' ), value: '' },
	{ label: __( 'Draft', 'ai-marketing-expert' ), value: 'draft' },
	{ label: __( 'Scheduled', 'ai-marketing-expert' ), value: 'scheduled' },
	{ label: __( 'Sending', 'ai-marketing-expert' ), value: 'working' },
	{ label: __( 'Sent', 'ai-marketing-expert' ), value: 'sent' },
	{ label: __( 'Paused', 'ai-marketing-expert' ), value: 'paused' },
];

const STATUS_BADGES = {
	draft: 'aime-badge-default',
	scheduled: 'aime-badge-warning',
	working: 'aime-badge-info',
	sent: 'aime-badge-success',
	paused: 'aime-badge-error',
	archived: 'aime-badge-default',
};

const Campaigns = ( { onNavigate } ) => {
	const { get, post, del, loading, error, clearError } = useApi();
	const [ items, setItems ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ status, setStatus ] = useState( '' );
	const [ search, setSearch ] = useState( '' );
	const [ notice, setNotice ] = useState( null );

	const fetchItems = useCallback( async () => {
		try {
			const res = await get( '/email/campaigns', { page, per_page: 20, status, search } );
			setItems( res.items || [] );
			setTotal( res.total || 0 );
		} catch ( e ) { /* */ }
	}, [ get, page, status, search ] );

	useEffect( () => { fetchItems(); }, [ fetchItems ] );

	const handleDuplicate = async ( id ) => {
		try {
			await post( `/email/campaigns/${ id }/duplicate` );
			setNotice( { type: 'success', message: __( 'Campaign duplicated.', 'ai-marketing-expert' ) } );
			fetchItems();
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
		}
	};

	const handleDelete = async ( id ) => {
		if ( ! window.confirm( __( 'Delete this campaign?', 'ai-marketing-expert' ) ) ) return;
		try {
			await del( `/email/campaigns/${ id }` );
			setNotice( { type: 'success', message: __( 'Campaign deleted.', 'ai-marketing-expert' ) } );
			fetchItems();
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
		}
	};

	const totalPages = Math.ceil( total / 20 );
	const formatRate = ( value ) => ( Number.isFinite( Number( value ) ) ? `${ Number( value ).toFixed( 1 ) }%` : '\u2014' );

	return (
		<div className="aime-campaigns-page">
			<div className="aime-page-header">
				<h2>{ __( 'Campaigns', 'ai-marketing-expert' ) } <span className="aime-count">({ total })</span></h2>
				<Button variant="primary" onClick={ () => onNavigate( 'campaign-editor', { id: 'new' } ) }>
					{ __( '+ New Campaign', 'ai-marketing-expert' ) }
				</Button>
			</div>

			{ notice && <Notice type={ notice.type } message={ notice.message } onDismiss={ () => setNotice( null ) } /> }
			{ error && <Notice type="error" message={ error } onDismiss={ clearError } /> }

			<Card>
				<div className="aime-table-toolbar">
					<SearchControl value={ search } onChange={ ( v ) => { setSearch( v ); setPage( 1 ); } } placeholder={ __( 'Search campaigns...', 'ai-marketing-expert' ) } className="aime-search" />
					<SelectControl value={ status } options={ STATUS_OPTIONS } onChange={ ( v ) => { setStatus( v ); setPage( 1 ); } } __nextHasNoMarginBottom />
				</div>

				{ loading ? <Loader /> : (
					<>
						<table className="aime-table">
							<thead>
								<tr>										<th>{ __( 'ID', 'ai-marketing-expert' ) }</th>									<th>{ __( 'Campaign', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Subject', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Sent', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Open Rate', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Click Rate', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Created', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ items.length === 0 ? (
									<tr><td colSpan="9" className="aime-empty-row">{ __( 'No campaigns found.', 'ai-marketing-expert' ) }</td></tr>
								) : items.map( ( c ) => (
									<tr key={ c.id }>
										<td className="aime-id-cell">{ c.id }</td>
										<td>
											<button className="aime-link-btn" onClick={ () => onNavigate( c.status === 'draft' ? 'campaign-editor' : 'campaign-progress', { id: c.id } ) }>
												<strong>{ c.title }</strong>
											</button>
										</td>
										<td><span className={ `aime-badge ${ STATUS_BADGES[ c.status ] || '' }` }>{ c.status }</span></td>
										<td>{ c.email_subject || '\u2014' }</td>
										<td>{ c.metrics?.sent ?? c.sent_count ?? 0 }</td>
										<td>{ formatRate( c.metrics?.open_rate ?? c.open_rate ) }</td>
										<td>{ formatRate( c.metrics?.click_rate ?? c.click_rate ) }</td>
										<td className="aime-date-cell">{ c.created_at?.split( ' ' )[ 0 ] || '\u2014' }</td>
										<td className="aime-actions-cell">
											{ c.status === 'draft' && (
												<Button variant="tertiary" size="small" onClick={ () => onNavigate( 'campaign-editor', { id: c.id } ) }>
													{ __( 'Edit', 'ai-marketing-expert' ) }
												</Button>
											) }
											{ [ 'sent', 'working', 'sending', 'scheduled' ].includes( c.status ) && (
												<Button variant="tertiary" size="small" onClick={ () => onNavigate( 'campaign-progress', { id: c.id } ) }>
													{ __( 'View', 'ai-marketing-expert' ) }
												</Button>
											) }
											<Button variant="tertiary" size="small" onClick={ () => handleDuplicate( c.id ) }>
												{ __( 'Duplicate', 'ai-marketing-expert' ) }
											</Button>
											<Button isDestructive variant="tertiary" size="small" onClick={ () => handleDelete( c.id ) }>
												{ __( 'Delete', 'ai-marketing-expert' ) }
											</Button>
										</td>
									</tr>
								) ) }
							</tbody>
						</table>

						{ totalPages > 1 && (
							<div className="aime-pagination">
								<Button variant="secondary" size="small" disabled={ page <= 1 } onClick={ () => setPage( page - 1 ) }>{ __( '\u2190 Prev', 'ai-marketing-expert' ) }</Button>
								<span>{ page } / { totalPages }</span>
								<Button variant="secondary" size="small" disabled={ page >= totalPages } onClick={ () => setPage( page + 1 ) }>{ __( 'Next \u2192', 'ai-marketing-expert' ) }</Button>
							</div>
						) }
					</>
				) }
			</Card>
		</div>
	);
};

export default Campaigns;
