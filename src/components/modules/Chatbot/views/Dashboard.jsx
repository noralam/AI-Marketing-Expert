/**
 * Chatbot Dashboard - overview KPIs, usage bar, conversation trends, recent activity.
 */

import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import Card from '../../../common/Card';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';

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

const Dashboard = ( { onNavigate } ) => {
	const { get, loading, error, clearError } = useApi();
	const { hasPro, freeLimits } = usePro();
	const [ stats, setStats ] = useState( null );
	const [ trends, setTrends ] = useState( [] );

	useEffect( () => {
		const load = async () => {
			try {
				const [ overview, trendData ] = await Promise.all( [
					get( '/chatbot/analytics/overview', { days: 14 } ),
					get( '/chatbot/analytics/conversations', { days: 14 } ),
				] );
				setStats( overview );
				setTrends( Array.isArray( trendData ) ? trendData : [] );
			} catch ( e ) {
				// silent
			}
		};
		load();
	}, [ get ] );

	if ( loading && ! stats ) {
		return <Loader text={ __( 'Loading dashboard...', 'ai-marketing-expert' ) } />;
	}

	const monthlyConversations = stats?.conversations_this_month || 0;
	const monthlyLimit = freeLimits?.chatbot_conversations_monthly || 100;

	const kpis = [
		{ label: __( 'Total Conversations', 'ai-marketing-expert' ), value: stats?.total_conversations || 0 },
		{ label: __( 'Total Messages', 'ai-marketing-expert' ), value: stats?.total_messages || 0 },
		{ label: __( 'Leads Captured', 'ai-marketing-expert' ), value: stats?.leads_captured || 0 },
		{ label: __( 'Active Now', 'ai-marketing-expert' ), value: stats?.active_conversations || 0 },
		{ label: __( 'Avg Satisfaction', 'ai-marketing-expert' ), value: stats?.avg_satisfaction ? `${ stats.avg_satisfaction }/5` : '\u2014' },
	];

	const maxTrendValue = trends.length > 0
		? Math.max( ...trends.map( ( d ) => d.total_conversations || 0 ), 1 )
		: 1;

	return (
		<div className="aime-chatbot-dashboard">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<h2>{ __( 'AI Chatbot', 'ai-marketing-expert' ) }</h2>
				<div className="aime-page-header-actions">
					<Button variant="primary" onClick={ () => onNavigate( 'new-bot' ) }>
						{ __( '+ New Chatbot', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</div>

			{ /* KPI cards */ }
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

			<div className="aime-charts-grid">
				{ /* Conversation trends chart */ }
				{ trends.length > 0 && (
					<Card title={ __( 'Conversations (Last 14 Days)', 'ai-marketing-expert' ) }>
						<div className="aime-bar-chart">
							{ trends.map( ( item ) => (
								<div key={ item.date } className="aime-bar-item">
									<div
										className="aime-bar"
										style={ {
											height: `${ Math.max( 4, ( ( item.total_conversations || 0 ) / maxTrendValue ) * 120 ) }px`,
										} }
										title={ `${ item.date }: ${ item.total_conversations || 0 }` }
									/>
									<span className="aime-bar-label">{ item.date.slice( 5 ) }</span>
								</div>
							) ) }
						</div>
					</Card>
				) }

				{ /* Bot status breakdown */ }
				{ stats?.bots?.length > 0 && (
					<Card title={ __( 'Chatbots', 'ai-marketing-expert' ) }
						actions={
							<Button variant="link" onClick={ () => onNavigate( 'bots' ) }>
								{ __( 'Manage', 'ai-marketing-expert' ) }
							</Button>
						}
					>
						<div className="aime-status-grid">
							{ stats.bots.map( ( bot ) => (
								<div key={ bot.id } className="aime-status-item">
									<span
										className="aime-status-dot"
										style={ { background: bot.is_active ? '#4caf50' : '#9e9e9e' } }
									/>
									<span className="aime-status-name">{ bot.name }</span>
									<span className="aime-status-count">
										{ bot.is_active ? __( 'Active', 'ai-marketing-expert' ) : __( 'Inactive', 'ai-marketing-expert' ) }
									</span>
								</div>
							) ) }
						</div>
					</Card>
				) }
			</div>

			{ /* Recent conversations */ }
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

export default Dashboard;
