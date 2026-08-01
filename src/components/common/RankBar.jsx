/**
 * Ranked bar list — label, a bar on a shared baseline, and a count.
 *
 * This is the plugin's standing answer to "should that be a pie". A pie asks
 * the eye to compare angles, which is the least accurate comparison it can
 * make, and it destroys order — while most of what gets drawn as a pie here is
 * a sequence (draft → ready → published) or a ranking (which action fails
 * most), and both of those are structure worth keeping.
 *
 * The grid lives on the <ul> and rows are `display: contents`, so labels,
 * tracks and counts line up down the card without a magic label width.
 */

/**
 * @param {Object} props
 * @param {string} props.label   Row label.
 * @param {number} props.count   The number shown at the right.
 * @param {number} props.percent Fill width, 0–100. Scale against the biggest
 *                               row rather than the total: against a total, a
 *                               seven-row list draws seven slivers and nothing
 *                               is comparable to anything.
 * @param {string} props.color   Fill and dot colour.
 * @param {string} [props.suffix] Small trailing unit, e.g. a failure rate.
 */
export const RankRow = ( { label, count, percent, color, suffix } ) => (
	<li className="aime-rankbar__row">
		<span className="aime-rankbar__label">
			<span className="aime-rankbar__dot" style={ { background: color } } />
			{ label }
		</span>
		<span className="aime-rankbar__track">
			<span
				className="aime-rankbar__fill"
				style={ {
					// A row with a real but tiny value still gets a visible stub, so
					// "one failure out of nine hundred" is not drawn as zero.
					width: `${ Math.max( percent, percent > 0 ? 2 : 0 ) }%`,
					background: color,
				} }
			/>
		</span>
		<span className="aime-rankbar__count">
			{ count.toLocaleString() }
			{ suffix && <em className="aime-rankbar__suffix">{ suffix }</em> }
		</span>
	</li>
);

export default RankRow;
