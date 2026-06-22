/**
 * Bot List - browse, create, activate/deactivate, duplicate, delete chatbots.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SearchControl } from '@aime/wp-components';
import { edit, trash, copy, seen } from '@wordpress/icons';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ConfirmModal from '../../../common/ConfirmModal';
import { ProUpgradeButton } from '../../../common/ProLock';
import { toast } from '../../../common/Toast';

const BotList = ( { onNavigate } ) => {
	const { get, post, put, del, loading } = useApi();
	const { hasPro } = usePro();
	const [ bots, setBots ] = useState( [] );
	const [ search, setSearch ] = useState( '' );
	const [ confirmDelete, setConfirmDelete ] = useState( null );

	const fetchBots = useCallback( async () => {
		try {
			const res = await get( '/chatbot/bots' );
			setBots( Array.isArray( res ) ? res : res.items || res.data || [] );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	useEffect( () => {
		fetchBots();
	}, [ fetchBots ] );

	const handleToggleActive = async ( bot ) => {
		try {
			const newStatus = bot.status === 'active' ? 'inactive' : 'active';
			await put( `/chatbot/bots/${ bot.id }`, { status: newStatus } );
			toast( bot.status === 'active'
				? __( 'Chatbot deactivated.', 'ai-marketing-expert' )
				: __( 'Chatbot activated.', 'ai-marketing-expert' )
			);
			fetchBots();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleDuplicate = async ( id ) => {
		try {
			await post( `/chatbot/bots/${ id }/duplicate` );
			toast( __( 'Chatbot duplicated.', 'ai-marketing-expert' ) );
			fetchBots();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleDelete = async ( id ) => {
		try {
			await del( `/chatbot/bots/${ id }` );
			toast( __( 'Chatbot deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			fetchBots();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const filtered = search
		? bots.filter( ( b ) => b.name.toLowerCase().includes( search.toLowerCase() ) )
		: bots;
	const freeBotLimitReached = ! hasPro && bots.length >= 1;

	return (
		<div className="aime-bot-list">
			<div className="aime-page-header">
				<h2>{ __( 'Chatbots', 'ai-marketing-expert' ) } <span className="aime-count">({ bots.length })</span></h2>
				<div className="aime-page-header-actions">
					<Button variant="primary" onClick={ () => onNavigate( 'new-bot' ) } disabled={ freeBotLimitReached }>
						{ __( '+ New Chatbot', 'ai-marketing-expert' ) }
					</Button>
					{ freeBotLimitReached && <ProUpgradeButton /> }
				</div>
			</div>

			{ freeBotLimitReached && (
				<Notice type="info" message={ __( 'Free plan includes 1 chatbot. Upgrade to Pro for additional chatbots.', 'ai-marketing-expert' ) } />
			) }

			<Card>
				<div className="aime-table-toolbar">
					<SearchControl
						value={ search }
						onChange={ setSearch }
						placeholder={ __( 'Search chatbots...', 'ai-marketing-expert' ) }
						className="aime-search"
					/>
				</div>

				{ loading && ! bots.length ? (
					<Loader text={ __( 'Loading chatbots...', 'ai-marketing-expert' ) } />
				) : filtered.length === 0 ? (
					<p className="aime-empty-msg">
						{ bots.length === 0
							? __( 'No chatbots yet. Create your first one!', 'ai-marketing-expert' )
							: __( 'No chatbots match your search.', 'ai-marketing-expert' )
						}
					</p>
				) : (
					<table className="aime-table">
						<thead>
							<tr>
								<th>{ __( 'Name', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Conversations', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Active Now', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Created', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ filtered.map( ( bot ) => (
								<tr key={ bot.id }>
									<td
										className="aime-clickable-row"
										onClick={ () => onNavigate( 'edit-bot', { id: bot.id } ) }
									>
										<strong>{ bot.name }</strong>
									</td>
									<td>
										<span
											className="aime-status-badge"
										style={ { background: bot.status === 'active' ? '#4caf50' : '#9e9e9e' } }
									>
										{ bot.status === 'active' ? __( 'Active', 'ai-marketing-expert' ) : __( 'Inactive', 'ai-marketing-expert' ) }
										</span>
									</td>
									<td>{ bot.conversation_count || 0 }</td>
									<td>{ bot.active_count || 0 }</td>
									<td>{ bot.created_at?.split( ' ' )[ 0 ] }</td>
									<td>
										<div className="aime-row-actions">
											<Button
												icon={ edit }
												label={ __( 'Edit', 'ai-marketing-expert' ) }
												onClick={ () => onNavigate( 'edit-bot', { id: bot.id } ) }
												size="small"
											/>
											<Button
												icon={ seen }
												label={ bot.status === 'active' ? __( 'Deactivate', 'ai-marketing-expert' ) : __( 'Activate', 'ai-marketing-expert' ) }
												onClick={ () => handleToggleActive( bot ) }
												size="small"
											/>
											<Button
												icon={ copy }
												label={ hasPro ? __( 'Duplicate', 'ai-marketing-expert' ) : __( 'Duplicate (Pro)', 'ai-marketing-expert' ) }
												onClick={ hasPro ? () => handleDuplicate( bot.id ) : undefined }
												disabled={ ! hasPro }
												size="small"
											/>
											<Button
												icon={ trash }
												label={ __( 'Delete', 'ai-marketing-expert' ) }
												isDestructive
												onClick={ () => setConfirmDelete( bot.id ) }
												size="small"
											/>
										</div>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				) }
			</Card>

			{ confirmDelete && (
				<ConfirmModal
					title={ __( 'Delete Chatbot', 'ai-marketing-expert' ) }
					message={ __( 'Are you sure you want to delete this chatbot? All conversations, messages, and knowledge entries for this bot will be permanently removed.', 'ai-marketing-expert' ) }
					confirmLabel={ __( 'Delete', 'ai-marketing-expert' ) }
					isDestructive
					onConfirm={ () => handleDelete( confirmDelete ) }
					onCancel={ () => setConfirmDelete( null ) }
				/>
			) }
		</div>
	);
};

export default BotList;
