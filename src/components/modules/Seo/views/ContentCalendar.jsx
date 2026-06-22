/**
 * Content Calendar - AI-generated content calendar with CRUD (Pro).
 */

import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, SelectControl, Spinner } from '@aime/wp-components';
import { trash, edit, pencil } from '@wordpress/icons';
import { navigateToNewArticle } from '../../../../utils/seoContentBridge';
import useApi from '../../../../hooks/useApi';
import useSlowWarning from '../../../../hooks/useSlowWarning';
import Card from '../../../common/Card';
import LoadingBtn from '../../../common/LoadingBtn';
import AiNotice, { isAiConfigured, aiDisabledTitle } from '../../../common/AiNotice';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ProGate from '../../../common/ProGate';
import ConfirmModal from '../../../common/ConfirmModal';
import { toast } from '../../../common/Toast';
import { DonutChart, StackedBar, SortArrow } from './SeoCharts';

const STATUS_COLORS = {
	planned: '#2196f3',
	in_progress: '#ff9800',
	published: '#4caf50',
	skipped: '#9e9e9e',
};

const STATUS_LABELS = {
	planned: 'Planned',
	in_progress: 'In Progress',
	published: 'Published',
	skipped: 'Skipped',
};

const ContentCalendar = ( { onNavigate } ) => {
	const { get, post, put, del, loading, error, clearError } = useApi();
	const slowWarning = useSlowWarning();
	const [ items, setItems ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ generating, setGenerating ] = useState( false );
	const [ niche, setNiche ] = useState( '' );
	const [ weeks, setWeeks ] = useState( '4' );
	const [ frequency, setFrequency ] = useState( 'twice_weekly' );
	const [ confirmDelete, setConfirmDelete ] = useState( null );
	const [ sortKey, setSortKey ] = useState( null );
	const [ sortDir, setSortDir ] = useState( 'asc' );

	const handleSort = ( key ) => {
		if ( sortKey === key ) {
			setSortDir( sortDir === 'asc' ? 'desc' : 'asc' );
		} else {
			setSortKey( key );
			setSortDir( 'asc' );
		}
	};

	const fetchItems = useCallback( async () => {
		try {
			const res = await get( '/seo/calendar', { per_page: 50 } );
			setItems( res.items || res.data || [] );
			setTotal( res.total || 0 );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	useEffect( () => {
		fetchItems();
	}, [ fetchItems ] );

	const handleGenerate = async () => {
		if ( ! niche.trim() ) return;
		setGenerating( true );
		clearError();
		slowWarning.start();
		try {
			await post( '/seo/calendar/generate', {
				niche: niche.trim(),
				weeks: parseInt( weeks ) || 4,
				frequency,
			} );
			toast( __( 'Content calendar generated!', 'ai-marketing-expert' ) );
			fetchItems();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
			setGenerating( false );
		}
	};

	const handleStatusChange = async ( id, status ) => {
		try {
			await put( `/seo/calendar/${ id }`, { status } );
			toast( __( 'Status updated.', 'ai-marketing-expert' ) );
			fetchItems();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleDelete = async ( id ) => {
		try {
			await del( `/seo/calendar/${ id }` );
			toast( __( 'Item deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			fetchItems();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	// Sort items.
	const sortedItems = useMemo( () => {
		if ( ! sortKey ) return items;
		return [ ...items ].sort( ( a, b ) => {
			let aVal = sortKey === 'title' ? ( a.title || '' ) : sortKey === 'keyword_name' ? ( a.keyword_name || '' ) : sortKey === 'content_type' ? ( a.content_type || '' ) : sortKey === 'status' ? ( a.status || '' ) : ( a.planned_date || '' );
			let bVal = sortKey === 'title' ? ( b.title || '' ) : sortKey === 'keyword_name' ? ( b.keyword_name || '' ) : sortKey === 'content_type' ? ( b.content_type || '' ) : sortKey === 'status' ? ( b.status || '' ) : ( b.planned_date || '' );
			if ( typeof aVal === 'string' ) aVal = aVal.toLowerCase();
			if ( typeof bVal === 'string' ) bVal = bVal.toLowerCase();
			if ( aVal < bVal ) return sortDir === 'asc' ? -1 : 1;
			if ( aVal > bVal ) return sortDir === 'asc' ? 1 : -1;
			return 0;
		} );
	}, [ items, sortKey, sortDir ] );

	// Status counts for charts.
	const statusCounts = useMemo( () => {
		const counts = { planned: 0, in_progress: 0, published: 0, skipped: 0 };
		items.forEach( ( item ) => { counts[ item.status || 'planned' ] = ( counts[ item.status || 'planned' ] || 0 ) + 1; } );
		return counts;
	}, [ items ] );

	// Group by week for visual display.
	const groupedByWeek = sortedItems.reduce( ( acc, item ) => {
		const week = item.planned_date
			? item.planned_date.substring( 0, 10 )
			: __( 'Unscheduled', 'ai-marketing-expert' );
		if ( ! acc[ week ] ) acc[ week ] = [];
		acc[ week ].push( item );
		return acc;
	}, {} );

	const sortedDates = Object.keys( groupedByWeek ).sort();

	return (
		<ProGate feature={ __( 'Content Calendar', 'ai-marketing-expert' ) }>
			<div className="aime-seo-calendar">
				{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

				<div className="aime-page-header">
					<h2>{ __( 'Content Calendar', 'ai-marketing-expert' ) } ({ total })</h2>
				</div>

				{ /* Generate */ }
				<Card title={ __( 'Generate Calendar with AI', 'ai-marketing-expert' ) }>
					<div className="aime-table-toolbar">
						<TextControl
							label={ __( 'Niche', 'ai-marketing-expert' ) }
							value={ niche }
							onChange={ setNiche }
							placeholder={ __( 'e.g. digital marketing', 'ai-marketing-expert' ) }
							__nextHasNoMarginBottom
							style={ { minWidth: 200 } }
						/>
						<TextControl
							label={ __( 'Weeks', 'ai-marketing-expert' ) }
							value={ weeks }
							onChange={ setWeeks }
							type="number"
							__nextHasNoMarginBottom
							style={ { width: 80 } }
						/>
						<SelectControl
							label={ __( 'Frequency', 'ai-marketing-expert' ) }
							value={ frequency }
							options={ [
								{ label: __( 'Daily', 'ai-marketing-expert' ), value: 'daily' },
								{ label: __( 'Twice Weekly', 'ai-marketing-expert' ), value: 'twice_weekly' },
								{ label: __( 'Weekly', 'ai-marketing-expert' ), value: 'weekly' },
								{ label: __( 'Biweekly', 'ai-marketing-expert' ), value: 'biweekly' },
							] }
							onChange={ setFrequency }
							__nextHasNoMarginBottom
						/>
						{ generating ? (
							<LoadingBtn primary style={ { marginLeft: 'auto' } }>{ __( 'Generating\u2026', 'ai-marketing-expert' ) }</LoadingBtn>
						) : (
							<Button
								variant="primary"
								onClick={ handleGenerate }
								disabled={ ! isAiConfigured() || ! niche.trim() }
								title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
								style={ { marginLeft: 'auto' } }
							>
								{ __( 'Generate', 'ai-marketing-expert' ) }
							</Button>
						) }
						<AiNotice />
					</div>
					{ generating && <Loader text={ __( 'AI is planning your content\u2026', 'ai-marketing-expert' ) } /> }
				</Card>

				{ /* Calendar list */ }
				{ loading && ! items.length ? (
					<Loader text={ __( 'Loading calendar\u2026', 'ai-marketing-expert' ) } />
				) : items.length === 0 ? (
					<Card>
						<p className="aime-empty-text">
							{ __( 'No calendar items. Generate one above to get started.', 'ai-marketing-expert' ) }
						</p>
					</Card>
				) : (
					<>
						{ /* Summary Stats */ }
						<div className="aime-kw-summary-row">
							<div className="aime-kw-stat-card">
								<span className="aime-kw-stat-val">{ items.length }</span>
								<span className="aime-kw-stat-label">{ __( 'Total Items', 'ai-marketing-expert' ) }</span>
							</div>
							{ Object.entries( STATUS_LABELS ).map( ( [ key, label ] ) => (
								<div className="aime-kw-stat-card" key={ key }>
									<span className="aime-kw-stat-val" style={ { color: STATUS_COLORS[ key ] } }>{ statusCounts[ key ] || 0 }</span>
									<span className="aime-kw-stat-label">{ label }</span>
								</div>
							) ) }
						</div>

						{ /* Status Chart */ }
						<div className="aime-analytics-charts-row">
							<Card title={ __( 'Status Distribution', 'ai-marketing-expert' ) }>
								<DonutChart
									data={ Object.entries( STATUS_LABELS ).map( ( [ key, label ] ) => ( {
										label,
										value: statusCounts[ key ] || 0,
										color: STATUS_COLORS[ key ],
									} ) ) }
								/>
							</Card>
							<Card title={ __( 'Pipeline Overview', 'ai-marketing-expert' ) }>
								<StackedBar
									segments={ Object.entries( STATUS_LABELS ).map( ( [ key, label ] ) => ( {
										label,
										value: statusCounts[ key ] || 0,
										color: STATUS_COLORS[ key ],
									} ) ) }
									height={ 24 }
								/>
							</Card>
						</div>

						{ sortedDates.map( ( date ) => (
						<Card key={ date } title={ date }>
							<table className="aime-kw-table">
								<thead>
									<tr>
										<th onClick={ () => handleSort( 'title' ) } style={ { cursor: 'pointer' } }>{ __( 'Title', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'title' } dir={ sortDir } /></th>
										<th onClick={ () => handleSort( 'keyword_name' ) } style={ { cursor: 'pointer' } }>{ __( 'Keyword', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'keyword_name' } dir={ sortDir } /></th>
										<th onClick={ () => handleSort( 'content_type' ) } style={ { cursor: 'pointer' } }>{ __( 'Type', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'content_type' } dir={ sortDir } /></th>
										<th onClick={ () => handleSort( 'status' ) } style={ { cursor: 'pointer' } }>{ __( 'Status', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'status' } dir={ sortDir } /></th>
										<th>{ __( 'Actions', 'ai-marketing-expert' ) }</th>
									</tr>
								</thead>
								<tbody>
									{ groupedByWeek[ date ].map( ( item ) => (
										<tr key={ item.id }>
											<td><strong>{ item.title }</strong></td>
											<td>{ item.keyword_name || '\u2014' }</td>
											<td>
												<span className="aime-tag">{ item.content_type || 'blog_post' }</span>
											</td>
											<td>
												<SelectControl
													value={ item.status || 'planned' }
													options={ Object.entries( STATUS_LABELS ).map( ( [ v, l ] ) => ( { value: v, label: l } ) ) }
													onChange={ ( v ) => handleStatusChange( item.id, v ) }
													__nextHasNoMarginBottom
												/>
											</td>
											<td>
												<Button
													icon={ pencil }
													label={ __( 'Write Article', 'ai-marketing-expert' ) }
													onClick={ () => navigateToNewArticle( {
														topic: item.keyword_name || item.title,
														title: item.title,
														keywords: item.keyword_name ? [ item.keyword_name ] : [],
														content_type: item.content_type,
														source: 'content-calendar',
													} ) }
													style={ { marginRight: 4 } }
												/>
												<Button
													icon={ trash }
													isDestructive
													label={ __( 'Delete', 'ai-marketing-expert' ) }
													onClick={ () => setConfirmDelete( item.id ) }
												/>
											</td>
										</tr>
									) ) }
								</tbody>
							</table>
						</Card>
					) ) }
					</>
				) }

				{ confirmDelete && (
					<ConfirmModal
						title={ __( 'Delete Calendar Item', 'ai-marketing-expert' ) }
						message={ __( 'Are you sure you want to delete this item?', 'ai-marketing-expert' ) }
						onConfirm={ () => handleDelete( confirmDelete ) }
						onCancel={ () => setConfirmDelete( null ) }
					/>
				) }
			</div>
		</ProGate>
	);
};

export default ContentCalendar;
