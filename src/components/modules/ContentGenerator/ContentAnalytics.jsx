/**
 * Content Analytics - overview dashboard with KPI grid, charts, and tables.
 * Replaces the old Dashboard + Analytics - now the default landing page.
 */

import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import usePro from '../../../hooks/usePro';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import { ARTICLE_STATUS_LABELS, ARTICLE_STATUS_COLORS } from '../../../utils/constants';

const ContentAnalytics = ( { onNavigate } ) => {
	const { get, loading, error, clearError } = useApi();
	const { hasPro, freeLimits } = usePro();
	const [ stats, setStats ] = useState( null );

	useEffect( () => {
		const load = async () => {
			try {
				const res = await get( '/content/analytics/overview' );
				setStats( res );
			} catch ( e ) {
				// silent
			}
		};
		load();
	}, [ get ] );

	if ( loading && ! stats ) {
		return <Loader text={ __( 'Loading analytics...', 'ai-marketing-expert' ) } />;
	}

	const totals = stats?.totals || {};
	const monthlyCount = totals.articles_this_month || 0;
	const monthlyLimit = freeLimits?.content_articles_per_month || 10;

	const kpis = [
		{ label: __( 'Total Articles', 'ai-marketing-expert' ), value: totals.total_articles || 0 },
		{ label: __( 'Published', 'ai-marketing-expert' ), value: totals.total_published || 0 },
		{ label: __( 'Total Words', 'ai-marketing-expert' ), value: ( totals.total_words || 0 ).toLocaleString() },
		{ label: __( 'Avg SEO Score', 'ai-marketing-expert' ), value: totals.avg_seo_score || 0 },
		{ label: __( 'Avg Readability', 'ai-marketing-expert' ), value: totals.avg_readability || 0 },
	];

	return (
		<div className="aime-content-analytics">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<h2>{ __( 'Content Generator', 'ai-marketing-expert' ) }</h2>
				<div className="aime-page-header-actions">
					<Button variant="primary" onClick={ () => onNavigate( 'new-article' ) }>
						{ __( '+ New Article', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</div>

			{ /* KPI cards - same pattern as EmailAnalytics */ }
			<div className="aime-kpi-grid aime-kpi-grid-5">
				{ kpis.map( ( k ) => (
					<div key={ k.label } className="aime-kpi-card">
						<span className="aime-kpi-value">{ k.value }</span>
						<span className="aime-kpi-label">{ k.label }</span>
					</div>
				) ) }
			</div>

			{ /* Monthly usage (free plan) */ }
			{ ! hasPro && (
				<Card title={ __( 'Monthly Usage', 'ai-marketing-expert' ) }>
					<div className="aime-usage-bar-wrap">
						<div className="aime-usage-labels">
							<span>{ monthlyCount } / { monthlyLimit } { __( 'articles', 'ai-marketing-expert' ) }</span>
							<span>{ Math.round( ( monthlyCount / monthlyLimit ) * 100 ) }%</span>
						</div>
						<div className="aime-usage-bar">
							<div
								className="aime-usage-bar-fill"
								style={ { width: `${ Math.min( 100, ( monthlyCount / monthlyLimit ) * 100 ) }%` } }
							/>
						</div>
					</div>
				</Card>
			) }

			<div className="aime-charts-grid">
				{ /* Articles over time */ }
				{ stats?.articles_over_time?.length > 0 && (
					<Card title={ __( 'Articles Created Over Time', 'ai-marketing-expert' ) }>
						<div className="aime-bar-chart">
							{ stats.articles_over_time.map( ( item ) => (
								<div key={ item.date } className="aime-bar-item">
									<div
										className="aime-bar"
										style={ {
											height: `${ Math.max( 4, ( item.count / Math.max( ...stats.articles_over_time.map( ( d ) => d.count ) ) ) * 120 ) }px`,
										} }
										title={ `${ item.date }: ${ item.count }` }
									/>
									<span className="aime-bar-label">{ item.date.slice( 5 ) }</span>
								</div>
							) ) }
						</div>
					</Card>
				) }

				{ /* Status breakdown */ }
				{ stats?.status_breakdown?.length > 0 && (
					<Card title={ __( 'Status Breakdown', 'ai-marketing-expert' ) }>
						<div className="aime-status-grid">
							{ stats.status_breakdown.map( ( item ) => (
								<div key={ item.status } className="aime-status-item">
									<span
										className="aime-status-dot"
										style={ { background: ARTICLE_STATUS_COLORS[ item.status ] || '#9e9e9e' } }
									/>
									<span className="aime-status-name">
										{ ARTICLE_STATUS_LABELS[ item.status ] || item.status }
									</span>
									<span className="aime-status-count">{ item.count }</span>
								</div>
							) ) }
						</div>
					</Card>
				) }
			</div>

			<div className="aime-charts-grid">
				{ /* Top tones */ }
				{ stats?.top_tones?.length > 0 && (
					<Card title={ __( 'Popular Tones', 'ai-marketing-expert' ) }>
						<div className="aime-tone-list">
							{ stats.top_tones.map( ( item ) => (
								<div key={ item.tone } className="aime-tone-item">
									<span className="aime-tone-name">{ item.tone }</span>
									<span className="aime-tone-count">{ item.count } { __( 'articles', 'ai-marketing-expert' ) }</span>
								</div>
							) ) }
						</div>
					</Card>
				) }

				{ /* Recent articles */ }
				<Card
					title={ __( 'Recent Articles', 'ai-marketing-expert' ) }
					actions={
						<Button variant="link" onClick={ () => onNavigate( 'articles' ) }>
							{ __( 'View All', 'ai-marketing-expert' ) }
						</Button>
					}
				>
					{ stats?.recent_articles?.length > 0 ? (
						<table className="aime-table">
							<thead>
								<tr>
									<th>{ __( 'Title', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Words', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'SEO', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ stats.recent_articles.map( ( a ) => (
									<tr
										key={ a.id }
										className="aime-clickable-row"
										onClick={ () => onNavigate( 'edit-article', { id: a.id } ) }
									>
										<td>{ a.title || __( 'Untitled', 'ai-marketing-expert' ) }</td>
										<td>
											<span
												className="aime-status-badge"
												style={ { background: ARTICLE_STATUS_COLORS[ a.status ] || '#9e9e9e' } }
											>
												{ ARTICLE_STATUS_LABELS[ a.status ] || a.status }
											</span>
										</td>
										<td>{ a.actual_word_count || 0 }</td>
										<td>{ a.seo_score || '\u2014' }</td>
									</tr>
								) ) }
							</tbody>
						</table>
					) : (
						<p className="aime-empty-msg">{ __( 'No articles yet. Create your first one!', 'ai-marketing-expert' ) }</p>
					) }
				</Card>
			</div>
		</div>
	);
};

export default ContentAnalytics;
