/**
 * Rank Tracker - tracked keyword ranks, history, manual/bulk check.
 */

import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, SelectControl, Spinner } from '@aime/wp-components';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ProGate from '../../../common/ProGate';
import { toast } from '../../../common/Toast';
import { DonutChart, HBarChart, SortArrow } from './SeoCharts';

const RankTracker = ( { onNavigate } ) => {
	const { get, post, loading, error, clearError } = useApi();
	const { hasPro, freeLimits } = usePro();
	const [ history, setHistory ] = useState( [] );
	const [ keywords, setKeywords ] = useState( [] );
	const [ selectedKeyword, setSelectedKeyword ] = useState( '' );
	const [ checking, setChecking ] = useState( false );
	const [ bulkChecking, setBulkChecking ] = useState( false );
	const [ settings, setSettings ] = useState( null );
	const [ sortKey, setSortKey ] = useState( null );
	const [ sortDir, setSortDir ] = useState( 'asc' );
	const [ hSortKey, setHSortKey ] = useState( null );
	const [ hSortDir, setHSortDir ] = useState( 'desc' );

	const handleSort = ( key ) => {
		if ( sortKey === key ) { setSortDir( sortDir === 'asc' ? 'desc' : 'asc' ); }
		else { setSortKey( key ); setSortDir( 'asc' ); }
	};
	const handleHSort = ( key ) => {
		if ( hSortKey === key ) { setHSortDir( hSortDir === 'asc' ? 'desc' : 'asc' ); }
		else { setHSortKey( key ); setHSortDir( 'desc' ); }
	};

	const fetchHistory = useCallback( async () => {
		try {
			const params = {};
			if ( selectedKeyword ) params.keyword_id = selectedKeyword;
			const res = await get( '/seo/rank/history', params );
			setHistory( res.history || res.items || res.data || [] );
			if ( res.tracked ) {
				setKeywords( res.tracked );
			}
		} catch ( e ) {
			// silent
		}
	}, [ get, selectedKeyword ] );

	const fetchSettings = useCallback( async () => {
		try {
			const res = await get( '/seo/settings' );
			setSettings( res.data || res );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	useEffect( () => {
		fetchHistory();
	}, [ fetchHistory ] );
	useEffect( () => {
		fetchSettings();
	}, [ fetchSettings ] );

	const handleManualCheck = async ( keywordId ) => {
		setChecking( true );
		clearError();
		try {
			const res = await post( '/seo/rank/check', { keyword_id: keywordId, search_engine: settings?.rank_check_engine || 'google' } );
			toast(
				res.rank
					? `${ __( 'Rank:', 'ai-marketing-expert' ) } #${ res.rank }`
					: __( 'Rank checked.', 'ai-marketing-expert' )
			);
			fetchHistory();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setChecking( false );
		}
	};

	const handleBulkCheck = async () => {
		if ( ! keywords.length ) {
			toast( __( 'No tracked keywords to check.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setBulkChecking( true );
		clearError();
		try {
			const ids = keywords.map( ( kw ) => kw.id );
			const res = await post( '/seo/rank/bulk-check', { keyword_ids: ids, search_engine: settings?.rank_check_engine || 'google' } );
			toast( res.message || __( 'Bulk check completed.', 'ai-marketing-expert' ) );
			fetchHistory();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setBulkChecking( false );
		}
	};

	// Build keyword options for filter.
	const keywordOptions = [
		{ label: __( 'All Keywords', 'ai-marketing-expert' ), value: '' },
		...keywords.map( ( kw ) => ( { label: `${ kw.keyword } (#${ kw.id })`, value: String( kw.id ) } ) ),
	];

	const sortedKeywords = useMemo( () => {
		if ( ! sortKey ) return keywords;
		return [ ...keywords ].sort( ( a, b ) => {
			let aVal = sortKey === 'keyword' ? ( a.keyword || '' ).toLowerCase() : Number( a[ sortKey ] ) || 0;
			let bVal = sortKey === 'keyword' ? ( b.keyword || '' ).toLowerCase() : Number( b[ sortKey ] ) || 0;
			if ( aVal < bVal ) return sortDir === 'asc' ? -1 : 1;
			if ( aVal > bVal ) return sortDir === 'asc' ? 1 : -1;
			return 0;
		} );
	}, [ keywords, sortKey, sortDir ] );

	const sortedHistory = useMemo( () => {
		if ( ! hSortKey ) return history;
		return [ ...history ].sort( ( a, b ) => {
			let aVal, bVal;
			if ( hSortKey === 'keyword' ) { aVal = ( a.keyword || '' ).toLowerCase(); bVal = ( b.keyword || '' ).toLowerCase(); }
			else if ( hSortKey === 'rank_position' ) { aVal = Number( a.rank_position ) || 999; bVal = Number( b.rank_position ) || 999; }
			else if ( hSortKey === 'checked_at' ) { aVal = a.checked_at || ''; bVal = b.checked_at || ''; }
			else { aVal = ( a[ hSortKey ] || '' ).toString().toLowerCase(); bVal = ( b[ hSortKey ] || '' ).toString().toLowerCase(); }
			if ( aVal < bVal ) return hSortDir === 'asc' ? -1 : 1;
			if ( aVal > bVal ) return hSortDir === 'asc' ? 1 : -1;
			return 0;
		} );
	}, [ history, hSortKey, hSortDir ] );

	const rankDistribution = useMemo( () => {
		const buckets = { top3: 0, top10: 0, top30: 0, beyond: 0 };
		keywords.forEach( ( kw ) => {
			const r = Number( kw.current_rank ) || 0;
			if ( ! r ) return;
			if ( r <= 3 ) buckets.top3++;
			else if ( r <= 10 ) buckets.top10++;
			else if ( r <= 30 ) buckets.top30++;
			else buckets.beyond++;
		} );
		return buckets;
	}, [ keywords ] );

	return (
		<div className="aime-seo-rank-tracker">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<h2>{ __( 'Rank Tracker', 'ai-marketing-expert' ) }</h2>
				<div className="aime-page-header-actions">
					{ hasPro && (
						<Button
							variant="secondary"
							onClick={ handleBulkCheck }
							disabled={ bulkChecking }
							isBusy={ bulkChecking }
						>
							{ bulkChecking
								? <><Spinner style={ { marginRight: 4 } } />{ __( 'Checking\u2026', 'ai-marketing-expert' ) }</>
								: __( 'Bulk Check All', 'ai-marketing-expert' )
							}
						</Button>
					) }
				</div>
			</div>

			{ ! hasPro && (
				<Notice
					type="info"
					message={ `${ __( 'Free plan: track up to', 'ai-marketing-expert' ) } ${ freeLimits?.seo_rank_keywords || 5 } ${ __( 'keywords.', 'ai-marketing-expert' ) }` }
				/>
			) }
			<Notice
				type="info"
				message={ `${ __( 'Rank checks currently use AI-estimated positions for', 'ai-marketing-expert' ) } ${ ( settings?.rank_check_engine || 'google' ).toUpperCase() }. ${ __( 'Connect a SERP provider in a future Pro integration for verified live rankings.', 'ai-marketing-expert' ) }` }
			/>

			{ /* Summary Stats */ }
			{ keywords.length > 0 && (
				<>
					<div className="aime-kw-summary-row">
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val">{ keywords.length }</span>
							<span className="aime-kw-stat-label">{ __( 'Tracked Keywords', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val" style={ { color: '#4caf50' } }>{ rankDistribution.top3 }</span>
							<span className="aime-kw-stat-label">{ __( 'Top 3', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val" style={ { color: '#2196f3' } }>{ rankDistribution.top10 }</span>
							<span className="aime-kw-stat-label">{ __( 'Top 4-10', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val" style={ { color: '#ff9800' } }>{ rankDistribution.top30 }</span>
							<span className="aime-kw-stat-label">{ __( 'Top 11-30', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-stat-card">
							<span className="aime-kw-stat-val" style={ { color: '#f44336' } }>{ rankDistribution.beyond }</span>
							<span className="aime-kw-stat-label">{ __( '30+', 'ai-marketing-expert' ) }</span>
						</div>
					</div>

					<div className="aime-analytics-charts-row">
						<Card title={ __( 'Rank Distribution', 'ai-marketing-expert' ) }>
							<DonutChart
								data={ [
									{ label: __( 'Top 3', 'ai-marketing-expert' ), value: rankDistribution.top3, color: '#4caf50' },
									{ label: __( 'Top 4-10', 'ai-marketing-expert' ), value: rankDistribution.top10, color: '#2196f3' },
									{ label: __( 'Top 11-30', 'ai-marketing-expert' ), value: rankDistribution.top30, color: '#ff9800' },
									{ label: __( '30+', 'ai-marketing-expert' ), value: rankDistribution.beyond, color: '#f44336' },
								] }
							/>
						</Card>
						<Card title={ __( 'Top Rankings', 'ai-marketing-expert' ) }>
							<HBarChart
								data={ keywords
									.filter( ( kw ) => kw.current_rank )
									.sort( ( a, b ) => ( a.current_rank || 999 ) - ( b.current_rank || 999 ) )
									.slice( 0, 8 )
									.map( ( kw ) => ( {
										label: kw.keyword,
										value: kw.current_rank,
										color: kw.current_rank <= 3 ? '#4caf50' : kw.current_rank <= 10 ? '#2196f3' : kw.current_rank <= 30 ? '#ff9800' : '#f44336',
										maxLabel: `#${ kw.current_rank }`,
									} ) )
								}
								maxValue={ 100 }
								title={ __( 'Best Positions', 'ai-marketing-expert' ) }
							/>
						</Card>
					</div>
				</>
			) }

			{ /* Filter by keyword */ }
			<Card>
				<div className="aime-table-toolbar">
					<SelectControl
						label={ __( 'Filter by Keyword', 'ai-marketing-expert' ) }
						value={ selectedKeyword }
						options={ keywordOptions }
						onChange={ setSelectedKeyword }
						__nextHasNoMarginBottom
					/>
				</div>
			</Card>

			{ /* Tracked Keywords Summary */ }
			{ keywords.length > 0 && (
				<Card title={ __( 'Tracked Keywords', 'ai-marketing-expert' ) }>
					<table className="aime-kw-table">
						<thead>
							<tr>
								<th onClick={ () => handleSort( 'keyword' ) } style={ { cursor: 'pointer' } }>{ __( 'Keyword', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'keyword' } dir={ sortDir } /></th>
								<th onClick={ () => handleSort( 'current_rank' ) } style={ { cursor: 'pointer' } }>{ __( 'Current Rank', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'current_rank' } dir={ sortDir } /></th>
								<th onClick={ () => handleSort( 'latest_rank' ) } style={ { cursor: 'pointer' } }>{ __( 'Latest Rank', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'latest_rank' } dir={ sortDir } /></th>
								<th>{ __( 'Last Checked', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ sortedKeywords.map( ( kw ) => (
								<tr key={ kw.id }>
									<td><strong>{ kw.keyword }</strong></td>
									<td>
										{ kw.current_rank
											? <span style={ { fontWeight: 'bold', color: kw.current_rank <= 10 ? '#4caf50' : kw.current_rank <= 30 ? '#ff9800' : '#f44336' } }>
												#{ kw.current_rank }
											</span>
											: '\u2014'
										}
									</td>
								<td>{ kw.latest_rank ? `#${ kw.latest_rank }` : '\u2014' }</td>
									<td>{ kw.last_checked?.split( ' ' )[ 0 ] || '\u2014' }</td>
									<td>
										<Button
											variant="secondary"
											onClick={ () => handleManualCheck( kw.id ) }
											disabled={ checking }
											isSmall
										>
											{ __( 'Check Now', 'ai-marketing-expert' ) }
										</Button>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</Card>
			) }

			{ /* Rank History */ }
			<Card title={ __( 'Rank History', 'ai-marketing-expert' ) }>
				{ loading && ! history.length ? (
					<Loader variant="table" text={ __( 'Loading history\u2026', 'ai-marketing-expert' ) } />
				) : history.length === 0 ? (
					<p className="aime-empty-text">
						{ __( 'No rank history yet. Add keywords to your vault and check their rank.', 'ai-marketing-expert' ) }{ ' ' }
						<Button variant="link" onClick={ () => onNavigate( 'keyword-vault' ) }>
							{ __( 'Go to Keyword Vault', 'ai-marketing-expert' ) }
						</Button>
					</p>
				) : (
					<table className="aime-kw-table">
						<thead>
							<tr>
								<th onClick={ () => handleHSort( 'keyword' ) } style={ { cursor: 'pointer' } }>{ __( 'Keyword', 'ai-marketing-expert' ) } <SortArrow active={ hSortKey === 'keyword' } dir={ hSortDir } /></th>
								<th onClick={ () => handleHSort( 'rank_position' ) } style={ { cursor: 'pointer' } }>{ __( 'Position', 'ai-marketing-expert' ) } <SortArrow active={ hSortKey === 'rank_position' } dir={ hSortDir } /></th>
								<th>{ __( 'URL', 'ai-marketing-expert' ) }</th>
								<th onClick={ () => handleHSort( 'search_engine' ) } style={ { cursor: 'pointer' } }>{ __( 'Engine', 'ai-marketing-expert' ) } <SortArrow active={ hSortKey === 'search_engine' } dir={ hSortDir } /></th>
								<th onClick={ () => handleHSort( 'checked_at' ) } style={ { cursor: 'pointer' } }>{ __( 'Date', 'ai-marketing-expert' ) } <SortArrow active={ hSortKey === 'checked_at' } dir={ hSortDir } /></th>
							</tr>
						</thead>
						<tbody>
							{ sortedHistory.map( ( h, idx ) => (
								<tr key={ h.id || idx }>
									<td><strong>{ h.keyword || `KW #${ h.keyword_id }` }</strong></td>
									<td>
										<span style={ { fontWeight: 'bold', color: ( h.rank_position || 0 ) <= 10 ? '#4caf50' : ( h.rank_position || 0 ) <= 30 ? '#ff9800' : '#f44336' } }>
											{ h.rank_position ? `#${ h.rank_position }` : '\u2014' }
										</span>
									</td>
									<td>
										{ h.url ? (
											<span style={ { fontSize: 12, color: '#666' } }>{ h.url }</span>
										) : '\u2014' }
									</td>
									<td>{ h.search_engine || 'google' }</td>
									<td>{ h.checked_at?.split( ' ' )[ 0 ] || '\u2014' }</td>
								</tr>
							) ) }
						</tbody>
					</table>
				) }
			</Card>
		</div>
	);
};

export default RankTracker;
