/**
 * Accounts - manage connected social media accounts.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Icon } from '@aime/wp-components';
import { people, update, close, edit } from '@wordpress/icons';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import ConfirmModal from '../../common/ConfirmModal';
import Notice from '../../common/Notice';
import { ProUpgradeButton } from '../../common/ProLock';
import ConnectAccountModal from './ConnectAccountModal';
import { toast } from '../../common/Toast';
import { FREE_LIMITS } from '../../../utils/constants';

const platformColors = {
	facebook: '#1877F2',
	instagram: '#E4405F',
	x: '#000000',
};

const platformLabels = {
	facebook: 'Facebook',
	instagram: 'Instagram',
	x: 'X (Twitter)',
};

const Accounts = ( { onNavigate } ) => {
	const { get, post, del, loading } = useApi();
	const [ accounts, setAccounts ] = useState( [] );
	const [ showConnect, setShowConnect ] = useState( false );
	const [ editingAccount, setEditingAccount ] = useState( null );
	const [ confirmDisconnect, setConfirmDisconnect ] = useState( null );
	const [ refreshingId, setRefreshingId ] = useState( null );
	const [ testingId, setTestingId ] = useState( null );

	const fetchAccounts = useCallback( async () => {
		try {
			const res = await get( '/social/accounts' );
			setAccounts( res.items || res || [] );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	useEffect( () => {
		fetchAccounts();
	}, [ fetchAccounts ] );

	const handleDisconnect = async ( id ) => {
		try {
			await del( `/social/accounts/${ id }` );
			toast( __( 'Account disconnected.', 'ai-marketing-expert' ) );
			setConfirmDisconnect( null );
			fetchAccounts();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleRefresh = async ( id ) => {
		setRefreshingId( id );
		try {
			await post( `/social/accounts/${ id }/refresh` );
			toast( __( 'Token refreshed successfully.', 'ai-marketing-expert' ) );
			fetchAccounts();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setRefreshingId( null );
		}
	};

	const handleTest = async ( id ) => {
		setTestingId( id );
		try {
			const res = await post( `/social/accounts/${ id }/test` );
			toast( res.message || __( 'Account connection verified.', 'ai-marketing-expert' ) );
			fetchAccounts();
		} catch ( e ) {
			toast( e.message || __( 'Account connection test failed.', 'ai-marketing-expert' ), 'error' );
			fetchAccounts();
		} finally {
			setTestingId( null );
		}
	};

	const handleConnected = () => {
		setShowConnect( false );
		setEditingAccount( null );
		fetchAccounts();
	};

	if ( loading && ! accounts.length ) {
		return <Loader text={ __( 'Loading accounts...', 'ai-marketing-expert' ) } />;
	}

	const hasPro = window.aimeData?.hasPro;
	const limit = FREE_LIMITS.social_accounts || 2;
	const canAdd = hasPro || accounts.length < limit;
	const accountLimitReached = ! hasPro && accounts.length >= limit;

	return (
		<div className="aime-accounts-page">
			<div className="aime-section-header" style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } }>
				<div>
					<h2 style={ { margin: 0 } }>{ __( 'Connected Accounts', 'ai-marketing-expert' ) }</h2>
					{ ! hasPro && (
						<p style={ { margin: '4px 0 0', fontSize: 13, color: 'var(--aime-text-muted)' } }>
							{ `${ accounts.length }/${ limit } ${ __( 'accounts (Free plan)', 'ai-marketing-expert' ) }` }
						</p>
					) }
				</div>
				<Button
					variant="primary"
					onClick={ () => setShowConnect( true ) }
					disabled={ ! canAdd }
				>
					{ __( '+ Connect Account', 'ai-marketing-expert' ) }
				</Button>
			</div>

			{ accountLimitReached && (
				<Notice type="info" message={ __( 'Free plan includes 2 social accounts. Upgrade to Pro for unlimited accounts.', 'ai-marketing-expert' ) } />
			) }

			{ accounts.length === 0 ? (
				<Card>
					<div style={ { textAlign: 'center', padding: '60px 20px' } }>
						<Icon icon={ people } size={ 48 } style={ { opacity: 0.3 } } />
						<h3 style={ { marginTop: 16 } }>{ __( 'No accounts connected', 'ai-marketing-expert' ) }</h3>
						<p style={ { color: 'var(--aime-text-muted)' } }>
							{ __( 'Connect your Facebook, Instagram, or X account to start posting.', 'ai-marketing-expert' ) }
						</p>
						<Button variant="primary" onClick={ () => setShowConnect( true ) } disabled={ ! canAdd }>
							{ __( 'Connect Your First Account', 'ai-marketing-expert' ) }
						</Button>
					</div>
				</Card>
			) : (
				<div className="aime-accounts-grid" style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 } }>
					{ accounts.map( ( account ) => (
						<Card key={ account.id } className="aime-account-card">
							<div style={ { display: 'flex', alignItems: 'center', gap: 14 } }>
								{ account.avatar_url ? (
									<img
										src={ account.avatar_url }
										alt={ account.name }
										style={ { width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' } }
									/>
								) : (
									<div style={ {
										width: 48, height: 48, borderRadius: '50%',
										background: platformColors[ account.platform ] || '#999',
										display: 'flex', alignItems: 'center', justifyContent: 'center',
										color: '#fff', fontWeight: 700, fontSize: 18,
									} }>
										{ ( account.name || '?' ).charAt( 0 ).toUpperCase() }
									</div>
								) }
								<div style={ { flex: 1 } }>
									<div style={ { fontWeight: 600, fontSize: 15 } }>{ account.name }</div>
									<div style={ { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 } }>
										<span
											className={ `aime-platform-badge aime-platform-${ account.platform }` }
											style={ { background: platformColors[ account.platform ] || '#999', color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 } }
										>
											{ platformLabels[ account.platform ] || account.platform }
										</span>
										<span style={ {
											display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
										background: ( account.status === 'active' || account.status === 'connected' ) ? '#4caf50' : ( account.status === 'expired' ? '#f44336' : '#ff9800' ),
									} } />
									<span style={ { fontSize: 12, color: 'var(--aime-text-muted)' } }>
										{ ( account.status === 'active' || account.status === 'connected' ) ? __( 'connected', 'ai-marketing-expert' ) : account.status }
										</span>
									</div>
								</div>
							</div>

							{ account.token_expires_at && (
								<div style={ { fontSize: 12, color: 'var(--aime-text-muted)', marginTop: 10 } }>
									{ __( 'Token expires:', 'ai-marketing-expert' ) } { account.token_expires_at }
								</div>
							) }
							{ account.last_tested_at && (
								<div style={ { fontSize: 12, color: account.last_test_valid ? '#2E7D32' : '#C62828', marginTop: 10, lineHeight: 1.4 } }>
									<strong>{ account.last_test_valid ? __( 'Verified:', 'ai-marketing-expert' ) : __( 'Test failed:', 'ai-marketing-expert' ) }</strong>{ ' ' }
									{ account.last_test_message || __( 'No message returned.', 'ai-marketing-expert' ) }
									<div style={ { color: 'var(--aime-text-muted)' } }>{ account.last_tested_at }</div>
								</div>
							) }

							<div style={ { display: 'flex', gap: 8, marginTop: 14, borderTop: '1px solid var(--aime-border)', paddingTop: 12 } }>
								<Button
									variant="primary"
									size="compact"
									onClick={ () => handleTest( account.id ) }
									disabled={ testingId === account.id }
								>
									{ testingId === account.id
										? __( 'Testing...', 'ai-marketing-expert' )
										: __( 'Test', 'ai-marketing-expert' ) }
								</Button>
								<Button
									variant="secondary"
									size="compact"
									icon={ edit }
									onClick={ () => setEditingAccount( account ) }
								>
									{ __( 'Edit', 'ai-marketing-expert' ) }
								</Button>
								{ account.can_refresh && (
									<Button
										variant="secondary"
										size="compact"
										icon={ update }
										onClick={ () => handleRefresh( account.id ) }
										disabled={ refreshingId === account.id }
									>
										{ refreshingId === account.id
											? __( 'Refreshing...', 'ai-marketing-expert' )
											: __( 'Refresh', 'ai-marketing-expert' ) }
									</Button>
								)}
								<Button
									variant="tertiary"
									size="compact"
									isDestructive
									icon={ close }
									onClick={ () => setConfirmDisconnect( account ) }
								>
									{ __( 'Disconnect', 'ai-marketing-expert' ) }
								</Button>
							</div>
						</Card>
					) ) }
				</div>
			) }

			{ showConnect && (
				<ConnectAccountModal
					onClose={ () => setShowConnect( false ) }
					onConnected={ handleConnected }
				/>
			) }

			{ editingAccount && (
				<ConnectAccountModal
					account={ editingAccount }
					onClose={ () => setEditingAccount( null ) }
					onConnected={ handleConnected }
				/>
			) }

			{ confirmDisconnect && (
				<ConfirmModal
					title={ __( 'Disconnect Account', 'ai-marketing-expert' ) }
					message={ `${ __( 'Are you sure you want to disconnect', 'ai-marketing-expert' ) } "${ confirmDisconnect.name }"? ${ __( 'All associated posts will also be deleted.', 'ai-marketing-expert' ) }` }
					confirmLabel={ __( 'Disconnect', 'ai-marketing-expert' ) }
					isDestructive
					onConfirm={ () => handleDisconnect( confirmDisconnect.id ) }
					onCancel={ () => setConfirmDisconnect( null ) }
				/>
			) }
		</div>
	);
};

export default Accounts;
