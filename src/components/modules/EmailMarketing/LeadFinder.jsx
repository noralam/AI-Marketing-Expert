/**
 * B2B Lead Finder & Autopilot Pipeline — Discover verified prospects by industry, role, and location.
 * Pro-only feature wrapped with ProGate, 3-tier deduplication, and DNS MX deliverability verification.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	SelectControl,
	CheckboxControl,
	Spinner,
} from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import useSlowWarning from '../../../hooks/useSlowWarning';
import Card from '../../common/Card';
import Notice from '../../common/Notice';
import ProGate from '../../common/ProGate';
import ProBadge from '../../Layout/ProBadge';
import { isProActive } from '../../common/ProLock';

const INDUSTRY_PRESETS = [
	{ label: __( 'Select Industry...', 'ai-marketing-expert' ), value: '' },
	{ label: 'Technology & SaaS', value: 'Technology & SaaS' },
	{ label: 'E-commerce & Retail', value: 'E-commerce & Retail' },
	{ label: 'Marketing & Digital Agency', value: 'Marketing & Digital Agency' },
	{ label: 'Healthcare & Medical', value: 'Healthcare & Medical' },
	{ label: 'Financial Services & Fintech', value: 'Financial Services & Fintech' },
	{ label: 'Real Estate & Property', value: 'Real Estate & Property' },
	{ label: 'Professional Services & Consulting', value: 'Professional Services & Consulting' },
	{ label: 'Education & EdTech', value: 'Education & EdTech' },
	{ label: 'Manufacturing & Industrial', value: 'Manufacturing & Industrial' },
	{ label: 'Hospitality & Tourism', value: 'Hospitality & Tourism' },
];

const ROLE_PRESETS = [
	{ label: __( 'Select Role / Title...', 'ai-marketing-expert' ), value: '' },
	{ label: 'Founder / CEO / Co-Founder', value: 'Founder / CEO' },
	{ label: 'Chief Marketing Officer (CMO) / VP Marketing', value: 'CMO / VP Marketing' },
	{ label: 'Chief Technology Officer (CTO) / VP Engineering', value: 'CTO / VP Engineering' },
	{ label: 'Chief Operating Officer (COO) / Operations Director', value: 'COO / Operations Director' },
	{ label: 'VP of Sales / Head of Sales / CRO', value: 'Head of Sales / VP Sales' },
	{ label: 'E-commerce Director / Store Manager', value: 'E-commerce Director' },
	{ label: 'Human Resources / Talent Director', value: 'HR Director' },
	{ label: 'Product Manager / Head of Product', value: 'Head of Product' },
];

const LOCATION_PRESETS = [
	{ label: __( 'Worldwide / Any Location', 'ai-marketing-expert' ), value: '' },
	{ label: 'United States', value: 'United States' },
	{ label: 'United Kingdom', value: 'United Kingdom' },
	{ label: 'Canada', value: 'Canada' },
	{ label: 'Australia', value: 'Australia' },
	{ label: 'Germany', value: 'Germany' },
	{ label: 'France', value: 'France' },
	{ label: 'European Union', value: 'European Union' },
	{ label: 'India', value: 'India' },
	{ label: 'Singapore', value: 'Singapore' },
];

const COMPANY_SIZE_PRESETS = [
	{ label: __( 'Any Company Size', 'ai-marketing-expert' ), value: '' },
	{ label: '1 - 10 (Startup / Micro)', value: '1-10 employees' },
	{ label: '11 - 50 (Small Business)', value: '11-50 employees' },
	{ label: '51 - 200 (Mid-Market)', value: '51-200 employees' },
	{ label: '201 - 1,000 (Large)', value: '201-1000 employees' },
	{ label: '1,000+ (Enterprise)', value: '1000+ employees' },
];

/**
 * Deliverability Risk Guidance Card
 */
