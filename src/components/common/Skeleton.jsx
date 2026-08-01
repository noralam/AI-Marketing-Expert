/**
 * Skeleton primitives.
 *
 * The shimmer itself lives in `.aime-skeleton` (global.scss) so every waiting
 * surface in the plugin sweeps in the same material and the same rhythm — these
 * only decide size and arrangement.
 *
 * For a whole-surface wait, prefer `Loader` with a variant; reach for these when
 * a specific block needs its own placeholder.
 */

const SkeletonBlock = ( { width = '100%', height = 16, style = {} } ) => (
	<div className="aime-skeleton" style={ { width, height, ...style } } />
);

const SkeletonCard = () => (
	<div className="aime-card" style={ { padding: 20 } }>
		<SkeletonBlock height={ 14 } width="40%" style={ { marginBottom: 12 } } />
		<SkeletonBlock height={ 32 } width="60%" style={ { marginBottom: 8 } } />
		<SkeletonBlock height={ 12 } width="30%" />
	</div>
);

// Fixed, offset widths rather than random ones: a placeholder that reshuffles on
// every re-render reads as content changing, not as content arriving.
const ROW_WIDTHS = [ '72%', '90%', '55%', '80%', '64%' ];

const SkeletonRow = ( { cols = 5, offset = 0 } ) => (
	<tr>
		{ Array.from( { length: cols } ).map( ( _, i ) => (
			<td key={ i }>
				<SkeletonBlock height={ 14 } width={ ROW_WIDTHS[ ( i + offset ) % ROW_WIDTHS.length ] } />
			</td>
		) ) }
	</tr>
);

const SkeletonTable = ( { rows = 5, cols = 5 } ) => (
	<div className="aime-table-wrap">
		<table className="aime-table">
			<thead>
				<tr>
					{ Array.from( { length: cols } ).map( ( _, i ) => (
						<th key={ i }><SkeletonBlock height={ 12 } width="70%" /></th>
					) ) }
				</tr>
			</thead>
			<tbody>
				{ Array.from( { length: rows } ).map( ( _, i ) => (
					<SkeletonRow key={ i } cols={ cols } offset={ i } />
				) ) }
			</tbody>
		</table>
	</div>
);

const SkeletonChart = ( { height = 250 } ) => (
	<div className="aime-card" style={ { padding: 20 } }>
		<SkeletonBlock height={ 14 } width="30%" style={ { marginBottom: 16 } } />
		<SkeletonBlock height={ height } width="100%" />
	</div>
);

export { SkeletonBlock, SkeletonCard, SkeletonRow, SkeletonTable, SkeletonChart };
export default SkeletonCard;
