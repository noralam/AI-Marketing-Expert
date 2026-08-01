/**
 * Loader — the single waiting state for the whole plugin.
 *
 * Every screen here is Operate-mode UI: the visitor came to finish a task, and
 * a centred spinner tells them nothing except that the page is not ready yet.
 * A skeleton tells them what is about to arrive and holds its space, so the
 * layout settles once instead of twice.
 *
 * `text` is no longer painted. It is announced — screen readers hear "Loading
 * campaigns…", sighted users get the shape of the campaigns. Every existing
 * `<Loader text="…" />` call site therefore keeps working unchanged.
 *
 * Variants describe what is coming, not what it looks like:
 *   cards  a grid of records          (default — lists, galleries, pickers)
 *   table  a ledger with a head row   (subscribers, logs, history)
 *   form   labelled fields            (settings panels, editors)
 *   dashboard  stat rail over charts  (analytics, overviews)
 *   calendar   a month of day cells   (content and social calendars)
 *   lines  bare text, no chrome       (inside an existing panel)
 *
 * Card chrome is stripped by CSS when a Loader is rendered inside a card, so a
 * default-variant Loader never produces a card inside a card.
 */

import { __ } from '@wordpress/i18n';

// Deterministic, not random: a skeleton that reshuffles its own widths on every
// re-render reads as content changing rather than content arriving.
const CARD_LINES = [
	{ height: 14, width: '46%' },
	{ height: 16, width: '86%' },
	{ height: 12, width: '96%' },
	{ height: 12, width: '62%' },
];

const ROW_WIDTHS = [ '72%', '90%', '55%', '80%', '64%' ];

const Bar = ( { height, width, className = '' } ) => (
	<span
		className={ `aime-skeleton ${ className }`.trim() }
		style={ { height, width } }
	/>
);

const Loader = ( { text, variant = 'cards', count, className = '' } ) => {
	const items = count || ( variant === 'table' ? 5 : 3 );

	let body;

	if ( variant === 'table' ) {
		body = (
			<div className="aime-loading__table">
				<div className="aime-loading__tr aime-loading__tr--head">
					{ ROW_WIDTHS.map( ( w, c ) => <Bar key={ c } height={ 12 } width={ w } /> ) }
				</div>
				{ Array.from( { length: items } ).map( ( _, r ) => (
					<div className="aime-loading__tr" key={ r }>
						{ ROW_WIDTHS.map( ( w, c ) => (
							// Shift the width pattern one column per row so the
							// column edges do not line up into a false grid.
							<Bar key={ c } height={ 13 } width={ ROW_WIDTHS[ ( c + r ) % ROW_WIDTHS.length ] } />
						) ) }
					</div>
				) ) }
			</div>
		);
	} else if ( variant === 'form' ) {
		body = (
			<div className="aime-loading__form">
				{ Array.from( { length: items } ).map( ( _, i ) => (
					<div className="aime-loading__field" key={ i }>
						<Bar height={ 12 } width="28%" />
						<Bar height={ 36 } width="100%" className="aime-skeleton--control" />
					</div>
				) ) }
			</div>
		);
	} else if ( variant === 'dashboard' ) {
		// Analytics surfaces open with a stat rail over charts, never with a row
		// of paragraph cards. Reserving the wrong shape moves the page twice.
		body = (
			<>
				<div className="aime-loading__stats">
					{ Array.from( { length: 4 } ).map( ( _, i ) => (
						<div className="aime-loading__stat" key={ i }>
							<Bar height={ 28 } width="58%" />
							<Bar height={ 12 } width="76%" />
						</div>
					) ) }
				</div>
				<div className="aime-loading__panels">
					{ Array.from( { length: count || 2 } ).map( ( _, i ) => (
						<div className="aime-loading__card" key={ i }>
							<Bar height={ 14 } width="34%" />
							<Bar height={ 180 } width="100%" className="aime-skeleton--plot" />
						</div>
					) ) }
				</div>
			</>
		);
	} else if ( variant === 'calendar' ) {
		body = (
			<div className="aime-loading__calendar">
				{ Array.from( { length: 7 } ).map( ( _, i ) => (
					<Bar key={ `h${ i }` } height={ 12 } width="52%" className="aime-loading__day-head" />
				) ) }
				{ Array.from( { length: ( count || 5 ) * 7 } ).map( ( _, i ) => (
					<div className="aime-loading__day" key={ i }>
						<Bar height={ 11 } width="24%" />
						{ /* Only some days carry an entry — an evenly filled month
						     would promise a full schedule that is not there. */ }
						{ i % 4 === 1 && <Bar height={ 12 } width="82%" /> }
					</div>
				) ) }
			</div>
		);
	} else if ( variant === 'lines' ) {
		body = (
			<div className="aime-loading__lines">
				{ CARD_LINES.slice( 0, count || CARD_LINES.length ).map( ( line, i ) => (
					<Bar key={ i } { ...line } />
				) ) }
			</div>
		);
	} else {
		body = (
			<div className="aime-loading__grid">
				{ Array.from( { length: items } ).map( ( _, i ) => (
					<div className="aime-loading__card" key={ i }>
						{ CARD_LINES.map( ( line, l ) => <Bar key={ l } { ...line } /> ) }
					</div>
				) ) }
			</div>
		);
	}

	return (
		<div
			className={ `aime-loading aime-loading--${ variant } ${ className }`.trim() }
			role="status"
			aria-busy="true"
			aria-live="polite"
		>
			<span className="screen-reader-text">{ text || __( 'Loading…', 'ai-marketing-expert' ) }</span>
			{ body }
		</div>
	);
};

export default Loader;
