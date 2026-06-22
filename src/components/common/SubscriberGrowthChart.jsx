/**
 * Subscriber Growth Chart — area chart with Recharts.
 */

import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';

const SubscriberGrowthChart = ( { data = [], height = 300 } ) => {
	if ( ! data.length ) {
		return <p className="aime-empty-state">No subscriber data yet.</p>;
	}

	const chartData = data.map( ( d ) => ( {
		date: d.date,
		count: parseInt( d.count, 10 ) || 0,
	} ) );

	return (
		<ResponsiveContainer width="100%" height={ height }>
			<AreaChart data={ chartData } margin={ { top: 5, right: 20, left: 0, bottom: 5 } }>
				<defs>
					<linearGradient id="subGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="var(--aime-primary, #3858e9)" stopOpacity={ 0.3 } />
						<stop offset="95%" stopColor="var(--aime-primary, #3858e9)" stopOpacity={ 0 } />
					</linearGradient>
				</defs>
				<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
				<XAxis
					dataKey="date"
					tick={ { fontSize: 11, fill: '#94a3b8' } }
					tickFormatter={ ( v ) => {
						const d = new Date( v );
						return `${ d.getMonth() + 1 }/${ d.getDate() }`;
					} }
				/>
				<YAxis tick={ { fontSize: 11, fill: '#94a3b8' } } allowDecimals={ false } />
				<Tooltip
					contentStyle={ { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 } }
					labelFormatter={ ( v ) => new Date( v ).toLocaleDateString() }
				/>
				<Area
					type="monotone"
					dataKey="count"
					stroke="var(--aime-primary, #3858e9)"
					strokeWidth={ 2 }
					fill="url(#subGradient)"
					name="Subscribers"
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
};

export default SubscriberGrowthChart;
