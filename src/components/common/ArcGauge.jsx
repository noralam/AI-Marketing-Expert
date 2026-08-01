/**
 * Semicircular arc gauge.
 *
 * A full ring leaves a hole in the middle that nothing can fill without
 * crowding the stroke, so the number ends up parked underneath and the ring
 * becomes decoration. An open arc has a mouth: the value sits inside it, the
 * arc reads as the frame around the number rather than as a separate object,
 * and the whole unit costs about half the vertical space of a ring.
 *
 * Colour is deliberately not defaulted here. Left alone, the value stroke
 * inherits `var(--aime-primary)` from the stylesheet, so a gauge dropped into
 * any module lights with that room's accent. Pass `color` only for a gauge
 * that stands for a *different* room than the page it sits on — the dashboard
 * does this, because a crimson arc there means Email no matter which page is
 * showing it.
 */

import { useEffect, useState } from '@wordpress/element';

const ArcGauge = ( {
	value,
	max = 100,
	color,
	size = 148,
	stroke = 10,
	children,
} ) => {
	const safeMax = max > 0 ? max : 1;
	const fraction = Math.min( Math.max( Number( value ) / safeMax, 0 ), 1 );

	const radius = ( size - stroke ) / 2;
	const midline = size / 2;
	const height = midline + stroke / 2;
	const arcLength = Math.PI * radius;
	const path = `M ${ stroke / 2 } ${ midline } A ${ radius } ${ radius } 0 0 1 ${ size - stroke / 2 } ${ midline }`;

	/*
	 * The arc sweeps to its value once, on arrival. This is the page's one
	 * authored moment: the dashboard is otherwise a still surface, and a value
	 * that draws itself tells you the number was measured rather than printed.
	 * It starts from an empty arc rather than a hidden one, so a failed
	 * animation leaves a legible gauge instead of a blank card.
	 */
	const [ swept, setSwept ] = useState( false );
	useEffect( () => {
		const frame = window.requestAnimationFrame( () => setSwept( true ) );
		return () => window.cancelAnimationFrame( frame );
	}, [] );

	return (
		<div className="aime-arc" style={ { width: size } }>
			<svg
				className="aime-arc__svg"
				width={ size }
				height={ height }
				viewBox={ `0 0 ${ size } ${ height }` }
				aria-hidden="true"
				focusable="false"
			>
				<path
					className="aime-arc__track"
					d={ path }
					fill="none"
					strokeWidth={ stroke }
					strokeLinecap="round"
				/>
				<path
					className="aime-arc__value"
					d={ path }
					fill="none"
					strokeWidth={ stroke }
					// A round cap on a zero-length arc still paints a dot, which
					// would read as "a little bit" on a gauge that means zero.
					strokeLinecap={ fraction > 0 ? 'round' : 'butt' }
					strokeDasharray={ arcLength }
					strokeDashoffset={ swept ? arcLength * ( 1 - fraction ) : arcLength }
					style={ color ? { stroke: color } : undefined }
				/>
			</svg>
			<div className="aime-arc__center">{ children }</div>
		</div>
	);
};

export default ArcGauge;
