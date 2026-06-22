/**
 * CsvImportModal — two-step CSV import with drag-and-drop upload + column mapping.
 *
 * Step 1: Choose delimiter, drag & drop (or click) to upload CSV.
 * Step 2: Map CSV headers to subscriber fields, assign lists/tags, set status, confirm import.
 */

import { useState, useRef, useCallback, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import useApi from '../../hooks/useApi';
import { ProLabel } from './ProLock';

const DELIMITER_OPTIONS = [
	{ label: __( 'Comma Separated (,)', 'ai-marketing-expert' ), value: ',' },
	{ label: __( 'Semicolon Separated (;)', 'ai-marketing-expert' ), value: ';' },
	{ label: __( 'Tab Separated', 'ai-marketing-expert' ), value: '\t' },
	{ label: __( 'Pipe Separated (|)', 'ai-marketing-expert' ), value: '|' },
];

const SUBSCRIBER_FIELDS = [
	{ label: __( 'Select', 'ai-marketing-expert' ), value: '' },
	{ label: __( 'Email', 'ai-marketing-expert' ), value: 'email' },
	{ label: __( 'First Name', 'ai-marketing-expert' ), value: 'first_name' },
	{ label: __( 'Last Name', 'ai-marketing-expert' ), value: 'last_name' },
	{ label: __( 'Phone', 'ai-marketing-expert' ), value: 'phone' },
	{ label: __( 'Address Line 1', 'ai-marketing-expert' ), value: 'address_line_1' },
	{ label: __( 'Address Line 2', 'ai-marketing-expert' ), value: 'address_line_2' },
	{ label: __( 'City', 'ai-marketing-expert' ), value: 'city' },
	{ label: __( 'State', 'ai-marketing-expert' ), value: 'state' },
	{ label: __( 'Postal Code', 'ai-marketing-expert' ), value: 'postal_code' },
	{ label: __( 'Country', 'ai-marketing-expert' ), value: 'country' },
	{ label: __( 'Date of Birth', 'ai-marketing-expert' ), value: 'date_of_birth' },
];

const STATUS_OPTIONS = [
	{ label: __( 'Subscribed', 'ai-marketing-expert' ), value: 'subscribed' },
	{ label: __( 'Pending', 'ai-marketing-expert' ), value: 'pending' },
	{ label: __( 'Unsubscribed', 'ai-marketing-expert' ), value: 'unsubscribed' },
];

/**
 * Smart-match a CSV header to a subscriber field.
 */
const autoMap = ( header ) => {
	const h = header.toLowerCase().replace( /[^a-z0-9]/g, '' );
	const map = {
		email: 'email', emailaddress: 'email', mail: 'email',
		firstname: 'first_name', first: 'first_name', fname: 'first_name', givenname: 'first_name',
		lastname: 'last_name', last: 'last_name', lname: 'last_name', surname: 'last_name', familyname: 'last_name',
		phone: 'phone', telephone: 'phone', mobile: 'phone', phonenumber: 'phone', cell: 'phone',
		address: 'address_line_1', addressline1: 'address_line_1', street: 'address_line_1',
		addressline2: 'address_line_2', address2: 'address_line_2',
		city: 'city', town: 'city',
		state: 'state', province: 'state', region: 'state',
		postalcode: 'postal_code', zip: 'postal_code', zipcode: 'postal_code', postcode: 'postal_code',
		country: 'country',
		dob: 'date_of_birth', dateofbirth: 'date_of_birth', birthday: 'date_of_birth', birthdate: 'date_of_birth',
	};
	return map[ h ] || '';
};

const CsvImportModal = ( { onClose, onImported, lists = [], tags = [], validation, onValidationChange, hasPro = !! window.aimeData?.hasPro } ) => {
	const { post, loading } = useApi();
	const fileRef = useRef( null );
	const [ step, setStep ] = useState( 1 );
	const [ delimiter, setDelimiter ] = useState( ',' );
	const [ fileName, setFileName ] = useState( '' );
	const [ rawCsv, setRawCsv ] = useState( '' );
	const [ headers, setHeaders ] = useState( [] );
	const [ rows, setRows ] = useState( [] );
	const [ mapping, setMapping ] = useState( {} ); // { headerIndex: subscriberField }
	const [ selectedLists, setSelectedLists ] = useState( [] );
	const [ selectedTags, setSelectedTags ] = useState( [] );
	const [ updateExisting, setUpdateExisting ] = useState( false );
	const [ newStatus, setNewStatus ] = useState( 'subscribed' );
	const [ dragging, setDragging ] = useState( false );
	const [ importError, setImportError ] = useState( '' );
	const validationOptions = validation || {
		skip_invalid_format: true,
		skip_disposable: true,
		skip_test_fake: true,
		skip_role_based: false,
		skip_spam_patterns: true,
		check_mx: false,
	};
	const updateValidation = ( key, value ) => {
		if ( ! hasPro && [ 'skip_disposable', 'skip_role_based', 'skip_spam_patterns', 'check_mx' ].includes( key ) ) {
			setImportError( __( 'Advanced import cleanup filters are available in Pro.', 'ai-marketing-expert' ) );
			return;
		}
		if ( onValidationChange ) {
			onValidationChange( { ...validationOptions, [ key ]: value } );
		}
	};
	const validationForRequest = hasPro ? validationOptions : { ...validationOptions, skip_disposable: false, skip_role_based: false, skip_spam_patterns: false, check_mx: false };

	const parseCsv = useCallback( ( text, delim ) => {
		const lines = text.split( /\r?\n/ ).filter( ( l ) => l.trim() );
		if ( lines.length < 1 ) return;
		const hdrs = lines[ 0 ].split( delim ).map( ( h ) => h.trim().replace( /^"|"$/g, '' ) );
		const dataRows = lines.slice( 1 ).map( ( line ) =>
			line.split( delim ).map( ( c ) => c.trim().replace( /^"|"$/g, '' ) )
		);
		setHeaders( hdrs );
		setRows( dataRows );
		// Auto-map headers.
		const m = {};
		hdrs.forEach( ( h, i ) => {
			const field = autoMap( h );
			if ( field ) m[ i ] = field;
		} );
		setMapping( m );
	}, [] );

	const handleFile = useCallback( ( file ) => {
		if ( ! file ) return;
		setFileName( file.name );
		const reader = new FileReader();
		reader.onload = ( e ) => {
			const text = e.target.result;
			setRawCsv( text );
			parseCsv( text, delimiter );
		};
		reader.readAsText( file );
	}, [ delimiter, parseCsv ] );

	/* Re-parse when delimiter changes and we already have raw data. */
	useEffect( () => {
		if ( rawCsv ) parseCsv( rawCsv, delimiter );
	}, [ delimiter, rawCsv, parseCsv ] );

	const handleDrop = ( e ) => {
		e.preventDefault();
		setDragging( false );
		const file = e.dataTransfer.files?.[ 0 ];
		handleFile( file );
	};

	const handleDragOver = ( e ) => {
		e.preventDefault();
		setDragging( true );
	};

	const goToMapping = () => {
		if ( ! headers.length ) return;
		setStep( 2 );
	};

	const handleConfirmImport = async () => {
		setImportError( '' );
		// Validate email column is mapped.
		const emailMapped = Object.values( mapping ).includes( 'email' );
		if ( ! emailMapped ) {
			setImportError( __( 'You must map the Email field.', 'ai-marketing-expert' ) );
			return;
		}

		// Build contacts array from mapping.
		const contacts = rows.map( ( row ) => {
			const obj = {};
			Object.entries( mapping ).forEach( ( [ idx, field ] ) => {
				if ( field && row[ idx ] !== undefined ) {
					obj[ field ] = row[ idx ];
				}
			} );
			return obj;
		} ).filter( ( c ) => c.email );

		try {
			const res = await post( '/email/subscribers/import', {
				source: 'csv',
				contacts,
				list_ids: selectedLists,
				tag_ids: selectedTags,
				update_existing: updateExisting,
				new_status: newStatus,
				validation: validationForRequest,
			} );
			if ( onImported ) onImported( res );
		} catch ( e ) {
			setImportError( e.message || __( 'Import failed.', 'ai-marketing-expert' ) );
		}
	};

	const updateMapping = ( headerIdx, field ) => {
		setMapping( ( prev ) => ( { ...prev, [ headerIdx ]: field } ) );
	};

	const downloadSample = () => {
		const csv = 'email,first_name,last_name,phone\njohn@example.com,John,Doe,+1555000111\njane@example.com,Jane,Smith,+1555000222';
		const blob = new Blob( [ csv ], { type: 'text/csv' } );
		const url = URL.createObjectURL( blob );
		const a = document.createElement( 'a' );
		a.href = url;
		a.download = 'sample-import.csv';
		a.click();
		URL.revokeObjectURL( url );
	};

	return (
		<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) onClose(); } }>
			<div className="aime-premium-modal aime-csv-import-modal" onClick={ ( e ) => e.stopPropagation() }>
				{ /* Header */ }
				<div className="aime-premium-modal-header">
					<h3>
						<span className="aime-premium-modal-icon" style={ { background: 'var(--aime-gradient)' } }>
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						</span>
						{ __( 'Import Contacts', 'ai-marketing-expert' ) }
					</h3>
					<button className="aime-premium-modal-close" onClick={ onClose }>&times;</button>
				</div>

				{ /* Step 1 — Upload */ }
				{ step === 1 && (
					<>
						<div className="aime-premium-modal-body">
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Select Your CSV Delimiter', 'ai-marketing-expert' ) }</label>
								<select className="aime-premium-select" value={ delimiter } onChange={ ( e ) => setDelimiter( e.target.value ) }>
									{ DELIMITER_OPTIONS.map( ( o ) => <option key={ o.value } value={ o.value }>{ o.label }</option> ) }
								</select>
							</div>

							<h4 style={ { margin: '16px 0 8px' } }>{ __( 'Upload CSV', 'ai-marketing-expert' ) }</h4>

							<div
								className={ `aime-dropzone${ dragging ? ' is-dragging' : '' }${ fileName ? ' has-file' : '' }` }
								onDrop={ handleDrop }
								onDragOver={ handleDragOver }
								onDragLeave={ () => setDragging( false ) }
								onClick={ () => fileRef.current?.click() }
							>
								<input
									ref={ fileRef }
									type="file"
									accept=".csv,text/csv"
									style={ { display: 'none' } }
									onChange={ ( e ) => handleFile( e.target.files?.[ 0 ] ) }
								/>
								{ fileName ? (
									<div className="aime-dropzone-file">
										<span className="dashicons dashicons-media-spreadsheet" />
										<span>{ fileName }</span>
										<button type="button" className="aime-dropzone-remove" onClick={ ( e ) => {
											e.stopPropagation();
											setFileName( '' );
											setRawCsv( '' );
											setHeaders( [] );
											setRows( [] );
											setMapping( {} );
										} }>&times;</button>
									</div>
								) : (
									<>
										<svg className="aime-dropzone-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
											<path d="M24 32V16m0 0l-6 6m6-6l6 6" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
											<path d="M8 32v4a4 4 0 004 4h24a4 4 0 004-4v-4" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
										<p>{ __( 'Drop file here or', 'ai-marketing-expert' ) } <span className="aime-dropzone-link">{ __( 'click to upload', 'ai-marketing-expert' ) }</span></p>
									</>
								) }
							</div>

							<button type="button" className="aime-link-btn aime-mt-8" onClick={ downloadSample }>
								{ __( 'Download sample file', 'ai-marketing-expert' ) }
							</button>

							<p className="aime-muted aime-mt-4">
								{ __( 'Please make sure your CSV file has unique headers. Otherwise, it may fail to import.', 'ai-marketing-expert' ) }
							</p>
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ onClose }>{ __( 'Cancel', 'ai-marketing-expert' ) }</button>
							<button className="aime-btn-primary" disabled={ ! headers.length } onClick={ goToMapping }>
								{ __( 'Next [Map Columns]', 'ai-marketing-expert' ) }
							</button>
						</div>
					</>
				) }

				{ /* Step 2 — Mapping */ }
				{ step === 2 && (
					<>
						<div className="aime-premium-modal-body">
							<div className="aime-csv-mapping-head">
								<h4>{ __( 'Map CSV Fields with Contact Property', 'ai-marketing-expert' ) }</h4>
								<span className="aime-muted">{ rows.length } { __( 'rows found', 'ai-marketing-expert' ) }</span>
							</div>

							{ importError && <div className="aime-notice-error" style={ { marginBottom: 12 } }>{ importError }</div> }

							<div className="aime-csv-mapping-table">
								<div className="aime-csv-mapping-row aime-csv-mapping-header">
									<span>{ __( 'CSV Headers', 'ai-marketing-expert' ) }</span>
									<span>{ __( 'Subscriber Fields', 'ai-marketing-expert' ) }</span>
								</div>
								{ headers.map( ( hdr, idx ) => (
									<div key={ idx } className="aime-csv-mapping-row">
										<div className="aime-csv-mapping-cell">
											<input type="text" className="aime-premium-input" value={ hdr } readOnly />
										</div>
										<div className="aime-csv-mapping-cell">
											<select
												className="aime-premium-select"
												value={ mapping[ idx ] || '' }
												onChange={ ( e ) => updateMapping( idx, e.target.value ) }
											>
												{ SUBSCRIBER_FIELDS.map( ( f ) => (
													<option key={ f.value } value={ f.value }>{ f.label }</option>
												) ) }
											</select>
										</div>
									</div>
								) ) }
							</div>

							<div className="aime-csv-assign-section">
								{ lists.length > 0 && (
									<div className="aime-csv-assign-col">
										<label className="aime-premium-form-label">{ __( 'Lists', 'ai-marketing-expert' ) }</label>
										<div className="aime-toggle-buttons">
											{ lists.map( ( l ) => {
												const sel = selectedLists.includes( l.id );
												return (
													<button key={ l.id } type="button" className={ `aime-toggle-btn${ sel ? ' is-selected' : '' }` } onClick={ () => setSelectedLists( sel ? selectedLists.filter( ( x ) => x !== l.id ) : [ ...selectedLists, l.id ] ) }>
														{ l.title }
													</button>
												);
											} ) }
										</div>
									</div>
								) }
								{ tags.length > 0 && (
									<div className="aime-csv-assign-col">
										<label className="aime-premium-form-label">{ __( 'Tags', 'ai-marketing-expert' ) }</label>
										<div className="aime-toggle-buttons">
											{ tags.map( ( t ) => {
												const sel = selectedTags.includes( t.id );
												return (
													<button key={ t.id } type="button" className={ `aime-toggle-btn${ sel ? ' is-selected' : '' }` } onClick={ () => setSelectedTags( sel ? selectedTags.filter( ( x ) => x !== t.id ) : [ ...selectedTags, t.id ] ) } style={ t.color ? { '--tag-color': t.color } : {} }>
														{ t.color && <span className="aime-toggle-btn-dot" style={ { background: t.color } } /> }
														{ t.title }
													</button>
												);
											} ) }
										</div>
									</div>
								) }
							</div>

							<div className="aime-csv-options-row">
								<div className="aime-csv-option">
									<label className="aime-premium-form-label">{ __( 'Update Subscribers', 'ai-marketing-expert' ) }</label>
									<div className="aime-radio-group">
										<label className="aime-radio-label">
											<input type="radio" name="update_existing" checked={ updateExisting } onChange={ () => setUpdateExisting( true ) } />
											<span>{ __( 'Yes', 'ai-marketing-expert' ) }</span>
										</label>
										<label className="aime-radio-label">
											<input type="radio" name="update_existing" checked={ ! updateExisting } onChange={ () => setUpdateExisting( false ) } />
											<span>{ __( 'No', 'ai-marketing-expert' ) }</span>
										</label>
									</div>
								</div>
								<div className="aime-csv-option">
									<label className="aime-premium-form-label">{ __( 'New Subscriber Status', 'ai-marketing-expert' ) }</label>
									<select className="aime-premium-select" value={ newStatus } onChange={ ( e ) => setNewStatus( e.target.value ) }>
										{ STATUS_OPTIONS.map( ( o ) => <option key={ o.value } value={ o.value }>{ o.label }</option> ) }
									</select>
								</div>
							</div>

							<div className="aime-import-validation-options">
								<label className="aime-premium-form-label">{ __( 'Validation & Cleanup', 'ai-marketing-expert' ) }</label>
								<label className="aime-checkbox-label"><input type="checkbox" checked={ validationOptions.skip_invalid_format } onChange={ ( e ) => updateValidation( 'skip_invalid_format', e.target.checked ) } /> <span>{ __( 'Skip invalid email format', 'ai-marketing-expert' ) }</span></label>
								<label className="aime-checkbox-label"><input type="checkbox" checked={ hasPro && validationOptions.skip_disposable } disabled={ ! hasPro } onChange={ ( e ) => updateValidation( 'skip_disposable', e.target.checked ) } /> { hasPro ? <span>{ __( 'Skip disposable or temporary email', 'ai-marketing-expert' ) }</span> : <ProLabel>{ __( 'Skip disposable or temporary email', 'ai-marketing-expert' ) }</ProLabel> }</label>
								<label className="aime-checkbox-label"><input type="checkbox" checked={ validationOptions.skip_test_fake } onChange={ ( e ) => updateValidation( 'skip_test_fake', e.target.checked ) } /> <span>{ __( 'Skip test, fake, localhost, and placeholder emails', 'ai-marketing-expert' ) }</span></label>
								<label className="aime-checkbox-label"><input type="checkbox" checked={ hasPro && validationOptions.skip_role_based } disabled={ ! hasPro } onChange={ ( e ) => updateValidation( 'skip_role_based', e.target.checked ) } /> { hasPro ? <span>{ __( 'Skip role-based emails like info@, support@, admin@', 'ai-marketing-expert' ) }</span> : <ProLabel>{ __( 'Skip role-based emails like info@, support@, admin@', 'ai-marketing-expert' ) }</ProLabel> }</label>
								<label className="aime-checkbox-label"><input type="checkbox" checked={ hasPro && validationOptions.skip_spam_patterns } disabled={ ! hasPro } onChange={ ( e ) => updateValidation( 'skip_spam_patterns', e.target.checked ) } /> { hasPro ? <span>{ __( 'Skip suspicious spam-pattern emails', 'ai-marketing-expert' ) }</span> : <ProLabel>{ __( 'Skip suspicious spam-pattern emails', 'ai-marketing-expert' ) }</ProLabel> }</label>
								<label className="aime-checkbox-label"><input type="checkbox" checked={ hasPro && validationOptions.check_mx } disabled={ ! hasPro } onChange={ ( e ) => updateValidation( 'check_mx', e.target.checked ) } /> { hasPro ? <span>{ __( 'Check MX records before import', 'ai-marketing-expert' ) }</span> : <ProLabel>{ __( 'Check MX records before import', 'ai-marketing-expert' ) }</ProLabel> }</label>
							</div>
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-cancel" onClick={ () => setStep( 1 ) }>{ __( '← Back', 'ai-marketing-expert' ) }</button>
							<button className="aime-btn-primary" disabled={ loading } onClick={ handleConfirmImport }>
								{ loading ? __( 'Importing…', 'ai-marketing-expert' ) : __( 'Confirm Import', 'ai-marketing-expert' ) }
							</button>
						</div>
					</>
				) }
			</div>
		</div>
	);
};

export default CsvImportModal;
