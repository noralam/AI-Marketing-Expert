/**
 * Chatbot Analytics - main landing page with KPIs, SVG charts, bots overview, and recent conversations.
 * Uses the same chart style as the SEO Analyzer module.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl } from '@aime/wp-components';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import { DonutChart, HBarChart, StackedBar } from '../../Seo/views/SeoCharts';

const DAILY_PAGE_SIZE = 10;

/* Inline SVG area chart */
const AreaChart = ( { data, dataKey, color = '#1565c0', height = 180 } ) => {
	if ( ! data.length ) return null;
	const values = data.map( ( d ) => d[ dataKey ] || 0 );
	const max = Math.max( ...values, 1 );
	const W = 600;
	const H = height;
	const padTop = 20;
	const padBottom = 30;
	const padLeft = 40;
	const padRight = 10;
	const plotW = W - padLeft - padRight;
	const plotH = H - padTop - padBottom;
	const step = data.length > 1 ? plotW / ( data.length - 1 ) : plotW;

	const points = values.map( ( v, i ) => {
		const x = padLeft + ( data.length > 1 ? i * step : plotW / 2 );
		const y = padTop + plotH - ( v / max ) * plotH;
		return { x, y, v };
	} );

	const linePath = points.map( ( p, i ) => `${ i === 0 ? 'M' : 'L' } ${ p.x } ${ p.y }` ).join( ' ' );
	const areaPath = `${ linePath } L ${ points[ points.length - 1 ].x } ${ padTop + plotH } L ${ points[ 0 ].x } ${ padTop + plotH } Z`;

	// Y-axis gridlines (5 lines)
	const gridLines = [ 0, 0.25, 0.5, 0.75, 1 ].map( ( pct ) => {
		const y = padTop + plotH - pct * plotH;
		const val = Math.round( pct * max );
		return { y, val };
	} );

	// X-axis labels - pick up to 7 evenly spaced
	const maxLabels = Math.min( 7, data.length );
	const labelStep = data.length > 1 ? Math.ceil( data.length / maxLabels ) : 1;
	const xLabels = data.filter( ( _, i ) => i % labelStep === 0 || i === data.length - 1 );

	return (
		<svg
			viewBox={ `0 0 ${ W } ${ H }` }
			width="100%"
			height={ H }
			style={ { display: 'block', overflow: 'visible' } }
			className="aime-chart-area"
		>
			{ /* Grid lines */ }
			{ gridLines.map( ( g, i ) => (
				<g key={ i }>
					<line x1={ padLeft } y1={ g.y } x2={ W - padRight } y2={ g.y } stroke="#e8e8e8" strokeWidth="1" />
					<text x={ padLeft - 6 } y={ g.y + 4 } textAnchor="end" fontSize="10" fill="#999">{ g.val }</text>
				</g>
			) ) }
			{ /* Gradient fill */ }
			<defs>
				<linearGradient id={ `area-grad-${ dataKey }` } x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={ color } stopOpacity="0.25" />
					<stop offset="100%" stopColor={ color } stopOpacity="0.02" />
				</linearGradient>
			</defs>
			<path d={ areaPath } fill={ `url(#area-grad-${ dataKey })` } />
			<path d={ linePath } fill="none" stroke={ color } strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
			{ /* Data dots */ }
			{ points.map( ( p, i ) => (
				<g key={ i }>
					<circle cx={ p.x } cy={ p.y } r="4" fill="#fff" stroke={ color } strokeWidth="2" />
					<title>{ `${ data[ i ].date }: ${ p.v }` }</title>
				</g>
			) ) }
			{ /* X-axis labels */ }
			{ xLabels.map( ( d, i ) => {
				const idx = data.indexOf( d );
				const x = padLeft + ( data.length > 1 ? idx * step : plotW / 2 );
				return (
					<text key={ i } x={ x } y={ H - 6 } textAnchor="middle" fontSize="10" fill="#999">
						{ d.date?.slice( 5 ) }
					</text>
				);
			} ) }
		</svg>
	);
};

const CONVERSATION_STATUS_COLORS = {
	active: '#4caf50',
	closed: '#9e9e9e',
	human_takeover: '#ff9800',
};

const CONVERSATION_STATUS_LABELS = {
	active: 'Active',
	closed: 'Closed',
	human_takeover: 'Human Takeover',
};

