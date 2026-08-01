/**
 * On-Page Audit - run SEO audits on posts/pages, view results.
 */

import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, SelectControl, Spinner } from '@aime/wp-components';
import { trash, seen } from '@wordpress/icons';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import useSlowWarning from '../../../../hooks/useSlowWarning';
import Card from '../../../common/Card';
import LoadingBtn from '../../../common/LoadingBtn';
import AiNotice, { isAiConfigured, aiDisabledTitle } from '../../../common/AiNotice';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ConfirmModal from '../../../common/ConfirmModal';
import { toast } from '../../../common/Toast';
import { DonutChart, RadialGauge, StackedBar } from './SeoCharts';

const SCORE_COLOR = ( score ) => {
	if ( score >= 70 ) return '#4caf50';
	if ( score >= 40 ) return '#ff9800';
	return '#f44336';
};

const OnPageAudit = ( { onNavigate } ) => {
	const { get, post, del, loading, error, clearError } = useApi();
	const { hasPro, freeLimits } = usePro();
	const slowWarning = useSlowWarning();
	const [ audits, setAudits ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ running, setRunning ] = useState( false );
	const [ postTypes, setPostTypes ] = useState( [] );
	const [ selectedPostType, setSelectedPostType ] = useState( 'post' );
	const [ posts, setPosts ] = useState( [] );
	const [ loadingPosts, setLoadingPosts ] = useState( false );
	const [ postId, setPostId ] = useState( '' );
	const [ keyword, setKeyword ] = useState( '' );
	const [ selectedAudit, setSelectedAudit ] = useState( null );
	const [ confirmDelete, setConfirmDelete ] = useState( null );
	const [ sortKey, setSortKey ] = useState( null );
	const [ sortDir, setSortDir ] = useState( 'desc' );

	const handleSort = ( key ) => {
		if ( sortKey === key ) {
			setSortDir( sortDir === 'asc' ? 'desc' : 'asc' );
		} else {
			setSortKey( key );
			setSortDir( 'desc' );
		}
	};

	const SortArrow = ( { active, dir } ) => (
		<span className={ `aime-sort-arrow${ active ? ' aime-sort-arrow--active' : '' }` }>
			{ active ? ( dir === 'asc' ? '\u2191' : '\u2193' ) : '\u21C5' }
		</span>
	);

	const sortedAudits = useMemo( () => {
		if ( ! sortKey ) return audits;
		return [ ...audits ].sort( ( a, b ) => {
			let aVal = a[ sortKey ] ?? '';
			let bVal = b[ sortKey ] ?? '';
			if ( typeof aVal === 'string' ) aVal = aVal.toLowerCase();
			if ( typeof bVal === 'string' ) bVal = bVal.toLowerCase();
			if ( aVal < bVal ) return sortDir === 'asc' ? -1 : 1;
			if ( aVal > bVal ) return sortDir === 'asc' ? 1 : -1;
			return 0;
		} );
	}, [ audits, sortKey, sortDir ] );

	const scoreDistribution = useMemo( () => {
		const d = { good: 0, average: 0, poor: 0 };
		audits.forEach( ( a ) => {
			const s = Number( a.overall_score ) || 0;
			if ( s >= 70 ) d.good++;
			else if ( s >= 40 ) d.average++;
			else d.poor++;
		} );
		return d;
	}, [ audits ] );

	const avgScore = useMemo( () => {
		if ( ! audits.length ) return 0;
		return Math.round( audits.reduce( ( s, a ) => s + ( Number( a.overall_score ) || 0 ), 0 ) / audits.length );
	}, [ audits ] );

	const fetchAudits = useCallback( async () => {
		try {
			const res = await get( '/seo/audits', { page, per_page: 20 } );
			setAudits( res.items || res.data || [] );
			setTotal( res.total || 0 );
		} catch ( e ) {
			// silent
		}
	}, [ get, page ] );

	useEffect( () => {
		fetchAudits();
	}, [ fetchAudits ] );

	const fetchPostTypes = useCallback( async () => {
		try {
			const res = await get( '/seo/audits/post-types' );
			const items = res.items || res.data || [];
			setPostTypes( items );
			if ( items.length && ! items.some( ( item ) => item.name === selectedPostType ) ) {
				setSelectedPostType( items[ 0 ].name );
			}
		} catch ( e ) {
			// silent
		}
	}, [ get, selectedPostType ] );

	const fetchPosts = useCallback( async () => {
		if ( ! selectedPostType ) return;
		setLoadingPosts( true );
		try {
			const res = await get( '/seo/audits/posts', { post_type: selectedPostType } );
			setPosts( res.items || res.data || [] );
			setPostId( '' );
		} catch ( e ) {
			setPosts( [] );
		} finally {
			setLoadingPosts( false );
		}
	}, [ get, selectedPostType ] );

	useEffect( () => {
		fetchPostTypes();
	}, [ fetchPostTypes ] );

	useEffect( () => {
		fetchPosts();
	}, [ fetchPosts ] );

	const handleRunAudit = async () => {
		if ( ! postId ) return;
		setRunning( true );
		clearError();
		slowWarning.start();
		try {
			const payload = {
				wp_post_id: parseInt( postId ),
				keyword_focus: keyword.trim() || undefined,
			};
			const res = await post( '/seo/audits/run', payload );
			toast( __( 'Audit completed!', 'ai-marketing-expert' ) );
			setSelectedAudit( res.data || res );
			fetchAudits();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
			setRunning( false );
		}
	};

	const handleViewAudit = async ( id ) => {
		try {
			const res = await get( `/seo/audits/${ id }` );
			setSelectedAudit( res.data || res );
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleDelete = async ( id ) => {
		try {
			await del( `/seo/audits/${ id }` );
			toast( __( 'Audit deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			if ( selectedAudit?.id === id ) setSelectedAudit( null );
			fetchAudits();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const renderChecks = ( checks ) => {
		if ( ! checks || typeof checks !== 'object' ) return null;

		// Checks can be an array of {check, label, status, message, value} objects
		// or a legacy key-value object.
		const isArray = Array.isArray( checks );

		if ( isArray ) {
			return (
				<div className="aime-audit-checks">
					{ checks.map( ( item, idx ) => {
						const passed = item.status === 'pass';
						const isWarning = item.status === 'warning';
						const label = item.label || ( item.check || '' ).replace( /_/g, ' ' ).replace( /\b\w/g, ( c ) => c.toUpperCase() );
						return (
							<div key={ item.check || idx } className={ `aime-audit-check ${ passed ? 'aime-check-pass' : isWarning ? 'aime-check-warning' : 'aime-check-fail' }` }>
								<span className="aime-check-icon">{ passed ? '\u2713' : isWarning ? '!' : '\u2717' }</span>
								<span className="aime-check-label">{ label }</span>
								{ item.message && <span className="aime-check-detail">{ item.message }</span> }
							</div>
						);
					} ) }
				</div>
			);
		}

		// Legacy key-value object format.
		const items = Object.entries( checks );
		return (
			<div className="aime-audit-checks">
				{ items.map( ( [ key, val ] ) => {
					const passed = val === true || val?.passed === true;
					const label = key.replace( /_/g, ' ' ).replace( /\b\w/g, ( c ) => c.toUpperCase() );
					const detail = typeof val === 'object' ? val.detail || val.message || val.value : null;
					return (
						<div key={ key } className={ `aime-audit-check ${ passed ? 'aime-check-pass' : 'aime-check-fail' }` }>
							<span className="aime-check-icon">{ passed ? '\u2713' : '\u2717' }</span>
							<span className="aime-check-label">{ label }</span>
							{ detail && <span className="aime-check-detail">{ String( detail ) }</span> }
						</div>
					);
				} ) }
			</div>
		);
	};

	const renderSuggestions = ( suggestions ) => {
		if ( ! suggestions?.length ) return null;
		return (
			<ul className="aime-list">
				{ suggestions.map( ( s, i ) => (
					<li key={ i }>{ typeof s === 'string' ? s : s.suggestion || s.text || JSON.stringify( s ) }</li>
				) ) }
			</ul>
		);
	};

	return (
		<div className="aime-seo-audit">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<h2>{ __( 'On-Page SEO Audit', 'ai-marketing-expert' ) }</h2>
			</div>

			{ /* Run New Audit */ }
			<Card title={ __( 'Run New Audit', 'ai-marketing-expert' ) }>
				<div className="aime-table-toolbar">
					<SelectControl
						label={ __( 'Post Type', 'ai-marketing-expert' ) }
						value={ selectedPostType }
						options={ postTypes.length
							? postTypes.map( ( type ) => ( { label: type.label, value: type.name } ) )
							: [ { label: __( 'Posts', 'ai-marketing-expert' ), value: 'post' } ]
						}
						onChange={ setSelectedPostType }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Select Content', 'ai-marketing-expert' ) }
						value={ postId }
						options={ [
							{ label: loadingPosts ? __( 'Loading...', 'ai-marketing-expert' ) : __( 'Select a post/page', 'ai-marketing-expert' ), value: '' },
							...posts.map( ( item ) => ( {
								label: `${ item.title || __( '(no title)', 'ai-marketing-expert' ) } (#${ item.id })`,
								value: String( item.id ),
							} ) ),
						] }
						onChange={ setPostId }
						disabled={ loadingPosts }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Target Keyword (optional)', 'ai-marketing-expert' ) }
						value={ keyword }
						onChange={ setKeyword }
						placeholder={ __( 'e.g. best running shoes', 'ai-marketing-expert' ) }
						__nextHasNoMarginBottom
					/>
					{ running ? (
						<LoadingBtn primary>{ __( 'Running Audit\u2026', 'ai-marketing-expert' ) }</LoadingBtn>
					) : (
						<Button
							variant="primary"
							onClick={ handleRunAudit }
							disabled={ ! isAiConfigured() || ! postId || loadingPosts }
							title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
						>
							{ __( 'Run Audit', 'ai-marketing-expert' ) }
						</Button>
					) }
					<AiNotice />
				</div>
				{ running && <Loader variant="lines" text={ __( 'Running SEO audit\u2026', 'ai-marketing-expert' ) } /> }
			</Card>

			{ /* Summary Stats & Charts */ }
			{ audits.length > 0 && (
				<>
					<div className="aime-kw-summary-row">
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val">{ audits.length }</span>
							<span className="aime-kw-stat-label">{ __( 'Total Audits', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val" style={ { color: '#4caf50' } }>{ scoreDistribution.good }</span>
							<span className="aime-kw-stat-label">{ __( 'Good (\u226570)', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val" style={ { color: '#ff9800' } }>{ scoreDistribution.average }</span>
							<span className="aime-kw-stat-label">{ __( 'Average (40-69)', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val" style={ { color: '#f44336' } }>{ scoreDistribution.poor }</span>
							<span className="aime-kw-stat-label">{ __( 'Poor (<40)', 'ai-marketing-expert' ) }</span>
						</div>
					</div>

					<div className="aime-analytics-charts-row">
						<Card title={ __( 'Score Distribution', 'ai-marketing-expert' ) }>
							<DonutChart
								data={ [
									{ label: __( 'Good', 'ai-marketing-expert' ), value: scoreDistribution.good, color: '#4caf50' },
									{ label: __( 'Average', 'ai-marketing-expert' ), value: scoreDistribution.average, color: '#ff9800' },
									{ label: __( 'Poor', 'ai-marketing-expert' ), value: scoreDistribution.poor, color: '#f44336' },
								] }
							/>
						</Card>
						<Card title={ __( 'Average Score', 'ai-marketing-expert' ) }>
							<RadialGauge value={ avgScore } max={ 100 } label={ `${ avgScore }%` } color={ SCORE_COLOR( avgScore ) } />
						</Card>
					</div>
				</>
			) }

			{ /* Audit Detail */ }
			{ selectedAudit && (
				<Card
					title={ `${ __( 'Audit Result', 'ai-marketing-expert' ) }: ${ selectedAudit.title || `Post #${ selectedAudit.wp_post_id }` }` }
					actions={
						<Button variant="link" onClick={ () => setSelectedAudit( null ) }>
							{ __( 'Close', 'ai-marketing-expert' ) }
						</Button>
					}
				>
					<div className="aime-audit-score" style={ { textAlign: 'center', marginBottom: 24 } }>
						<span
							style={ {
								fontSize: 48,
								fontWeight: 'bold',
								color: SCORE_COLOR( selectedAudit.overall_score || 0 ),
							} }
						>
							{ selectedAudit.overall_score || 0 }%
						</span>
						<p>{ __( 'SEO Score', 'ai-marketing-expert' ) }</p>
						{ selectedAudit.keyword_focus && (
							<p>
								{ __( 'Target Keyword:', 'ai-marketing-expert' ) }{ ' ' }
								<strong>{ selectedAudit.keyword_focus }</strong>
							</p>
						) }
					</div>

					{ /* Technical Checks */ }
					{ selectedAudit.results && (
						<div style={ { marginBottom: 16 } }>
							<h4>{ __( 'Technical Checks', 'ai-marketing-expert' ) }</h4>
							{ renderChecks(
								typeof selectedAudit.results === 'string'
									? JSON.parse( selectedAudit.results )
									: selectedAudit.results
							) }
						</div>
					) }

					{ /* AI Suggestions */ }
					{ selectedAudit.ai_suggestions && (
						<div>
							<h4>{ __( 'AI Suggestions', 'ai-marketing-expert' ) }</h4>
							{ renderSuggestions(
								typeof selectedAudit.ai_suggestions === 'string'
									? JSON.parse( selectedAudit.ai_suggestions )
									: selectedAudit.ai_suggestions
							) }
						</div>
					) }
				</Card>
			) }

			{ /* Audit History */ }
			<Card title={ __( 'Audit History', 'ai-marketing-expert' ) }>
				{ loading && ! audits.length ? (
					<Loader variant="table" text={ __( 'Loading audits\u2026', 'ai-marketing-expert' ) } />
				) : audits.length === 0 ? (
					<p className="aime-empty-text">
						{ __( 'No audits yet. Run your first audit above.', 'ai-marketing-expert' ) }
					</p>
				) : (
					<table className="aime-table aime-kw-table">
						<thead>
							<tr>
								<th onClick={ () => handleSort( 'title' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>{ __( 'Page', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'title' } dir={ sortDir } /></th>
								<th onClick={ () => handleSort( 'keyword_focus' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>{ __( 'Keyword', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'keyword_focus' } dir={ sortDir } /></th>
								<th onClick={ () => handleSort( 'overall_score' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>{ __( 'Score', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'overall_score' } dir={ sortDir } /></th>
								<th onClick={ () => handleSort( 'created_at' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>{ __( 'Date', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'created_at' } dir={ sortDir } /></th>
								<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ sortedAudits.map( ( a ) => (
								<tr key={ a.id }>
									<td><strong>{ a.title || a.url || `Post #${ a.wp_post_id }` }</strong></td>
									<td>{ a.keyword_focus || '\u2014' }</td>
									<td>
										<strong style={ { color: SCORE_COLOR( a.overall_score || 0 ), fontWeight: 700 } }>
											{ a.overall_score || 0 }%
										</strong>
									</td>
									<td>{ a.created_at?.split( ' ' )[ 0 ] }</td>
									<td>
										<Button
											icon={ seen }
											label={ __( 'View', 'ai-marketing-expert' ) }
											onClick={ () => handleViewAudit( a.id ) }
											style={ { marginRight: 4 } }
										/>
										<Button
											icon={ trash }
											isDestructive
											label={ __( 'Delete', 'ai-marketing-expert' ) }
											onClick={ () => setConfirmDelete( a.id ) }
										/>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				) }
			</Card>

			{ confirmDelete && (
				<ConfirmModal
					title={ __( 'Delete Audit', 'ai-marketing-expert' ) }
					message={ __( 'Are you sure you want to delete this audit?', 'ai-marketing-expert' ) }
					onConfirm={ () => handleDelete( confirmDelete ) }
					onCancel={ () => setConfirmDelete( null ) }
				/>
			) }
		</div>
	);
};

export default OnPageAudit;
