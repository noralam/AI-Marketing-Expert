/**
 * SEO Analytics - SEMrush-style overview with KPIs, charts, recent activity.
 */

import { useState, useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Icon } from '@aime/wp-components';
import { search, page, chartBar, update, lineSolid, external } from '@wordpress/icons';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import { navigateToNewArticle } from '../../../../utils/seoContentBridge';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import { DonutChart, HBarChart, RadialGauge } from './SeoCharts';

const SCORE_COLOR = ( s ) => s >= 70 ? '#4caf50' : s >= 40 ? '#ff9800' : '#f44336';

const KPI_CONFIG = [
	{ key: 'total_keywords', label: 'Saved Keywords', icon: '\uD83D\uDD11', color: '#1565c0', bg: '#e3f2fd' },
	{ key: 'total_audits', label: 'Audits Run', icon: '\uD83D\uDCCB', color: '#2e7d32', bg: '#e8f5e9' },
	{ key: 'avg_audit_score', label: 'Avg Audit Score', icon: '\uD83D\uDCCA', color: '#e65100', bg: '#fff3e0', suffix: '%', scoreColor: true },
	{ key: 'tracked_keywords', label: 'Tracked Keywords', icon: '\uD83D\uDCC8', color: '#6a1b9a', bg: '#f3e5f5' },
];

