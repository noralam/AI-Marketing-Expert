/**
 * Dashboard home page - aggregated analytics from all modules.
 */

import { useState, useEffect } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import {
	ResponsiveContainer,
	AreaChart, Area,
	XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

import Card from '../../common/Card';
import ArcGauge from '../../common/ArcGauge';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import EmptyState from '../../common/EmptyState';
import useApi from '../../../hooks/useApi';
import { apiGet } from '../../../utils/api';
import usePro from '../../../hooks/usePro';
import { menuUrl } from '../../../utils/menuUrl';

/**
 * Room wayfinding colours.
 *
 * These MUST match the --aime-room-* tokens in src/styles/global.scss and the
 * [data-module] accent themes above them. The Overview is a launchpad: a bar,
 * line or stripe standing for Email has to be the same colour the Email module
 * paints itself, or the dashboard sends people to the wrong door.
 *
 * Literal hex rather than var() because Recharts writes stroke/fill as SVG
 * presentation attributes, where custom properties do not resolve.
 */
const ROOM = {
	email:   '#BE123C',
	content: '#4338CA',
	seo:     '#B45309',
	chatbot: '#7C3AED',
	social:  '#0E7490',

	/*
	 * Workflow Automation is not a sixth room — the stylesheet has no
	 * `[data-module="workflow-automation"]` accent, and inventing one here would
	 * put a colour on the page that no other surface in the plugin can match.
	 * It runs the other five, so it takes the house green: the corridor colour,
	 * not a room colour.
	 */
	workflow: '#1B5E20',
};

// Chart chrome, tinted to the green canvas instead of a cool blue-grey.
const CHART_GRID = '#eaf2ea';
const CHART_TICK = '#5f7562';
const CHART_CURSOR = '#8fa893';

// Draw order for the stacked activity chart. Fixed rather than derived, so a
// band never swaps position between two renders of the same data.
const SERIES = [ 'email', 'content', 'seo', 'chatbot', 'social' ];

/**
 * Ranges the activity endpoint will actually honour.
 *
 * The REST route clamps `days` to 7–90, so offering a year would be a control
 * that silently returns three months. Every option here is a range the server
 * can really answer.
 */
const RANGES = [ 7, 30, 90 ];

/*
 * The synthetic 30-day series that used to sit behind the free tier's blurred
 * chart is gone. The activity endpoint is admin-permission only, with no Pro
 * check, so the real chart was always available — the blur was showing people
 * invented numbers about their own site to sell them a feature they had.
 */

/**
 * Activity chart tooltip.
 *
 * Recharts' default tooltip is an unstyled white box that ignores the card
 * language around it, and on a stacked chart it lists the series bottom-up —
 * the reverse of the order they are painted, so the colour you are pointing at
 * is never the row your eye lands on first. This reverses the payload and adds
 * the total, which is the number a stack is actually asking you to read.
 */
const ActivityTooltip = ( { active, payload, label } ) => {
	if ( ! active || ! payload?.length ) {
		return null;
	}

	const total = payload.reduce( ( sum, entry ) => sum + Number( entry.value || 0 ), 0 );

	return (
		<div className="aime-chart-tooltip">
			<div className="aime-chart-tooltip__date">{ label }</div>
			<ul className="aime-chart-tooltip__list">
				{ [ ...payload ].reverse().map( ( entry ) => (
					<li key={ entry.dataKey } className="aime-chart-tooltip__row">
						<span className="aime-chart-tooltip__dot" style={ { backgroundColor: entry.color || entry.stroke } } />
						<span className="aime-chart-tooltip__name">{ entry.name }</span>
						<span className="aime-chart-tooltip__value">{ Number( entry.value || 0 ).toLocaleString() }</span>
					</li>
				) ) }
			</ul>
			<div className="aime-chart-tooltip__total">
				<span>{ __( 'Total', 'ai-marketing-expert' ) }</span>
				<span>{ total.toLocaleString() }</span>
			</div>
		</div>
	);
};

/**
 * Stacked activity chart.
 *
 * Five separate lines answered "how is each module trending" and nothing else;
 * at the density this data arrives in they mostly crossed each other. Stacked
 * bands answer the question the dashboard is actually for — is anything
 * happening, and which room is driving it — and the height of the stack is
 * legible from across the room in a way five 2px strokes never were.
 */
const ActivityChart = ( { data, labels, height = 300 } ) => (
	<ResponsiveContainer width="100%" height={ height }>
		<AreaChart data={ data } margin={ { top: 8, right: 8, left: -12, bottom: 0 } }>
			<defs>
				{ SERIES.map( ( key ) => (
					<linearGradient key={ key } id={ `aime-area-${ key }` } x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={ ROOM[ key ] } stopOpacity={ 0.5 } />
						<stop offset="100%" stopColor={ ROOM[ key ] } stopOpacity={ 0.12 } />
					</linearGradient>
				) ) }
			</defs>
			{ /* Horizontal rules only. Vertical ones fence the bands into columns
			     and fight the shape the stack is drawing. */ }
			<CartesianGrid vertical={ false } stroke={ CHART_GRID } />
			<XAxis
				dataKey="date"
				tickLine={ false }
				axisLine={ false }
				minTickGap={ 28 }
				tick={ { fontSize: 11, fill: CHART_TICK } }
			/>
			<YAxis
				allowDecimals={ false }
				tickLine={ false }
				axisLine={ false }
				width={ 44 }
				tick={ { fontSize: 11, fill: CHART_TICK } }
			/>
			<Tooltip
				content={ <ActivityTooltip /> }
				cursor={ { stroke: CHART_CURSOR, strokeDasharray: '3 3' } }
			/>
			{ SERIES.map( ( key ) => (
				<Area
					key={ key }
					type="monotone"
					dataKey={ key }
					name={ labels[ key ] }
					stackId="activity"
					stroke={ ROOM[ key ] }
					strokeWidth={ 1.5 }
					fill={ `url(#aime-area-${ key })` }
					activeDot={ { r: 3, strokeWidth: 0 } }
				/>
			) ) }
		</AreaChart>
	</ResponsiveContainer>
);

const OverviewPage = () => {
	const { loading, get } = useApi();
	const { hasPro } = usePro();
	const [ stats, setStats ] = useState( null );
	const [ error, setError ] = useState( '' );
	const [ aiProviderCount, setAiProviderCount ] = useState( null );
	const [ smtpConnectionCount, setSmtpConnectionCount ] = useState( null );
	const [ connectionsFailed, setConnectionsFailed ] = useState( false );
	const [ activityTrends, setActivityTrends ] = useState( [] );
	const [ trendsFailed, setTrendsFailed ] = useState( false );
	const [ trendsLoading, setTrendsLoading ] = useState( true );
	const [ rangeDays, setRangeDays ] = useState( 30 );

	useEffect( () => {
		loadStats();
		loadConnectionCounts();
	}, [] );

	// The chart owns its own fetch because it is the only thing on the page
	// with a control attached to it. Re-running the whole dashboard to change a
	// date range would blank four cards that did not change.
	useEffect( () => {
		loadActivityTrends( rangeDays );
	}, [ rangeDays ] );

	const loadStats = async () => {
		try {
			const data = await get( '/dashboard/stats' );
			setStats( data );
		} catch ( err ) {
			setError( err.message || __( 'Could not load your dashboard stats. Reload the page to try again.', 'ai-marketing-expert' ) );
		}
	};

	const loadActivityTrends = async ( days ) => {
		setTrendsLoading( true );
		setTrendsFailed( false );
		try {
			const data = await get( '/dashboard/activity-trends', { days } );
			setActivityTrends( Array.isArray( data ) ? data : [] );
		} catch ( e ) {
			// An empty array and a failed request look identical downstream, and
			// the empty state for this chart says "Nothing has run yet." — which
			// is a claim about the user's data, not about the request. Saying it
			// when we never got an answer is worse than saying nothing.
			setActivityTrends( [] );
			setTrendsFailed( true );
		} finally {
			setTrendsLoading( false );
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

		// A lookup that never resolved leaves its count at null forever, which
		// would pin the hero in its loading skin for the rest of the session.
		// Record the failure so the page can settle without claiming to know
		// what is or is not connected.
		if ( aiResult.status === 'rejected' || smtpResult.status === 'rejected' ) {
			setConnectionsFailed( true );
		}
	};

	if ( loading && ! stats ) {
		return <Loader variant="dashboard" text={ __( 'Loading dashboard…', 'ai-marketing-expert' ) } />;
	}

	const email    = stats?.modules?.[ 'email-marketing' ] || {};
	const content  = stats?.modules?.[ 'content-generator' ] || {};
	const chatbot  = stats?.modules?.chatbot || {};
	const social   = stats?.modules?.[ 'social-media' ] || {};
	const seo      = stats?.modules?.seo || {};
	const workflow = stats?.modules?.[ 'workflow-automation' ] || {};
	const proUrl  = window.aimeData?.proUrl || '#/pro';
	/* ------ First-run setup gate ------
	 * A setup prompt is only honest when we actually know the answer. A count
	 * of null means "not looked up yet" and a failed lookup means "unknown" —
	 * neither is "not configured", so neither one earns a prompt. Telling
	 * someone to connect a provider they already connected is worse than
	 * saying nothing.
	 */
	const connectionsLoaded = connectionsFailed || ( aiProviderCount !== null && smtpConnectionCount !== null );
	const showAiProviderConnect = aiProviderCount === 0;
	const showSmtpConnect = smtpConnectionCount === 0;
	const showDashboardNotice = connectionsLoaded && ( showAiProviderConnect || showSmtpConnect );
	const showDashboardHero = ! connectionsLoaded || showDashboardNotice;

	// Nothing generated by AI works until a provider key exists, so this one
	// gates the value of every other module and outranks the SMTP prompt.
	const needsFirstSetup = showDashboardNotice && showAiProviderConnect;

	/* ------ Hero copy ------
	 * The hero only exists while something is unconfigured, so it should name
	 * the thing that is unconfigured. Describing what a dashboard is, to
	 * somebody already looking at the dashboard, spends the one piece of
	 * prominent space on the page saying nothing.
	 */
	const heroCopy = ! connectionsLoaded
		? {
			title: __( 'Checking your setup…', 'ai-marketing-expert' ),
			body: '',
		}
		: needsFirstSetup
			? {
				title: __( 'Add an AI provider key to switch the modules on.', 'ai-marketing-expert' ),
				body: __( 'Articles, SEO suggestions, chat replies, and social posts are generated with your own API key, so no module produces output until one is connected. You can add several providers and set a fallback order later.', 'ai-marketing-expert' ),
			}
			: {
				title: __( 'Connect an SMTP service to start sending email.', 'ai-marketing-expert' ),
				body: __( 'Subscribers, campaigns, and automations are already stored on this site, but WordPress needs an SMTP connection to deliver them. Every other module works without it.', 'ai-marketing-expert' ),
			};

	/*
	 * The band holds three gauges, and a gauge needs a bounded number — a count
	 * has no full, so an arc drawn over one is decoration. Open rate is bounded
	 * by definition. Lead capture rate is derived here rather than read from the
	 * API because no endpoint returns it: it is the share of conversations the
	 * bot turned into a lead, which is the only chatbot number that answers
	 * "is this working" rather than "did this happen".
	 */
	const emailOpenRateValue = Math.max( 0, Math.min( Number( email.open_rate || 0 ), 100 ) );

	const chatbotConversations = Number( chatbot.total_conversations || 0 );
	const chatbotLeadRateValue = chatbotConversations > 0
		? Math.max( 0, Math.min( ( Number( chatbot.leads_captured || 0 ) / chatbotConversations ) * 100, 100 ) )
		: 0;

	const seriesLabels = {
		email:   __( 'Email', 'ai-marketing-expert' ),
		content: __( 'Content', 'ai-marketing-expert' ),
		seo:     __( 'SEO', 'ai-marketing-expert' ),
		chatbot: __( 'Chatbot', 'ai-marketing-expert' ),
		social:  __( 'Social', 'ai-marketing-expert' ),
	};

	/* ------ Module summary cards ------
	 * `lead` is the module's health signal and renders as the card's big
	 * number. `share` is the part-of-whole pair that used to need a whole
	 * two-slice donut of its own — a stacked bar says the same thing in 8px of
	 * height and reads at a glance across five cards, which five separate pie
	 * charts never did. `stats` is the supporting detail.
	 *
	 * `activity` is the "has this room produced anything at all" test behind
	 * the rooms-in-use gauge. It sums the module's own totals rather than a
	 * single field, because a module counts as in use whether the user made
	 * bots or conversations, keywords or audits.
	 */
	const modules = [
		{
			key: 'email',
			title: __( 'Email Marketing', 'ai-marketing-expert' ),
			color: ROOM.email,
			href: menuUrl( 'email' ),
			lead: {
				label: __( 'Open Rate', 'ai-marketing-expert' ),
				value: `${ parseFloat( email.open_rate || 0 ).toFixed( 1 ) }%`,
			},
			share: {
				label: __( 'Active', 'ai-marketing-expert' ),
				value: Number( email.active_contacts || 0 ),
				restLabel: __( 'Unengaged', 'ai-marketing-expert' ),
				totalLabel: __( 'Subscribers', 'ai-marketing-expert' ),
				total: Number( email.total_contacts || 0 ),
			},
			stats: [
				{ label: __( 'Campaigns', 'ai-marketing-expert' ), value: email.total_campaigns || 0 },
				{ label: __( 'Emails Sent', 'ai-marketing-expert' ), value: email.emails_sent || 0 },
				{ label: __( 'Automations', 'ai-marketing-expert' ), value: email.total_automations || 0 },
			],
			activity: Number( email.total_campaigns || 0 ) + Number( email.emails_sent || 0 ) + Number( email.total_contacts || 0 ),
		},
		{
			key: 'content',
			title: __( 'Content Generator', 'ai-marketing-expert' ),
			color: ROOM.content,
			href: menuUrl( 'content' ),
			lead: {
				label: __( 'Published', 'ai-marketing-expert' ),
				value: content.published_articles || 0,
			},
			share: {
				label: __( 'Published', 'ai-marketing-expert' ),
				value: Number( content.published_articles || 0 ),
				restLabel: __( 'Drafts', 'ai-marketing-expert' ),
				totalLabel: __( 'Articles', 'ai-marketing-expert' ),
				total: Number( content.total_articles || 0 ),
			},
			stats: [
				{ label: __( 'Average SEO score', 'ai-marketing-expert' ), value: `${ parseFloat( content.avg_seo_score || 0 ).toFixed( 0 ) }%` },
				{ label: __( 'Total Words', 'ai-marketing-expert' ), value: Number( content.total_words || 0 ).toLocaleString() },
			],
			activity: Number( content.total_articles || 0 ),
		},
		{
			key: 'seo',
			title: __( 'SEO Analyzer', 'ai-marketing-expert' ),
			color: ROOM.seo,
			href: menuUrl( 'seo' ),
			lead: {
				label: __( 'Average score', 'ai-marketing-expert' ),
				value: `${ parseFloat( seo.avg_audit_score || 0 ).toFixed( 0 ) }%`,
			},
			share: {
				label: __( 'Tracked', 'ai-marketing-expert' ),
				value: Number( seo.tracked_keywords || 0 ),
				restLabel: __( 'Untracked', 'ai-marketing-expert' ),
				totalLabel: __( 'Keywords', 'ai-marketing-expert' ),
				total: Number( seo.total_keywords || 0 ),
			},
			stats: [
				{ label: __( 'Audits', 'ai-marketing-expert' ), value: seo.total_audits || 0 },
			],
			activity: Number( seo.total_keywords || 0 ) + Number( seo.total_audits || 0 ),
		},
		{
			key: 'chatbot',
			title: __( 'AI Chatbot', 'ai-marketing-expert' ),
			color: ROOM.chatbot,
			href: menuUrl( 'chatbot' ),
			lead: {
				label: __( 'Active Chats', 'ai-marketing-expert' ),
				value: chatbot.active_conversations || 0,
			},
			share: {
				label: __( 'Active', 'ai-marketing-expert' ),
				value: Number( chatbot.active_conversations || 0 ),
				restLabel: __( 'Closed', 'ai-marketing-expert' ),
				totalLabel: __( 'Conversations', 'ai-marketing-expert' ),
				total: Number( chatbot.total_conversations || 0 ),
			},
			stats: [
				{ label: __( 'Bots', 'ai-marketing-expert' ), value: chatbot.total_bots || 0 },
				{ label: __( 'Messages', 'ai-marketing-expert' ), value: chatbot.total_messages || 0 },
				{ label: __( 'Leads', 'ai-marketing-expert' ), value: chatbot.leads_captured || 0 },
			],
			activity: Number( chatbot.total_bots || 0 ) + Number( chatbot.total_conversations || 0 ),
		},
		{
			key: 'social',
			title: __( 'Social Media', 'ai-marketing-expert' ),
			color: ROOM.social,
			href: menuUrl( 'social' ),
			lead: {
				label: __( 'Scheduled', 'ai-marketing-expert' ),
				value: social.scheduled_posts || 0,
			},
			share: {
				label: __( 'Published', 'ai-marketing-expert' ),
				value: Number( social.published_month || 0 ),
				restLabel: __( 'Pending', 'ai-marketing-expert' ),
				totalLabel: __( 'Posts this month', 'ai-marketing-expert' ),
				total: Number( social.posts_this_month || 0 ),
			},
			stats: [
				{ label: __( 'Accounts', 'ai-marketing-expert' ), value: social.total_accounts || 0 },
			],
			activity: Number( social.total_accounts || 0 ) + Number( social.posts_this_month || 0 ),
		},
		{
			key: 'workflow',
			title: __( 'Workflow Automation', 'ai-marketing-expert' ),
			color: ROOM.workflow,
			href: menuUrl( 'workflow-automation' ),
			lead: {
				label: __( 'Active Workflows', 'ai-marketing-expert' ),
				value: workflow.active_workflows || 0,
			},
			share: {
				label: __( 'Active', 'ai-marketing-expert' ),
				value: Number( workflow.active_workflows || 0 ),
				restLabel: __( 'Paused', 'ai-marketing-expert' ),
				totalLabel: __( 'Workflows', 'ai-marketing-expert' ),
				total: Number( workflow.total_workflows || 0 ),
			},
			stats: [
				{ label: __( 'Runs (30d)', 'ai-marketing-expert' ), value: workflow.runs_last_30_days || 0 },
			],
			activity: Number( workflow.total_workflows || 0 ) + Number( workflow.runs_last_30_days || 0 ),
		},
	];

	/* ------ Rooms in use ------
	 * The lead card on a launchpad should answer the question people actually
	 * open a launchpad with: is this thing doing anything yet. Six rooms, and
	 * the arc says how many are lit. Every other number on the page is inside
	 * one room; this is the only one about the building.
	 */
	const roomsInUse = modules.filter( ( mod ) => mod.activity > 0 ).length;
	const unknownCount = '—';

	const quickModuleLinks = [
		{ label: __( 'Email Marketing', 'ai-marketing-expert' ), href: menuUrl( 'email' ) },
		{ label: __( 'SEO Analyzer', 'ai-marketing-expert' ), href: menuUrl( 'seo' ) },
		{ label: __( 'Content Generator', 'ai-marketing-expert' ), href: menuUrl( 'content' ) },
		{ label: __( 'AI Chatbot', 'ai-marketing-expert' ), href: menuUrl( 'chatbot' ) },
		{ label: __( 'Social Media', 'ai-marketing-expert' ), href: menuUrl( 'social' ) },
		{ label: __( 'Workflow Automation', 'ai-marketing-expert' ), href: menuUrl( 'workflow-automation' ) },
		{ label: __( 'AI Providers', 'ai-marketing-expert' ), href: menuUrl( 'ai-providers' ) },
	];

	const rangeNote = sprintf(
		/* translators: %d: number of days covered by the activity chart. */
		_n( 'Last %d day', 'Last %d days', rangeDays, 'ai-marketing-expert' ),
		rangeDays
	);

	// The range control is not gated. The chart under it plots this site's own
	// data on every tier, so every option here changes something real.
	const rangeToggle = (
		<div className="aime-range-toggle" role="group" aria-label={ __( 'Activity date range', 'ai-marketing-expert' ) }>
			{ RANGES.map( ( days ) => (
				<button
					key={ days }
					type="button"
					className={ `aime-range-toggle__btn${ days === rangeDays ? ' is-active' : '' }` }
					aria-pressed={ days === rangeDays }
					onClick={ () => setRangeDays( days ) }
				>
					{ sprintf(
						/* translators: %d: number of days. */
						_n( '%d day', '%d days', days, 'ai-marketing-expert' ),
						days
					) }
				</button>
			) ) }
		</div>
	);

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
							<span className="aime-dashboard-hero__eyebrow">{ __( 'Getting started', 'ai-marketing-expert' ) }</span>
							<h3>{ heroCopy.title }</h3>
							{ heroCopy.body && <p>{ heroCopy.body }</p> }
						</div>
						<div className="aime-dashboard-hero__actions">
							{ showAiProviderConnect && (
								<a href={ menuUrl( 'ai-providers' ) }><Button variant="primary">{ __( 'Connect an AI provider', 'ai-marketing-expert' ) }</Button></a>
							) }
							{ showSmtpConnect && (
								<a href={ `${ menuUrl( 'email' ) }#smtp` }><Button variant="secondary">{ __( 'Connect an SMTP service', 'ai-marketing-expert' ) }</Button></a>
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

			{ /* ── Summary band ──────────────────────────────────────────
			     Three gauges, largest first: the building, then the two
			     bounded scores worth watching daily. Everything else on the
			     page is a count, and a count is not a gauge. */ }
			<div className="aime-overview-band">
				<Card className="aime-band-card aime-band-card--lead">
					<span className="aime-band-card__label">{ __( 'Workspace', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ roomsInUse } max={ modules.length } size={ 176 } stroke={ 12 }>
						<span className="aime-arc__value-text">{ roomsInUse }</span>
						<span className="aime-arc__caption">
							{ sprintf(
								/* translators: %d: total number of modules. */
								__( 'of %d modules in use', 'ai-marketing-expert' ),
								modules.length
							) }
						</span>
					</ArcGauge>
					<div className="aime-band-chips">
						<div className="aime-band-chip">
							<span className="aime-band-chip__label">{ __( 'AI providers', 'ai-marketing-expert' ) }</span>
							<span className="aime-band-chip__value">{ aiProviderCount === null ? unknownCount : aiProviderCount }</span>
						</div>
						<div className="aime-band-chip">
							<span className="aime-band-chip__label">{ __( 'SMTP connections', 'ai-marketing-expert' ) }</span>
							<span className="aime-band-chip__value">{ smtpConnectionCount === null ? unknownCount : smtpConnectionCount }</span>
						</div>
					</div>
				</Card>

				<Card className="aime-band-card">
					<span className="aime-band-card__label" style={ { color: ROOM.email } }>{ __( 'Email Marketing', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ emailOpenRateValue } color={ ROOM.email }>
						<span className="aime-arc__value-text">{ `${ emailOpenRateValue.toFixed( 1 ) }%` }</span>
						<span className="aime-arc__caption">{ __( 'Open rate', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					{ Number( email.emails_sent || 0 ) > 0 ? (
						<div className="aime-band-chips">
							<div className="aime-band-chip">
								<span className="aime-band-chip__label">{ __( 'Emails sent', 'ai-marketing-expert' ) }</span>
								<span className="aime-band-chip__value">{ Number( email.emails_sent || 0 ).toLocaleString() }</span>
							</div>
							<div className="aime-band-chip">
								<span className="aime-band-chip__label">{ __( 'Campaigns', 'ai-marketing-expert' ) }</span>
								<span className="aime-band-chip__value">{ Number( email.total_campaigns || 0 ).toLocaleString() }</span>
							</div>
						</div>
					) : (
						<p className="aime-band-card__hint">
							{ __( 'No campaign has gone out yet, so there is no open rate to read.', 'ai-marketing-expert' ) }
							{ ' ' }
							<a className="aime-link" href={ menuUrl( 'email' ) }>{ __( 'Create a campaign', 'ai-marketing-expert' ) }</a>
						</p>
					) }
				</Card>

				<Card className="aime-band-card">
					<span className="aime-band-card__label" style={ { color: ROOM.chatbot } }>{ __( 'AI Chatbot', 'ai-marketing-expert' ) }</span>
					<ArcGauge value={ chatbotLeadRateValue } color={ ROOM.chatbot }>
						<span className="aime-arc__value-text">{ `${ chatbotLeadRateValue.toFixed( 0 ) }%` }</span>
						<span className="aime-arc__caption">{ __( 'Lead capture rate', 'ai-marketing-expert' ) }</span>
					</ArcGauge>
					{ chatbotConversations > 0 ? (
						<div className="aime-band-chips">
							<div className="aime-band-chip">
								<span className="aime-band-chip__label">{ __( 'Conversations', 'ai-marketing-expert' ) }</span>
								<span className="aime-band-chip__value">{ chatbotConversations.toLocaleString() }</span>
							</div>
							<div className="aime-band-chip">
								<span className="aime-band-chip__label">{ __( 'Leads captured', 'ai-marketing-expert' ) }</span>
								<span className="aime-band-chip__value">{ Number( chatbot.leads_captured || 0 ).toLocaleString() }</span>
							</div>
						</div>
					) : (
						<p className="aime-band-card__hint">
							{ __( 'No one has talked to a bot yet, so there is no capture rate to read.', 'ai-marketing-expert' ) }
							{ ' ' }
							<a className="aime-link" href={ menuUrl( 'chatbot' ) }>{ __( 'Set up a chatbot', 'ai-marketing-expert' ) }</a>
						</p>
					) }
				</Card>
			</div>

			{ /* ── Activity ──────────────────────────────────────────────
			     One chart, one control. The range control only exists for Pro,
			     because on the free tier the chart underneath it is a demo and
			     a control that changes nothing is worse than no control. */ }
			<Card
				className="aime-insight-card"
				title={
					<>
						{ __( 'Activity', 'ai-marketing-expert' ) }
						<span className="aime-card-title__note">{ rangeNote }</span>
					</>
				}
				actions={ rangeToggle }
			>
				<div className={ `aime-insight-body${ trendsLoading ? ' is-loading' : '' }` }>
					{ activityTrends.length > 0 ? (
						<>
							{ /* The legend sits above the plot, not below it. A legend
							     is a key, and a key you read after the thing it unlocks
							     is a key you read twice. Left-aligned so it lands on the
							     same scan line the card title starts. */ }
							<ul className="aime-chart-legend">
								{ SERIES.map( ( key ) => (
									<li key={ key } className="aime-chart-legend__item">
										<span className="aime-chart-legend__dot" style={ { backgroundColor: ROOM[ key ] } } />
										{ seriesLabels[ key ] }
									</li>
								) ) }
							</ul>
							<ActivityChart data={ activityTrends } labels={ seriesLabels } />
						</>
					) : trendsFailed ? (
						<EmptyState
							title={ __( 'Could not load activity.', 'ai-marketing-expert' ) }
							description={ __( 'The chart did not come back this time. Your data is unaffected — pick a range again to retry.', 'ai-marketing-expert' ) }
						/>
					) : trendsLoading ? (
						<div className="aime-insight-placeholder" aria-hidden="true" />
					) : (
						<EmptyState
							title={ __( 'Nothing has run yet.', 'ai-marketing-expert' ) }
							description={ __( 'Once modules start working, this stacks them by day so you can see total output and which room is producing it.', 'ai-marketing-expert' ) }
							actionLabel={ needsFirstSetup ? __( 'Connect an AI provider', 'ai-marketing-expert' ) : '' }
							actionHref={ needsFirstSetup ? menuUrl( 'ai-providers' ) : '' }
						/>
					) }
				</div>
			</Card>

			{ /* Module Summary Cards */ }
			<h3 className="aime-section-title">{ __( 'Module Overview', 'ai-marketing-expert' ) }</h3>
			<div className="aime-module-cards-grid">
				{ modules.map( ( mod ) => {
					const shareTotal = mod.share.total;
					const sharePercent = shareTotal > 0
						? Math.min( 100, Math.max( 0, ( mod.share.value / shareTotal ) * 100 ) )
						: 0;
					const shareRest = Math.max( 0, shareTotal - mod.share.value );

					return (
						<Card
							key={ mod.key }
							className="aime-module-summary-card"
							title={ mod.title }
							actions={
								<a
									href={ mod.href }
									className="aime-link"
									aria-label={ sprintf(
										/* translators: %s: module name, e.g. "Email Marketing". */
										__( 'View %s', 'ai-marketing-expert' ),
										mod.title
									) }
								>
									{ __( 'View →', 'ai-marketing-expert' ) }
								</a>
							}
						>
							<div className="aime-module-summary-stripe" style={ { backgroundColor: mod.color } } />
							<div className="aime-module-summary-lead">
								<span className="aime-module-summary-lead__value">{ mod.lead.value }</span>
								<span className="aime-module-summary-lead__label">{ mod.lead.label }</span>
							</div>

							{ /* Part of whole. The bar is decoration on top of the
							     legend below it, which carries both numbers as
							     text, so it stays out of the accessibility tree. */ }
							<div className="aime-module-share">
								<div className="aime-module-share__bar" aria-hidden="true">
									<span
										className="aime-module-share__fill"
										style={ { width: `${ sharePercent }%`, backgroundColor: mod.color } }
									/>
								</div>
								<div className="aime-module-share__legend">
									<span className="aime-module-share__item">
										<span className="aime-module-share__dot" style={ { backgroundColor: mod.color } } />
										{ mod.share.label }
										<strong>{ mod.share.value.toLocaleString() }</strong>
									</span>
									<span className="aime-module-share__item">
										<span className="aime-module-share__dot aime-module-share__dot--rest" />
										{ mod.share.restLabel }
										<strong>{ shareRest.toLocaleString() }</strong>
									</span>
								</div>
							</div>

							<div className="aime-module-summary-stats">
								{ mod.stats.map( ( item ) => (
									<div key={ item.label } className="aime-module-summary-stat">
										<span className="aime-module-summary-value">{ item.value }</span>
										<span className="aime-module-summary-label">{ item.label }</span>
									</div>
								) ) }
							</div>
						</Card>
					);
				} ) }
			</div>

			{ ! hasPro && (
				<Card className="aime-upgrade-card">
					<div className="aime-upgrade-banner">
						<div>
							<h3>{ __( 'Unlock Pro Features', 'ai-marketing-expert' ) }</h3>
							<p>{ __( 'Get unlimited AI generations, advanced analytics, and priority support.', 'ai-marketing-expert' ) }</p>
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