const Analytics = ( { onNavigate } ) => {
	const { get, loading, error, clearError } = useApi();
	const { hasPro, freeLimits } = usePro();
	const [ stats, setStats ] = useState( null );
	const [ trends, setTrends ] = useState( [] );
	const [ days, setDays ] = useState( '30' );
	const [ botFilter, setBotFilter ] = useState( '' );
	const [ bots, setBots ] = useState( [] );
	const [ dailyPage, setDailyPage ] = useState( 1 );

	useEffect( () => {
		const loadBots = async () => {
			try {
				const res = await get( '/chatbot/bots' );
				const arr = Array.isArray( res ) ? res : res.items || [];
				setBots( arr.map( ( b ) => ( { label: b.name, value: String( b.id ) } ) ) );
			} catch ( e ) {
				// silent
			}
		};
		loadBots();
	}, [ get ] );

	const fetchData = useCallback( async () => {
		try {
			const params = {};
			if ( botFilter ) params.bot_id = botFilter;

			const [ overview, trendData ] = await Promise.all( [
				get( '/chatbot/analytics/overview', { ...params, days: parseInt( days ) } ),
				get( '/chatbot/analytics/conversations', { ...params, days: parseInt( days ) } ),
			] );
			setStats( overview );
			setTrends( Array.isArray( trendData ) ? trendData : [] );
		} catch ( e ) {
			// silent
		}
	}, [ get, botFilter, days ] );

	useEffect( () => {
		fetchData();
	}, [ fetchData ] );

	if ( loading && ! stats ) {
		return <Loader text={ __( 'Loading analytics...', 'ai-marketing-expert' ) } />;
	}

	const monthlyConversations = stats?.conversations_this_month || 0;
	const monthlyLimit = freeLimits?.chatbot_conversations_monthly || 100;

	const kpis = [
		{ label: __( 'Total Conversations', 'ai-marketing-expert' ), value: stats?.total_conversations || 0, icon: '\uD83D\uDCAC' },
		{ label: __( 'Total Messages', 'ai-marketing-expert' ), value: stats?.total_messages || 0, icon: '\u2709\uFE0F' },
		{ label: __( 'Unique Visitors', 'ai-marketing-expert' ), value: stats?.unique_visitors || 0, icon: '\uD83D\uDC65' },
		{ label: __( 'Active Now', 'ai-marketing-expert' ), value: stats?.active_conversations || 0, icon: '\uD83D\uDFE2' },
		{ label: __( 'Leads Captured', 'ai-marketing-expert' ), value: stats?.leads_captured || 0, icon: '\uD83C\uDFAF' },
		{ label: __( 'Human Takeovers', 'ai-marketing-expert' ), value: stats?.human_takeovers || 0, icon: '\uD83D\uDE4B' },
	];

	const botOptions = [
		{ label: __( 'All Bots', 'ai-marketing-expert' ), value: '' },
		...bots,
	];

	const dayOptions = [
		{ label: '7 days', value: '7' },
		{ label: '14 days', value: '14' },
		{ label: '30 days', value: '30' },
		{ label: '90 days', value: '90' },
	];

	// Conversation status donut data
	const statusDonut = [
		{ label: __( 'Active', 'ai-marketing-expert' ), value: stats?.active_status_conversations || 0, color: '#4caf50' },
		{ label: __( 'Closed', 'ai-marketing-expert' ), value: stats?.closed_conversations || 0, color: '#9e9e9e' },
		{ label: __( 'Human Takeover', 'ai-marketing-expert' ), value: stats?.human_takeover_active || 0, color: '#ff9800' },
	].filter( ( d ) => d.value > 0 );

	// Engagement stacked bar
	const engagementSegments = [
		{ label: __( 'Conversations', 'ai-marketing-expert' ), value: stats?.total_conversations || 0, color: '#1565c0' },
		{ label: __( 'Messages', 'ai-marketing-expert' ), value: stats?.total_messages || 0, color: '#7C3AED' },
		{ label: __( 'Leads', 'ai-marketing-expert' ), value: stats?.leads_captured || 0, color: '#ff9800' },
	];

	// Bot performance bar chart data
	const botBarData = ( stats?.bots || [] ).map( ( bot ) => ( {
		label: bot.name,
		value: bot.conversation_count || bot.conversations || 0,
		color: bot.status === 'active' ? '#1565c0' : '#9e9e9e',
	} ) );

	return (
		<div className="aime-chatbot-analytics">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<h2>{ __( 'AI Chatbot', 'ai-marketing-expert' ) }</h2>
				<div className="aime-page-header-actions" style={ { display: 'flex', gap: 8 } }>
					<Button variant="primary" onClick={ () => onNavigate( 'new-bot' ) }>
						{ __( '+ New Chatbot', 'ai-marketing-expert' ) }
					</Button>
					{ bots.length > 1 && (
						<SelectControl
							value={ botFilter }
							options={ botOptions }
							onChange={ setBotFilter }
							__nextHasNoMarginBottom
						/>
					) }
					<SelectControl
						value={ days }
						options={ dayOptions }
						onChange={ setDays }
						__nextHasNoMarginBottom
					/>
				</div>
			</div>

			{ /* KPI cards */ }
			<div className="aime-kpi-grid aime-kpi-grid-3">
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
							<span>{ monthlyConversations } / { monthlyLimit } { __( 'conversations', 'ai-marketing-expert' ) }</span>
							<span>{ Math.round( ( monthlyConversations / monthlyLimit ) * 100 ) }%</span>
						</div>
						<div className="aime-usage-bar">
							<div
								className="aime-usage-bar-fill"
								style={ { width: `${ Math.min( 100, ( monthlyConversations / monthlyLimit ) * 100 ) }%` } }
							/>
						</div>
					</div>
				</Card>
			) }

			{ /* SVG area charts - conversations and messages over time */ }
			<div className="aime-charts-grid">
				{ trends.length > 0 && (
					<Card title={ __( 'Conversations Over Time', 'ai-marketing-expert' ) }>
						<AreaChart data={ trends } dataKey="total_conversations" color="#1565c0" />
					</Card>
				) }

				{ trends.length > 0 && (
					<Card title={ __( 'Messages Over Time', 'ai-marketing-expert' ) }>
						<AreaChart data={ trends } dataKey="total_messages" color="#7C3AED" />
					</Card>
				) }
			</div>

			{ /* Donut + Engagement + Bot Performance row */ }
			<div className="aime-charts-grid aime-charts-grid-3">
				{ statusDonut.length > 0 && (
					<Card title={ __( 'Conversation Status', 'ai-marketing-expert' ) }>
						<DonutChart data={ statusDonut } size={ 150 } thickness={ 24 } />
					</Card>
				) }

				<Card title={ __( 'Engagement Breakdown', 'ai-marketing-expert' ) }>
					<StackedBar segments={ engagementSegments } height={ 22 } />
					<div style={ { marginTop: 16 } }>
						<HBarChart data={ [
							{ label: __( 'Avg Messages/Conv', 'ai-marketing-expert' ), value: stats?.total_conversations ? Math.round( ( stats.total_messages || 0 ) / stats.total_conversations * 10 ) / 10 : 0, color: '#7C3AED' },
							{ label: __( 'Lead Rate', 'ai-marketing-expert' ), value: stats?.total_conversations ? Math.round( ( stats.leads_captured || 0 ) / stats.total_conversations * 100 ) : 0, color: '#ff9800' },
						] } barHeight={ 20 } />
					</div>
				</Card>

				{ botBarData.length > 0 && (
					<Card title={ __( 'Bot Performance', 'ai-marketing-expert' ) }>
						<HBarChart data={ botBarData } barHeight={ 22 } />
					</Card>
				) }
			</div>

			{ /* Bot status breakdown */ }
			{ stats?.bots?.length > 0 && (
				<Card
					title={ __( 'Chatbots', 'ai-marketing-expert' ) }
					actions={
						<Button variant="link" onClick={ () => onNavigate( 'bots' ) }>
							{ __( 'Manage', 'ai-marketing-expert' ) }
						</Button>
					}
				>
					<div className="aime-bot-cards">
						{ stats.bots.map( ( bot ) => (
							<div key={ bot.id } className="aime-bot-card">
								<div className="aime-bot-card__header">
									<span
										className="aime-status-dot"
										style={ { background: bot.status === 'active' ? '#4caf50' : '#9e9e9e' } }
									/>
									<span className="aime-bot-card__name">{ bot.name }</span>
									<span
										className={ `aime-status-badge aime-status-badge--${ bot.status === 'active' ? 'active' : 'inactive' }` }
									>
										{ bot.status === 'active' ? __( 'Active', 'ai-marketing-expert' ) : __( 'Inactive', 'ai-marketing-expert' ) }
									</span>
								</div>
								<div className="aime-bot-card__meta">
									{ bot.conversation_count > 0 && (
										<span>{ bot.conversation_count } { __( 'conversations', 'ai-marketing-expert' ) }</span>
									) }
								</div>
								<div className="aime-bot-card__actions">
									<Button
										variant="link"
										onClick={ () => onNavigate( 'edit-bot', { id: bot.id } ) }
									>
										{ __( 'Edit', 'ai-marketing-expert' ) }
									</Button>

								</div>
							</div>
						) ) }
					</div>
				</Card>
			) }

			{ /* Daily Breakdown table with pagination */ }
			{ trends.length > 0 && ( () => {
				const reversed = trends.slice().reverse();
				const totalPages = Math.ceil( reversed.length / DAILY_PAGE_SIZE );
				const paged = reversed.slice( ( dailyPage - 1 ) * DAILY_PAGE_SIZE, dailyPage * DAILY_PAGE_SIZE );
				return (
					<Card title={ `${ __( 'Daily Breakdown', 'ai-marketing-expert' ) } (${ reversed.length })` }>
						<table className="aime-table">
							<thead>
								<tr>
									<th>{ __( 'Date', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Conversations', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Messages', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Leads', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Takeovers', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'Unique Visitors', 'ai-marketing-expert' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ paged.map( ( row, i ) => (
									<tr key={ `${ row.date }-${ i }` }>
										<td>{ row.date }</td>
										<td>{ row.total_conversations || 0 }</td>
										<td>{ row.total_messages || 0 }</td>
										<td>{ row.leads_captured || 0 }</td>
										<td>{ row.human_takeovers || 0 }</td>
										<td>{ row.unique_visitors || 0 }</td>
									</tr>
								) ) }
							</tbody>
						</table>
						{ totalPages > 1 && (
							<div className="aime-table-pagination">
								<Button variant="secondary" disabled={ dailyPage <= 1 } onClick={ () => setDailyPage( dailyPage - 1 ) }>
									{ __( '\u2190 Previous', 'ai-marketing-expert' ) }
								</Button>
								<span className="aime-pagination-info">
									{ __( 'Page', 'ai-marketing-expert' ) } { dailyPage } / { totalPages }
								</span>
								<Button variant="secondary" disabled={ dailyPage >= totalPages } onClick={ () => setDailyPage( dailyPage + 1 ) }>
									{ __( 'Next \u2192', 'ai-marketing-expert' ) }
								</Button>
							</div>
						) }
					</Card>
				);
			} )() }

			{ /* Recent Conversations */ }
			<Card
				title={ __( 'Recent Conversations', 'ai-marketing-expert' ) }
				actions={
					<Button variant="link" onClick={ () => onNavigate( 'conversations' ) }>
						{ __( 'View All', 'ai-marketing-expert' ) }
					</Button>
				}
			>
				{ stats?.recent_conversations?.length > 0 ? (
					<table className="aime-table">
						<thead>
							<tr>
								<th>{ __( 'Visitor', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Bot', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Status', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Messages', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Started', 'ai-marketing-expert' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ stats.recent_conversations.map( ( c ) => (
								<tr
									key={ c.id }
									className="aime-clickable-row"
									onClick={ () => onNavigate( 'conversation', { id: c.id } ) }
								>
									<td>
										<div className="aime-contact-cell">
											<strong>{ c.visitor_name || __( 'Anonymous', 'ai-marketing-expert' ) }</strong>
											{ c.visitor_email && <small>{ c.visitor_email }</small> }
										</div>
									</td>
									<td>{ c.bot_name || '\u2014' }</td>
									<td>
										<span
											className="aime-status-badge"
											style={ { background: CONVERSATION_STATUS_COLORS[ c.status ] || '#9e9e9e' } }
										>
											{ CONVERSATION_STATUS_LABELS[ c.status ] || c.status }
										</span>
									</td>
									<td>{ c.message_count || 0 }</td>
									<td>{ c.created_at?.split( ' ' )[ 0 ] }</td>
								</tr>
							) ) }
						</tbody>
					</table>
				) : (
					<p className="aime-empty-msg">{ __( 'No conversations yet. Create a chatbot to get started!', 'ai-marketing-expert' ) }</p>
				) }
			</Card>
		</div>
	);
};

export default Analytics;
