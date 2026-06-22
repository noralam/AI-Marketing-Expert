/**
 * ImportExport - CSV / WP Users / WooCommerce import, CSV export.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl, CheckboxControl, Spinner } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Notice from '../../common/Notice';
import CsvImportModal from '../../common/CsvImportModal';
import { isProActive, ProLabel } from '../../common/ProLock';

const SOURCE_OPTIONS = [
	{ label: __( 'CSV', 'ai-marketing-expert' ), value: 'csv' },
	{ label: __( 'WordPress Users', 'ai-marketing-expert' ), value: 'wp_users' },
	{ label: __( 'WooCommerce Customers', 'ai-marketing-expert' ), value: 'woocommerce' },
];

const IMPORT_STATUS_OPTIONS = [
	{ label: __( 'Subscribed', 'ai-marketing-expert' ), value: 'subscribed' },
	{ label: __( 'Unsubscribed', 'ai-marketing-expert' ), value: 'unsubscribed' },
	{ label: __( 'Pending', 'ai-marketing-expert' ), value: 'pending' },
	{ label: __( 'Bounced', 'ai-marketing-expert' ), value: 'bounced' },
	{ label: __( 'Complained', 'ai-marketing-expert' ), value: 'complained' },
];

const DEFAULT_VALIDATION = {
	skip_invalid_format: true,
	skip_disposable: true,
	skip_test_fake: true,
	skip_role_based: false,
	skip_spam_patterns: true,
	check_mx: false,
};

const SKIP_REASON_LABELS = {
	invalid_email: __( 'Invalid format', 'ai-marketing-expert' ),
	blocked_domain: __( 'Blocked/test domain', 'ai-marketing-expert' ),
	blocked_tld: __( 'Blocked test TLD', 'ai-marketing-expert' ),
	blocked_prefix: __( 'Fake/test address', 'ai-marketing-expert' ),
	disposable_email: __( 'Disposable/temp email', 'ai-marketing-expert' ),
	role_based_email: __( 'Role-based email', 'ai-marketing-expert' ),
	spam_pattern: __( 'Spam pattern', 'ai-marketing-expert' ),
	gmail_dot_variant: __( 'Gmail dot variant', 'ai-marketing-expert' ),
	no_mx_record: __( 'No mail server', 'ai-marketing-expert' ),
	duplicate: __( 'Duplicate', 'ai-marketing-expert' ),
	no_tld: __( 'No valid TLD', 'ai-marketing-expert' ),
};

const ImportExport = () => {
	const { post, get, loading, error, clearError } = useApi();
	const hasPro = isProActive();
	const [ source, setSource ] = useState( 'csv' );
	const [ doubleOptin, setDoubleOptin ] = useState( false );
	const [ result, setResult ] = useState( null );
	const [ showCsvModal, setShowCsvModal ] = useState( false );
	const [ showValidationModal, setShowValidationModal ] = useState( false );
	const [ lists, setLists ] = useState( [] );
	const [ tags, setTags ] = useState( [] );
	const [ validation, setValidation ] = useState( DEFAULT_VALIDATION );
	const [ selectedLists, setSelectedLists ] = useState( [] );
	const [ selectedTags, setSelectedTags ] = useState( [] );
	const [ updateExisting, setUpdateExisting ] = useState( false );
	const [ newStatus, setNewStatus ] = useState( 'subscribed' );

	const updateValidation = ( key, value ) => {
		if ( ! hasPro && [ 'skip_disposable', 'skip_role_based', 'skip_spam_patterns', 'check_mx' ].includes( key ) ) {
			return;
		}
		setValidation( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const validationForRequest = () => {
		if ( hasPro ) {
			return validation;
		}
		return { ...validation, skip_disposable: false, skip_role_based: false, skip_spam_patterns: false, check_mx: false };
	};

	const renderSkipReasons = () => {
		const reasons = Object.entries( result?.skip_reasons || {} ).filter( ( [ , count ] ) => count > 0 );
		if ( reasons.length === 0 ) return null;
		return (
			<div className="aime-import-skip-summary">
				<strong>{ __( 'Skipped breakdown:', 'ai-marketing-expert' ) }</strong>
				{ reasons.map( ( [ reason, count ] ) => (
					<span key={ reason }>{ SKIP_REASON_LABELS[ reason ] || reason }: { count }</span>
				) ) }
			</div>
		);
	};

	const fetchMeta = useCallback( async () => {
		try {
			const [ t, l ] = await Promise.all( [
				get( '/email/tags' ),
				get( '/email/lists' ),
			] );
			setTags( t || [] );
			setLists( l || [] );
		} catch ( e ) { /* */ }
	}, [ get ] );

	useEffect( () => { fetchMeta(); }, [ fetchMeta ] );

	const runImport = async () => {
		setResult( null );
		try {
			const payload = {
				source,
				double_optin: doubleOptin,
				validation: validationForRequest(),
				list_ids: selectedLists,
				tag_ids: selectedTags,
				update_existing: updateExisting,
				new_status: newStatus,
			};
			const res = await post( '/email/subscribers/import', payload );
			setShowValidationModal( false );
			setResult( res );
		} catch ( e ) { /* */ }
	};

	const handleImport = async () => {
		setResult( null );
		if ( source === 'csv' ) {
			setShowCsvModal( true );
			return;
		}
		setShowValidationModal( true );
	};

	const handleExport = async () => {
		if ( ! hasPro ) {
			return;
		}

		try {
			const res = await get( '/email/subscribers?per_page=99999' );
			const rows = ( res.items || [] ).map( ( s ) =>
				[ s.email, s.first_name, s.last_name, s.status ].join( ',' )
			);
			const csv = [ 'email,first_name,last_name,status', ...rows ].join( '\n' );
			const blob = new Blob( [ csv ], { type: 'text/csv' } );
			const url = URL.createObjectURL( blob );
			const a = document.createElement( 'a' );
			a.href = url;
			a.download = `subscribers-${ new Date().toISOString().slice( 0, 10 ) }.csv`;
			a.click();
			URL.revokeObjectURL( url );
		} catch ( e ) { /* */ }
	};

	return (
		<div className="aime-import-export">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ result && (
				<>
					<Notice type="success" message={
						`${ __( 'Import complete!', 'ai-marketing-expert' ) } ${ __( 'Imported:', 'ai-marketing-expert' ) } ${ result.imported || 0 }${ result.updated ? `, ${ __( 'Updated:', 'ai-marketing-expert' ) } ${ result.updated }` : '' }, ${ __( 'Skipped:', 'ai-marketing-expert' ) } ${ result.skipped || 0 }`
					} dismissible onDismiss={ () => setResult( null ) } />
					{ renderSkipReasons() }
				</>
			) }

			<div className="aime-import-export-grid">
				<Card title={ __( 'Import Contacts', 'ai-marketing-expert' ) }>
					<SelectControl label={ __( 'Source', 'ai-marketing-expert' ) } value={ source } options={ SOURCE_OPTIONS } onChange={ setSource } __nextHasNoMarginBottom />

					<div className="aime-import-validation-options">
						<label className="aime-premium-form-label">{ __( 'Validation & Cleanup', 'ai-marketing-expert' ) }</label>
						<CheckboxControl label={ __( 'Skip invalid email format', 'ai-marketing-expert' ) } checked={ validation.skip_invalid_format } onChange={ ( v ) => updateValidation( 'skip_invalid_format', v ) } />
						<CheckboxControl label={ <ProLabel>{ __( 'Skip disposable or temporary email', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && validation.skip_disposable } onChange={ ( v ) => updateValidation( 'skip_disposable', v ) } disabled={ ! hasPro } />
						<CheckboxControl label={ __( 'Skip test, fake, localhost, and placeholder emails', 'ai-marketing-expert' ) } checked={ validation.skip_test_fake } onChange={ ( v ) => updateValidation( 'skip_test_fake', v ) } />
						<CheckboxControl label={ <ProLabel>{ __( 'Skip role-based emails like info@, support@, admin@', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && validation.skip_role_based } onChange={ ( v ) => updateValidation( 'skip_role_based', v ) } disabled={ ! hasPro } />
						<CheckboxControl label={ <ProLabel>{ __( 'Skip suspicious spam-pattern emails', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && validation.skip_spam_patterns } onChange={ ( v ) => updateValidation( 'skip_spam_patterns', v ) } disabled={ ! hasPro } />
						<CheckboxControl label={ <ProLabel>{ __( 'Check MX records before import', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && validation.check_mx } onChange={ ( v ) => updateValidation( 'check_mx', v ) } disabled={ ! hasPro } />
					</div>

					{ source === 'wp_users' && (
						<p>{ __( 'All WordPress users will be imported as subscribers.', 'ai-marketing-expert' ) }</p>
					) }

					{ source === 'woocommerce' && (
						<p>{ __( 'All WooCommerce customers will be imported as subscribers.', 'ai-marketing-expert' ) }</p>
					) }

					{ source !== 'csv' && (
						<>
						<div className="aime-csv-options-grid">
							<div className="aime-csv-option">
								<label className="aime-premium-form-label">{ __( 'Lists', 'ai-marketing-expert' ) }</label>
								<div className="aime-toggle-buttons">
									{ lists.map( ( list ) => {
										const isSelected = selectedLists.includes( list.id );
										return <button key={ list.id } type="button" className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` } onClick={ () => setSelectedLists( isSelected ? selectedLists.filter( ( id ) => id !== list.id ) : [ ...selectedLists, list.id ] ) }>{ list.title }</button>;
									} ) }
									{ lists.length === 0 && <span className="aime-muted">{ __( 'No lists available.', 'ai-marketing-expert' ) }</span> }
								</div>
							</div>
							<div className="aime-csv-option">
								<label className="aime-premium-form-label">{ __( 'Tags', 'ai-marketing-expert' ) }</label>
								<div className="aime-toggle-buttons">
									{ tags.map( ( tag ) => {
										const isSelected = selectedTags.includes( tag.id );
										return <button key={ tag.id } type="button" className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` } onClick={ () => setSelectedTags( isSelected ? selectedTags.filter( ( id ) => id !== tag.id ) : [ ...selectedTags, tag.id ] ) }>{ tag.color && <span className="aime-toggle-btn-dot" style={ { background: tag.color } } /> }{ tag.title }</button>;
									} ) }
									{ tags.length === 0 && <span className="aime-muted">{ __( 'No tags available.', 'ai-marketing-expert' ) }</span> }
								</div>
							</div>
							<div className="aime-csv-option">
								<label className="aime-premium-form-label">{ __( 'Update Subscribers', 'ai-marketing-expert' ) }</label>
								<div className="aime-radio-group">
									<label className="aime-radio-label"><input type="radio" name="import_export_update_existing" checked={ updateExisting } onChange={ () => setUpdateExisting( true ) } /> <span>{ __( 'Yes', 'ai-marketing-expert' ) }</span></label>
									<label className="aime-radio-label"><input type="radio" name="import_export_update_existing" checked={ ! updateExisting } onChange={ () => setUpdateExisting( false ) } /> <span>{ __( 'No', 'ai-marketing-expert' ) }</span></label>
								</div>
							</div>
							<div className="aime-csv-option">
								<SelectControl label={ __( 'New Subscriber Status', 'ai-marketing-expert' ) } value={ newStatus } options={ IMPORT_STATUS_OPTIONS } onChange={ setNewStatus } __nextHasNoMarginBottom />
							</div>
						</div>
						</>
					) }

					{ source !== 'csv' && (
						<CheckboxControl
							label={ __( 'Send double opt-in confirmation', 'ai-marketing-expert' ) }
							checked={ doubleOptin }
							onChange={ setDoubleOptin }
						/>
					) }

					<Button variant="primary" onClick={ handleImport } isBusy={ loading } disabled={ loading } style={ { marginTop: 12 } }>
						{ loading
							? <><Spinner style={ { marginRight: 4 } } />{ __( 'Importing...', 'ai-marketing-expert' ) }</>
							: source === 'csv' ? __( 'Upload CSV & Import', 'ai-marketing-expert' ) : __( 'Import', 'ai-marketing-expert' )
						}
					</Button>
				</Card>

				<Card title={ <span className="aime-pro-card-header">{ __( 'Export Contacts', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span> }>
					<p>{ __( 'Download all subscribers as a CSV file.', 'ai-marketing-expert' ) }</p>
					<Button variant="secondary" onClick={ handleExport } isBusy={ loading && hasPro }>
						{ loading
							? <><Spinner style={ { marginRight: 4 } } />{ __( 'Exporting...', 'ai-marketing-expert' ) }</>
							: __( 'Download CSV', 'ai-marketing-expert' )
						}
					</Button>
				</Card>
			</div>

			{ showCsvModal && (
				<CsvImportModal
					lists={ lists }
					tags={ tags }
					validation={ validation }
					onValidationChange={ setValidation }
					hasPro={ hasPro }
					onClose={ () => setShowCsvModal( false ) }
					onImported={ ( res ) => {
						setShowCsvModal( false );
						setResult( res );
					} }
				/>
			) }

			{ showValidationModal && (
				<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) setShowValidationModal( false ); } }>
					<div className="aime-premium-modal" onClick={ ( e ) => e.stopPropagation() }>
						<div className="aime-premium-modal-header">
							<h3>{ __( 'Review Import Validation', 'ai-marketing-expert' ) }</h3>
							<button className="aime-premium-modal-close" onClick={ () => setShowValidationModal( false ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<p className="aime-muted" style={ { marginTop: 0 } }>
								{ source === 'wp_users'
									? __( 'WordPress users will be validated with these cleanup rules before they are imported as subscribers.', 'ai-marketing-expert' )
									: __( 'WooCommerce customers will be validated with these cleanup rules before they are imported as subscribers.', 'ai-marketing-expert' )
								}
							</p>
							<div className="aime-import-validation-options">
								<label className="aime-premium-form-label">{ __( 'Validation & Cleanup', 'ai-marketing-expert' ) }</label>
								<CheckboxControl label={ __( 'Skip invalid email format', 'ai-marketing-expert' ) } checked={ validation.skip_invalid_format } onChange={ ( v ) => updateValidation( 'skip_invalid_format', v ) } />
								<CheckboxControl label={ <ProLabel>{ __( 'Skip disposable or temporary email', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && validation.skip_disposable } onChange={ ( v ) => updateValidation( 'skip_disposable', v ) } disabled={ ! hasPro } />
								<CheckboxControl label={ __( 'Skip test, fake, localhost, and placeholder emails', 'ai-marketing-expert' ) } checked={ validation.skip_test_fake } onChange={ ( v ) => updateValidation( 'skip_test_fake', v ) } />
								<CheckboxControl label={ <ProLabel>{ __( 'Skip role-based emails like info@, support@, admin@', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && validation.skip_role_based } onChange={ ( v ) => updateValidation( 'skip_role_based', v ) } disabled={ ! hasPro } />
								<CheckboxControl label={ <ProLabel>{ __( 'Skip suspicious spam-pattern emails', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && validation.skip_spam_patterns } onChange={ ( v ) => updateValidation( 'skip_spam_patterns', v ) } disabled={ ! hasPro } />
								<CheckboxControl label={ <ProLabel>{ __( 'Check MX records before import', 'ai-marketing-expert' ) }</ProLabel> } checked={ hasPro && validation.check_mx } onChange={ ( v ) => updateValidation( 'check_mx', v ) } disabled={ ! hasPro } />
							</div>
							<div className="aime-csv-options-grid">
								<div className="aime-csv-option">
									<label className="aime-premium-form-label">{ __( 'Lists', 'ai-marketing-expert' ) }</label>
									<div className="aime-toggle-buttons">
										{ lists.map( ( list ) => {
											const isSelected = selectedLists.includes( list.id );
											return <button key={ list.id } type="button" className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` } onClick={ () => setSelectedLists( isSelected ? selectedLists.filter( ( id ) => id !== list.id ) : [ ...selectedLists, list.id ] ) }>{ list.title }</button>;
										} ) }
										{ lists.length === 0 && <span className="aime-muted">{ __( 'No lists available.', 'ai-marketing-expert' ) }</span> }
									</div>
								</div>
								<div className="aime-csv-option">
									<label className="aime-premium-form-label">{ __( 'Tags', 'ai-marketing-expert' ) }</label>
									<div className="aime-toggle-buttons">
										{ tags.map( ( tag ) => {
											const isSelected = selectedTags.includes( tag.id );
											return <button key={ tag.id } type="button" className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` } onClick={ () => setSelectedTags( isSelected ? selectedTags.filter( ( id ) => id !== tag.id ) : [ ...selectedTags, tag.id ] ) }>{ tag.color && <span className="aime-toggle-btn-dot" style={ { background: tag.color } } /> }{ tag.title }</button>;
										} ) }
										{ tags.length === 0 && <span className="aime-muted">{ __( 'No tags available.', 'ai-marketing-expert' ) }</span> }
									</div>
								</div>
								<div className="aime-csv-option">
									<label className="aime-premium-form-label">{ __( 'Update Subscribers', 'ai-marketing-expert' ) }</label>
									<div className="aime-radio-group">
										<label className="aime-radio-label"><input type="radio" name="review_update_existing" checked={ updateExisting } onChange={ () => setUpdateExisting( true ) } /> <span>{ __( 'Yes', 'ai-marketing-expert' ) }</span></label>
										<label className="aime-radio-label"><input type="radio" name="review_update_existing" checked={ ! updateExisting } onChange={ () => setUpdateExisting( false ) } /> <span>{ __( 'No', 'ai-marketing-expert' ) }</span></label>
									</div>
								</div>
								<div className="aime-csv-option">
									<SelectControl label={ __( 'New Subscriber Status', 'ai-marketing-expert' ) } value={ newStatus } options={ IMPORT_STATUS_OPTIONS } onChange={ setNewStatus } __nextHasNoMarginBottom />
								</div>
							</div>
							<CheckboxControl
								label={ __( 'Send double opt-in confirmation', 'ai-marketing-expert' ) }
								checked={ doubleOptin }
								onChange={ setDoubleOptin }
							/>
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => setShowValidationModal( false ) }>{ __( 'Cancel', 'ai-marketing-expert' ) }</button>
							<Button variant="primary" onClick={ runImport } isBusy={ loading } disabled={ loading }>
								{ loading ? __( 'Importing...', 'ai-marketing-expert' ) : __( 'Confirm Import', 'ai-marketing-expert' ) }
							</Button>
						</div>
					</div>
				</div>
			) }
		</div>
	);
};

export default ImportExport;
