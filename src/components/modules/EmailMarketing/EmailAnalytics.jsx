/**
 * EmailAnalytics - comprehensive analytics dashboard with recharts.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl } from '@aime/wp-components';
import {
	ResponsiveContainer, AreaChart, Area, BarChart, Bar,
	XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';

const COLORS = [ '#3858e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4' ];
const DAYS_OPTIONS = [
	{ label: __( 'Last 7 Days', 'ai-marketing-expert' ), value: '7' },
	{ label: __( 'Last 14 Days', 'ai-marketing-expert' ), value: '14' },
	{ label: __( 'Last 30 Days', 'ai-marketing-expert' ), value: '30' },
	{ label: __( 'Last 90 Days', 'ai-marketing-expert' ), value: '90' },
];

const ACTIVITY_PAGE_SIZE_OPTIONS = [
	{ label: '5', value: '5' },
	{ label: '10', value: '10' },
];

const EmailAnalytics = () => {
	const { get, loading, error, clearError } = useApi();
	const [ days, setDays ] = useState( '30' );
	const [ data, setData ] = useState( null );
	const [ activityLog, setActivityLog ] = useState( [] );
	const [ logPage, setLogPage ] = useState( 1 );
	const [ logPerPage, setLogPerPage ] = useState( '5' );
	const [ logTotal, setLogTotal ] = useState( 0 );

	const fetchOverview = useCallback( async () => {
		try {
			const res = await get( `/email/analytics/overview?days=${ days }` );
			setData( res );
		} catch ( e ) { /* */ }
	}, [ get, days ] );

	const fetchActivity = useCallback( async () => {
		try {
			const res = await get( `/email/analytics/activity-log?page=${ logPage }&per_page=${ logPerPage }` );
			setActivityLog( res.items || [] );
			setLogTotal( res.total || 0 );
		} catch ( e ) { /* */ }
	}, [ get, logPage, logPerPage ] );

	useEffect( () => { fetchOverview(); }, [ fetchOverview ] );
	useEffect( () => { fetchActivity(); }, [ fetchActivity ] );

	if ( loading && ! data ) {
		return <Loader text={ __( 'Loading analytics...', 'ai-marketing-expert' ) } />;
	}

	const totals = data?.totals || {};
	const kpis = [
		{ label: __( 'Total Subscribers', 'ai-marketing-expert' ), value: totals.subscribers || 0 },
		{ label: __( 'Emails Sent', 'ai-marketing-expert' ), value: totals.sent || 0 },
		{ label: __( 'Open Rate', 'ai-marketing-expert' ), value: `${ totals.open_rate || 0 }%` },
		{ label: __( 'Click Rate', 'ai-marketing-expert' ), value: `${ totals.click_rate || 0 }%` },
		{ label: __( 'Unsubscribes', 'ai-marketing-expert' ), value: totals.unsubscribes || 0 },
	];

	const openVsNot = [
		{ name: __( 'Opened', 'ai-marketing-expert' ), value: totals.opened || 0 },
		{ name: __( 'Not Opened', 'ai-marketing-expert' ), value: Math.max( 0, ( totals.sent || 0 ) - ( totals.opened || 0 ) ) },
	];

	const logPages = Math.ceil( logTotal / parseInt( logPerPage, 10 ) );

	return (
		<div className="aime-email-analytics">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<h2>{ __( 'Email Analytics', 'ai-marketing-expert' ) }</h2>
				<SelectControl value={ days } options={ DAYS_OPTIONS } onChange={ setDays } __nextHasNoMarginBottom />
			</div>

			{ /* KPIs */ }
			<div className="aime-kpi-grid aime-kpi-grid-5">
				{ kpis.map( ( k ) => (
					<div key={ k.label } className="aime-kpi-card">
						<span className="aime-kpi-value">{ k.value }</span>
						<span className="aime-kpi-label">{ k.label }</span>
					</div>
				) ) }
			</div>

			<div className="aime-charts-grid">
				{ /* Subscriber growth */ }
				<Card title={ __( 'Subscriber Growth', 'ai-marketing-expert' ) }>
					{ data?.subscriber_growth && data.subscriber_growth.length > 0 ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<AreaChart data={ data.subscriber_growth.map( ( d ) => ( { ...d, count: Number( d.count ) || 0 } ) ) }>
								<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
								<XAxis dataKey="date" tick={ { fontSize: 11 } } />
								<YAxis tick={ { fontSize: 11 } } allowDecimals={ false } domain={ [ 0, 'dataMax' ] } />
								<Tooltip />
								<Area type="monotone" dataKey="count" stroke="#3858e9" fill="#3858e9" fillOpacity={ 0.15 } />
							</AreaChart>
						</ResponsiveContainer>
					) : <p className="aime-empty-msg">{ __( 'No data yet.', 'ai-marketing-expert' ) }</p> }
				</Card>

				{ /* Email activity */ }
				<Card title={ __( 'Email Activity', 'ai-marketing-expert' ) }>
					{ data?.email_activity && data.email_activity.length > 0 ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<BarChart data={ data.email_activity }>
								<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
								<XAxis dataKey="date" tick={ { fontSize: 11 } } />
								<YAxis tick={ { fontSize: 11 } } />
								<Tooltip />
								<Bar dataKey="sent" fill="#3858e9" radius={ [ 4, 4, 0, 0 ] } name={ __( 'Sent', 'ai-marketing-expert' ) } />
								<Bar dataKey="opened" fill="#10b981" radius={ [ 4, 4, 0, 0 ] } name={ __( 'Opened', 'ai-marketing-expert' ) } />
								<Legend />
							</BarChart>
						</ResponsiveContainer>
					) : <p className="aime-empty-msg">{ __( 'No data yet.', 'ai-marketing-expert' ) }</p> }
				</Card>
			</div>

			<div className="aime-charts-grid">
				{ /* Open rate pie */ }
				<Card title={ __( 'Open Rate Breakdown', 'ai-marketing-expert' ) }>
					<ResponsiveContainer width="100%" height={ 240 }>
						<PieChart>
							<Pie data={ openVsNot } dataKey="value" cx="50%" cy="50%" outerRadius={ 80 } label>
								{ openVsNot.map( ( _, i ) => <Cell key={ i } fill={ COLORS[ i ] } /> ) }
							</Pie>
							<Legend />
							<Tooltip />
						</PieChart>
					</ResponsiveContainer>
				</Card>

				{ /* Recent activity log */ }
				<Card title={ __( 'Recent Activity', 'ai-marketing-expert' ) }>
					<div className="aime-card-toolbar">
						<SelectControl
							label={ __( 'Rows', 'ai-marketing-expert' ) }
							value={ logPerPage }
							options={ ACTIVITY_PAGE_SIZE_OPTIONS }
							onChange={ ( value ) => { setLogPerPage( value ); setLogPage( 1 ); } }
							__nextHasNoMarginBottom
						/>
					</div>
					{ activityLog.length === 0 ? (
						<p className="aime-empty-msg">{ __( 'No recent activity.', 'ai-marketing-expert' ) }</p>
					) : (
						<>
							<div className="aime-activity-timeline">
								{ activityLog.map( ( a, i ) => (
									<div key={ i } className="aime-activity-item">
										<span className="aime-activity-dot" />
										<div>
											<span>{ a.description || a.action }</span>
											<span className="aime-muted">{ a.created_at ? new Date( a.created_at ).toLocaleString() : '' }</span>
										</div>
									</div>
								) ) }
							</div>
							{ logPages > 1 && (
								<div className="aime-pagination">
									<Button variant="secondary" disabled={ logPage <= 1 } onClick={ () => setLogPage( logPage - 1 ) }>{ __( '\u2190 Prev', 'ai-marketing-expert' ) }</Button>
									<span>{ logPage } / { logPages }</span>
									<Button variant="secondary" disabled={ logPage >= logPages } onClick={ () => setLogPage( logPage + 1 ) }>{ __( 'Next \u2192', 'ai-marketing-expert' ) }</Button>
								</div>
							) }
						</>
					) }
				</Card>
			</div>
		</div>
	);
};

export default EmailAnalytics;
