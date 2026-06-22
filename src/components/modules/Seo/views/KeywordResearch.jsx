/**
 * Keyword Research - SEMrush-style AI-powered keyword discovery
 * with inline SVG charts (donut, bar, gauge) for all tabs.
 */

import { useState, useMemo, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, TextareaControl, SelectControl, TabPanel, Spinner } from '@aime/wp-components';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import useSlowWarning from '../../../../hooks/useSlowWarning';
import Card from '../../../common/Card';
import LoadingBtn from '../../../common/LoadingBtn';
import AiNotice, { isAiConfigured, aiDisabledTitle } from '../../../common/AiNotice';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ProGate from '../../../common/ProGate';
import { toast } from '../../../common/Toast';
import { navigateToNewArticle } from '../../../../utils/seoContentBridge';

/* ================================================================
   CONSTANTS
   ================================================================ */

const INTENT_COLORS = {
	informational: '#2196f3',
	commercial: '#ff9800',
	transactional: '#4caf50',
	navigational: '#9c27b0',
};

const KD_COLOR = ( score ) => {
	if ( score <= 14 ) return '#4caf50';
	if ( score <= 29 ) return '#8bc34a';
	if ( score <= 49 ) return '#ff9800';
	if ( score <= 69 ) return '#ff5722';
	if ( score <= 84 ) return '#f44336';
	return '#b71c1c';
};

const KD_LABEL = ( score ) => {
	if ( score <= 14 ) return __( 'Very Easy', 'ai-marketing-expert' );
	if ( score <= 29 ) return __( 'Easy', 'ai-marketing-expert' );
	if ( score <= 49 ) return __( 'Possible', 'ai-marketing-expert' );
	if ( score <= 69 ) return __( 'Difficult', 'ai-marketing-expert' );
	if ( score <= 84 ) return __( 'Hard', 'ai-marketing-expert' );
	return __( 'Very Hard', 'ai-marketing-expert' );
};

const TREND_ICON = ( trend ) => {
	if ( trend === 'up' ) return '\u{1F4C8}';
	if ( trend === 'down' ) return '\u{1F4C9}';
	return '\u{27A1}\u{FE0F}';
};

const SERP_ICONS = {
	featured_snippet: '\u{2B50}',
	people_also_ask: '\u{2753}',
	local_pack: '\u{1F4CD}',
	image_pack: '\u{1F5BC}\u{FE0F}',
	video: '\u{1F3AC}',
	knowledge_panel: '\u{1F4CB}',
	shopping: '\u{1F6D2}',
	reviews: '\u{2B50}',
	sitelinks: '\u{1F517}',
	top_stories: '\u{1F4F0}',
};

const PRIORITY_COLORS = { high: '#f44336', medium: '#ff9800', low: '#4caf50' };

const TABS = [
	{ name: 'keyword', title: __( 'Keyword Research', 'ai-marketing-expert' ) },
	{ name: 'niche', title: __( 'Niche Analysis', 'ai-marketing-expert' ) },
	{ name: 'competitor', title: __( 'Competitor Gap', 'ai-marketing-expert' ) },
	{ name: 'brief', title: __( 'Content Brief', 'ai-marketing-expert' ) },
];

const RESULT_TABS = [
	{ name: 'related', title: __( 'Related Keywords', 'ai-marketing-expert' ) },
	{ name: 'longtail', title: __( 'Long-Tail', 'ai-marketing-expert' ) },
	{ name: 'questions', title: __( 'Questions', 'ai-marketing-expert' ) },
	{ name: 'clusters', title: __( 'Topic Clusters', 'ai-marketing-expert' ) },
];

const RECENT_STORAGE_KEY = 'aime_seo_keyword_research_recent';

const loadRecentState = () => {
	try {
		const raw = window.localStorage?.getItem( RECENT_STORAGE_KEY );
		return raw ? JSON.parse( raw ) : {};
	} catch ( e ) {
		return {};
	}
};

const saveRecentState = ( state ) => {
	try {
		window.localStorage?.setItem( RECENT_STORAGE_KEY, JSON.stringify( state ) );
	} catch ( e ) {
		// Ignore storage quota/private mode failures.
	}
};

/* ================================================================
   REUSABLE SVG CHART COMPONENTS  (no external deps)
   ================================================================ */

/**
 * Donut / Pie chart rendered as pure SVG.
 * @param {{ data: {label:string, value:number, color:string}[], size?: number, thickness?: number, showLegend?: boolean }} props
 */
