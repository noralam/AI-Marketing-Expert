/**
 * Email Timeline Chart — multi-line chart (sends, opens, clicks).
 */

import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts';

/**
 * Merge separate arrays into unified datelined data.
 *
 * @param {Object} param0 - { sends, opens, clicks } arrays of { date, count }.
 * @return {Array} Merged array.
 */
const mergeTimeline = ( { sends = [], opens = [], clicks = [] } ) => {
	const map = {};
	const addSeries = ( arr, key ) => {
		( arr || [] ).forEach( ( d ) => {
			if ( ! map[ d.date ] ) {
				map[ d.date ] = { date: d.date, sends: 0, opens: 0, clicks: 0 };
			}
			map[ d.date ][ key ] = parseInt( d.count, 10 ) || 0;
		} );
	};
	addSeries( sends, 'sends' );
	addSeries( opens, 'opens' );
	addSeries( clicks, 'clicks' );
	return Object.values( map ).sort( ( a, b ) => a.date.localeCompare( b.date ) );
};

const EmailTimelineChart = ( { data = {}, height = 300 } ) => {
	const chartData = mergeTimeline( data );

	if ( ! chartData.length ) {
		return <p className="aime-empty-state">No email activity data yet.</p>;
	}

	return (
		<ResponsiveContainer width="100%" height={ height }>
			<LineChart data={ chartData } margin={ { top: 5, right: 20, left: 0, bottom: 5 } }>
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
				<Legend wrapperStyle={ { fontSize: 12 } } />
				<Line type="monotone" dataKey="sends" stroke="#3858e9" strokeWidth={ 2 } dot={ false } name="Sent" />
				<Line type="monotone" dataKey="opens" stroke="#10b981" strokeWidth={ 2 } dot={ false } name="Opens" />
				<Line type="monotone" dataKey="clicks" stroke="#f59e0b" strokeWidth={ 2 } dot={ false } name="Clicks" />
			</LineChart>
		</ResponsiveContainer>
	);
};

export default EmailTimelineChart;
