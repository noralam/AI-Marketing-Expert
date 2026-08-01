/**
 * Email Dashboard - overview with KPI cards, charts, quick actions.
 */

import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon, Button } from '@aime/wp-components';
import { people, megaphone, envelope, chartBar } from '@wordpress/icons';
import {
	ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';

const EmailDashboard = ( { onNavigate } ) => {
	const { get, loading, error } = useApi();
	const [ data, setData ] = useState( null );

	useEffect( () => {
		get( '/email/analytics/overview', { days: 30 } )
			.then( setData )
			.catch( () => {} );
	}, [ get ] );

	if ( loading && ! data ) {
		return <Loader variant="dashboard" text={ __( 'Loading dashboard...', 'ai-marketing-expert' ) } />;
	}

	if ( error ) {
		return <Notice type="error" message={ error } />;
	}

	if ( ! data ) {
		return null;
	}

	const { totals, subscriber_growth, email_activity } = data;

	const kpis = [
		{ label: __( 'Emails Sent', 'ai-marketing-expert' ), value: totals.sent, icon: envelope, color: 'var(--aime-primary, #3858e9)' },
		{ label: __( 'Opens', 'ai-marketing-expert' ), value: `${ totals.opened } (${ totals.open_rate }%)`, icon: megaphone, color: 'var(--aime-success, #10b981)' },
		{ label: __( 'Clicks', 'ai-marketing-expert' ), value: `${ totals.clicks } (${ totals.click_rate }%)`, icon: chartBar, color: 'var(--aime-warning, #f59e0b)' },
		{ label: __( 'Unsubscribes', 'ai-marketing-expert' ), value: totals.unsubscribes, icon: people, color: 'var(--aime-error, #ef4444)' },
	];

	return (
		<div className="aime-email-dashboard">
			<div className="aime-page-header">
				<h2>{ __( 'Email Marketing Dashboard', 'ai-marketing-expert' ) }</h2>
				<div className="aime-header-actions">
					<Button variant="primary" onClick={ () => onNavigate( 'campaign-editor', { id: 'new' } ) }>
						{ __( 'New Campaign', 'ai-marketing-expert' ) }
					</Button>
					<Button variant="secondary" onClick={ () => onNavigate( 'subscribers' ) }>
						{ __( 'View Contacts', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</div>

			{ /* KPI Cards */ }
			<div className="aime-kpi-grid">
				{ kpis.map( ( kpi ) => (
					<div key={ kpi.label } className="aime-kpi-card">
						<div className="aime-kpi-icon" style={ { backgroundColor: kpi.color + '15', color: kpi.color } }>
							<Icon icon={ kpi.icon } size={ 24 } />
						</div>
						<div className="aime-kpi-content">
							<span className="aime-kpi-value">{ kpi.value }</span>
							<span className="aime-kpi-label">{ kpi.label }</span>
						</div>
					</div>
				) ) }
			</div>

			{ /* Charts */ }
			<div className="aime-charts-grid">
				<Card title={ __( 'Subscriber Growth', 'ai-marketing-expert' ) }>
					{ subscriber_growth && subscriber_growth.length > 0 ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<AreaChart data={ subscriber_growth.map( ( d ) => ( { ...d, count: Number( d.count ) || 0 } ) ) }>
								<defs>
									<linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3858e9" stopOpacity={ 0.3 } />
										<stop offset="95%" stopColor="#3858e9" stopOpacity={ 0 } />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
								<XAxis dataKey="date" tick={ { fontSize: 11 } } />
								<YAxis tick={ { fontSize: 11 } } allowDecimals={ false } domain={ [ 0, 'dataMax' ] } />
								<Tooltip />
								<Area type="monotone" dataKey="count" stroke="#3858e9" fillOpacity={ 1 } fill="url(#growthGrad)" />
							</AreaChart>
						</ResponsiveContainer>
					) : (
						<p className="aime-empty-msg">{ __( 'No data yet.', 'ai-marketing-expert' ) }</p>
					) }
				</Card>

				<Card title={ __( 'Email Activity', 'ai-marketing-expert' ) }>
					{ email_activity && email_activity.length > 0 ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<AreaChart data={ email_activity }>
								<defs>
									<linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3858e9" stopOpacity={ 0.3 } />
										<stop offset="95%" stopColor="#3858e9" stopOpacity={ 0 } />
									</linearGradient>
									<linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#10b981" stopOpacity={ 0.3 } />
										<stop offset="95%" stopColor="#10b981" stopOpacity={ 0 } />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
								<XAxis dataKey="date" tick={ { fontSize: 11 } } />
								<YAxis tick={ { fontSize: 11 } } />
								<Tooltip />
								<Area type="monotone" dataKey="sent" stroke="#3858e9" fillOpacity={ 1 } fill="url(#sentGrad)" name={ __( 'Sent', 'ai-marketing-expert' ) } />
								<Area type="monotone" dataKey="opened" stroke="#10b981" fillOpacity={ 1 } fill="url(#openGrad)" name={ __( 'Opened', 'ai-marketing-expert' ) } />
							</AreaChart>
						</ResponsiveContainer>
					) : (
						<p className="aime-empty-msg">{ __( 'No data yet.', 'ai-marketing-expert' ) }</p>
					) }
				</Card>
			</div>

			{ /* Quick Actions */ }
			<Card title={ __( 'Quick Actions', 'ai-marketing-expert' ) }>
				<div className="aime-quick-actions">
					<Button variant="secondary" onClick={ () => onNavigate( 'campaign-editor', { id: 'new' } ) }>
						{ __( '+ New Campaign', 'ai-marketing-expert' ) }
					</Button>
					<Button variant="secondary" onClick={ () => onNavigate( 'automation-editor', { id: 'new' } ) }>
						{ __( '+ New Automation', 'ai-marketing-expert' ) }
					</Button>
					<Button variant="secondary" onClick={ () => onNavigate( 'import-export' ) }>
						{ __( 'Import Contacts', 'ai-marketing-expert' ) }
					</Button>
					<Button variant="secondary" onClick={ () => onNavigate( 'ai-tools' ) }>
						{ __( 'AI Tools', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</Card>
		</div>
	);
};

export default EmailDashboard;