const DonutChart = ( { data, size = 160, thickness = 28, showLegend = true } ) => {
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

/**
 * Horizontal bar chart rendered as styled divs.
 * @param {{ data: {label:string, value:number, color?:string, maxLabel?:string}[], maxValue?: number, barHeight?: number, title?: string }} props
 */
const HBarChart = ( { data, maxValue, barHeight = 22, title } ) => {
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

/**
 * Radial gauge (0-10 or 0-100) rendered as SVG arc.
 * @param {{ value: number, max?: number, size?: number, label?: string, color?: string }} props
 */
const RadialGauge = ( { value, max = 10, size = 120, label, color } ) => {
	const pct = Math.min( 1, Math.max( 0, value / max ) );
	const r = ( size - 16 ) / 2;
	const C = Math.PI * r; // semicircle
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

/**
 * Stacked horizontal bar (like SEMrush distribution).
 * @param {{ segments: {label:string, value:number, color:string}[] }} props
 */
const StackedBar = ( { segments, height = 18 } ) => {
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

/* ================================================================
   SMALL HELPERS
   ================================================================ */

const SortArrow = ( { active, dir } ) => (
	<span style={ active ? { fontSize: 14, fontWeight: 700, color: '#007cba', marginLeft: 2 } : { fontSize: 14, opacity: 0.35, marginLeft: 2 } }>
		{ active ? ( dir === 'asc' ? '\u2191' : '\u2193' ) : '\u21C5' }
	</span>
);

const MetricCard = ( { label, value, subtext, color } ) => (
	<div className="aime-metric-card">
		<div className="aime-metric-card__label">{ label }</div>
		<div className="aime-metric-card__value" style={ { color: color || '#1e1e1e' } }>{ value }</div>
		{ subtext && <div className="aime-metric-card__sub">{ subtext }</div> }
	</div>
);

const KdGauge = ( { score } ) => {
	const color = KD_COLOR( score );
	const pct = Math.min( 100, Math.max( 0, score ) );
	return (
		<div className="aime-kd-gauge">
			<div className="aime-kd-gauge__bar">
				<div className="aime-kd-gauge__fill" style={ { width: `${ pct }%`, background: color } } />
			</div>
			<div className="aime-kd-gauge__info">
				<span style={ { color, fontWeight: 700, fontSize: 18 } }>{ score }%</span>
				<span style={ { fontSize: 12, color: '#666' } }>{ KD_LABEL( score ) }</span>
			</div>
		</div>
	);
};

const SerpBadges = ( { features } ) => {
	if ( ! features?.length ) return '-';
	return (
		<div style={ { display: 'flex', flexWrap: 'wrap', gap: 3 } }>
			{ features.slice( 0, 4 ).map( ( f ) => (
				<span key={ f } title={ f.replace( /_/g, ' ' ) } style={ {
					fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#f0f0f1', whiteSpace: 'nowrap',
				} }>
					{ SERP_ICONS[ f ] || '\u{1F50D}' }
				</span>
			) ) }
			{ features.length > 4 && <span style={ { fontSize: 10, color: '#888' } }>+{ features.length - 4 }</span> }
		</div>
	);
};

/* ================================================================
   ANALYTICS HELPERS  -  derive chart data from API responses
   ================================================================ */

/** Compute KD distribution buckets from a keyword array. */
const kdDistribution = ( keywords ) => {
	const buckets = { 'Easy (0-29)': 0, 'Possible (30-49)': 0, 'Difficult (50-69)': 0, 'Hard (70-100)': 0 };
	const colors = { 'Easy (0-29)': '#4caf50', 'Possible (30-49)': '#ff9800', 'Difficult (50-69)': '#ff5722', 'Hard (70-100)': '#f44336' };
	( keywords || [] ).forEach( ( k ) => {
		const d = k.difficulty_score ?? 50;
		if ( d < 30 ) buckets[ 'Easy (0-29)' ]++;
		else if ( d < 50 ) buckets[ 'Possible (30-49)' ]++;
		else if ( d < 70 ) buckets[ 'Difficult (50-69)' ]++;
		else buckets[ 'Hard (70-100)' ]++;
	} );
	return Object.entries( buckets ).map( ( [ label, value ] ) => ( { label, value, color: colors[ label ] } ) );
};

/** Compute intent distribution from a keyword array. */
const intentDistribution = ( keywords ) => {
	const counts = {};
	( keywords || [] ).forEach( ( k ) => {
		const intent = k.intent || 'unknown';
		counts[ intent ] = ( counts[ intent ] || 0 ) + 1;
	} );
	return Object.entries( counts ).map( ( [ label, value ] ) => ( {
		label: label.charAt( 0 ).toUpperCase() + label.slice( 1 ),
		value,
		color: INTENT_COLORS[ label ] || '#607d8b',
	} ) );
};

/** Compute volume range distribution from a keyword array. */
const volumeDistribution = ( keywords ) => {
	const ranges = [ [ '0-100', 0, 100, '#90caf9' ], [ '100-1K', 100, 1000, '#42a5f5' ], [ '1K-10K', 1000, 10000, '#1e88e5' ], [ '10K+', 10000, Infinity, '#1565c0' ] ];
	const data = ranges.map( ( [ label, min, max, color ] ) => ( {
		label,
		value: ( keywords || [] ).filter( ( k ) => {
			const v = k.search_volume || 0;
			return v >= min && v < max;
		} ).length,
		color,
	} ) );
	return data;
};

/** Compute priority distribution from gap keywords. */
const priorityDistribution = ( keywords ) => {
	const counts = { high: 0, medium: 0, low: 0 };
	( keywords || [] ).forEach( ( k ) => { counts[ k.priority || 'medium' ]++; } );
	return Object.entries( counts ).map( ( [ label, value ] ) => ( {
		label: label.charAt( 0 ).toUpperCase() + label.slice( 1 ),
		value,
		color: PRIORITY_COLORS[ label ],
	} ) );
};

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

const KeywordResearch = ( { onNavigate } ) => {
	const { get, post, loading, error, clearError } = useApi();
	const { hasPro, freeLimits } = usePro();
	const slowWarning = useSlowWarning();
	const recentState = useMemo( loadRecentState, [] );

	// Keyword research state.
	const [ seed, setSeed ] = useState( recentState.keyword?.seed || '' );
	const [ language, setLanguage ] = useState( recentState.keyword?.language || 'en' );
	const [ country, setCountry ] = useState( recentState.keyword?.country || 'US' );
	const [ researchData, setResearchData ] = useState( recentState.keyword?.data || null );
	const [ selected, setSelected ] = useState( [] );

	// Niche analysis state.
	const [ niche, setNiche ] = useState( recentState.niche?.query || '' );
	const [ nicheResults, setNicheResults ] = useState( recentState.niche?.data || null );

	// Competitor gap state.
	const [ domain, setDomain ] = useState( recentState.competitor?.domain || '' );
	const [ competitors, setCompetitors ] = useState( recentState.competitor?.competitors || '' );
	const [ gapResults, setGapResults ] = useState( recentState.competitor?.data || null );

	// Content brief state.
	const [ briefKeyword, setBriefKeyword ] = useState( recentState.brief?.keyword || '' );
	const [ briefResult, setBriefResult ] = useState( recentState.brief?.data || null );

	// Tab + sort state.
	const [ activeTab, setActiveTab ] = useState( recentState.activeTab || 'keyword' );
	const [ activeResultTab, setActiveResultTab ] = useState( 'related' );
	const [ sortKey, setSortKey ] = useState( null );
	const [ sortDir, setSortDir ] = useState( 'desc' );

	// Per-tab sort state for other tables.
	const [ nicheSortKey, setNicheSortKey ] = useState( null );
	const [ nicheSortDir, setNicheSortDir ] = useState( 'desc' );
	const [ gapSortKey, setGapSortKey ] = useState( null );
	const [ gapSortDir, setGapSortDir ] = useState( 'desc' );
	const [ sharedSortKey, setSharedSortKey ] = useState( null );
	const [ sharedSortDir, setSharedSortDir ] = useState( 'desc' );

	useEffect( () => {
		saveRecentState( {
			activeTab,
			keyword: {
				seed,
				language,
				country,
				data: researchData,
				updated_at: researchData ? Date.now() : recentState.keyword?.updated_at,
			},
			niche: {
				query: niche,
				data: nicheResults,
				updated_at: nicheResults ? Date.now() : recentState.niche?.updated_at,
			},
			competitor: {
				domain,
				competitors,
				data: gapResults,
				updated_at: gapResults ? Date.now() : recentState.competitor?.updated_at,
			},
			brief: {
				keyword: briefKeyword,
				data: briefResult,
				updated_at: briefResult ? Date.now() : recentState.brief?.updated_at,
			},
		} );
	}, [ activeTab, seed, language, country, researchData, niche, nicheResults, domain, competitors, gapResults, briefKeyword, briefResult, recentState ] );

	const handleSort = ( key ) => {
		if ( sortKey === key ) {
			setSortDir( ( d ) => ( d === 'asc' ? 'desc' : 'asc' ) );
		} else {
			setSortKey( key );
			setSortDir( 'desc' );
		}
	};

	/** Generic sort handler factory for any table. */
	const makeSortHandler = ( currentKey, setKey, currentDir, setDir ) => ( key ) => {
		if ( currentKey === key ) {
			setDir( currentDir === 'asc' ? 'desc' : 'asc' );
		} else {
			setKey( key );
			setDir( 'desc' );
		}
	};

	const handleNicheSort = makeSortHandler( nicheSortKey, setNicheSortKey, nicheSortDir, setNicheSortDir );
	const handleGapSort = makeSortHandler( gapSortKey, setGapSortKey, gapSortDir, setGapSortDir );
	const handleSharedSort = makeSortHandler( sharedSortKey, setSharedSortKey, sharedSortDir, setSharedSortDir );

	/** Generic array sorter. */
	const sortArray = ( arr, key, dir ) => {
		if ( ! key || ! arr?.length ) return arr || [];
		return [ ...arr ].sort( ( a, b ) => {
			let aVal = a[ key ] ?? '';
			let bVal = b[ key ] ?? '';
			if ( typeof aVal === 'string' ) aVal = aVal.toLowerCase();
			if ( typeof bVal === 'string' ) bVal = bVal.toLowerCase();
			if ( aVal < bVal ) return dir === 'asc' ? -1 : 1;
			if ( aVal > bVal ) return dir === 'asc' ? 1 : -1;
			return 0;
		} );
	};

	const currentKeywords = useMemo( () => {
		if ( ! researchData ) return [];
		if ( activeResultTab === 'related' ) return researchData.related_keywords || researchData.keywords || [];
		if ( activeResultTab === 'longtail' ) return researchData.long_tail_keywords || [];
		if ( activeResultTab === 'questions' ) return researchData.questions || [];
		return [];
	}, [ researchData, activeResultTab ] );

	const sortedKeywords = useMemo( () => {
		if ( ! sortKey ) return currentKeywords;
		return [ ...currentKeywords ].sort( ( a, b ) => {
			let aVal = a[ sortKey ] ?? '';
			let bVal = b[ sortKey ] ?? '';
			if ( typeof aVal === 'string' ) aVal = aVal.toLowerCase();
			if ( typeof bVal === 'string' ) bVal = bVal.toLowerCase();
			if ( aVal < bVal ) return sortDir === 'asc' ? -1 : 1;
			if ( aVal > bVal ) return sortDir === 'asc' ? 1 : -1;
			return 0;
		} );
	}, [ currentKeywords, sortKey, sortDir ] );

	const sortedWithOrigIdx = useMemo( () => {
		return sortedKeywords.map( ( kw ) => ( {
			...kw,
			_origIdx: currentKeywords.indexOf( kw ),
		} ) );
	}, [ sortedKeywords, currentKeywords ] );

	/* -- Keyword Research -------------------------------------- */

	const handleResearch = async () => {
		if ( ! seed.trim() ) return;
		clearError();
		slowWarning.start();
		try {
			const res = await post( '/seo/research/keywords', {
				seed_keyword: seed.trim(),
				language,
				country,
			} );
			if ( res && res.success === false ) {
				toast( res.message || __( 'Research failed. Please try again.', 'ai-marketing-expert' ), 'error' );
				return;
			}
			const data = res?.data || res || {};
			setResearchData( data );
			setSelected( [] );
			setSortKey( null );
			setActiveResultTab( 'related' );

			// If the AI returned valid JSON but all arrays are empty, show a
			// warning so the user knows to retry rather than wondering why there
			// are no results.
			const total =
				( data.related_keywords?.length || 0 ) +
				( data.long_tail_keywords?.length || 0 ) +
				( data.questions?.length || 0 ) +
				( data.cluster_suggestions?.length || 0 );
			if ( total === 0 ) {
				toast( __( 'AI returned empty results. Try a different keyword or AI model.', 'ai-marketing-expert' ), 'warning' );
			}
		} catch ( e ) {
			toast( e.message || __( 'Research failed. Please try again.', 'ai-marketing-expert' ), 'error' );
		} finally {
			slowWarning.stop();
		}
	};

	const toggleSelect = ( idx ) => {
		setSelected( ( prev ) =>
			prev.includes( idx ) ? prev.filter( ( i ) => i !== idx ) : [ ...prev, idx ]
		);
	};

	const toggleSelectAll = () => {
		if ( selected.length === currentKeywords.length ) {
			setSelected( [] );
		} else {
			setSelected( currentKeywords.map( ( _, i ) => i ) );
		}
	};

	const handleSaveSelected = async () => {
		if ( ! selected.length ) return;
		let saved = 0;
		for ( const idx of selected ) {
			const kw = currentKeywords[ idx ];
			try {
				await post( '/seo/keywords', {
					keyword: kw.keyword,
					search_volume: kw.search_volume || null,
					difficulty_score: kw.difficulty_score || null,
					cpc_estimate: kw.cpc_estimate || null,
					intent: kw.intent || null,
				} );
				saved++;
			} catch ( e ) {
				// duplicate or limit
			}
		}
		toast(
			saved > 0
				? `${ saved } ${ __( 'keywords saved to vault.', 'ai-marketing-expert' ) }`
				: __( 'No keywords could be saved (limit reached or duplicates).', 'ai-marketing-expert' ),
			saved > 0 ? 'success' : 'error'
		);
		if ( saved > 0 ) setSelected( [] );
	};

	/* -- Niche Analysis (Pro) ---------------------------------- */

	const handleNicheAnalysis = async () => {
		if ( ! niche.trim() ) return;
		clearError();
		slowWarning.start();
		try {
			const res = await post( '/seo/research/niche-analysis', { niche: niche.trim() } );
			setNicheResults( res.data || {} );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
		}
	};

	/* -- Competitor Gap (Pro) ---------------------------------- */

	const handleCompetitorGap = async () => {
		if ( ! domain.trim() || ! competitors.trim() ) return;
		clearError();
		slowWarning.start();
		try {
			const res = await post( '/seo/research/competitor-gap', {
				my_domain: domain.trim(),
				competitor_domains: competitors.split( '\n' ).map( ( c ) => c.trim() ).filter( Boolean ),
			} );
			setGapResults( res.data || {} );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
		}
	};

	/* -- Content Brief (Pro) ----------------------------------- */

	const handleContentBrief = async () => {
		if ( ! briefKeyword.trim() ) return;
		clearError();
		slowWarning.start();
		try {
			const res = await post( '/seo/research/content-brief', { keyword: briefKeyword.trim() } );
			setBriefResult( res.data || {} );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
		}
	};

	const getKeywordText = ( item ) => {
		if ( typeof item === 'string' ) return item;
		return item?.keyword || item?.text || item?.label || '';
	};

	const buildOutlineForArticle = ( brief ) => {
		const outline = brief?.outline || [];
		if ( ! Array.isArray( outline ) || ! outline.length ) {
			return '';
		}

		const items = [];
		outline.forEach( ( item ) => {
			const heading = typeof item === 'string' ? item : item.heading || item.section || item.title;
			if ( ! heading ) return;
			const level = String( item.level || 'h2' ).replace( /^h/i, '' );
			items.push( {
				heading,
				level: parseInt( level, 10 ) || 2,
				description: item.notes || item.description || '',
			} );
			( item.sub_headings || [] ).forEach( ( sub ) => {
				const subHeading = typeof sub === 'string' ? sub : sub.heading || sub.title;
				if ( ! subHeading ) return;
				items.push( {
					heading: subHeading,
					level: 3,
					description: sub.notes || sub.description || '',
				} );
			} );
		} );

		return JSON.stringify( items, null, 2 );
	};

	const handleCreateArticleFromBrief = () => {
		if ( ! briefResult ) return;
		const primaryKeywords = ( briefResult.primary_keywords || [] ).map( getKeywordText ).filter( Boolean );
		const secondaryKeywords = ( briefResult.secondary_keywords || [] ).map( getKeywordText ).filter( Boolean );
		const title = briefResult.title_suggestions?.[ 0 ] || briefKeyword.trim();
		const topic = title || briefKeyword.trim();

		navigateToNewArticle( {
			source: 'seo-content-brief',
			topic,
			title,
			keywords: [ ...new Set( [ briefKeyword.trim(), ...primaryKeywords, ...secondaryKeywords ].filter( Boolean ) ) ],
			intent: briefResult.search_intent || '',
			content_type: briefResult.content_type || 'blog_post',
			word_count_target: briefResult.target_word_count || 1200,
			outline: buildOutlineForArticle( briefResult ),
			meta_title: title,
			meta_description: briefResult.meta_description || '',
			excerpt: briefResult.meta_description || briefResult.unique_angle || '',
		} );
	};

	/* ============================================================
	   RENDER: SEED OVERVIEW  (Keyword Research tab)
	   ============================================================ */

	const renderSeedOverview = () => {
		const sm = researchData?.seed_metrics;
		const summary = researchData?.summary;
		if ( ! sm && ! summary ) return null;

		return (
			<div style={ { marginTop: 24 } }>
				{ sm && (
					<div className="aime-kw-seed-card">
						<div className="aime-kw-seed-hero">
							<div>
								<h3 style={ { margin: '0 0 6px', fontSize: 20, fontWeight: 700 } }>{ sm.keyword || seed }</h3>
								<div style={ { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } }>
									{ sm.intent && (
										<span className="aime-status-badge" style={ { background: INTENT_COLORS[ sm.intent ] || '#607d8b' } }>
											{ sm.intent }
										</span>
									) }
									{ sm.trend && <span>{ TREND_ICON( sm.trend ) } { sm.trend }</span> }
									{ sm.results_count > 0 && (
										<span style={ { color: '#666', fontSize: 13 } }>
											{ Number( sm.results_count ).toLocaleString() } { __( 'results', 'ai-marketing-expert' ) }
										</span>
									) }
									{ sm.serp_features?.length > 0 && <SerpBadges features={ sm.serp_features } /> }
								</div>
							</div>
						</div>

						<div className="aime-kw-metrics-row">
							<MetricCard
								label={ __( 'Volume', 'ai-marketing-expert' ) }
								value={ sm.search_volume ? Number( sm.search_volume ).toLocaleString() : '-' }
								subtext="/mo"
							/>
							<div className="aime-metric-card">
								<div className="aime-metric-card__label">{ __( 'Keyword Difficulty', 'ai-marketing-expert' ) }</div>
								<KdGauge score={ sm.difficulty_score || 0 } />
							</div>
							<MetricCard
								label={ __( 'CPC', 'ai-marketing-expert' ) }
								value={ sm.cpc_estimate ? `$${ sm.cpc_estimate }` : '-' }
								color="#1e88e5"
							/>
							<MetricCard
								label={ __( 'Competition', 'ai-marketing-expert' ) }
								value={ sm.competition != null ? sm.competition : '-' }
								subtext={ __( 'paid density', 'ai-marketing-expert' ) }
							/>
						</div>
					</div>
				) }

				{ summary && (
					<div className="aime-kw-summary-row">
						<div className="aime-kw-summary-stat">
							<span className="aime-kw-summary-stat__num">{ summary.total_keywords || 0 }</span>
							<span className="aime-kw-summary-stat__label">{ __( 'Keywords', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-summary-stat">
							<span className="aime-kw-summary-stat__num">{ summary.avg_volume ? Number( summary.avg_volume ).toLocaleString() : 0 }</span>
							<span className="aime-kw-summary-stat__label">{ __( 'Avg Volume', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-summary-stat">
							<span className="aime-kw-summary-stat__num" style={ { color: KD_COLOR( summary.avg_difficulty || 0 ) } }>{ summary.avg_difficulty || 0 }%</span>
							<span className="aime-kw-summary-stat__label">{ __( 'Avg KD', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-summary-stat">
							<span className="aime-kw-summary-stat__num" style={ { color: '#1e88e5' } }>${ summary.avg_cpc || '0.00' }</span>
							<span className="aime-kw-summary-stat__label">{ __( 'Avg CPC', 'ai-marketing-expert' ) }</span>
						</div>
						<div className="aime-kw-summary-stat">
							<span className="aime-kw-summary-stat__num" style={ { color: '#4caf50' } }>{ summary.easy_wins_count || 0 }</span>
							<span className="aime-kw-summary-stat__label">{ __( 'Easy Wins', 'ai-marketing-expert' ) }</span>
						</div>
					</div>
				) }
			</div>
		);
	};

	/* ============================================================
	   RENDER: KEYWORD TABLE  (Keyword Research tab)
	   ============================================================ */

	const renderKeywordTable = () => {
		const isQuestions = activeResultTab === 'questions';

		return (
			<div style={ { overflowX: 'auto' } }>
				<table className="aime-table aime-kw-table">
					<thead>
						<tr>
							<th style={ { width: 32 } }>
								<input
									type="checkbox"
									checked={ selected.length === currentKeywords.length && currentKeywords.length > 0 }
									onChange={ toggleSelectAll }
									style={ { margin: 0 } }
								/>
							</th>
							<th onClick={ () => handleSort( 'keyword' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
								{ __( 'Keyword', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'keyword' } dir={ sortDir } />
							</th>
							<th onClick={ () => handleSort( 'intent' ) } style={ { cursor: 'pointer', userSelect: 'none', width: 44 } }>
								{ __( 'Intent', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'intent' } dir={ sortDir } />
							</th>
							<th onClick={ () => handleSort( 'search_volume' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
								{ __( 'Volume', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'search_volume' } dir={ sortDir } />
							</th>
							<th onClick={ () => handleSort( 'difficulty_score' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
								{ __( 'KD%', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'difficulty_score' } dir={ sortDir } />
							</th>
							<th onClick={ () => handleSort( 'cpc_estimate' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
								{ __( 'CPC', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'cpc_estimate' } dir={ sortDir } />
							</th>
							{ ! isQuestions && (
								<>
									<th onClick={ () => handleSort( 'competition' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
										{ __( 'Com.', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'competition' } dir={ sortDir } />
									</th>
									<th>{ __( 'Trend', 'ai-marketing-expert' ) }</th>
									<th>{ __( 'SERP', 'ai-marketing-expert' ) }</th>
									<th onClick={ () => handleSort( 'opportunity_score' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
										{ __( 'Opp.', 'ai-marketing-expert' ) } <SortArrow active={ sortKey === 'opportunity_score' } dir={ sortDir } />
									</th>
								</>
							) }
						</tr>
					</thead>
					<tbody>
						{ sortedWithOrigIdx.map( ( kw ) => (
							<tr key={ kw._origIdx }>
								<td style={ { width: 32 } }>
									<input
										type="checkbox"
										checked={ selected.includes( kw._origIdx ) }
										onChange={ () => toggleSelect( kw._origIdx ) }
										style={ { margin: 0 } }
									/>
								</td>
								<td><strong>{ kw.keyword }</strong></td>
								<td>
									{ kw.intent && (
										<span
											className="aime-intent-dot"
											title={ kw.intent }
											style={ { background: INTENT_COLORS[ kw.intent ] || '#607d8b' } }
										>
											{ kw.intent?.charAt( 0 ).toUpperCase() }
										</span>
									) }
								</td>
								<td>{ kw.search_volume ? Number( kw.search_volume ).toLocaleString() : '-' }</td>
								<td>
									{ kw.difficulty_score != null ? (
										<span style={ { color: KD_COLOR( kw.difficulty_score ), fontWeight: 600 } }>{ kw.difficulty_score }%</span>
									) : '-' }
								</td>
								<td>{ kw.cpc_estimate ? `$${ kw.cpc_estimate }` : '-' }</td>
								{ ! isQuestions && (
									<>
										<td>{ kw.competition != null ? kw.competition : '-' }</td>
										<td>{ kw.trend ? TREND_ICON( kw.trend ) : '-' }</td>
										<td><SerpBadges features={ kw.serp_features } /></td>
										<td>
											{ kw.opportunity_score != null ? (
												<span style={ {
													fontWeight: 700,
													color: kw.opportunity_score >= 70 ? '#4caf50' : kw.opportunity_score >= 40 ? '#ff9800' : '#f44336',
												} }>
													{ kw.opportunity_score }
												</span>
											) : '-' }
										</td>
									</>
								) }
							</tr>
						) ) }
					</tbody>
				</table>
			</div>
		);
	};

	/* ============================================================
	   RENDER: CLUSTERS  (Keyword Research tab)
	   ============================================================ */

	const renderClusters = () => {
		const clusters = researchData?.cluster_suggestions;
		if ( ! clusters?.length ) return <p className="aime-empty-text">{ __( 'No clusters found.', 'ai-marketing-expert' ) }</p>;

		return (
			<div className="aime-cluster-grid">
				{ clusters.map( ( cluster, i ) => (
					<Card key={ i } className="aime-cluster-card">
						<h4 style={ { margin: '0 0 8px', fontSize: 15, fontWeight: 600 } }>
							{ '\u{1F3AF}' } { cluster.name }
						</h4>
						{ cluster.pillar_keyword && (
							<div style={ { marginBottom: 8, fontSize: 13, color: '#666' } }>
								{ __( 'Pillar:', 'ai-marketing-expert' ) } <strong>{ cluster.pillar_keyword }</strong>
							</div>
						) }
						<div className="aime-tag-list">
							{ ( cluster.keywords || [] ).map( ( kw, j ) => (
								<span key={ j } className="aime-tag">{ typeof kw === 'string' ? kw : kw.keyword || kw }</span>
							) ) }
						</div>
					</Card>
				) ) }
			</div>
		);
	};

	/* ============================================================
	   RENDER: NICHE ANALYSIS RESULTS  (with charts)
	   ============================================================ */

	const renderNicheResults = () => {
		if ( ! nicheResults ) return null;
		const kwsRaw = nicheResults.top_keywords || [];
		const kws = sortArray( kwsRaw, nicheSortKey, nicheSortDir );
		const kdData = kdDistribution( kwsRaw );
		const volData = volumeDistribution( kwsRaw );
		const topVolKws = [ ...kwsRaw ].sort( ( a, b ) => ( b.search_volume || 0 ) - ( a.search_volume || 0 ) ).slice( 0, 8 );

		return (
			<div style={ { marginTop: 24 } }>
				{ /* --- Gauges Row --- */ }
				<div className="aime-analytics-gauges">
					{ nicheResults.opportunity_score != null && (
						<RadialGauge
							value={ nicheResults.opportunity_score }
							max={ 10 }
							label={ __( 'Opportunity Score', 'ai-marketing-expert' ) }
							color={ nicheResults.opportunity_score >= 7 ? '#4caf50' : nicheResults.opportunity_score >= 4 ? '#ff9800' : '#f44336' }
						/>
					) }
					{ nicheResults.competition_level && (
						<RadialGauge
							value={ nicheResults.competition_level === 'low' ? 3 : nicheResults.competition_level === 'medium' ? 6 : 9 }
							max={ 10 }
							label={ __( 'Competition Level', 'ai-marketing-expert' ) }
							color={ nicheResults.competition_level === 'low' ? '#4caf50' : nicheResults.competition_level === 'medium' ? '#ff9800' : '#f44336' }
						/>
					) }
					{ nicheResults.estimated_timeline && (
						<div className="aime-metric-card" style={ { textAlign: 'center', minWidth: 140 } }>
							<div className="aime-metric-card__label">{ __( 'Est. Timeline', 'ai-marketing-expert' ) }</div>
							<div className="aime-metric-card__value" style={ { fontSize: 18 } }>{ nicheResults.estimated_timeline }</div>
						</div>
					) }
				</div>

				{ /* --- Overview --- */ }
				{ nicheResults.overview && (
					<Card title={ __( 'Niche Overview', 'ai-marketing-expert' ) }>
						<p style={ { lineHeight: 1.7, color: '#333', margin: 0 } }>{ nicheResults.overview }</p>
					</Card>
				) }

				{ /* --- Charts Row: KD Distribution + Volume Distribution --- */ }
				{ kws.length > 0 && (
					<div className="aime-analytics-charts-row">
						<Card title={ __( 'Keyword Difficulty Distribution', 'ai-marketing-expert' ) }>
							<DonutChart data={ kdData } size={ 150 } thickness={ 26 } />
						</Card>
						<Card title={ __( 'Search Volume Distribution', 'ai-marketing-expert' ) }>
							<DonutChart data={ volData } size={ 150 } thickness={ 26 } />
						</Card>
					</div>
				) }

				{ /* --- Top Keywords by Volume (Horizontal Bar) --- */ }
				{ topVolKws.length > 0 && (
					<Card title={ __( 'Top Keywords by Volume', 'ai-marketing-expert' ) }>
						<HBarChart
							data={ topVolKws.map( ( k ) => ( {
								label: k.keyword,
								value: k.search_volume || 0,
								color: KD_COLOR( k.difficulty_score || 50 ),
							} ) ) }
						/>
					</Card>
				) }

				{ /* --- KD Stacked Bar --- */ }
				{ kws.length > 0 && (
					<Card title={ __( 'Difficulty Overview', 'ai-marketing-expert' ) }>
						<StackedBar segments={ kdData } height={ 22 } />
					</Card>
				) }

				{ /* --- Keywords Table --- */ }
				{ kws.length > 0 && (
					<Card title={ __( 'Top Keywords', 'ai-marketing-expert' ) }>
						<div style={ { overflowX: 'auto' } }>
							<table className="aime-table">
								<thead>
									<tr>
										<th>#</th>
										<th>{ __( 'Keyword', 'ai-marketing-expert' ) }</th>
										<th>{ __( 'Volume', 'ai-marketing-expert' ) }</th>
										<th>{ __( 'KD%', 'ai-marketing-expert' ) }</th>
										<th>{ __( 'Difficulty', 'ai-marketing-expert' ) }</th>
									</tr>
								</thead>
								<tbody>
									{ kws.map( ( kw, i ) => (
										<tr key={ i }>
											<td style={ { color: '#999', fontSize: 12 } }>{ i + 1 }</td>
											<td><strong>{ typeof kw === 'string' ? kw : kw.keyword }</strong></td>
											<td>{ kw.search_volume ? Number( kw.search_volume ).toLocaleString() : '-' }</td>
											<td>
												{ kw.difficulty_score != null ? (
													<span style={ { color: KD_COLOR( kw.difficulty_score ), fontWeight: 600 } }>{ kw.difficulty_score }%</span>
												) : '-' }
											</td>
											<td>
												{ kw.difficulty_score != null && (
													<div style={ { width: 60, height: 6, borderRadius: 3, background: '#eee', overflow: 'hidden' } }>
														<div style={ { width: `${ kw.difficulty_score }%`, height: '100%', background: KD_COLOR( kw.difficulty_score ), borderRadius: 3 } } />
													</div>
												) }
											</td>
										</tr>
									) ) }
								</tbody>
							</table>
						</div>
					</Card>
				) }

				{ /* --- Content Gaps --- */ }
				{ nicheResults.content_gaps?.length > 0 && (
					<Card title={ __( 'Content Gaps & Opportunities', 'ai-marketing-expert' ) }>
						<div className="aime-gap-list">
							{ nicheResults.content_gaps.map( ( g, i ) => (
								<div key={ i } className="aime-gap-item">
									<span className="aime-gap-item__num">{ i + 1 }</span>
									<span>{ g }</span>
								</div>
							) ) }
						</div>
					</Card>
				) }

				{ /* --- Strategy --- */ }
				{ nicheResults.recommended_strategy?.length > 0 && (
					<Card title={ __( 'Recommended Strategy', 'ai-marketing-expert' ) }>
						<div className="aime-strategy-timeline">
							{ nicheResults.recommended_strategy.map( ( s, i ) => (
								<div key={ i } className="aime-strategy-step">
									<div className="aime-strategy-step__marker">{ i + 1 }</div>
									<div className="aime-strategy-step__text">{ s }</div>
								</div>
							) ) }
						</div>
					</Card>
				) }

				{ /* --- Monetization --- */ }
				{ nicheResults.monetization_potential?.length > 0 && (
					<Card title={ __( 'Monetization Potential', 'ai-marketing-expert' ) }>
						<div className="aime-tag-list">
							{ nicheResults.monetization_potential.map( ( m, i ) => (
								<span key={ i } className="aime-tag aime-tag--accent">{ m }</span>
							) ) }
						</div>
					</Card>
				) }
			</div>
		);
	};

	/* ============================================================
	   RENDER: COMPETITOR GAP RESULTS  (with charts)
	   ============================================================ */

	const renderGapResults = () => {
		if ( ! gapResults ) return null;
		const gapKwsRaw = gapResults.gap_keywords || [];
		const sharedKwsRaw = gapResults.shared_keywords || [];
		const gapKws = sortArray( gapKwsRaw, gapSortKey, gapSortDir );
		const sharedKws = sortArray( sharedKwsRaw, sharedSortKey, sharedSortDir );
		const allKws = [ ...gapKwsRaw, ...sharedKwsRaw ];
		const kdData = kdDistribution( gapKwsRaw );
		const prioData = priorityDistribution( gapKwsRaw );
		const topGapKws = [ ...gapKwsRaw ].sort( ( a, b ) => ( b.search_volume || 0 ) - ( a.search_volume || 0 ) ).slice( 0, 8 );

		// Competitor coverage: how many gap keywords each competitor has
		const compCoverage = {};
		gapKwsRaw.forEach( ( k ) => {
			const comp = k.competitor || k.competitor_coverage || 'Unknown';
			compCoverage[ comp ] = ( compCoverage[ comp ] || 0 ) + 1;
		} );
		const compCoverageData = Object.entries( compCoverage ).map( ( [ label, value ], i ) => ( {
			label,
			value,
			color: [ '#1565c0', '#e91e63', '#ff9800', '#9c27b0', '#009688' ][ i % 5 ],
		} ) );

		return (
			<div style={ { marginTop: 24 } }>
				{ /* --- Summary Stats --- */ }
				<div className="aime-kw-summary-row" style={ { marginBottom: 20 } }>
					<div className="aime-kw-summary-stat">
						<span className="aime-kw-summary-stat__num" style={ { color: '#f44336' } }>{ gapKws.length }</span>
						<span className="aime-kw-summary-stat__label">{ __( 'Gap Keywords', 'ai-marketing-expert' ) }</span>
					</div>
					<div className="aime-kw-summary-stat">
						<span className="aime-kw-summary-stat__num" style={ { color: '#1565c0' } }>{ sharedKws.length }</span>
						<span className="aime-kw-summary-stat__label">{ __( 'Shared Keywords', 'ai-marketing-expert' ) }</span>
					</div>
					<div className="aime-kw-summary-stat">
						<span className="aime-kw-summary-stat__num" style={ { color: '#ff9800' } }>{ Object.keys( compCoverage ).length }</span>
						<span className="aime-kw-summary-stat__label">{ __( 'Competitors', 'ai-marketing-expert' ) }</span>
					</div>
					{ gapKws.length > 0 && (
						<div className="aime-kw-summary-stat">
							<span className="aime-kw-summary-stat__num" style={ { color: '#4caf50' } }>
								{ gapKws.filter( ( k ) => k.priority === 'high' ).length }
							</span>
							<span className="aime-kw-summary-stat__label">{ __( 'High Priority', 'ai-marketing-expert' ) }</span>
						</div>
					) }
				</div>

				{ /* --- Charts Row: Priority + KD + Competitor Coverage --- */ }
				{ gapKws.length > 0 && (
					<div className="aime-analytics-charts-row aime-analytics-charts-row--3">
						<Card title={ __( 'Priority Distribution', 'ai-marketing-expert' ) }>
							<DonutChart data={ prioData } size={ 140 } thickness={ 24 } />
						</Card>
						<Card title={ __( 'KD Distribution', 'ai-marketing-expert' ) }>
							<DonutChart data={ kdData } size={ 140 } thickness={ 24 } />
						</Card>
						{ compCoverageData.length > 0 && (
							<Card title={ __( 'Competitor Coverage', 'ai-marketing-expert' ) }>
								<DonutChart data={ compCoverageData } size={ 140 } thickness={ 24 } />
							</Card>
						) }
					</div>
				) }

				{ /* --- Gap vs Shared Stacked Bar --- */ }
				{ ( gapKws.length > 0 || sharedKws.length > 0 ) && (
					<Card title={ __( 'Gap vs Shared Keywords', 'ai-marketing-expert' ) }>
						<StackedBar segments={ [
							{ label: __( 'Gap (Opportunities)', 'ai-marketing-expert' ), value: gapKws.length, color: '#f44336' },
							{ label: __( 'Shared (Competing)', 'ai-marketing-expert' ), value: sharedKws.length, color: '#1565c0' },
						] } height={ 24 } />
					</Card>
				) }

				{ /* --- Top Gap Keywords by Volume (Bar Chart) --- */ }
				{ topGapKws.length > 0 && (
					<Card title={ __( 'Top Gap Keywords by Volume', 'ai-marketing-expert' ) }>
						<HBarChart
							data={ topGapKws.map( ( k ) => ( {
								label: k.keyword,
								value: k.search_volume || 0,
								color: PRIORITY_COLORS[ k.priority ] || '#ff9800',
							} ) ) }
						/>
					</Card>
				) }

				{ /* --- Gap Keywords Table --- */ }
				{ gapKws.length > 0 && (
					<Card title={ __( 'Keyword Opportunities', 'ai-marketing-expert' ) }>
						<div style={ { overflowX: 'auto' } }>
							<table className="aime-table aime-kw-table">
								<thead>
									<tr>
										<th>#</th>
										<th onClick={ () => handleGapSort( 'keyword' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
											{ __( 'Keyword', 'ai-marketing-expert' ) } <SortArrow active={ gapSortKey === 'keyword' } dir={ gapSortDir } />
										</th>
										<th onClick={ () => handleGapSort( 'search_volume' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
											{ __( 'Volume', 'ai-marketing-expert' ) } <SortArrow active={ gapSortKey === 'search_volume' } dir={ gapSortDir } />
										</th>
										<th onClick={ () => handleGapSort( 'difficulty_score' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
											{ __( 'KD%', 'ai-marketing-expert' ) } <SortArrow active={ gapSortKey === 'difficulty_score' } dir={ gapSortDir } />
										</th>
										<th onClick={ () => handleGapSort( 'competitor' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
											{ __( 'Competitor', 'ai-marketing-expert' ) } <SortArrow active={ gapSortKey === 'competitor' } dir={ gapSortDir } />
										</th>
										<th onClick={ () => handleGapSort( 'content_type' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
											{ __( 'Content Type', 'ai-marketing-expert' ) } <SortArrow active={ gapSortKey === 'content_type' } dir={ gapSortDir } />
										</th>
										<th onClick={ () => handleGapSort( 'priority' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
											{ __( 'Priority', 'ai-marketing-expert' ) } <SortArrow active={ gapSortKey === 'priority' } dir={ gapSortDir } />
										</th>
									</tr>
								</thead>
								<tbody>
									{ gapKws.map( ( op, i ) => (
										<tr key={ i }>
											<td style={ { color: '#999', fontSize: 12 } }>{ i + 1 }</td>
											<td><strong>{ op.keyword }</strong></td>
											<td>{ op.search_volume ? Number( op.search_volume ).toLocaleString() : '-' }</td>
											<td>
												{ op.difficulty_score != null ? (
													<span style={ { color: KD_COLOR( op.difficulty_score ), fontWeight: 600 } }>{ op.difficulty_score }%</span>
												) : '-' }
											</td>
											<td>{ op.competitor || op.competitor_coverage || '-' }</td>
											<td style={ { textTransform: 'capitalize' } }>{ op.content_type ? op.content_type.replace( /_/g, ' ' ) : '-' }</td>
											<td>
												<span className="aime-status-badge" style={ {
													background: PRIORITY_COLORS[ op.priority ] || '#ff9800',
												} }>
													{ op.priority || 'medium' }
												</span>
											</td>
										</tr>
									) ) }
								</tbody>
							</table>
						</div>
					</Card>
				) }

				{ /* --- Shared Keywords Table --- */ }
				{ sharedKws.length > 0 && (
					<Card title={ __( 'Shared Keywords', 'ai-marketing-expert' ) }>
						<div style={ { overflowX: 'auto' } }>
							<table className="aime-table aime-kw-table">
								<thead>
									<tr>
										<th onClick={ () => handleSharedSort( 'keyword' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
											{ __( 'Keyword', 'ai-marketing-expert' ) } <SortArrow active={ sharedSortKey === 'keyword' } dir={ sharedSortDir } />
										</th>
										<th onClick={ () => handleSharedSort( 'search_volume' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
											{ __( 'Volume', 'ai-marketing-expert' ) } <SortArrow active={ sharedSortKey === 'search_volume' } dir={ sharedSortDir } />
										</th>
										<th onClick={ () => handleSharedSort( 'difficulty_score' ) } style={ { cursor: 'pointer', userSelect: 'none' } }>
											{ __( 'KD%', 'ai-marketing-expert' ) } <SortArrow active={ sharedSortKey === 'difficulty_score' } dir={ sharedSortDir } />
										</th>
									</tr>
								</thead>
								<tbody>
									{ sharedKws.map( ( sk, i ) => (
										<tr key={ i }>
											<td><strong>{ sk.keyword }</strong></td>
											<td>{ sk.search_volume ? Number( sk.search_volume ).toLocaleString() : '-' }</td>
											<td>
												{ sk.difficulty_score != null ? (
													<span style={ { color: KD_COLOR( sk.difficulty_score ), fontWeight: 600 } }>{ sk.difficulty_score }%</span>
												) : '-' }
											</td>
										</tr>
									) ) }
								</tbody>
							</table>
						</div>
					</Card>
				) }

				{ /* --- My Advantages --- */ }
				{ gapResults.my_advantages?.length > 0 && (
					<Card title={ __( 'Your Advantages', 'ai-marketing-expert' ) }>
						<div className="aime-gap-list">
							{ gapResults.my_advantages.map( ( a, i ) => (
								<div key={ i } className="aime-gap-item">
									<span className="aime-gap-item__num" style={ { background: '#4caf50' } }>{ '\u2713' }</span>
									<span>{ a }</span>
								</div>
							) ) }
						</div>
					</Card>
				) }

				{ /* --- Competitor Strengths --- */ }
				{ gapResults.competitor_strengths?.length > 0 && (
					<Card title={ __( 'Competitor Strengths', 'ai-marketing-expert' ) }>
						<div className="aime-comp-strengths">
							{ gapResults.competitor_strengths.map( ( cs, i ) => (
								<div key={ i } className="aime-comp-strength-card">
									<div className="aime-comp-strength-card__domain">
										<span className="aime-comp-strength-card__icon" style={ { background: [ '#1565c0', '#e91e63', '#ff9800', '#9c27b0' ][ i % 4 ] } }>
											{ cs.domain?.charAt( 0 ).toUpperCase() || '#' }
										</span>
										{ cs.domain }
									</div>
									<ul className="aime-list">
										{ ( cs.strengths || [] ).map( ( s, j ) => <li key={ j }>{ s }</li> ) }
									</ul>
								</div>
							) ) }
						</div>
					</Card>
				) }

				{ /* --- Recommendations --- */ }
				{ gapResults.recommendations?.length > 0 && (
					<Card title={ __( 'Action Plan', 'ai-marketing-expert' ) }>
						<div className="aime-strategy-timeline">
							{ gapResults.recommendations.map( ( r, i ) => (
								<div key={ i } className="aime-strategy-step">
									<div className="aime-strategy-step__marker" style={ { background: i < 3 ? '#f44336' : i < 6 ? '#ff9800' : '#4caf50' } }>{ i + 1 }</div>
									<div className="aime-strategy-step__text">{ r }</div>
								</div>
							) ) }
						</div>
					</Card>
				) }
			</div>
		);
	};

	/* ============================================================
	   RENDER: CONTENT BRIEF RESULTS  (with charts)
	   ============================================================ */

	const renderBriefResults = () => {
		if ( ! briefResult ) return null;

		// Derive data for charts
		const secKws = briefResult.secondary_keywords || [];
		const primKws = briefResult.primary_keywords || [];
		const outlineLen = ( briefResult.outline || [] ).length;

		// Content structure pie data
		const structureData = [
			{ label: __( 'Primary KWs', 'ai-marketing-expert' ), value: primKws.length, color: '#1565c0' },
			{ label: __( 'Secondary KWs', 'ai-marketing-expert' ), value: secKws.length, color: '#42a5f5' },
			{ label: __( 'Outline Sections', 'ai-marketing-expert' ), value: outlineLen, color: '#90caf9' },
		].filter( ( d ) => d.value > 0 );

		// Title suggestions scoring (visual bar chart)
		const titles = briefResult.title_suggestions || [];

		return (
			<div className="aime-brief-results" style={ { marginTop: 24 } }>
				<div className="aime-page-header" style={ { marginBottom: 16 } }>
					<div>
						<h3>{ __( 'Content Brief Ready', 'ai-marketing-expert' ) }</h3>
					</div>
					<Button variant="primary" onClick={ handleCreateArticleFromBrief }>
						{ __( 'Create Article from Brief', 'ai-marketing-expert' ) }
					</Button>
				</div>
				{ /* --- Summary Metrics Row --- */ }
				<div className="aime-kw-summary-row" style={ { marginBottom: 20 } }>
					{ briefResult.target_word_count > 0 && (
						<div className="aime-kw-summary-stat">
							<span className="aime-kw-summary-stat__num" style={ { color: '#1e88e5' } }>{ briefResult.target_word_count }</span>
							<span className="aime-kw-summary-stat__label">{ __( 'Target Words', 'ai-marketing-expert' ) }</span>
						</div>
					) }
					{ briefResult.content_type && (
						<div className="aime-kw-summary-stat">
							<span className="aime-kw-summary-stat__num" style={ { fontSize: 16, textTransform: 'capitalize' } }>{ briefResult.content_type.replace( /_/g, ' ' ) }</span>
							<span className="aime-kw-summary-stat__label">{ __( 'Content Type', 'ai-marketing-expert' ) }</span>
						</div>
					) }
					{ briefResult.search_intent && (
						<div className="aime-kw-summary-stat">
							<span className="aime-kw-summary-stat__num" style={ { fontSize: 16, textTransform: 'capitalize', color: INTENT_COLORS[ briefResult.search_intent ] || '#607d8b' } }>
								{ briefResult.search_intent }
							</span>
							<span className="aime-kw-summary-stat__label">{ __( 'Search Intent', 'ai-marketing-expert' ) }</span>
						</div>
					) }
					<div className="aime-kw-summary-stat">
						<span className="aime-kw-summary-stat__num">{ outlineLen }</span>
						<span className="aime-kw-summary-stat__label">{ __( 'Sections', 'ai-marketing-expert' ) }</span>
					</div>
					<div className="aime-kw-summary-stat">
						<span className="aime-kw-summary-stat__num" style={ { color: '#9c27b0' } }>{ primKws.length + secKws.length }</span>
						<span className="aime-kw-summary-stat__label">{ __( 'Total Keywords', 'ai-marketing-expert' ) }</span>
					</div>
				</div>

				{ /* --- Charts Row: Content Structure Pie + Keyword Balance --- */ }
				{ structureData.length > 0 && (
					<div className={ `aime-analytics-charts-row${ ! briefResult.target_word_count ? ' aime-analytics-charts-row--1' : '' }` }>
						<Card title={ __( 'Content Structure', 'ai-marketing-expert' ) }>
							<DonutChart data={ structureData } size={ 140 } thickness={ 24 } />
						</Card>
						{ briefResult.target_word_count > 0 && (
							<Card title={ __( 'Word Count Benchmark', 'ai-marketing-expert' ) }>
								<HBarChart
									data={ [
										{ label: __( 'Thin Content', 'ai-marketing-expert' ), value: 500, color: '#f44336' },
										{ label: __( 'Average', 'ai-marketing-expert' ), value: 1200, color: '#ff9800' },
										{ label: __( 'Your Target', 'ai-marketing-expert' ), value: briefResult.target_word_count, color: '#4caf50' },
										{ label: __( 'Long-form', 'ai-marketing-expert' ), value: 3000, color: '#1565c0' },
									] }
								/>
							</Card>
						) }
					</div>
				) }

				{ /* --- Grid Layout for Cards --- */ }
				<div className="aime-brief-grid">

					{ /* Title Suggestions */ }
					{ titles.length > 0 && (
						<Card title={ __( 'Title Suggestions', 'ai-marketing-expert' ) } className="aime-brief-grid__full">
							<div className="aime-title-suggestions">
								{ titles.map( ( t, i ) => (
									<div key={ i } className="aime-title-suggestion">
										<span className="aime-title-suggestion__rank">{ i + 1 }</span>
										<span className="aime-title-suggestion__text">{ t }</span>
										<span className="aime-title-suggestion__len" style={ { color: t.length <= 60 ? '#4caf50' : t.length <= 70 ? '#ff9800' : '#f44336' } }>
											{ t.length } { __( 'chars', 'ai-marketing-expert' ) }
										</span>
									</div>
								) ) }
							</div>
						</Card>
					) }

					{ /* Meta Description */ }
					{ briefResult.meta_description && (
						<Card title={ __( 'Meta Description', 'ai-marketing-expert' ) } className="aime-brief-grid__full">
							<div className="aime-brief-seo-tips">
								<div className="aime-brief-tip">
									<code style={ { display: 'block', padding: 12, fontSize: 13, lineHeight: 1.6 } }>{ briefResult.meta_description }</code>
								</div>
								<div style={ { fontSize: 12, color: briefResult.meta_description.length <= 160 ? '#4caf50' : '#f44336' } }>
									{ briefResult.meta_description.length } / 160 { __( 'characters', 'ai-marketing-expert' ) }
								</div>
							</div>
						</Card>
					) }

					{ /* Content Outline */ }
					{ briefResult.outline?.length > 0 && (
						<Card title={ __( 'Content Outline', 'ai-marketing-expert' ) } className="aime-brief-grid__full">
							<div className="aime-outline-visual">
								{ briefResult.outline.map( ( item, i ) => {
									const heading = typeof item === 'string' ? item : item.heading || item.section;
									const level = item.level || 'h2';
									const notes = item.notes || '';
									const subHeadings = item.sub_headings || [];
									return (
										<div key={ i } className="aime-outline-item">
											<div className="aime-outline-item__header">
												<span className="aime-outline-item__level">{ level.toUpperCase() }</span>
												<strong>{ heading }</strong>
											</div>
											{ notes && <div className="aime-outline-item__notes">{ notes }</div> }
											{ subHeadings.length > 0 && (
												<div className="aime-outline-item__subs">
													{ subHeadings.map( ( sh, j ) => (
														<div key={ j } className="aime-outline-sub">
															<span className="aime-outline-item__level" style={ { background: '#e3f2fd', color: '#1565c0' } }>H3</span>
															<span>{ sh.heading || sh }</span>
															{ sh.notes && <span style={ { color: '#888', fontSize: 12 } }> - { sh.notes }</span> }
														</div>
													) ) }
												</div>
											) }
										</div>
									);
								} ) }
							</div>
						</Card>
					) }

					{ /* Primary Keywords */ }
					{ primKws.length > 0 && (
						<Card title={ __( 'Primary Keywords', 'ai-marketing-expert' ) } className="aime-brief-grid__side">
							<div className="aime-tag-list">
								{ primKws.map( ( kw, i ) => (
									<span key={ i } className="aime-tag aime-tag--primary">{ typeof kw === 'string' ? kw : kw.keyword || kw }</span>
								) ) }
							</div>
						</Card>
					) }

					{ /* Secondary Keywords */ }
					{ secKws.length > 0 && (
						<Card title={ __( 'Secondary Keywords', 'ai-marketing-expert' ) } className="aime-brief-grid__side">
							<div className="aime-tag-list">
								{ secKws.map( ( kw, i ) => (
									<span key={ i } className="aime-tag">{ typeof kw === 'string' ? kw : kw.keyword || kw }</span>
								) ) }
							</div>
						</Card>
					) }

					{ /* Competing Content Analysis */ }
					{ briefResult.competing_content_analysis && (
						<Card title={ __( 'Competing Content Analysis', 'ai-marketing-expert' ) } className="aime-brief-grid__full">
							<p style={ { lineHeight: 1.7, color: '#333', margin: 0 } }>{ briefResult.competing_content_analysis }</p>
						</Card>
					) }

					{ /* Unique Angle */ }
					{ briefResult.unique_angle && (
						<Card title={ __( 'Unique Angle', 'ai-marketing-expert' ) } className="aime-brief-grid__main">
							<div className="aime-gap-item" style={ { background: '#fff3e0', padding: 16, borderRadius: 8, border: '1px solid #ffe0b2' } }>
								<span className="aime-gap-item__num" style={ { background: '#ff9800' } }>{ '\u{1F4A1}' }</span>
								<span style={ { lineHeight: 1.6 } }>{ briefResult.unique_angle }</span>
							</div>
						</Card>
					) }

					{ /* Internal Link Suggestions */ }
					{ briefResult.internal_link_suggestions?.length > 0 && (
						<Card title={ __( 'Internal Link Suggestions', 'ai-marketing-expert' ) } className="aime-brief-grid__side">
							<div className="aime-gap-list">
								{ briefResult.internal_link_suggestions.map( ( l, i ) => (
									<div key={ i } className="aime-gap-item">
										<span className="aime-gap-item__num" style={ { background: '#1565c0' } }>{ '\u{1F517}' }</span>
										<span>{ l }</span>
									</div>
								) ) }
							</div>
						</Card>
					) }

					{ /* CTA Suggestions */ }
					{ briefResult.cta_suggestions?.length > 0 && (
						<Card title={ __( 'CTA Suggestions', 'ai-marketing-expert' ) } className="aime-brief-grid__full">
							<div style={ { display: 'flex', flexWrap: 'wrap', gap: 10 } }>
								{ briefResult.cta_suggestions.map( ( c, i ) => (
									<div key={ i } className="aime-cta-card">
										<span className="aime-cta-card__icon">{ '\u{1F3AF}' }</span>
										<span>{ c }</span>
									</div>
								) ) }
							</div>
						</Card>
					) }

					{ /* GEO / AEO / SEO Guide */ }
					<Card title={ __( 'SEO / GEO / AEO Optimization Guide', 'ai-marketing-expert' ) } className="aime-brief-grid__full">
						<div className="aime-seo-guide-grid">
							<div className="aime-seo-guide-card">
								<div className="aime-seo-guide-card__icon" style={ { background: '#e3f2fd' } }>{ '\u{1F50D}' }</div>
								<h5>{ __( 'SEO (Search Engine)', 'ai-marketing-expert' ) }</h5>
								<ul className="aime-list">
									<li>{ __( 'Use primary keyword in title, H1, first paragraph', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Add secondary keywords naturally in subheadings', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Optimize meta description with keyword + CTA', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Internal link to related pillar content', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Use schema markup (Article, FAQ, HowTo)', 'ai-marketing-expert' ) }</li>
								</ul>
							</div>
							<div className="aime-seo-guide-card">
								<div className="aime-seo-guide-card__icon" style={ { background: '#e8f5e9' } }>{ '\u{1F30D}' }</div>
								<h5>{ __( 'GEO (Generative Engine)', 'ai-marketing-expert' ) }</h5>
								<ul className="aime-list">
									<li>{ __( 'Write clear, direct answers in first 2 sentences', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Use bullet points and structured data', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Cite authoritative sources with statistics', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Include comparison tables for AI summarization', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Add "What is X" and "How to X" sections', 'ai-marketing-expert' ) }</li>
								</ul>
							</div>
							<div className="aime-seo-guide-card">
								<div className="aime-seo-guide-card__icon" style={ { background: '#fff3e0' } }>{ '\u{1F399}\u{FE0F}' }</div>
								<h5>{ __( 'AEO (Answer Engine)', 'ai-marketing-expert' ) }</h5>
								<ul className="aime-list">
									<li>{ __( 'Target featured snippet with concise 40-60 word answers', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Use FAQ schema for People Also Ask rankings', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Structure content as Q&A format', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Optimize for voice search with conversational tone', 'ai-marketing-expert' ) }</li>
									<li>{ __( 'Add "According to [source]" citations for trust', 'ai-marketing-expert' ) }</li>
								</ul>
							</div>
						</div>
					</Card>
				</div>
			</div>
		);
	};

	/* ============================================================
	   MAIN RENDER
	   ============================================================ */

	return (
		<div className="aime-seo-keyword-research">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<div className="aime-page-header">
				<h2>{ __( 'Keyword Research', 'ai-marketing-expert' ) }</h2>
			</div>

			<Card>
				{ loading && <Loader text={ __( 'AI is analyzing your keywords. Processing time depends on your AI model and internet connection.', 'ai-marketing-expert' ) } /> }
				<div style={ loading ? { display: 'none' } : undefined }>
					<TabPanel tabs={ TABS } initialTabName={ activeTab } onSelect={ setActiveTab }>
						{ ( tab ) => {
							/* -- Keyword Research Tab -------- */
							if ( tab.name === 'keyword' ) {
								return (
									<div className="aime-settings-form">
										<div className="aime-form-grid aime-form-grid-3">
											<TextControl
												label={ __( 'Seed Keyword', 'ai-marketing-expert' ) }
												value={ seed }
												onChange={ setSeed }
												placeholder={ __( 'e.g. best running shoes', 'ai-marketing-expert' ) }
												__nextHasNoMarginBottom
											/>
											<SelectControl
												label={ __( 'Language', 'ai-marketing-expert' ) }
												value={ language }
												options={ [
													{ label: 'English', value: 'en' },
													{ label: 'Bengali', value: 'bn' },
													{ label: 'Spanish', value: 'es' },
													{ label: 'French', value: 'fr' },
													{ label: 'German', value: 'de' },
													{ label: 'Hindi', value: 'hi' },
													{ label: 'Arabic', value: 'ar' },
													{ label: 'Portuguese', value: 'pt' },
													{ label: 'Chinese', value: 'zh' },
													{ label: 'Japanese', value: 'ja' },
													{ label: 'Korean', value: 'ko' },
													{ label: 'Russian', value: 'ru' },
													{ label: 'Italian', value: 'it' },
													{ label: 'Dutch', value: 'nl' },
													{ label: 'Turkish', value: 'tr' },
													{ label: 'Indonesian', value: 'id' },
													{ label: 'Vietnamese', value: 'vi' },
													{ label: 'Thai', value: 'th' },
													{ label: 'Polish', value: 'pl' },
													{ label: 'Swedish', value: 'sv' },
													{ label: 'Urdu', value: 'ur' },
													{ label: 'Malay', value: 'ms' },
												] }
												onChange={ setLanguage }
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
											<SelectControl
												label={ __( 'Country', 'ai-marketing-expert' ) }
												value={ country }
												options={ [
													{ label: 'United States', value: 'US' },
													{ label: 'Bangladesh', value: 'BD' },
													{ label: 'India', value: 'IN' },
													{ label: 'United Kingdom', value: 'GB' },
													{ label: 'Canada', value: 'CA' },
													{ label: 'Australia', value: 'AU' },
													{ label: 'Germany', value: 'DE' },
													{ label: 'France', value: 'FR' },
													{ label: 'Spain', value: 'ES' },
													{ label: 'Italy', value: 'IT' },
													{ label: 'Brazil', value: 'BR' },
													{ label: 'Mexico', value: 'MX' },
													{ label: 'Japan', value: 'JP' },
													{ label: 'South Korea', value: 'KR' },
													{ label: 'China', value: 'CN' },
													{ label: 'Indonesia', value: 'ID' },
													{ label: 'Pakistan', value: 'PK' },
													{ label: 'Russia', value: 'RU' },
													{ label: 'Turkey', value: 'TR' },
													{ label: 'Saudi Arabia', value: 'SA' },
													{ label: 'UAE', value: 'AE' },
													{ label: 'Netherlands', value: 'NL' },
													{ label: 'Sweden', value: 'SE' },
													{ label: 'Thailand', value: 'TH' },
													{ label: 'Vietnam', value: 'VN' },
													{ label: 'Malaysia', value: 'MY' },
													{ label: 'Philippines', value: 'PH' },
													{ label: 'Nigeria', value: 'NG' },
													{ label: 'South Africa', value: 'ZA' },
													{ label: 'Egypt', value: 'EG' },
													{ label: 'Poland', value: 'PL' },
													{ label: 'Argentina', value: 'AR' },
													{ label: 'Colombia', value: 'CO' },
													{ label: 'Singapore', value: 'SG' },
													{ label: 'New Zealand', value: 'NZ' },
													{ label: 'Ireland', value: 'IE' },
													{ label: 'Switzerland', value: 'CH' },
													{ label: 'Portugal', value: 'PT' },
												] }
												onChange={ setCountry }
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
										</div>
										<Button
											variant="primary"
											onClick={ handleResearch }
											disabled={ loading || ! seed.trim() }
											isBusy={ loading }
											style={ { marginTop: 16 } }
										>
											{ __( 'Research Keywords', 'ai-marketing-expert' ) }
										</Button>

										{ /* -- Results -- */ }
										{ researchData && (
											<>
												{ renderSeedOverview() }

												<div style={ { marginTop: 24 } }>
													<div className="aime-kw-result-header">
														<div className="aime-kw-result-tabs">
															{ RESULT_TABS.map( ( rt ) => {
																const count = rt.name === 'related' ? ( researchData.related_keywords || researchData.keywords || [] ).length
																	: rt.name === 'longtail' ? ( researchData.long_tail_keywords || [] ).length
																		: rt.name === 'questions' ? ( researchData.questions || [] ).length
																			: ( researchData.cluster_suggestions || [] ).length;
																return (
																	<button
																		key={ rt.name }
																		className={ `aime-kw-result-tab ${ activeResultTab === rt.name ? 'is-active' : '' }` }
																		onClick={ () => { setActiveResultTab( rt.name ); setSelected( [] ); setSortKey( null ); } }
																	>
																		{ rt.title } <span className="aime-kw-result-tab__count">{ count }</span>
																	</button>
																);
															} ) }
														</div>
														{ activeResultTab !== 'clusters' && (
															<Button
																variant="secondary"
																onClick={ handleSaveSelected }
																disabled={ ! selected.length }
																size="compact"
															>
																{ __( 'Save to Vault', 'ai-marketing-expert' ) } ({ selected.length })
															</Button>
														) }
													</div>

													{ activeResultTab === 'clusters'
														? renderClusters()
														: currentKeywords.length > 0
															? renderKeywordTable()
															: <p className="aime-empty-text">{ __( 'No keywords in this category.', 'ai-marketing-expert' ) }</p>
													}
												</div>
											</>
										) }
									</div>
								);
							}

							/* -- Niche Analysis Tab (Pro) --- */
							if ( tab.name === 'niche' ) {
								return (
									<ProGate feature={ __( 'Niche Analysis', 'ai-marketing-expert' ) }>
										<div className="aime-settings-form">
											<TextControl
												label={ __( 'Niche / Industry', 'ai-marketing-expert' ) }
												value={ niche }
												onChange={ setNiche }
												placeholder={ __( 'e.g. home fitness equipment', 'ai-marketing-expert' ) }
												__nextHasNoMarginBottom
											/>
											{ loading ? (
												<LoadingBtn primary style={ { marginTop: 16 } }>{ __( 'Analyzing...', 'ai-marketing-expert' ) }</LoadingBtn>
											) : (
												<Button
													variant="primary"
													onClick={ handleNicheAnalysis }
													disabled={ ! isAiConfigured() || ! niche.trim() }
													title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
													style={ { marginTop: 16 } }
												>
													{ __( 'Analyze Niche', 'ai-marketing-expert' ) }
												</Button>
											) }
											{ renderNicheResults() }
										</div>
									</ProGate>
								);
							}

							/* -- Competitor Gap Tab (Pro) --- */
							if ( tab.name === 'competitor' ) {
								return (
									<ProGate feature={ __( 'Competitor Gap Analysis', 'ai-marketing-expert' ) }>
										<div className="aime-settings-form">
											<TextControl
												label={ __( 'Your Domain', 'ai-marketing-expert' ) }
												value={ domain }
												onChange={ setDomain }
												placeholder="example.com"
												__nextHasNoMarginBottom
											/>
											<TextareaControl
												label={ __( 'Competitor Domains (one per line)', 'ai-marketing-expert' ) }
												value={ competitors }
												className={ 'aim-competitor-domains' }
												onChange={ setCompetitors }
												placeholder={ 'competitor1.com\ncompetitor2.com' }
												rows={ 3 }
												__nextHasNoMarginBottom
											/>
											{ loading ? (
												<LoadingBtn primary style={ { marginTop: 16 } }>{ __( 'Analyzing...', 'ai-marketing-expert' ) }</LoadingBtn>
											) : (
												<Button
													variant="primary"
													onClick={ handleCompetitorGap }
													disabled={ ! isAiConfigured() || ! domain.trim() || ! competitors.trim() }
													title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
													style={ { marginTop: 16 } }
												>
													{ __( 'Analyze Gap', 'ai-marketing-expert' ) }
												</Button>
											) }
											{ renderGapResults() }
										</div>
									</ProGate>
								);
							}

							/* -- Content Brief Tab (Pro) ---- */
							return (
								<ProGate feature={ __( 'AI Content Brief', 'ai-marketing-expert' ) }>
									<div className="aime-settings-form">
										<TextControl
											label={ __( 'Target Keyword', 'ai-marketing-expert' ) }
											value={ briefKeyword }
											onChange={ setBriefKeyword }
											placeholder={ __( 'e.g. best protein powder for beginners', 'ai-marketing-expert' ) }
											__nextHasNoMarginBottom
										/>
										{ loading ? (
											<LoadingBtn primary style={ { marginTop: 16 } }>{ __( 'Generating...', 'ai-marketing-expert' ) }</LoadingBtn>
										) : (
											<Button
												variant="primary"
												onClick={ handleContentBrief }
												disabled={ ! isAiConfigured() || ! briefKeyword.trim() }
												title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
												style={ { marginTop: 16 } }
											>
												{ __( 'Generate Brief', 'ai-marketing-expert' ) }
											</Button>
										) }
										{ renderBriefResults() }
									</div>
								</ProGate>
							);
						} }
					</TabPanel>
				</div>
			</Card>
		</div>
	);
};

export default KeywordResearch;