const SeoDashboard = ( { onNavigate } ) => {
	const { get, loading, error, clearError } = useApi();
	const { hasPro, freeLimits } = usePro();
	const [ stats, setStats ] = useState( null );

	useEffect( () => {
		const load = async () => {
			try {
				const res = await get( '/seo/analytics/dashboard' );
				setStats( res );
			} catch ( e ) {
				// silent
			}
		};
		load();
	}, [ get ] );

	const counts = stats?.stats || {};
	const usage = stats?.usage || {};

	const auditScoreDist = useMemo( () => {
		const audits = stats?.recent_audits || [];
		const d = { good: 0, average: 0, poor: 0 };
		audits.forEach( ( a ) => {
			const s = Number( a.overall_score ) || 0;
			if ( s >= 70 ) d.good++;
			else if ( s >= 40 ) d.average++;
			else d.poor++;
		} );
		return d;
	}, [ stats ] );

	const topKeywords = useMemo( () => {
		const kws = stats?.recent_keywords || [];
		return [ ...kws ]
			.filter( ( k ) => k.search_volume > 0 )
			.sort( ( a, b ) => ( b.search_volume || 0 ) - ( a.search_volume || 0 ) )
			.slice( 0, 6 )
			.map( ( k ) => ( { label: k.keyword, value: k.search_volume } ) );
	}, [ stats ] );

	if ( loading && ! stats ) {
		return <Loader text={ __( 'Loading analytics...', 'ai-marketing-expert' ) } />;
	}

	return (
		<div className="aime-seo-dashboard">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<div>
					<h2>{ __( 'SEO Analytics', 'ai-marketing-expert' ) }</h2>
					<p className="aime-page-desc">
						{ __( 'AI-powered SEO toolkit for keyword research, audits, and rank tracking.', 'ai-marketing-expert' ) }
					</p>
				</div>
				<Button variant="primary" onClick={ () => onNavigate( 'keyword-research' ) }>
					<Icon icon={ search } size={ 18 } />
					{ __( 'New Research', 'ai-marketing-expert' ) }
				</Button>
			</div>

			{ /* KPI Cards */ }
			<div className="aime-seo-kpi-row">
				{ KPI_CONFIG.map( ( kpi ) => {
					const raw = counts[ kpi.key ];
					const val = kpi.key === 'avg_audit_score' && raw ? `${ raw }%` : ( raw || 0 );
					const valColor = kpi.scoreColor && raw ? SCORE_COLOR( Number( raw ) ) : kpi.color;
					return (
						<div className="aime-seo-kpi-card" key={ kpi.key } style={ { borderTop: `3px solid ${ kpi.color }` } }>
							<span className="aime-seo-kpi-icon" style={ { background: kpi.bg } }>{ kpi.icon }</span>
							<span className="aime-seo-kpi-val" style={ { color: valColor } }>{ val }</span>
							<span className="aime-seo-kpi-label">{ __( kpi.label, 'ai-marketing-expert' ) }</span>
						</div>
					);
				} ) }
			</div>

			{ /* Monthly usage (free plan) */ }
			{ ! hasPro && (
				<Card title={ __( 'Monthly Usage', 'ai-marketing-expert' ) } className="aime-usage-card">
					<div className="aime-usage-bar-wrap">
						<div className="aime-usage-labels">
							<span>
								{ usage.research_used || 0 } / { freeLimits?.seo_keyword_research_monthly || 10 }{ ' ' }
								{ __( 'keyword researches', 'ai-marketing-expert' ) }
							</span>
							<span>
								{ Math.round( ( ( usage.research_used || 0 ) / ( freeLimits?.seo_keyword_research_monthly || 10 ) ) * 100 ) }%
							</span>
						</div>
						<div className="aime-usage-bar">
							<div
								className="aime-usage-bar-fill"
								style={ {
									width: `${ Math.min( 100, ( ( usage.research_used || 0 ) / ( freeLimits?.seo_keyword_research_monthly || 10 ) ) * 100 ) }%`,
								} }
							/>
						</div>
					</div>
					<div className="aime-usage-bar-wrap" style={ { marginTop: 12 } }>
						<div className="aime-usage-labels">
							<span>
								{ usage.audit_used || 0 } / { freeLimits?.seo_audits_monthly || 5 }{ ' ' }
								{ __( 'audits', 'ai-marketing-expert' ) }
							</span>
							<span>
								{ Math.round( ( ( usage.audit_used || 0 ) / ( freeLimits?.seo_audits_monthly || 5 ) ) * 100 ) }%
							</span>
						</div>
						<div className="aime-usage-bar">
							<div
								className="aime-usage-bar-fill"
								style={ {
									width: `${ Math.min( 100, ( ( usage.audit_used || 0 ) / ( freeLimits?.seo_audits_monthly || 5 ) ) * 100 ) }%`,
								} }
							/>
						</div>
					</div>
				</Card>
			) }

			{ /* Quick Actions */ }
			<div className="aime-seo-quick-actions">
				{ [
					{ tab: 'keyword-research', label: __( 'Keyword Research', 'ai-marketing-expert' ), icon: '\uD83D\uDD0D' },
					{ tab: 'on-page-audit', label: __( 'Run Audit', 'ai-marketing-expert' ), icon: '\uD83D\uDCCB' },
					{ tab: 'content-calendar', label: __( 'Content Calendar', 'ai-marketing-expert' ), icon: '\uD83D\uDCC6' },
					{ tab: 'link-building', label: __( 'Link Building', 'ai-marketing-expert' ), icon: '\uD83D\uDD17' },
					{ tab: 'rank-tracker', label: __( 'Rank Tracker', 'ai-marketing-expert' ), icon: '\uD83D\uDCC8' },
					{ tab: 'topic-map', label: __( 'Topic Map', 'ai-marketing-expert' ), icon: '\uD83D\uDDFA\uFE0F' },
				].map( ( a ) => (
					<button key={ a.tab } className="aime-seo-quick-btn" onClick={ () => onNavigate( a.tab ) }>
						<span className="aime-seo-quick-icon">{ a.icon }</span>
						<span>{ a.label }</span>
					</button>
				) ) }
				<button className="aime-seo-quick-btn aime-seo-quick-btn--cta" onClick={ () => navigateToNewArticle( { source: 'seo-dashboard' } ) }>
					<span className="aime-seo-quick-icon">{ '\u270D\uFE0F' }</span>
					<span>{ __( 'Write Article', 'ai-marketing-expert' ) }</span>
				</button>
			</div>

			{ /* Charts Row */ }
			{ ( stats?.recent_audits?.length > 0 || topKeywords.length > 0 ) && (
				<div className="aime-analytics-charts-row">
					{ stats?.recent_audits?.length > 0 && (
						<Card title={ __( 'Audit Score Distribution', 'ai-marketing-expert' ) }>
							<DonutChart
								data={ [
									{ label: __( 'Good (\u226570)', 'ai-marketing-expert' ), value: auditScoreDist.good, color: '#4caf50' },
									{ label: __( 'Average (40-69)', 'ai-marketing-expert' ), value: auditScoreDist.average, color: '#ff9800' },
									{ label: __( 'Poor (<40)', 'ai-marketing-expert' ), value: auditScoreDist.poor, color: '#f44336' },
								] }
							/>
						</Card>
					) }
					{ counts.avg_audit_score && (
						<Card title={ __( 'Average SEO Score', 'ai-marketing-expert' ) }>
							<RadialGauge
								value={ Number( counts.avg_audit_score ) || 0 }
								max={ 100 }
								label={ `${ counts.avg_audit_score }%` }
								color={ SCORE_COLOR( Number( counts.avg_audit_score ) ) }
							/>
						</Card>
					) }
				</div>
			) }

			{ topKeywords.length > 0 && (
				<div className="aime-analytics-charts-row aime-analytics-charts-row--1">
					<Card title={ __( 'Top Keywords by Volume', 'ai-marketing-expert' ) }>
						<HBarChart data={ topKeywords } title={ __( 'Search Volume', 'ai-marketing-expert' ) } />
					</Card>
				</div>
			) }

			<div className="aime-charts-grid">
				{ /* Recent keywords */ }
				<Card
					title={ __( 'Recent Keywords', 'ai-marketing-expert' ) }
					actions={
						<Button variant="link" onClick={ () => onNavigate( 'keyword-vault' ) }>
							{ __( 'View All', 'ai-marketing-expert' ) }
						</Button>
					}
				>
					{ stats?.recent_keywords?.length > 0 ? (
						<table className="aime-kw-table">
							<thead>
								<tr>
									<th>{ __( 'Keyword', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Volume', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Difficulty', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Intent', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ stats.recent_keywords.map( ( kw ) => (
									<tr key={ kw.id }>
										<td><strong>{ kw.keyword }</strong></td>
										<td>{ kw.search_volume ? Number( kw.search_volume ).toLocaleString() : '\u2014' }</td>
										<td>
											<strong style={ { color: SCORE_COLOR( 100 - ( kw.difficulty_score || 0 ) ) } }>
												{ kw.difficulty_score || '\u2014' }
											</strong>
										</td>
										<td>
											<span className="aime-status-badge" style={ { background: '#607d8b' } }>
												{ kw.intent || 'N/A' }
											</span>
										</td>
									</tr>
								) ) }
							</tbody>
						</table>
					) : (
						<p className="aime-empty-text">
							{ __( 'No keywords saved yet.', 'ai-marketing-expert' ) }{ ' ' }
							<Button variant="link" onClick={ () => onNavigate( 'keyword-research' ) }>
								{ __( 'Start researching', 'ai-marketing-expert' ) }
							</Button>
						</p>
					) }
				</Card>

				{ /* Recent audits */ }
				<Card
					title={ __( 'Recent Audits', 'ai-marketing-expert' ) }
					actions={
						<Button variant="link" onClick={ () => onNavigate( 'on-page-audit' ) }>
							{ __( 'View All', 'ai-marketing-expert' ) }
						</Button>
					}
				>
					{ stats?.recent_audits?.length > 0 ? (
						<table className="aime-kw-table">
							<thead>
								<tr>
									<th>{ __( 'Page', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Score', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Date', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ stats.recent_audits.map( ( a ) => (
									<tr key={ a.id }>
										<td>{ a.title || '\u2014' }</td>
										<td>
											<strong style={ {
												color: ( a.overall_score || 0 ) >= 70 ? '#4caf50' : ( a.overall_score || 0 ) >= 40 ? '#ff9800' : '#f44336',
											} }>
												{ a.overall_score || 0 }%
											</strong>
										</td>
										<td>{ a.created_at?.split( ' ' )[ 0 ] }</td>
									</tr>
								) ) }
							</tbody>
						</table>
					) : (
						<p className="aime-empty-text">
							{ __( 'No audits run yet.', 'ai-marketing-expert' ) }{ ' ' }
							<Button variant="link" onClick={ () => onNavigate( 'on-page-audit' ) }>
								{ __( 'Run your first audit', 'ai-marketing-expert' ) }
							</Button>
						</p>
					) }
				</Card>
			</div>
		</div>
	);
};

export default SeoDashboard;
