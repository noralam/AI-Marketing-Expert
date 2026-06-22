/**
 * Content Dashboard - overview stats and quick actions.
 */

import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Icon } from '@aime/wp-components';
import { postContent, edit, chartBar, published } from '@wordpress/icons';
import useApi from '../../../hooks/useApi';
import usePro from '../../../hooks/usePro';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import { ARTICLE_STATUS_LABELS, ARTICLE_STATUS_COLORS } from '../../../utils/constants';

const StatCard = ( { label, value, icon, color } ) => (
	<div className="aime-stat-card">
		<div className="aime-stat-icon" style={ { color } }>
			<Icon icon={ icon } size={ 28 } />
		</div>
		<div className="aime-stat-info">
			<span className="aime-stat-value">{ value }</span>
			<span className="aime-stat-label">{ label }</span>
		</div>
	</div>
);

const ContentDashboard = ( { onNavigate } ) => {
	const { get, loading } = useApi();
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
		return <Loader text={ __( 'Loading dashboard...', 'ai-marketing-expert' ) } />;
	}

	const totals = stats?.totals || {};
	const monthlyCount = totals.articles_this_month || 0;
	const monthlyLimit = freeLimits?.content_articles_per_month || 10;

	return (
		<div className="aime-content-dashboard">
			<div className="aime-page-header">
				<div>
					<h2>{ __( 'Content Generator', 'ai-marketing-expert' ) }</h2>
					<p className="aime-page-desc">
						{ __( 'AI-powered blog content creation at your fingertips.', 'ai-marketing-expert' ) }
					</p>
				</div>
				<Button variant="primary" onClick={ () => onNavigate( 'new-article' ) }>
					<Icon icon={ edit } size={ 18 } />
					{ __( 'New Article', 'ai-marketing-expert' ) }
				</Button>
			</div>

			{ /* Stats row */ }
			<div className="aime-stats-row">
				<StatCard
					label={ __( 'Total Articles', 'ai-marketing-expert' ) }
					value={ totals.total_articles || 0 }
					icon={ postContent }
					color="#2196f3"
				/>
				<StatCard
					label={ __( 'Published', 'ai-marketing-expert' ) }
					value={ totals.total_published || 0 }
					icon={ published }
					color="#4caf50"
				/>
				<StatCard
					label={ __( 'Total Words', 'ai-marketing-expert' ) }
					value={ ( totals.total_words || 0 ).toLocaleString() }
					icon={ postContent }
					color="#9c27b0"
				/>
				<StatCard
					label={ __( 'Avg SEO Score', 'ai-marketing-expert' ) }
					value={ totals.avg_seo_score || 0 }
					icon={ chartBar }
					color="#ff9800"
				/>
			</div>

			{ /* Monthly usage (free plan) */ }
			{ ! hasPro && (
				<Card title={ __( 'Monthly Usage', 'ai-marketing-expert' ) } className="aime-usage-card">
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

			{ /* Recent articles */ }
			<Card
				title={ __( 'Recent Articles', 'ai-marketing-expert' ) }
				actions={
					<Button variant="link" onClick={ () => onNavigate( 'articles' ) }>
						{ __( 'View All', 'ai-marketing-expert' ) }
					</Button>
				}
			>
				{ stats?.recent_articles?.length ? (
					<table className="aime-table">
						<thead>
							<tr>
								<th>{ __( 'Title', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Words', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'SEO', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Created', 'ai-marketing-expert' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ stats.recent_articles.map( ( article ) => (
								<tr
									key={ article.id }
									className="aime-clickable-row"
									onClick={ () => onNavigate( 'edit-article', { id: article.id } ) }
								>
									<td>{ article.title || __( 'Untitled', 'ai-marketing-expert' ) }</td>
									<td>
										<span
											className="aime-status-badge"
											style={ { background: ARTICLE_STATUS_COLORS[ article.status ] || '#9e9e9e' } }
										>
											{ ARTICLE_STATUS_LABELS[ article.status ] || article.status }
										</span>
									</td>
									<td>{ article.actual_word_count || 0 }</td>
									<td>{ article.seo_score || '\u2014' }</td>
									<td>{ article.created_at?.split( ' ' )[ 0 ] }</td>
								</tr>
							) ) }
						</tbody>
					</table>
				) : (
					<p className="aime-empty-text">
						{ __( 'No articles yet. Create your first AI-generated article!', 'ai-marketing-expert' ) }
					</p>
				) }
			</Card>

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
	);
};

export default ContentDashboard;
