/**
 * Shared SVG chart components for SEO module tabs.
 */
import { __ } from '@wordpress/i18n';

export const DonutChart = ( { data, size = 160, thickness = 28, showLegend = true } ) => {
	const total = data.reduce( ( s, d ) => s + d.value, 0 );
	if ( ! total ) return null;
	const r = ( size - thickness ) / 2;
	const C = 2 * Math.PI * r;
	let offset = 0;

	return (
		<div className="aime-chart-donut-wrap">
			<svg width={ size } height={ size } viewBox={ `0 0 ${ size } ${ size }` } className="aime-chart-donut">
				{ data.map( ( d, i ) => {
					const pct = d.value / total;
					const dash = pct * C;
					const gap = C - dash;
					const currentOffset = offset;
					offset += dash;
					return (
						<circle
							key={ i }
							cx={ size / 2 } cy={ size / 2 } r={ r }
							fill="none" stroke={ d.color } strokeWidth={ thickness }
							strokeDasharray={ `${ dash } ${ gap }` }
							strokeDashoffset={ -currentOffset }
							style={ { transition: 'stroke-dasharray .4s' } }
						/>
					);
				} ) }
				<text x={ size / 2 } y={ size / 2 - 6 } textAnchor="middle" fontSize="22" fontWeight="700" fill="#1e1e1e">{ total }</text>
				<text x={ size / 2 } y={ size / 2 + 14 } textAnchor="middle" fontSize="11" fill="#888">{ __( 'total', 'ai-marketing-expert' ) }</text>
			</svg>
			{ showLegend && (
				<div className="aime-chart-legend">
					{ data.filter( ( d ) => d.value > 0 ).map( ( d, i ) => (
						<div key={ i } className="aime-chart-legend__item">
							<span className="aime-chart-legend__dot" style={ { background: d.color } } />
							<span className="aime-chart-legend__label">{ d.label }</span>
							<span className="aime-chart-legend__val">{ d.value } <small>({ Math.round( ( d.value / total ) * 100 ) }%)</small></span>
						</div>
					) ) }
				</div>
			) }
		</div>
	);
};

export const HBarChart = ( { data, maxValue, barHeight = 22, title } ) => {
	const mx = maxValue || Math.max( ...data.map( ( d ) => d.value ), 1 );
	return (
		<div className="aime-chart-hbar">
			{ title && <div className="aime-chart-hbar__title">{ title }</div> }
			{ data.map( ( d, i ) => {
				const pct = Math.min( 100, ( d.value / mx ) * 100 );
				return (
					<div key={ i } className="aime-chart-hbar__row">
						<div className="aime-chart-hbar__label" title={ d.label }>{ d.label }</div>
						<div className="aime-chart-hbar__track">
							<div
								className="aime-chart-hbar__fill"
								style={ { width: `${ pct }%`, background: d.color || '#1565c0', height: barHeight } }
							/>
						</div>
						<div className="aime-chart-hbar__val">{ d.maxLabel || ( typeof d.value === 'number' ? d.value.toLocaleString() : d.value ) }</div>
					</div>
				);
			} ) }
		</div>
	);
};

export const RadialGauge = ( { value, max = 10, size = 120, label, color } ) => {
	const pct = Math.min( 1, Math.max( 0, value / max ) );
	const r = ( size - 16 ) / 2;
	const C = Math.PI * r;
	const dash = pct * C;
	const autoColor = color || ( pct >= 0.7 ? '#4caf50' : pct >= 0.4 ? '#ff9800' : '#f44336' );

	return (
		<div className="aime-chart-gauge">
			<svg width={ size } height={ size / 2 + 20 } viewBox={ `0 0 ${ size } ${ size / 2 + 20 }` }>
				<path
					d={ `M ${ size * 0.08 },${ size / 2 } A ${ r },${ r } 0 0 1 ${ size * 0.92 },${ size / 2 }` }
					fill="none" stroke="#e8e8e8" strokeWidth="12" strokeLinecap="round"
				/>
				<path
					d={ `M ${ size * 0.08 },${ size / 2 } A ${ r },${ r } 0 0 1 ${ size * 0.92 },${ size / 2 }` }
					fill="none" stroke={ autoColor } strokeWidth="12" strokeLinecap="round"
					strokeDasharray={ `${ dash } ${ C }` }
					style={ { transition: 'stroke-dasharray .5s' } }
				/>
				<text x={ size / 2 } y={ size / 2 - 4 } textAnchor="middle" fontSize="22" fontWeight="700" fill={ autoColor }>
					{ value }{ max === 100 ? '%' : `/${ max }` }
				</text>
			</svg>
			{ label && <div style={ { textAlign: 'center', fontSize: 12, color: '#666', marginTop: -6 } }>{ label }</div> }
		</div>
	);
};

export const StackedBar = ( { segments, height = 18 } ) => {
	const total = segments.reduce( ( s, d ) => s + d.value, 0 );
	if ( ! total ) return null;
	return (
		<div>
			<div className="aime-chart-stacked" style={ { height } }>
				{ segments.map( ( s, i ) => (
					<div
						key={ i }
						title={ `${ s.label }: ${ s.value } (${ Math.round( ( s.value / total ) * 100 ) }%)` }
						style={ { width: `${ ( s.value / total ) * 100 }%`, background: s.color, height: '100%' } }
					/>
				) ) }
			</div>
			<div style={ { display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 } }>
				{ segments.filter( ( s ) => s.value > 0 ).map( ( s, i ) => (
					<span key={ i } style={ { fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 } }>
						<span style={ { width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' } } />
						{ s.label } ({ Math.round( ( s.value / total ) * 100 ) }%)
					</span>
				) ) }
			</div>
		</div>
	);
};

export const SortArrow = ( { active, dir } ) => (
	<span style={ active ? { fontSize: 14, fontWeight: 700, color: '#007cba', marginLeft: 2 } : { fontSize: 14, opacity: 0.35, marginLeft: 2 } }>
		{ active ? ( dir === 'asc' ? '\u2191' : '\u2193' ) : '\u21C5' }
	</span>
);
