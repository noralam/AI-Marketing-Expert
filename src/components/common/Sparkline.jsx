/**
 * Mini sparkline chart for stat cards.
 */

import { LineChart, Line, ResponsiveContainer } from 'recharts';

const Sparkline = ( { data = [], color = 'var(--aime-primary)', height = 40 } ) => {
	if ( ! data.length ) {
		return null;
	}

	const chartData = data.map( ( d ) => ( {
		date: d.date,
		value: parseInt( d.count, 10 ) || 0,
	} ) );

	return (
		<div className="aime-sparkline" style={ { width: '100%', height } }>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={ chartData }>
					<Line
						type="monotone"
						dataKey="value"
						stroke={ color }
						strokeWidth={ 2 }
						dot={ false }
						isAnimationActive={ false }
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
};

export default Sparkline;
