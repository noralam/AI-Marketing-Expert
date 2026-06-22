/**
 * Email Status Breakdown — donut/pie chart.
 */

import {
	PieChart,
	Pie,
	Cell,
	Legend,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';

const COLORS = {
	sent: '#3858e9',
	opened: '#10b981',
	clicked: '#f59e0b',
	bounced: '#ef4444',
	unsubscribed: '#8b5cf6',
};

const EmailStatusChart = ( { data = {}, height = 280 } ) => {
	const chartData = [
		{ name: 'Sent (not opened)', value: Math.max( 0, ( data.sent || 0 ) - ( data.opened || 0 ) ) },
		{ name: 'Opened', value: data.opened || 0 },
		{ name: 'Clicked', value: data.clicked || 0 },
		{ name: 'Bounced', value: data.bounced || 0 },
		{ name: 'Unsubscribed', value: data.unsubscribed || 0 },
	].filter( ( d ) => d.value > 0 );

	if ( ! chartData.length ) {
		return <p className="aime-empty-state">No email status data yet.</p>;
	}

	const colors = [
		COLORS.sent,
		COLORS.opened,
		COLORS.clicked,
		COLORS.bounced,
		COLORS.unsubscribed,
	];

	return (
		<ResponsiveContainer width="100%" height={ height }>
			<PieChart>
				<Pie
					data={ chartData }
					cx="50%"
					cy="50%"
					innerRadius={ 60 }
					outerRadius={ 90 }
					paddingAngle={ 3 }
					dataKey="value"
				>
					{ chartData.map( ( _, i ) => (
						<Cell key={ i } fill={ colors[ i % colors.length ] } />
					) ) }
				</Pie>
				<Tooltip contentStyle={ { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 } } />
				<Legend wrapperStyle={ { fontSize: 12 } } />
			</PieChart>
		</ResponsiveContainer>
	);
};

export default EmailStatusChart;
