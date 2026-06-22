/**
 * Dashboard home page - aggregated analytics from all modules.
 */

import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import {
	ResponsiveContainer,
	LineChart, Line,
	XAxis, YAxis, Tooltip, CartesianGrid, Legend,
	PieChart, Pie, Cell,
} from 'recharts';

const CircleGauge = ( { value, color, size = 160, strokeWidth = 16 } ) => {
	const r = ( size - strokeWidth ) / 2;
	const circ = 2 * Math.PI * r;
	const offset = circ - ( Math.min( Math.max( value, 0 ), 100 ) / 100 ) * circ;
	return (
		<svg width={ size } height={ size } style={ { display: 'block', margin: '0 auto' } }>
			<circle cx={ size / 2 } cy={ size / 2 } r={ r } fill="none" stroke="#e8eef5" strokeWidth={ strokeWidth } />
			<circle
				cx={ size / 2 } cy={ size / 2 } r={ r }
				fill="none"
				stroke={ color }
				strokeWidth={ strokeWidth }
				strokeDasharray={ circ }
				strokeDashoffset={ offset }
				strokeLinecap="round"
				style={ { transform: `rotate(-90deg)`, transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' } }
			/>
		</svg>
	);
};
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import useApi from '../../../hooks/useApi';
import { apiGet } from '../../../utils/api';
import usePro from '../../../hooks/usePro';
import { menuUrl } from '../../../utils/menuUrl';

const COLORS = [ '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#f44336', '#00bcd4' ];

const MODULE_LINE_COLORS = {
	email:   '#2196f3',
	content: '#4caf50',
	seo:     '#1565c0',
	chatbot: '#9c27b0',
	social:  '#ff9800',
};

// Static dummy data shown to free users behind the blur overlay.
const ACTIVITY_TRENDS_DEMO = ( () => {
	const base = { email: 220, content: 100, seo: 50, chatbot: 80, social: 60 };
	const result = [];
	for ( let i = 29; i >= 0; i-- ) {
		const d = new Date();
		d.setDate( d.getDate() - i );
		result.push( {
			date:    `${ d.getMonth() + 1 }/${ d.getDate() }`,
			email:   Math.round( base.email   + Math.sin( i * 0.35 ) * 120 + i * 6 ),
			content: Math.round( base.content + Math.sin( i * 0.28 ) *  80 + i * 5 ),
			seo:     Math.round( base.seo     + Math.cos( i * 0.42 ) *  60 + i * 4 ),
			chatbot: Math.round( base.chatbot + Math.sin( i * 0.55 ) *  50 + i * 3 ),
			social:  Math.round( base.social  + Math.cos( i * 0.31 ) *  40 + i * 2 ),
		} );
	}
	return result;
} )();

const OverviewPage = () => {
	const { loading, get } = useApi();
	const { hasPro } = usePro();
	const [ stats, setStats ] = useState( null );
	const [ error, setError ] = useState( '' );
	const [ aiProviderCount, setAiProviderCount ] = useState( null );
	const [ smtpConnectionCount, setSmtpConnectionCount ] = useState( null );
	const [ activityTrends, setActivityTrends ] = useState( [] );

	useEffect( () => {
		loadStats();
		loadConnectionCounts();
		loadActivityTrends();
	}, [] );

	const loadStats = async () => {
		try {
			const data = await get( '/dashboard/stats' );
			setStats( data );
		} catch ( err ) {
			setError( err.message || __( 'Failed to load dashboard stats.', 'ai-marketing-expert' ) );
		}
	};

	const loadActivityTrends = async () => {
		try {
			const data = await get( '/dashboard/activity-trends', { days: 30 } );
			if ( Array.isArray( data ) ) {
				setActivityTrends( data );
			}
		} catch ( e ) {
			// Silent — chart simply won't render if unavailable.
		}
	};

	const loadConnectionCounts = async () => {
		const [ aiResult, smtpResult ] = await Promise.allSettled( [
			apiGet( '/ai/connections' ),
			apiGet( '/email/smtp' ),
		] );

		if ( aiResult.status === 'fulfilled' ) {
			setAiProviderCount( Array.isArray( aiResult.value?.connections ) ? aiResult.value.connections.length : 0 );
		}

		if ( smtpResult.status === 'fulfilled' ) {
			setSmtpConnectionCount( Array.isArray( smtpResult.value ) ? smtpResult.value.length : 0 );
		}
	};

	if ( loading && ! stats ) {
		return <Loader text={ __( 'Loading dashboard...', 'ai-marketing-expert' ) } />;
	}

	const email   = stats?.modules?.[ 'email-marketing' ] || {};
	const content = stats?.modules?.[ 'content-generator' ] || {};
	const chatbot = stats?.modules?.chatbot || {};
	const social  = stats?.modules?.[ 'social-media' ] || {};
	const seo     = stats?.modules?.seo || {};
	const proUrl  = window.aimeData?.proUrl || '#/pro';
	const connectionsLoaded = aiProviderCount !== null && smtpConnectionCount !== null;
	const showAiProviderConnect = aiProviderCount === null ? true : aiProviderCount === 0;
	const showSmtpConnect = smtpConnectionCount === null ? true : smtpConnectionCount === 1;
	const showDashboardNotice = connectionsLoaded && ( aiProviderCount === 0 || smtpConnectionCount === 1 );
	const showDashboardHero = ! connectionsLoaded || showDashboardNotice;

	/* ------ Module overview bar chart ------ */
	const moduleBarData = [
		{
			name: __( 'Email', 'ai-marketing-expert' ),
			value: Number( email.total_campaigns || 0 ),
			metric: __( 'Campaigns', 'ai-marketing-expert' ),
		},
		{
			name: __( 'Content', 'ai-marketing-expert' ),
			value: Number( content.published_articles || 0 ),
			metric: __( 'Published', 'ai-marketing-expert' ),
		},
		{
			name: __( 'SEO', 'ai-marketing-expert' ),
			value: Number( seo.total_keywords || 0 ),
			metric: __( 'Keywords', 'ai-marketing-expert' ),
		},
		{
			name: __( 'Chatbot', 'ai-marketing-expert' ),
			value: Number( chatbot.total_messages || 0 ),
			metric: __( 'Messages', 'ai-marketing-expert' ),
		},
		{
			name: __( 'Social', 'ai-marketing-expert' ),
			value: Number( social.published_month || 0 ),
			metric: __( 'Published', 'ai-marketing-expert' ),
		},
	];

	/* ------ Content status pie ------ */
	const contentPieData = [
		{ name: __( 'Published', 'ai-marketing-expert' ), value: Number( content.published_articles || 0 ) },
		{ name: __( 'Draft', 'ai-marketing-expert' ), value: Number( content.draft_articles || 0 ) },
	].filter( ( d ) => d.value > 0 );

	/* ------ Chatbot pie ------ */
	const chatbotPieData = [
		{ name: __( 'Active', 'ai-marketing-expert' ), value: Number( chatbot.active_conversations || 0 ) },
		{
			name: __( 'Closed', 'ai-marketing-expert' ),
			value: Math.max( 0, Number( chatbot.total_conversations || 0 ) - Number( chatbot.active_conversations || 0 ) ),
		},
	].filter( ( d ) => d.value > 0 );

	const emailPerformanceData = [
		{ label: __( 'Campaigns', 'ai-marketing-expert' ), value: Number( email.total_campaigns || 0 ), color: '#2196f3' },
		{ label: __( 'Emails Sent', 'ai-marketing-expert' ), value: Number( email.emails_sent || 0 ), color: '#4caf50' },
		{ label: __( 'Automations', 'ai-marketing-expert' ), value: Number( email.total_automations || 0 ), color: '#9c27b0' },
	].filter( ( d ) => d.value > 0 );

	const seoPerformanceData = [
		{ label: __( 'Keywords', 'ai-marketing-expert' ), value: Number( seo.total_keywords || 0 ), color: '#1565c0' },
		{ label: __( 'Audits', 'ai-marketing-expert' ), value: Number( seo.total_audits || 0 ), color: '#4caf50' },
		{ label: __( 'Tracked', 'ai-marketing-expert' ), value: Number( seo.tracked_keywords || 0 ), color: '#9c27b0' },
	].filter( ( d ) => d.value > 0 );

	const emailOpenRateValue = Math.max( 0, Math.min( Number( email.open_rate || 0 ), 100 ) );
	const seoAvgScoreValue = Math.max( 0, Math.min( Number( seo.avg_audit_score || 0 ), 100 ) );

	/* ------ Module summary cards ------ */
	const modules = [
		{
			key: 'email',
			title: __( 'Email Marketing', 'ai-marketing-expert' ),
			color: '#2196f3',
			href: menuUrl( 'email' ),
			items: [
				{ label: __( 'Contacts', 'ai-marketing-expert' ), value: email.total_contacts || 0 },
				{ label: __( 'Active', 'ai-marketing-expert' ), value: email.active_contacts || 0 },
				{ label: __( 'Campaigns', 'ai-marketing-expert' ), value: email.total_campaigns || 0 },
				{ label: __( 'Emails Sent', 'ai-marketing-expert' ), value: email.emails_sent || 0 },
				{ label: __( 'Open Rate', 'ai-marketing-expert' ), value: `${ parseFloat( email.open_rate || 0 ).toFixed( 1 ) }%` },
				{ label: __( 'Automations', 'ai-marketing-expert' ), value: email.total_automations || 0 },
			],
		},
		{
			key: 'content',
			title: __( 'Content Generator', 'ai-marketing-expert' ),
			color: '#4caf50',
			href: menuUrl( 'content' ),
			items: [
				{ label: __( 'Total Articles', 'ai-marketing-expert' ), value: content.total_articles || 0 },
				{ label: __( 'Published', 'ai-marketing-expert' ), value: content.published_articles || 0 },
				{ label: __( 'Drafts', 'ai-marketing-expert' ), value: content.draft_articles || 0 },
				{ label: __( 'Avg SEO Score', 'ai-marketing-expert' ), value: `${ parseFloat( content.avg_seo_score || 0 ).toFixed( 0 ) }%` },
				{ label: __( 'Total Words', 'ai-marketing-expert' ), value: Number( content.total_words || 0 ).toLocaleString() },
			],
		},
		{
			key: 'seo',
			title: __( 'SEO Analyzer', 'ai-marketing-expert' ),
			color: '#1565c0',
			href: menuUrl( 'seo' ),
			items: [
				{ label: __( 'Keywords', 'ai-marketing-expert' ), value: seo.total_keywords || 0 },
				{ label: __( 'Tracked', 'ai-marketing-expert' ), value: seo.tracked_keywords || 0 },
				{ label: __( 'Audits', 'ai-marketing-expert' ), value: seo.total_audits || 0 },
				{ label: __( 'Avg Score', 'ai-marketing-expert' ), value: `${ parseFloat( seo.avg_audit_score || 0 ).toFixed( 0 ) }%` },
			],
		},
		{
			key: 'chatbot',
			title: __( 'AI Chatbot', 'ai-marketing-expert' ),
			color: '#9c27b0',
			href: menuUrl( 'chatbot' ),
			items: [
				{ label: __( 'Bots', 'ai-marketing-expert' ), value: chatbot.total_bots || 0 },
				{ label: __( 'Conversations', 'ai-marketing-expert' ), value: chatbot.total_conversations || 0 },
				{ label: __( 'Active', 'ai-marketing-expert' ), value: chatbot.active_conversations || 0 },
				{ label: __( 'Messages', 'ai-marketing-expert' ), value: chatbot.total_messages || 0 },
				{ label: __( 'Leads', 'ai-marketing-expert' ), value: chatbot.leads_captured || 0 },
			],
		},
		{
			key: 'social',
			title: __( 'Social Media', 'ai-marketing-expert' ),
			color: '#ff9800',
			href: menuUrl( 'social' ),
			items: [
				{ label: __( 'Accounts', 'ai-marketing-expert' ), value: social.total_accounts || 0 },
				{ label: __( 'Posts This Month', 'ai-marketing-expert' ), value: social.posts_this_month || 0 },
				{ label: __( 'Scheduled', 'ai-marketing-expert' ), value: social.scheduled_posts || 0 },
				{ label: __( 'Published', 'ai-marketing-expert' ), value: social.published_month || 0 },
			],
		},
	];

	const quickModuleLinks = [
		{ label: __( 'Email Marketing', 'ai-marketing-expert' ), href: menuUrl( 'email' ) },
		{ label: __( 'SEO Analyzer', 'ai-marketing-expert' ), href: menuUrl( 'seo' ) },
		{ label: __( 'Content Generator', 'ai-marketing-expert' ), href: menuUrl( 'content' ) },
		{ label: __( 'Chatbot', 'ai-marketing-expert' ), href: menuUrl( 'chatbot' ) },
		{ label: __( 'Social Media', 'ai-marketing-expert' ), href: menuUrl( 'social' ) },
		{ label: __( 'AI Providers', 'ai-marketing-expert' ), href: menuUrl( 'ai-providers' ) },
	];

	return (
		<div className="aime-overview">
			{ /* Page header */ }
			<div className="aime-page-header">
				<h2>{ __( 'Dashboard', 'ai-marketing-expert' ) }</h2>
			</div>

			{ error && <Notice type="error" message={ error } /> }

			{ showDashboardHero && (
				<Card className={ `aime-dashboard-hero-card${ connectionsLoaded ? '' : ' aime-dashboard-hero-card--loading' }` }>
					<div className="aime-dashboard-hero">
						<div>
							<span className="aime-dashboard-hero__eyebrow">{ __( 'Marketing workspace', 'ai-marketing-expert' ) }</span>
							<h3>{ __( 'Plan, create, automate, and measure every AI marketing workflow.', 'ai-marketing-expert' ) }</h3>
							<p>{ __( 'Use this dashboard as the single command center for all modules, quick links, and live performance signals.', 'ai-marketing-expert' ) }</p>
						</div>
						<div className="aime-dashboard-hero__actions">
							{ showAiProviderConnect && (
								<a href={ menuUrl( 'ai-providers' ) }><Button variant="primary">{ __( 'Connect AI Provider', 'ai-marketing-expert' ) }</Button></a>
							) }
							{ showSmtpConnect && (
								<a href={ `${ menuUrl( 'email' ) }#smtp` }><Button variant="secondary">{ __( 'Connect SMTP', 'ai-marketing-expert' ) }</Button></a>
							) }
						</div>
					</div>
				</Card>
			) }

			<div className="aime-module-quick-links" aria-label={ __( 'Quick module links', 'ai-marketing-expert' ) }>
				{ quickModuleLinks.map( ( item ) => (
					<a key={ item.label } href={ item.href }>{ item.label }</a>
				) ) }
			</div>

			{ /* Charts Grid */ }
			<div className="aime-charts-grid">
				{ /* Module Activity Line Chart — full width */ }
				<Card
					title={ __( 'Module Activity', 'ai-marketing-expert' ) }
					className="aime-chart-full-width"
				>
					{ hasPro ? (
						/* Pro: real time-series data */
						activityTrends.length > 0 ? (
							<ResponsiveContainer width="100%" height={ 300 }>
								<LineChart
									data={ activityTrends }
									margin={ { top: 10, right: 20, left: 0, bottom: 0 } }
								>
									<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
									<XAxis dataKey="date" tick={ { fontSize: 11 } } interval={ Math.floor( activityTrends.length / 8 ) } />
									<YAxis allowDecimals={ false } tick={ { fontSize: 11 } } />
									<Tooltip />
									<Legend />
									<Line type="monotone" dataKey="email"   name={ __( 'Email',   'ai-marketing-expert' ) } stroke={ MODULE_LINE_COLORS.email }   strokeWidth={ 2 } dot={ false } />
									<Line type="monotone" dataKey="content" name={ __( 'Content', 'ai-marketing-expert' ) } stroke={ MODULE_LINE_COLORS.content } strokeWidth={ 2 } dot={ false } />
									<Line type="monotone" dataKey="seo"     name={ __( 'SEO',     'ai-marketing-expert' ) } stroke={ MODULE_LINE_COLORS.seo }     strokeWidth={ 2 } dot={ false } />
									<Line type="monotone" dataKey="chatbot" name={ __( 'Chatbot', 'ai-marketing-expert' ) } stroke={ MODULE_LINE_COLORS.chatbot } strokeWidth={ 2 } dot={ false } />
									<Line type="monotone" dataKey="social"  name={ __( 'Social',  'ai-marketing-expert' ) } stroke={ MODULE_LINE_COLORS.social }  strokeWidth={ 2 } dot={ false } />
								</LineChart>
							</ResponsiveContainer>
						) : (
							<p className="aime-empty-msg">{ __( 'No activity data yet.', 'ai-marketing-expert' ) }</p>
						)
					) : (
						/* Free: blurred demo chart + upgrade overlay */
						<div className="aime-chart-pro-gate">
							<div className="aime-chart-pro-gate__blur" aria-hidden="true">
								<ResponsiveContainer width="100%" height={ 300 }>
									<LineChart
										data={ ACTIVITY_TRENDS_DEMO }
										margin={ { top: 10, right: 20, left: 0, bottom: 0 } }
									>
										<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
										<XAxis dataKey="date" tick={ { fontSize: 11 } } interval={ 4 } />
										<YAxis allowDecimals={ false } tick={ { fontSize: 11 } } />
										<Legend />
										<Line type="monotone" dataKey="email"   name={ __( 'Email',   'ai-marketing-expert' ) } stroke={ MODULE_LINE_COLORS.email }   strokeWidth={ 2 } dot={ false } />
										<Line type="monotone" dataKey="content" name={ __( 'Content', 'ai-marketing-expert' ) } stroke={ MODULE_LINE_COLORS.content } strokeWidth={ 2 } dot={ false } />
										<Line type="monotone" dataKey="seo"     name={ __( 'SEO',     'ai-marketing-expert' ) } stroke={ MODULE_LINE_COLORS.seo }     strokeWidth={ 2 } dot={ false } />
										<Line type="monotone" dataKey="chatbot" name={ __( 'Chatbot', 'ai-marketing-expert' ) } stroke={ MODULE_LINE_COLORS.chatbot } strokeWidth={ 2 } dot={ false } />
										<Line type="monotone" dataKey="social"  name={ __( 'Social',  'ai-marketing-expert' ) } stroke={ MODULE_LINE_COLORS.social }  strokeWidth={ 2 } dot={ false } />
									</LineChart>
								</ResponsiveContainer>
							</div>
							<div className="aime-chart-pro-gate__overlay">
								<p className="aime-chart-pro-gate__msg">{ __( 'Upgrade to premium for advanced stats!', 'ai-marketing-expert' ) }</p>
								<a
									href={ proUrl }
									target="_blank"
									rel="noopener noreferrer"
									className="aime-chart-pro-gate__btn"
								>
									{ __( 'Upgrade to Pro', 'ai-marketing-expert' ) }
								</a>
							</div>
						</div>
					) }
				</Card>

				{ /* Content Status Pie */ }
				<Card title={ __( 'Content Status', 'ai-marketing-expert' ) }>
					{ contentPieData.length > 0 ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<PieChart>
								<Pie
									data={ contentPieData }
									cx="50%"
									cy="50%"
									innerRadius={ 50 }
									outerRadius={ 90 }
									paddingAngle={ 4 }
									dataKey="value"
									label={ ( { name, value } ) => `${ name }: ${ value }` }
								>
									{ contentPieData.map( ( entry, index ) => (
										<Cell key={ entry.name } fill={ COLORS[ index % COLORS.length ] } />
									) ) }
								</Pie>
								<Legend />
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					) : (
						<p className="aime-empty-msg">{ __( 'No articles yet.', 'ai-marketing-expert' ) }</p>
					) }
				</Card>

				{ /* Chatbot Conversations Pie */ }
				<Card title={ __( 'Chatbot Conversations', 'ai-marketing-expert' ) }>
					{ chatbotPieData.length > 0 ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<PieChart>
								<Pie
									data={ chatbotPieData }
									cx="50%"
									cy="50%"
									innerRadius={ 50 }
									outerRadius={ 90 }
									paddingAngle={ 4 }
									dataKey="value"
									label={ ( { name, value } ) => `${ name }: ${ value }` }
								>
									{ chatbotPieData.map( ( entry, index ) => (
										<Cell key={ entry.name } fill={ [ '#9c27b0', '#e0e0e0' ][ index ] || COLORS[ index ] } />
									) ) }
								</Pie>
								<Legend />
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					) : (
						<p className="aime-empty-msg">{ __( 'No conversations yet.', 'ai-marketing-expert' ) }</p>
					) }
				</Card>

				<Card title={ __( 'Email Performance', 'ai-marketing-expert' ) }>
					{ emailPerformanceData.length > 0 ? (
						<div className="aime-performance-panel">
							<div className="aime-performance-panel__gauge">
								<CircleGauge value={ emailOpenRateValue } color="#ff9800" />
								<div className="aime-performance-gauge-label">
									<span className="aime-performance-gauge-value">{ `${ emailOpenRateValue.toFixed( 1 ) }%` }</span>
									<span className="aime-performance-gauge-text">{ __( 'Open rate', 'ai-marketing-expert' ) }</span>
								</div>
							</div>
							<div className="aime-performance-panel__metrics">
								{ emailPerformanceData.map( ( item ) => (
									<div key={ item.label } className="aime-performance-metric">
										<span className="aime-performance-metric__value">{ Number( item.value ).toLocaleString() }</span>
										<span className="aime-performance-metric__label">{ item.label }</span>
									</div>
								) ) }
							</div>
						</div>
					) : (
						<p className="aime-empty-msg">{ __( 'No email performance data yet.', 'ai-marketing-expert' ) }</p>
					) }
				</Card>

				<Card title={ __( 'SEO Performance', 'ai-marketing-expert' ) }>
					{ seoPerformanceData.length > 0 ? (
						<div className="aime-performance-panel">
							<div className="aime-performance-panel__gauge">
								<CircleGauge value={ seoAvgScoreValue } color="#1565c0" />
								<div className="aime-performance-gauge-label">
									<span className="aime-performance-gauge-value">{ `${ seoAvgScoreValue.toFixed( 0 ) }%` }</span>
									<span className="aime-performance-gauge-text">{ __( 'Average score', 'ai-marketing-expert' ) }</span>
								</div>
							</div>
							<div className="aime-performance-panel__metrics">
								{ seoPerformanceData.map( ( item ) => (
									<div key={ item.label } className="aime-performance-metric">
										<span className="aime-performance-metric__value">{ Number( item.value ).toLocaleString() }</span>
										<span className="aime-performance-metric__label">{ item.label }</span>
									</div>
								) ) }
							</div>
						</div>
					) : (
						<p className="aime-empty-msg">{ __( 'No SEO performance data yet.', 'ai-marketing-expert' ) }</p>
					) }
				</Card>
			</div>

			{ /* Module Summary Cards */ }
			<h3 className="aime-section-title">{ __( 'Module Overview', 'ai-marketing-expert' ) }</h3>
			<div className="aime-module-cards-grid">
				{ modules.map( ( mod ) => (
					<Card
						key={ mod.key }
						className="aime-module-summary-card"
						title={ mod.title }
						actions={
							<a href={ mod.href } className="aime-link">
								{ __( 'View \u2192', 'ai-marketing-expert' ) }
							</a>
						}
					>
						<div className="aime-module-summary-stripe" style={ { backgroundColor: mod.color } } />
						<div className="aime-module-summary-stats">
							{ mod.items.map( ( item ) => (
								<div key={ item.label } className="aime-module-summary-stat">
									<span className="aime-module-summary-value">{ item.value }</span>
									<span className="aime-module-summary-label">{ item.label }</span>
								</div>
							) ) }
						</div>
					</Card>
				) ) }
			</div>

			{ ! hasPro && (
				<Card className="aime-upgrade-card">
					<div className="aime-upgrade-banner">
						<div>
							<h3>{ __( 'Unlock Pro Features', 'ai-marketing-expert' ) }</h3>
							<p>{ __( 'Get unlimited AI generations, advanced analytics, priority support, and more.', 'ai-marketing-expert' ) }</p>
						</div>
						<a href={ proUrl } target="_blank" rel="noopener noreferrer">
							<Button variant="primary">{ __( 'Upgrade to Pro', 'ai-marketing-expert' ) }</Button>
						</a>
					</div>
				</Card>
			) }
		</div>
	);
};

export default OverviewPage;