const DeliverabilityWarning = ( { count } ) => {
	const num = parseInt( count, 10 ) || 0;

	if ( num <= 50 ) {
		return (
			<div
				style={ {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					borderRadius: '8px',
					padding: '12px 16px',
					marginTop: '12px',
					display: 'flex',
					alignItems: 'flex-start',
					gap: '10px',
					fontSize: '13px',
					color: '#166534',
				} }
			>
				<span style={ { fontSize: '18px' } }>🟢</span>
				<div>
					<strong>{ __( 'Safe & Recommended (Cold Outreach Best Practice)', 'ai-marketing-expert' ) }</strong>
					<p style={ { margin: '2px 0 0', opacity: 0.9 } }>
						{ __( 'Ideal volume for new sending domains or single SMTP connections. Keeps spam rates strictly below 0.1% and maintains high inbox deliverability.', 'ai-marketing-expert' ) }
					</p>
				</div>
			</div>
		);
	}

	if ( num <= 100 ) {
		return (
			<div
				style={ {
					background: '#eff6ff',
					border: '1px solid #bfdbfe',
					borderRadius: '8px',
					padding: '12px 16px',
					marginTop: '12px',
					display: 'flex',
					alignItems: 'flex-start',
					gap: '10px',
					fontSize: '13px',
					color: '#1e40af',
				} }
			>
				<span style={ { fontSize: '18px' } }>🔵</span>
				<div>
					<strong>{ __( 'Optimal Growth Volume', 'ai-marketing-expert' ) }</strong>
					<p style={ { margin: '2px 0 0', opacity: 0.9 } }>
						{ __( 'Great for established domains with warm-up history. Ensure your DNS records (SPF, DKIM, DMARC) are 100% verified before sending.', 'ai-marketing-expert' ) }
					</p>
				</div>
			</div>
		);
	}

	if ( num <= 250 ) {
		return (
			<div
				style={ {
					background: '#fffbeb',
					border: '1px solid #fde68a',
					borderRadius: '8px',
					padding: '12px 16px',
					marginTop: '12px',
					display: 'flex',
					alignItems: 'flex-start',
					gap: '10px',
					fontSize: '13px',
					color: '#92400e',
				} }
			>
				<span style={ { fontSize: '18px' } }>🟡</span>
				<div>
					<strong>{ __( 'High Volume Caution', 'ai-marketing-expert' ) }</strong>
					<p style={ { margin: '2px 0 0', opacity: 0.9 } }>
						{ __( 'Sending over 100 cold emails daily from a single domain increases spam filter exposure. We recommend enabling SMTP Rotation (available in SMTP Settings) or Amazon SES to avoid spam traps.', 'ai-marketing-expert' ) }
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			style={ {
				background: '#fef2f2',
				border: '1px solid #fecaca',
				borderRadius: '8px',
				padding: '12px 16px',
				marginTop: '12px',
				display: 'flex',
				alignItems: 'flex-start',
				gap: '10px',
				fontSize: '13px',
				color: '#991b1b',
			} }
		>
			<span style={ { fontSize: '18px' } }>🔴</span>
			<div>
				<strong>{ __( 'Critical Deliverability & Account Suspension Risk', 'ai-marketing-expert' ) }</strong>
				<p style={ { margin: '2px 0 0', opacity: 0.9 } }>
					{ __( '⚠️ High Cold Volume Warning: Blasting 250+ cold emails/day from one domain frequently leads to ISP throttling, high bounce rates, or ESP account suspension (even on Amazon SES). Use multiple sending domains and distribute volume across several SMTP connections.', 'ai-marketing-expert' ) }
				</p>
			</div>
		</div>
	);
};

const LeadFinder = ( { onNavigate } ) => {
	const hasPro = isProActive();
	const { get, post, error, clearError } = useApi();
	const slowWarning = useSlowWarning();

	// Active tab: 'autopilot' | 'instant'
	const [ activeTab, setActiveTab ] = useState( 'autopilot' );

	// Shared State
	const [ lists, setLists ] = useState( [] );
	const [ notice, setNotice ] = useState( null );

	// Tab 1: Instant Search State
	const [ industry, setIndustry ] = useState( '' );
	const [ customIndustry, setCustomIndustry ] = useState( '' );
	const [ role, setRole ] = useState( '' );
	const [ customRole, setCustomRole ] = useState( '' );
	const [ location, setLocation ] = useState( '' );
	const [ customLocation, setCustomLocation ] = useState( '' );
	const [ companySize, setCompanySize ] = useState( '' );
	const [ keyword, setKeyword ] = useState( '' );
	const [ instantVolumePreset, setInstantVolumePreset ] = useState( '25' );
	const [ instantCustomVolume, setInstantCustomVolume ] = useState( '25' );

	const [ leads, setLeads ] = useState( [] );
	const [ selectedIndices, setSelectedIndices ] = useState( [] );
	const [ isSearching, setIsSearching ] = useState( false );
	const [ targetListId, setTargetListId ] = useState( '' );
	const [ targetTags, setTargetTags ] = useState( 'B2B Lead' );
	const [ isImporting, setIsImporting ] = useState( false );

	// Tab 2: Autopilot State
	const [ apEnabled, setApEnabled ] = useState( false );
	const [ apMode, setApMode ] = useState( 'filters' ); // 'filters' | 'prompt'
	const [ apIndustry, setApIndustry ] = useState( '' );
	const [ apRole, setApRole ] = useState( '' );
	const [ apLocation, setApLocation ] = useState( '' );
	const [ apCompanySize, setApCompanySize ] = useState( '' );
	const [ apKeyword, setApKeyword ] = useState( '' );
	const [ apPrompt, setApPrompt ] = useState( '' );
	const [ apVolumePreset, setApVolumePreset ] = useState( '25' );
	const [ apCustomVolume, setApCustomVolume ] = useState( '25' );
	const [ apTargetListId, setApTargetListId ] = useState( '' );
	const [ apTags, setApTags ] = useState( 'AI-Autopilot' );

	const [ apLastRun, setApLastRun ] = useState( null );
	const [ apLastResult, setApLastResult ] = useState( null );
	const [ apStats, setApStats ] = useState( { imported: 0, skipped_dup: 0, skipped_mx: 0 } );
	const [ isSavingAp, setIsSavingAp ] = useState( false );
	const [ isRunningAp, setIsRunningAp ] = useState( false );

	// Effective Volume calculation
	const activeInstantLimit = instantVolumePreset === 'custom'
		? Math.max( 5, parseInt( instantCustomVolume, 10 ) || 25 )
		: parseInt( instantVolumePreset, 10 ) || 25;

	const activeApDailyTarget = apVolumePreset === 'custom'
		? Math.max( 5, parseInt( apCustomVolume, 10 ) || 25 )
		: parseInt( apVolumePreset, 10 ) || 25;

	// Fetch lists
	const fetchLists = useCallback( async () => {
		try {
			const res = await get( '/email/lists' );
			const items = res?.data || res || [];
			const arr = Array.isArray( items ) ? items : [];
			setLists( arr );
			if ( arr.length > 0 ) {
				if ( ! targetListId ) setTargetListId( String( arr[ 0 ].id ) );
				if ( ! apTargetListId ) setApTargetListId( String( arr[ 0 ].id ) );
			}
		} catch ( e ) { /* */ }
	}, [ get, targetListId, apTargetListId ] );

	// Fetch Autopilot Config
	const fetchAutopilotConfig = useCallback( async () => {
		try {
			const res = await get( '/email/leads/autopilot' );
			if ( res ) {
				setApEnabled( !! res.enabled );
				setApMode( res.mode || 'filters' );
				setApIndustry( res.industry || '' );
				setApRole( res.role || '' );
				setApLocation( res.location || '' );
				setApCompanySize( res.company_size || '' );
				setApKeyword( res.keyword || '' );
				setApPrompt( res.prompt || '' );
				if ( res.target_list_id ) setApTargetListId( String( res.target_list_id ) );
				if ( res.tag_names ) {
					setApTags( Array.isArray( res.tag_names ) ? res.tag_names.join( ', ' ) : String( res.tag_names ) );
				}

				const target = res.daily_target || 25;
				if ( [ 25, 50, 100 ].includes( target ) ) {
					setApVolumePreset( String( target ) );
				} else {
					setApVolumePreset( 'custom' );
					setApCustomVolume( String( target ) );
				}

				setApLastRun( res.last_run );
				setApLastResult( res.last_result );
				setApStats( {
					imported: res.total_imported || 0,
					skipped_dup: res.total_skipped_dup || 0,
					skipped_mx: res.total_skipped_mx || 0,
				} );
			}
		} catch ( e ) { /* */ }
	}, [ get ] );

	useEffect( () => {
		if ( hasPro ) {
			fetchLists();
			fetchAutopilotConfig();
		}
	}, [ hasPro, fetchLists, fetchAutopilotConfig ] );

	if ( ! hasPro ) {
		return (
			<div className="aime-lead-finder-page">
				<ProGate
					feature={ __( 'B2B Lead Finder & Autopilot Pipeline', 'ai-marketing-expert' ) }
					description={ __(
						'Discover verified B2B prospective clients, run autonomous daily prospecting, verify DNS/MX deliverability in real-time, and trigger cold email automation sequences on autopilot.',
						'ai-marketing-expert'
					) }
				/>
			</div>
		);
	}

	// Tab 1: Instant Search Handler
	const handleSearch = async ( e ) => {
		if ( e ) e.preventDefault();
		clearError();
		setNotice( null );

		const activeIndustry = customIndustry.trim() || industry;
		const activeRole = customRole.trim() || role;
		const activeLocation = customLocation.trim() || location;

		if ( ! activeIndustry && ! activeRole && ! keyword ) {
			setNotice( {
				type: 'error',
				message: __( 'Please select or enter at least an Industry, Job Role, or Keyword.', 'ai-marketing-expert' ),
			} );
			return;
		}

		setIsSearching( true );
		slowWarning.start();

		try {
			const res = await get( '/email/leads/search', {
				industry: activeIndustry,
				role: activeRole,
				location: activeLocation,
				company_size: companySize,
				keyword,
				limit: activeInstantLimit,
			} );

			const items = res?.items || [];
			setLeads( items );
			const initialSelect = [];
			items.forEach( ( item, idx ) => {
				if ( ! item.is_in_crm && item.mx_verified ) {
					initialSelect.push( idx );
				}
			} );
			setSelectedIndices( initialSelect );

			if ( items.length === 0 ) {
				setNotice( {
					type: 'warning',
					message: __( 'No leads found matching your criteria. Try broadening your role, industry, or location filters.', 'ai-marketing-expert' ),
				} );
			} else {
				setNotice( {
					type: 'success',
					message: sprintf( __( 'Found %d B2B prospects! Review the list and select prospects to import.', 'ai-marketing-expert' ), items.length ),
				} );
			}
		} catch ( err ) {
			setNotice( {
				type: 'error',
				message: err.message || __( 'Failed to search leads. Please try again.', 'ai-marketing-expert' ),
			} );
		} finally {
			slowWarning.stop();
			setIsSearching( false );
		}
	};

	const toggleSelectAll = () => {
		if ( selectedIndices.length === leads.length ) {
			setSelectedIndices( [] );
		} else {
			setSelectedIndices( leads.map( ( _, idx ) => idx ) );
		}
	};

	const toggleSelectOne = ( index ) => {
		setSelectedIndices( ( prev ) =>
			prev.includes( index ) ? prev.filter( ( i ) => i !== index ) : [ ...prev, index ]
		);
	};

	const handleImport = async () => {
		if ( selectedIndices.length === 0 ) {
			setNotice( {
				type: 'warning',
				message: __( 'Please select at least one lead to import.', 'ai-marketing-expert' ),
			} );
			return;
		}

		const selectedLeads = selectedIndices.map( ( idx ) => leads[ idx ] );
		const tagNames = targetTags.split( ',' ).map( ( t ) => t.trim() ).filter( Boolean );

		setIsImporting( true );
		try {
			const res = await post( '/email/leads/import', {
				leads: selectedLeads,
				list_id: parseInt( targetListId, 10 ) || 0,
				tag_names: tagNames,
			} );

			setNotice( {
				type: 'success',
				message: sprintf(
					__( 'Import successful! %1$d new contacts added, %2$d updated in CRM.', 'ai-marketing-expert' ),
					res?.imported || 0,
					res?.updated || 0
				),
			} );

			setLeads( ( prev ) =>
				prev.map( ( lead, idx ) =>
					selectedIndices.includes( idx ) ? { ...lead, is_in_crm: true } : lead
				)
			);
			setSelectedIndices( [] );
		} catch ( err ) {
			setNotice( {
				type: 'error',
				message: err.message || __( 'Failed to import leads.', 'ai-marketing-expert' ),
			} );
		} finally {
			setIsImporting( false );
		}
	};

	// Tab 2: Save Autopilot Configuration
	const handleSaveAutopilot = async () => {
		setIsSavingAp( true );
		setNotice( null );
		try {
			const res = await post( '/email/leads/autopilot', {
				enabled: apEnabled,
				mode: apMode,
				industry: apIndustry,
				role: apRole,
				location: apLocation,
				company_size: apCompanySize,
				keyword: apKeyword,
				prompt: apPrompt,
				daily_target: activeApDailyTarget,
				target_list_id: parseInt( apTargetListId, 10 ) || 0,
				tag_names: apTags,
			} );

			setNotice( {
				type: 'success',
				message: res?.message || __( 'Autopilot configuration saved successfully.', 'ai-marketing-expert' ),
			} );
			fetchAutopilotConfig();
		} catch ( err ) {
			setNotice( {
				type: 'error',
				message: err.message || __( 'Failed to save Autopilot settings.', 'ai-marketing-expert' ),
			} );
		} finally {
			setIsSavingAp( false );
		}
	};

	// Tab 2: Trigger Manual Test Run
	const handleRunAutopilotNow = async () => {
		const activeApIndustry = apIndustry;
		const activeApRole = apRole;
		const activeApLocation = apLocation;
		const activeApCompanySize = apCompanySize;
		const activeApKeyword = apKeyword;

		const hasFilters = activeApIndustry || activeApRole || activeApKeyword;
		const hasPrompt = apMode === 'prompt' && apPrompt.trim();

		if ( ! hasFilters && ! hasPrompt ) {
			setNotice( {
				type: 'error',
				message: __( 'Please select at least an Industry, Job Role, Keyword, or write an AI Prompt before running.', 'ai-marketing-expert' ),
			} );
			return;
		}

		setIsRunningAp( true );
		setNotice( null );
		slowWarning.start();
		try {
			const res = await post( '/email/leads/autopilot/run', {
				enabled: apEnabled,
				mode: apMode,
				industry: activeApIndustry,
				role: activeApRole,
				location: activeApLocation,
				company_size: activeApCompanySize,
				keyword: activeApKeyword,
				prompt: apPrompt,
				daily_target: activeApDailyTarget,
				target_list_id: parseInt( apTargetListId, 10 ) || 0,
				tag_names: apTags,
			} );
			setNotice( {
				type: 'success',
				message: res?.message || __( 'Autopilot run complete!', 'ai-marketing-expert' ),
			} );
			fetchAutopilotConfig();
		} catch ( err ) {
			setNotice( {
				type: 'error',
				message: err.message || __( 'Autopilot test run failed.', 'ai-marketing-expert' ),
			} );
		} finally {
			slowWarning.stop();
			setIsRunningAp( false );
		}
	};

	return (
		<div className="aime-lead-finder-page">
			{ /* Header */ }
			<div className="aime-page-header">
				<div>
					<h2 style={ { display: 'flex', alignItems: 'center', gap: '8px' } }>
						{ __( 'B2B Lead Finder & Autopilot Pipeline', 'ai-marketing-expert' ) }
						{ ! hasPro && <ProBadge /> }
					</h2>
					<p className="aime-page-subtitle" style={ { margin: '4px 0 0', color: 'var(--aime-muted, #64748b)' } }>
						{ __( 'Autonomous B2B prospect discovery with real-time MX deliverability verification, 3-tier CRM deduplication, and cold outreach funnel enrollment.', 'ai-marketing-expert' ) }
					</p>
				</div>
				{ onNavigate && (
					<div className="aime-page-header-actions">
						<Button
							variant="secondary"
							onClick={ () => onNavigate( 'subscribers' ) }
							style={ { display: 'inline-flex', alignItems: 'center', gap: '6px' } }
						>
							<span className="dashicons dashicons-arrow-left-alt" style={ { fontSize: '16px', width: '16px', height: '16px', lineHeight: '1' } } />
							<span>{ __( 'Back to Contacts', 'ai-marketing-expert' ) }</span>
						</Button>
					</div>
				) }
			</div>

			{ notice && (
				<Notice
					type={ notice.type }
					message={ notice.message }
					onDismiss={ () => setNotice( null ) }
				/>
			) }
			{ error && (
				<Notice
					type="error"
					message={ error }
					onDismiss={ clearError }
				/>
			) }

			{ /* Mode Tabs: Autopilot First, Instant Search Second */ }
			<div
				style={ {
					display: 'flex',
					gap: '8px',
					borderBottom: '1px solid var(--aime-border-color, #e2e8f0)',
					marginBottom: '20px',
				} }
			>
				<button
					type="button"
					className={ `aime-tab-btn ${ activeTab === 'autopilot' ? 'is-active' : '' }` }
					onClick={ () => setActiveTab( 'autopilot' ) }
					style={ {
						padding: '10px 18px',
						fontWeight: 600,
						fontSize: '14px',
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						display: 'inline-flex',
						alignItems: 'center',
						gap: '8px',
						borderBottom: activeTab === 'autopilot' ? '2px solid var(--aime-primary, #2563eb)' : '2px solid transparent',
						color: activeTab === 'autopilot' ? 'var(--aime-primary, #2563eb)' : 'var(--aime-muted, #64748b)',
					} }
				>
					<span className="dashicons dashicons-update" style={ { fontSize: '18px', width: '18px', height: '18px', lineHeight: '1' } } />
					<span>{ __( 'Autopilot Pipeline (Daily Engine)', 'ai-marketing-expert' ) }</span>
					{ apEnabled && (
						<span style={ { background: '#ecfdf5', color: '#065f46', fontSize: '11px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 } }>
							{ __( 'ACTIVE', 'ai-marketing-expert' ) }
						</span>
					) }
				</button>
				<button
					type="button"
					className={ `aime-tab-btn ${ activeTab === 'instant' ? 'is-active' : '' }` }
					onClick={ () => setActiveTab( 'instant' ) }
					style={ {
						padding: '10px 18px',
						fontWeight: 600,
						fontSize: '14px',
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						display: 'inline-flex',
						alignItems: 'center',
						gap: '8px',
						borderBottom: activeTab === 'instant' ? '2px solid var(--aime-primary, #2563eb)' : '2px solid transparent',
						color: activeTab === 'instant' ? 'var(--aime-primary, #2563eb)' : 'var(--aime-muted, #64748b)',
					} }
				>
					<span className="dashicons dashicons-search" style={ { fontSize: '18px', width: '18px', height: '18px', lineHeight: '1' } } />
					<span>{ __( 'Instant Prospect Search', 'ai-marketing-expert' ) }</span>
				</button>
			</div>

			{ /* TAB 1: INSTANT SEARCH */ }
			{ activeTab === 'instant' && (
				<>
					<Card title={ __( 'Search Filters & Criteria', 'ai-marketing-expert' ) }>
						<form onSubmit={ handleSearch }>
							<div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' } }>
								<div>
									<SelectControl
										label={ __( 'Industry', 'ai-marketing-expert' ) }
										value={ industry }
										options={ INDUSTRY_PRESETS }
										onChange={ setIndustry }
										__nextHasNoMarginBottom
									/>
									<input
										type="text"
										placeholder={ __( 'Or custom industry (e.g. Solar Energy)...', 'ai-marketing-expert' ) }
										value={ customIndustry }
										onChange={ ( e ) => setCustomIndustry( e.target.value ) }
										className="aime-premium-input"
										style={ { marginTop: '6px', fontSize: '13px' } }
									/>
								</div>

								<div>
									<SelectControl
										label={ __( 'Target Job Role / Title', 'ai-marketing-expert' ) }
										value={ role }
										options={ ROLE_PRESETS }
										onChange={ setRole }
										__nextHasNoMarginBottom
									/>
									<input
										type="text"
										placeholder={ __( 'Or specific title (e.g. VP of Growth)...', 'ai-marketing-expert' ) }
										value={ customRole }
										onChange={ ( e ) => setCustomRole( e.target.value ) }
										className="aime-premium-input"
										style={ { marginTop: '6px', fontSize: '13px' } }
									/>
								</div>

								<div>
									<SelectControl
										label={ __( 'Target Location', 'ai-marketing-expert' ) }
										value={ location }
										options={ LOCATION_PRESETS }
										onChange={ setLocation }
										__nextHasNoMarginBottom
									/>
									<input
										type="text"
										placeholder={ __( 'Or city/state (e.g. Chicago, Illinois)...', 'ai-marketing-expert' ) }
										value={ customLocation }
										onChange={ ( e ) => setCustomLocation( e.target.value ) }
										className="aime-premium-input"
										style={ { marginTop: '6px', fontSize: '13px' } }
									/>
								</div>

								<div>
									<SelectControl
										label={ __( 'Company Size', 'ai-marketing-expert' ) }
										value={ companySize }
										options={ COMPANY_SIZE_PRESETS }
										onChange={ setCompanySize }
										__nextHasNoMarginBottom
									/>
								</div>
							</div>

							<div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'flex-start', marginBottom: '16px' } }>
								<div>
									<label className="aime-premium-form-label" style={ { display: 'block', marginBottom: '6px' } }>
										{ __( 'Keywords / Niche Focus (Optional)', 'ai-marketing-expert' ) }
									</label>
									<input
										type="text"
										placeholder={ __( 'e.g. Shopify Plus, Dental Clinics, B2B Logistics, AI Startups...', 'ai-marketing-expert' ) }
										value={ keyword }
										onChange={ ( e ) => setKeyword( e.target.value ) }
										className="aime-premium-input"
									/>
								</div>

								<div>
									<label className="aime-premium-form-label" style={ { display: 'block', marginBottom: '6px' } }>
										{ __( 'Lead Volume', 'ai-marketing-expert' ) }
									</label>
									<div style={ { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }>
										{ [ '25', '50', '100' ].map( ( p ) => (
											<button
												key={ p }
												type="button"
												className={ `aime-btn-secondary ${ instantVolumePreset === p ? 'is-active' : '' }` }
												onClick={ () => setInstantVolumePreset( p ) }
												style={ {
													padding: '6px 14px',
													borderRadius: '6px',
													border: instantVolumePreset === p ? '2px solid var(--aime-primary, #2563eb)' : '1px solid #cbd5e1',
													background: instantVolumePreset === p ? '#eff6ff' : '#fff',
													fontWeight: 600,
													cursor: 'pointer',
													height: '36px',
												} }
											>
												{ p }
											</button>
										) ) }
										<button
											type="button"
											className={ `aime-btn-secondary ${ instantVolumePreset === 'custom' ? 'is-active' : '' }` }
											onClick={ () => setInstantVolumePreset( 'custom' ) }
											style={ {
												padding: '6px 14px',
												borderRadius: '6px',
												border: instantVolumePreset === 'custom' ? '2px solid var(--aime-primary, #2563eb)' : '1px solid #cbd5e1',
												background: instantVolumePreset === 'custom' ? '#eff6ff' : '#fff',
												fontWeight: 600,
												cursor: 'pointer',
												height: '36px',
											} }
										>
											{ __( 'Custom', 'ai-marketing-expert' ) }
										</button>

										{ instantVolumePreset === 'custom' && (
											<input
												type="number"
												min="5"
												max="500"
												value={ instantCustomVolume }
												onChange={ ( e ) => setInstantCustomVolume( e.target.value ) }
												className="aime-premium-input"
												style={ { width: '100px', height: '36px' } }
												placeholder="e.g. 75"
											/>
										) }
									</div>
								</div>
							</div>

							{ /* Live Deliverability Warning Card */ }
							<DeliverabilityWarning count={ activeInstantLimit } />

							{ /* Form Actions: Search Button at the Bottom */ }
							<div style={ { marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } }>
								<Button
									variant="primary"
									type="submit"
									disabled={ isSearching }
									style={ { height: '42px', minWidth: '180px', fontSize: '14px', fontWeight: 600 } }
								>
									<span translate="no" style={ { display: 'inline-flex', alignItems: 'center', gap: '8px' } }>
										{ isSearching ? (
											<>
												<Spinner />
												<span>{ __( 'Finding Leads...', 'ai-marketing-expert' ) }</span>
											</>
										) : (
											<>
												<span className="dashicons dashicons-search" style={ { fontSize: '18px', width: '18px', height: '18px', lineHeight: '1' } } />
												<span>{ sprintf( __( 'Search %d Leads', 'ai-marketing-expert' ), activeInstantLimit ) }</span>
											</>
										) }
									</span>
								</Button>
							</div>

							{ /* Live Search Progress Notice */ }
							{ isSearching && (
								<div
									style={ {
										background: '#eff6ff',
										border: '1px solid #bfdbfe',
										borderRadius: '8px',
										padding: '14px 18px',
										marginTop: '16px',
										display: 'flex',
										alignItems: 'center',
										gap: '12px',
										color: '#1e40af',
										fontSize: '13px',
									} }
								>
									<Spinner />
									<div>
										<strong style={ { display: 'block', marginBottom: '2px', color: '#1e3a8a' } }>
											{ __( 'AI Prospecting & DNS Deliverability Check in Progress...', 'ai-marketing-expert' ) }
										</strong>
										<span style={ { color: '#2563eb', fontSize: '12px' } }>
											{ sprintf(
												__( 'Discovering up to %d verified B2B prospects and testing real-time MX deliverability. This takes ~10–25 seconds. Please wait...', 'ai-marketing-expert' ),
												activeInstantLimit
											) }
										</span>
									</div>
								</div>
							) }
						</form>
					</Card>

					{ /* Results Section */ }
					{ leads.length > 0 && (
						<Card
							title={ sprintf( __( 'Discovered Prospects (%d)', 'ai-marketing-expert' ), leads.length ) }
							style={ { marginTop: '20px' } }
						>
							<div
								style={ {
									background: 'var(--aime-card-bg-alt, #f8fafc)',
									border: '1px solid var(--aime-border-color, #e2e8f0)',
									borderRadius: '8px',
									padding: '12px 16px',
									marginBottom: '16px',
									display: 'flex',
									flexWrap: 'wrap',
									alignItems: 'center',
									justifyContent: 'space-between',
									gap: '12px',
								} }
							>
								<div style={ { display: 'flex', alignItems: 'center', gap: '16px' } }>
									<span style={ { fontWeight: 600, fontSize: '13px', color: 'var(--aime-heading, #0f172a)' } }>
										{ sprintf( __( '%d leads selected', 'ai-marketing-expert' ), selectedIndices.length ) }
									</span>
									<Button variant="link" size="small" onClick={ toggleSelectAll }>
										{ selectedIndices.length === leads.length
											? __( 'Deselect All', 'ai-marketing-expert' )
											: __( 'Select All', 'ai-marketing-expert' ) }
									</Button>
								</div>

								<div style={ { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } }>
									<div style={ { minWidth: '180px' } }>
										<select
											className="aime-premium-select"
											value={ targetListId }
											onChange={ ( e ) => setTargetListId( e.target.value ) }
											style={ { height: '34px', fontSize: '13px' } }
										>
											<option value="">{ __( '-- Assign to List --', 'ai-marketing-expert' ) }</option>
											{ lists.map( ( l ) => (
												<option key={ l.id } value={ l.id }>{ l.title }</option>
											) ) }
										</select>
									</div>

									<div style={ { minWidth: '180px' } }>
										<input
											type="text"
											placeholder={ __( 'Tags (comma separated)...', 'ai-marketing-expert' ) }
											value={ targetTags }
											onChange={ ( e ) => setTargetTags( e.target.value ) }
											className="aime-premium-input"
											style={ { height: '34px', fontSize: '13px' } }
										/>
									</div>

									<Button
										variant="primary"
										onClick={ handleImport }
										disabled={ selectedIndices.length === 0 || isImporting }
									>
										<span translate="no" style={ { display: 'inline-flex', alignItems: 'center', gap: '6px' } }>
											{ isImporting ? (
												<>
													<Spinner />
													<span>{ __( 'Importing...', 'ai-marketing-expert' ) }</span>
												</>
											) : (
												<>
													<span className="dashicons dashicons-download" style={ { fontSize: '18px', width: '18px', height: '18px', lineHeight: '1' } } />
													<span>{ sprintf( __( 'Import %d Leads to CRM', 'ai-marketing-expert' ), selectedIndices.length ) }</span>
												</>
											) }
										</span>
									</Button>
								</div>
							</div>

							<div className="aime-table-responsive" style={ { overflowX: 'auto' } }>
								<table className="aime-table" style={ { width: '100%', borderCollapse: 'collapse' } }>
									<thead>
										<tr>
											<th style={ { width: '40px', textAlign: 'center' } }>
												<CheckboxControl
													checked={ selectedIndices.length === leads.length && leads.length > 0 }
													onChange={ toggleSelectAll }
													__nextHasNoMarginBottom
												/>
											</th>
											<th>{ __( 'Prospect & Title', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Company & Domain', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Email Address', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Deliverability (MX)', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'CRM Status', 'ai-marketing-expert' ) }</th>
											<th>{ __( 'Location', 'ai-marketing-expert' ) }</th>
										</tr>
									</thead>
									<tbody>
										{ leads.map( ( lead, idx ) => {
											const isSelected = selectedIndices.includes( idx );
											return (
												<tr
													key={ idx }
													style={ {
														backgroundColor: isSelected ? 'var(--aime-row-highlight, rgba(59, 130, 246, 0.04))' : undefined,
													} }
												>
													<td style={ { textAlign: 'center' } }>
														<CheckboxControl
															checked={ isSelected }
															onChange={ () => toggleSelectOne( idx ) }
															__nextHasNoMarginBottom
														/>
													</td>
													<td>
														<div style={ { fontWeight: 600, color: 'var(--aime-heading, #0f172a)' } }>
															{ lead.first_name } { lead.last_name }
														</div>
														<div style={ { fontSize: '12px', color: 'var(--aime-muted, #64748b)' } }>
															{ lead.title }
														</div>
													</td>
													<td>
														<div style={ { fontWeight: 500 } }>{ lead.company }</div>
														{ lead.website && (
															<a
																href={ lead.website }
																target="_blank"
																rel="noopener noreferrer"
																style={ { fontSize: '12px', color: 'var(--aime-primary, #2563eb)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' } }
															>
																<span>{ lead.domain || lead.website }</span>
																<span className="dashicons dashicons-external" style={ { fontSize: '14px', width: '14px', height: '14px', lineHeight: '1' } } />
															</a>
														) }
													</td>
													<td>
														<div style={ { fontFamily: 'monospace', fontSize: '12px' } }>
															{ lead.email }
														</div>
														{ lead.confidence && (
															<span style={ { fontSize: '11px', color: 'var(--aime-muted, #64748b)' } }>
																{ sprintf( __( 'AI Confidence: %s', 'ai-marketing-expert' ), lead.confidence ) }
															</span>
														) }
													</td>
													<td>
														{ lead.mx_verified ? (
															<span
																className="aime-badge aime-badge-success"
																style={ {
																	display: 'inline-flex',
																	alignItems: 'center',
																	gap: '4px',
																	background: '#ecfdf5',
																	color: '#065f46',
																	border: '1px solid #a7f3d0',
																	padding: '3px 8px',
																	borderRadius: '4px',
																	fontSize: '12px',
																	fontWeight: 500,
																} }
															>
																<span className="dashicons dashicons-yes-alt" style={ { fontSize: '15px', width: '15px', height: '15px', lineHeight: '1', color: '#059669' } } />
																<span>{ __( 'MX Deliverable', 'ai-marketing-expert' ) }</span>
															</span>
														) : (
															<span
																className="aime-badge aime-badge-warning"
																style={ {
																	display: 'inline-flex',
																	alignItems: 'center',
																	gap: '4px',
																	background: '#fffbeb',
																	color: '#92400e',
																	border: '1px solid #fde68a',
																	padding: '3px 8px',
																	borderRadius: '4px',
																	fontSize: '12px',
																	fontWeight: 500,
																} }
															>
																<span className="dashicons dashicons-warning" style={ { fontSize: '15px', width: '15px', height: '15px', lineHeight: '1', color: '#d97706' } } />
																<span>{ __( 'Unverified MX', 'ai-marketing-expert' ) }</span>
															</span>
														) }
													</td>
													<td>
														{ lead.is_in_crm ? (
															<span
																className="aime-badge"
																style={ {
																	background: '#f1f5f9',
																	color: '#475569',
																	border: '1px solid #cbd5e1',
																	padding: '2px 8px',
																	borderRadius: '4px',
																	fontSize: '12px',
																	fontWeight: 500,
																} }
															>
																{ __( 'In CRM', 'ai-marketing-expert' ) }
															</span>
														) : (
															<span
																className="aime-badge"
																style={ {
																	background: '#eff6ff',
																	color: '#1d4ed8',
																	border: '1px solid #bfdbfe',
																	padding: '2px 8px',
																	borderRadius: '4px',
																	fontSize: '12px',
																	fontWeight: 500,
																} }
															>
																{ __( 'New Prospect', 'ai-marketing-expert' ) }
															</span>
														) }
													</td>
													<td style={ { fontSize: '13px', color: 'var(--aime-muted, #64748b)' } }>
														{ lead.location || '—' }
													</td>
												</tr>
											);
										} ) }
									</tbody>
								</table>
							</div>
						</Card>
					) }
				</>
			) }

			{ /* TAB 2: AUTOPILOT PIPELINE */ }
			{ activeTab === 'autopilot' && (
				<div className="aime-autopilot-container">
					{ /* Status Banner & Metrics */ }
					<div
						style={ {
							background: apEnabled ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : '#f8fafc',
							color: apEnabled ? '#fff' : '#0f172a',
							border: '1px solid ' + ( apEnabled ? '#334155' : '#e2e8f0' ),
							borderRadius: '12px',
							padding: '20px 24px',
							marginBottom: '20px',
						} }
					>
						<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' } }>
							<div>
								<div style={ { display: 'flex', alignItems: 'center', gap: '12px' } }>
									<span
										className={ `dashicons ${ apEnabled ? 'dashicons-update' : 'dashicons-controls-pause' }` }
										style={ {
											fontSize: '26px',
											width: '26px',
											height: '26px',
											lineHeight: '1',
											color: apEnabled ? '#38bdf8' : '#64748b',
										} }
									/>
									<div>
										<h3 style={ { margin: 0, fontSize: '18px', color: apEnabled ? '#fff' : '#0f172a' } }>
											{ apEnabled
												? __( 'Autopilot Pipeline is Active', 'ai-marketing-expert' )
												: __( 'Autopilot Pipeline is Paused', 'ai-marketing-expert' ) }
										</h3>
										<p style={ { margin: '2px 0 0', fontSize: '13px', color: apEnabled ? '#94a3b8' : '#64748b' } }>
											{ apEnabled
												? sprintf( __( 'Searching, verifying, and ingesting %d fresh B2B leads daily via WP-Cron.', 'ai-marketing-expert' ), activeApDailyTarget )
												: __( 'Enable Autopilot below to generate deliverable prospects and feed your cold email sequences automatically.', 'ai-marketing-expert' ) }
										</p>
									</div>
								</div>
							</div>

							<div style={ { display: 'flex', gap: '12px', alignItems: 'center' } }>
								<Button
									variant={ apEnabled ? 'secondary' : 'primary' }
									onClick={ () => setApEnabled( ! apEnabled ) }
									style={ { height: '38px' } }
								>
									{ apEnabled ? __( 'Pause Autopilot', 'ai-marketing-expert' ) : __( 'Enable Autopilot', 'ai-marketing-expert' ) }
								</Button>

								<Button
									variant="primary"
									onClick={ handleRunAutopilotNow }
									disabled={ isRunningAp }
									style={ { height: '38px' } }
								>
									<span translate="no" style={ { display: 'inline-flex', alignItems: 'center', gap: '6px' } }>
										{ isRunningAp ? (
											<>
												<Spinner />
												<span>{ __( 'Running Pipeline...', 'ai-marketing-expert' ) }</span>
											</>
										) : (
											<>
												<span className="dashicons dashicons-controls-play" style={ { fontSize: '18px', width: '18px', height: '18px', lineHeight: '1' } } />
												<span>{ __( 'Run Now (Test Run)', 'ai-marketing-expert' ) }</span>
											</>
										) }
									</span>
								</Button>
							</div>
						</div>

						{ /* Stats Counter Pills */ }
						<div
							style={ {
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
								gap: '12px',
								marginTop: '20px',
								paddingTop: '16px',
								borderTop: '1px solid ' + ( apEnabled ? 'rgba(255,255,255,0.1)' : '#e2e8f0' ),
							} }
						>
							<div style={ { background: apEnabled ? 'rgba(255,255,255,0.05)' : '#fff', padding: '10px 14px', borderRadius: '8px', border: apEnabled ? 'none' : '1px solid #e2e8f0' } }>
								<div style={ { fontSize: '11px', textTransform: 'uppercase', color: apEnabled ? '#94a3b8' : '#64748b', fontWeight: 600 } }>
									{ __( 'Total Leads Ingested', 'ai-marketing-expert' ) }
								</div>
								<div style={ { fontSize: '20px', fontWeight: 700, color: apEnabled ? '#38bdf8' : '#0284c7', marginTop: '2px' } }>
									{ apStats.imported }
								</div>
							</div>

							<div style={ { background: apEnabled ? 'rgba(255,255,255,0.05)' : '#fff', padding: '10px 14px', borderRadius: '8px', border: apEnabled ? 'none' : '1px solid #e2e8f0' } }>
								<div style={ { fontSize: '11px', textTransform: 'uppercase', color: apEnabled ? '#94a3b8' : '#64748b', fontWeight: 600 } }>
									{ __( 'Duplicates Prevented', 'ai-marketing-expert' ) }
								</div>
								<div style={ { fontSize: '20px', fontWeight: 700, color: apEnabled ? '#a78bfa' : '#7c3aed', marginTop: '2px' } }>
									{ apStats.skipped_dup }
								</div>
							</div>

							<div style={ { background: apEnabled ? 'rgba(255,255,255,0.05)' : '#fff', padding: '10px 14px', borderRadius: '8px', border: apEnabled ? 'none' : '1px solid #e2e8f0' } }>
								<div style={ { fontSize: '11px', textTransform: 'uppercase', color: apEnabled ? '#94a3b8' : '#64748b', fontWeight: 600 } }>
									{ __( 'Bad MX Domains Filtered', 'ai-marketing-expert' ) }
								</div>
								<div style={ { fontSize: '20px', fontWeight: 700, color: apEnabled ? '#34d399' : '#059669', marginTop: '2px' } }>
									{ apStats.skipped_mx }
								</div>
							</div>

							<div style={ { background: apEnabled ? 'rgba(255,255,255,0.05)' : '#fff', padding: '10px 14px', borderRadius: '8px', border: apEnabled ? 'none' : '1px solid #e2e8f0' } }>
								<div style={ { fontSize: '11px', textTransform: 'uppercase', color: apEnabled ? '#94a3b8' : '#64748b', fontWeight: 600 } }>
									{ __( 'Last Execution', 'ai-marketing-expert' ) }
								</div>
								<div style={ { fontSize: '13px', fontWeight: 600, color: apEnabled ? '#e2e8f0' : '#1e293b', marginTop: '4px' } }>
									{ apLastRun ? apLastRun : __( 'Never executed', 'ai-marketing-expert' ) }
								</div>
							</div>
						</div>
					</div>

					{ /* Configuration Card */ }
					<Card title={ __( 'Autopilot Pipeline Rules & Ingestion Settings', 'ai-marketing-expert' ) }>
						{ /* Mode Selector */ }
						<div style={ { display: 'flex', gap: '12px', marginBottom: '20px' } }>
							<button
								type="button"
								onClick={ () => setApMode( 'filters' ) }
								style={ {
									padding: '10px 16px',
									borderRadius: '8px',
									border: apMode === 'filters' ? '2px solid var(--aime-primary, #2563eb)' : '1px solid #cbd5e1',
									background: apMode === 'filters' ? '#eff6ff' : '#fff',
									fontWeight: 600,
									cursor: 'pointer',
								} }
							>
								{ __( 'Option A: Smart Form Filters', 'ai-marketing-expert' ) }
							</button>

							<button
								type="button"
								onClick={ () => setApMode( 'prompt' ) }
								style={ {
									padding: '10px 16px',
									borderRadius: '8px',
									border: apMode === 'prompt' ? '2px solid var(--aime-primary, #2563eb)' : '1px solid #cbd5e1',
									background: apMode === 'prompt' ? '#eff6ff' : '#fff',
									fontWeight: 600,
									cursor: 'pointer',
								} }
							>
								{ __( 'Option B: AI Prompt Specification', 'ai-marketing-expert' ) }
							</button>
						</div>

						{ /* Mode A: Form Filters */ }
						{ apMode === 'filters' && (
							<div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' } }>
								<div>
									<SelectControl
										label={ __( 'Target Industry', 'ai-marketing-expert' ) }
										value={ apIndustry }
										options={ INDUSTRY_PRESETS }
										onChange={ setApIndustry }
										__nextHasNoMarginBottom
									/>
								</div>

								<div>
									<SelectControl
										label={ __( 'Target Job Role / Title', 'ai-marketing-expert' ) }
										value={ apRole }
										options={ ROLE_PRESETS }
										onChange={ setApRole }
										__nextHasNoMarginBottom
									/>
								</div>

								<div>
									<SelectControl
										label={ __( 'Target Location', 'ai-marketing-expert' ) }
										value={ apLocation }
										options={ LOCATION_PRESETS }
										onChange={ setApLocation }
										__nextHasNoMarginBottom
									/>
								</div>

								<div>
									<SelectControl
										label={ __( 'Company Size', 'ai-marketing-expert' ) }
										value={ apCompanySize }
										options={ COMPANY_SIZE_PRESETS }
										onChange={ setApCompanySize }
										__nextHasNoMarginBottom
									/>
								</div>

								<div style={ { gridColumn: '1 / -1' } }>
									<label className="aime-premium-form-label" style={ { display: 'block', marginBottom: '6px' } }>
										{ __( 'Keywords / Target Niche (Optional)', 'ai-marketing-expert' ) }
									</label>
									<input
										type="text"
										placeholder={ __( 'e.g. Klaviyo agencies, B2B SaaS, Shopify Plus merchants...', 'ai-marketing-expert' ) }
										value={ apKeyword }
										onChange={ ( e ) => setApKeyword( e.target.value ) }
										className="aime-premium-input"
									/>
								</div>
							</div>
						) }

						{ /* Mode B: AI Prompt */ }
						{ apMode === 'prompt' && (
							<div style={ { marginBottom: '20px' } }>
								<label className="aime-premium-form-label" style={ { display: 'block', marginBottom: '6px' } }>
									{ __( 'AI Natural Language Prospecting Prompt', 'ai-marketing-expert' ) }
								</label>
								<textarea
									rows="4"
									className="aime-premium-input"
									placeholder={ __( 'e.g. Find verified B2B marketing directors and founders of medium-sized e-commerce brands in the United States and Canada who utilize Shopify.', 'ai-marketing-expert' ) }
									value={ apPrompt }
									onChange={ ( e ) => setApPrompt( e.target.value ) }
									style={ { width: '100%', resize: 'vertical' } }
								/>
								<p style={ { fontSize: '12px', color: 'var(--aime-muted, #64748b)', margin: '4px 0 0' } }>
									{ __( 'The AI Prospecting engine automatically extracts role, location, domain rules, and company criteria from your natural language prompt.', 'ai-marketing-expert' ) }
								</p>
							</div>
						) }

						{ /* Daily Target & Deliverability Guidance */ }
						<div style={ { background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' } }>
							<label className="aime-premium-form-label" style={ { display: 'block', marginBottom: '8px', fontWeight: 600 } }>
								{ __( 'Daily Lead Target & Deliverability Volume', 'ai-marketing-expert' ) }
							</label>
							<div style={ { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }>
								{ [ '25', '50', '100' ].map( ( p ) => (
									<button
										key={ p }
										type="button"
										className={ `aime-btn-secondary ${ apVolumePreset === p ? 'is-active' : '' }` }
										onClick={ () => setApVolumePreset( p ) }
										style={ {
											padding: '8px 16px',
											borderRadius: '6px',
											border: apVolumePreset === p ? '2px solid var(--aime-primary, #2563eb)' : '1px solid #cbd5e1',
											background: apVolumePreset === p ? '#eff6ff' : '#fff',
											fontWeight: 600,
											cursor: 'pointer',
										} }
									>
										{ sprintf( __( '%s Leads / Day', 'ai-marketing-expert' ), p ) }
									</button>
								) ) }
								<button
									type="button"
									className={ `aime-btn-secondary ${ apVolumePreset === 'custom' ? 'is-active' : '' }` }
									onClick={ () => setApVolumePreset( 'custom' ) }
									style={ {
										padding: '8px 16px',
										borderRadius: '6px',
										border: apVolumePreset === 'custom' ? '2px solid var(--aime-primary, #2563eb)' : '1px solid #cbd5e1',
										background: apVolumePreset === 'custom' ? '#eff6ff' : '#fff',
										fontWeight: 600,
										cursor: 'pointer',
									} }
								>
									{ __( 'Custom Number', 'ai-marketing-expert' ) }
								</button>

								{ apVolumePreset === 'custom' && (
									<input
										type="number"
										min="5"
										max="500"
										value={ apCustomVolume }
										onChange={ ( e ) => setApCustomVolume( e.target.value ) }
										className="aime-premium-input"
										style={ { width: '130px', height: '36px' } }
									/>
								) }
							</div>

							<DeliverabilityWarning count={ activeApDailyTarget } />
						</div>

						{ /* Ingestion Pipeline (List, Tags, and Funnel Hand-off) */ }
						<div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' } }>
							<div>
								<label className="aime-premium-form-label" style={ { display: 'block', marginBottom: '6px' } }>
									{ __( 'Destination Email List', 'ai-marketing-expert' ) }
								</label>
								<select
									className="aime-premium-select"
									value={ apTargetListId }
									onChange={ ( e ) => setApTargetListId( e.target.value ) }
								>
									<option value="">{ __( '-- Select Destination List --', 'ai-marketing-expert' ) }</option>
									{ lists.map( ( l ) => (
										<option key={ l.id } value={ l.id }>{ l.title }</option>
									) ) }
								</select>
								<p style={ { fontSize: '12px', color: 'var(--aime-muted, #64748b)', margin: '4px 0 0' } }>
									{ __( 'Leads collected daily are automatically pushed into this list.', 'ai-marketing-expert' ) }
								</p>
							</div>

							<div>
								<label className="aime-premium-form-label" style={ { display: 'block', marginBottom: '6px' } }>
									{ __( 'Automated Tags', 'ai-marketing-expert' ) }
								</label>
								<input
									type="text"
									value={ apTags }
									onChange={ ( e ) => setApTags( e.target.value ) }
									placeholder={ __( 'e.g. AI-Autopilot, Cold-Outreach', 'ai-marketing-expert' ) }
									className="aime-premium-input"
								/>
								<p style={ { fontSize: '12px', color: 'var(--aime-muted, #64748b)', margin: '4px 0 0' } }>
									{ __( 'Tags added to each newly verified prospect.', 'ai-marketing-expert' ) }
								</p>
							</div>
						</div>

						{ /* Action Buttons & Automation Link */ }
						<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' } }>
							<div style={ { display: 'flex', gap: '12px' } }>
								<Button
									variant="primary"
									onClick={ handleSaveAutopilot }
									disabled={ isSavingAp }
									style={ { minWidth: '160px', height: '40px' } }
								>
									{ isSavingAp ? (
										<>
											<Spinner />
											<span style={ { marginLeft: '8px' } }>{ __( 'Saving...', 'ai-marketing-expert' ) }</span>
										</>
									) : (
										__( 'Save Autopilot Pipeline', 'ai-marketing-expert' )
									) }
								</Button>
							</div>

							{ onNavigate && (
								<Button
									variant="secondary"
									onClick={ () => onNavigate( 'automations' ) }
									style={ { height: '40px', display: 'inline-flex', alignItems: 'center', gap: '6px' } }
									title={ __( 'Configure or view automated cold email sequences for incoming leads', 'ai-marketing-expert' ) }
								>
									<span translate="no" style={ { display: 'inline-flex', alignItems: 'center', gap: '6px' } }>
										<span className="dashicons dashicons-randomize" style={ { fontSize: '18px', width: '18px', height: '18px', lineHeight: '1' } } />
										<span>{ __( 'Connect to Cold Outreach Funnel', 'ai-marketing-expert' ) }</span>
										<span className="dashicons dashicons-arrow-right-alt" style={ { fontSize: '16px', width: '16px', height: '16px', lineHeight: '1', color: 'var(--aime-primary, #2563eb)' } } />
									</span>
								</Button>
							) }
						</div>
					</Card>
				</div>
			) }
		</div>
	);
};

export default LeadFinder;
