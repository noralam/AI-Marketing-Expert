/**
 * Skeleton loading components.
 */

const SkeletonBlock = ( { width = '100%', height = 16, style = {} } ) => (
	<div
		className="aime-skeleton"
		style={ {
			width,
			height,
			borderRadius: 6,
			background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
			backgroundSize: '200% 100%',
			animation: 'aime-shimmer 1.5s infinite',
			...style,
		} }
	/>
);

const SkeletonCard = () => (
	<div className="aime-card" style={ { padding: 20 } }>
		<SkeletonBlock height={ 14 } width="40%" style={ { marginBottom: 12 } } />
		<SkeletonBlock height={ 32 } width="60%" style={ { marginBottom: 8 } } />
		<SkeletonBlock height={ 12 } width="30%" />
	</div>
);

const SkeletonRow = () => (
	<tr>
		{ [ 1, 2, 3, 4, 5 ].map( ( i ) => (
			<td key={ i }><SkeletonBlock height={ 14 } width={ `${ 40 + Math.random() * 40 }%` } /></td>
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
				{ Array.from( { length: rows } ).map( ( _, i ) => <SkeletonRow key={ i } /> ) }
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
