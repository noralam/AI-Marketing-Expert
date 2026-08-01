/**
 * Social Dashboard - activity analytics overview.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl } from '@aime/wp-components';
import { people, postContent, scheduled, warning, chartBar } from '@wordpress/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';

const COLORS = [ '#0E7490', '#06B6D4', '#67E8F9', '#0891B2', '#155E75' ];

const SocialDashboard = ( { onNavigate } ) => {
	const { get, loading } = useApi();
	const [ data, setData ] = useState( null );
	const [ days, setDays ] = useState( '30' );

	const fetchData = useCallback( async () => {
		try {
			const res = await get( '/social/analytics/overview', { days } );
			setData( res );
		} catch ( e ) {
			// silent
		}
	}, [ get, days ] );

	useEffect( () => {
		fetchData();
	}, [ fetchData ] );

	if ( loading && ! data ) {
		return <Loader variant="dashboard" text={ __( 'Loading analytics...', 'ai-marketing-expert' ) } />;
	}

	if ( ! data ) {
		return (
			<Card>
				<div style={ { padding: '40px', textAlign: 'center' } }>
					<p>{ __( 'No data available yet. Connect an account and create your first post!', 'ai-marketing-expert' ) }</p>
					<Button variant="primary" onClick={ () => onNavigate( 'accounts' ) }>
						{ __( 'Connect Account', 'ai-marketing-expert' ) }
					</Button>
				</div>
			</Card>
		);
	}

	const totals = data.totals || {};
	const statsCards = [
		{ label: __( 'Accounts', 'ai-marketing-expert' ), value: data.accounts || 0, icon: people, color: '#1B5E20' },
		{ label: __( 'Total Posts', 'ai-marketing-expert' ), value: totals.total_posts || 0, icon: postContent, color: '#2196f3' },
		{ label: __( 'Published', 'ai-marketing-expert' ), value: totals.published || 0, icon: postContent, color: '#4caf50' },
		{ label: __( 'Scheduled', 'ai-marketing-expert' ), value: totals.scheduled || 0, icon: scheduled, color: '#ff9800' },
		{ label: __( 'Failed', 'ai-marketing-expert' ), value: totals.failed || 0, icon: warning, color: '#f44336' },
		{ label: __( 'AI Generated', 'ai-marketing-expert' ), value: totals.ai_generated || 0, icon: chartBar, color: '#9c27b0' },
	];

	const statusData = ( data.status_breakdown || [] ).map( ( s ) => ( {
		name: s.status.charAt( 0 ).toUpperCase() + s.status.slice( 1 ),
		value: parseInt( s.count ),
	} ) );

	const platformData = ( data.platform_breakdown || [] ).map( ( p ) => ( {
		name: p.platform.charAt( 0 ).toUpperCase() + p.platform.slice( 1 ),
		value: parseInt( p.count ),
	} ) );

	return (
		<div className="aime-social-dashboard">
			{ /* Time range selector */ }
			<div className="aime-section-header" style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } }>
				<h2 style={ { margin: 0 } }>{ __( 'Social Media Analytics', 'ai-marketing-expert' ) }</h2>
				<SelectControl
					value={ days }
					options={ [
						{ label: __( 'Last 7 days', 'ai-marketing-expert' ), value: '7' },
						{ label: __( 'Last 30 days', 'ai-marketing-expert' ), value: '30' },
						{ label: __( 'Last 90 days', 'ai-marketing-expert' ), value: '90' },
					] }
					onChange={ setDays }
					__nextHasNoMarginBottom
				/>
			</div>

			{ /* Stats Cards */ }
			<div className="aime-stats-grid" style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 } }>
				{ statsCards.map( ( stat ) => (
					<Card key={ stat.label } className="aime-stat-card">
						<div style={ { textAlign: 'center', padding: '8px 0' } }>
							<div style={ { fontSize: 28, fontWeight: 700, color: stat.color } }>
								{ stat.value }
							</div>
							<div style={ { fontSize: 13, color: 'var(--aime-text-muted)', marginTop: 4 } }>
								{ stat.label }
							</div>
						</div>
					</Card>
				) ) }
			</div>

			{ /* Charts Row */ }
			<div style={ { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 } }>
				{ /* Posts Over Time */ }
				<Card title={ __( 'Posts Over Time', 'ai-marketing-expert' ) }>
					{ ( data.posts_over_time || [] ).length > 0 ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<AreaChart data={ data.posts_over_time } margin={ { top: 5, right: 20, bottom: 5, left: 0 } }>
								<defs>
									<linearGradient id="socialGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#1B5E20" stopOpacity={ 0.3 } />
										<stop offset="95%" stopColor="#1B5E20" stopOpacity={ 0.02 } />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="var(--aime-border)" />
								<XAxis dataKey="day" tick={ { fontSize: 12 } } />
								<YAxis tick={ { fontSize: 12 } } allowDecimals={ false } />
								<Tooltip />
								<Area type="monotone" dataKey="total" stroke="#1B5E20" fill="url(#socialGradient)" strokeWidth={ 2 } />
							</AreaChart>
						</ResponsiveContainer>
					) : (
						<p style={ { textAlign: 'center', color: 'var(--aime-text-muted)', padding: 40 } }>
							{ __( 'No post data for this period.', 'ai-marketing-expert' ) }
						</p>
					) }
				</Card>

				{ /* Platform Breakdown */ }
				<Card title={ __( 'By Platform', 'ai-marketing-expert' ) }>
					{ platformData.length > 0 ? (
						<ResponsiveContainer width="100%" height={ 260 }>
							<PieChart>
								<Pie data={ platformData } cx="50%" cy="50%" innerRadius={ 50 } outerRadius={ 80 } paddingAngle={ 5 } dataKey="value">
									{ platformData.map( ( _, i ) => (
										<Cell key={ `cell-${ i }` } fill={ COLORS[ i % COLORS.length ] } />
									) ) }
								</Pie>
								<Legend />
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					) : (
						<p style={ { textAlign: 'center', color: 'var(--aime-text-muted)', padding: 40 } }>
							{ __( 'No platform data.', 'ai-marketing-expert' ) }
						</p>
					) }
				</Card>
			</div>

			{ /* Recent Failures */ }
			{ ( data.recent_failures || [] ).length > 0 && (
				<Card title={ __( 'Recent Failures', 'ai-marketing-expert' ) } className="aime-failures-card">
					<table className="aime-table">
						<thead>
							<tr>
								<th>{ __( 'Platform', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Account', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Content', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Error', 'ai-marketing-expert' ) }</th>
								<th>{ __( 'Date', 'ai-marketing-expert' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ data.recent_failures.map( ( f ) => (
								<tr key={ f.id }>
									<td>
										<span className={ `aime-platform-badge aime-platform-${ f.platform }` }>
											{ f.platform }
										</span>
									</td>
									<td>{ f.account_name }</td>
									<td>{ ( f.content || '' ).substring( 0, 60 ) }...</td>
									<td style={ { color: '#f44336', fontSize: 12 } }>{ f.error_message }</td>
									<td style={ { fontSize: 12, whiteSpace: 'nowrap' } }>{ f.created_at }</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</Card>
			) }

			{ /* Quick Actions */ }
			<div style={ { display: 'flex', gap: 12, marginTop: 20 } }>
				<Button variant="primary" onClick={ () => onNavigate( 'new-post' ) }>
					{ __( 'Create Post', 'ai-marketing-expert' ) }
				</Button>
				<Button variant="secondary" onClick={ () => onNavigate( 'accounts' ) }>
					{ __( 'Manage Accounts', 'ai-marketing-expert' ) }
				</Button>
				<Button variant="secondary" onClick={ () => onNavigate( 'calendar' ) }>
					{ __( 'View Calendar', 'ai-marketing-expert' ) }
				</Button>
			</div>

		</div>
	);
};

export default SocialDashboard;
