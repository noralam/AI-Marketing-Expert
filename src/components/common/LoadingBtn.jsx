/**
 * LoadingBtn — native loading button that completely bypasses the WP Button
 * component so React can freely update children (spinner + text) without
 * any component interference that causes text duplication.
 */
const spinnerStyle = ( light = false ) => ( {
	display: 'inline-block',
	width: 16,
	height: 16,
	border: `2px solid ${ light ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.15)' }`,
	borderTopColor: light ? '#fff' : 'currentColor',
	borderRadius: '50%',
	animation: 'aime-spin 0.6s linear infinite',
	flexShrink: 0,
} );

const LoadingBtn = ( { light, primary, children, style: extra } ) => {
	const filled = primary || light;
	return (
	<button
		type="button"
		aria-disabled="true"
		style={ {
			display: 'inline-flex',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 6,
			padding: '6px 12px',
			borderRadius: 2,
			border: filled ? 'none' : '1px solid #949494',
			background: filled ? 'var(--aime-primary)' : 'transparent',
			color: filled ? '#fff' : '#1e1e1e',
			fontSize: 13,
			lineHeight: 1.5,
			cursor: 'default',
			pointerEvents: 'none',
			...extra,
		} }
	>
		<span style={ spinnerStyle( filled ) } />
		{ children }
	</button>
	);
};

export default LoadingBtn;
