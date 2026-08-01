/**
 * Date and time formatting for the admin app.
 *
 * Everything the REST API returns is stored as a UTC MySQL datetime
 * ("2026-07-29 11:02:04"). Display must follow the site's own settings under
 * Settings → General — timezone, Date Format and Time Format — not the
 * browser's locale and not the browser's timezone. A site set to Dhaka should
 * read the same for an admin working from London.
 *
 * @wordpress/date is used because WordPress core already primes it with the
 * site timezone, formats and translated month/day names, so these helpers stay
 * in sync with the settings screen without duplicating that state.
 */

import { dateI18n, gmdateI18n, getSettings } from '@wordpress/date';

/** Site formats, with WordPress defaults if core settings are unavailable. */
const formats = () => {
	const s = getSettings?.() || {};
	return {
		date: s.formats?.date || 'F j, Y',
		time: s.formats?.time || 'g:i a',
		datetime: s.formats?.datetime || 'F j, Y g:i a',
	};
};

/**
 * Normalise an API value into something @wordpress/date can parse as UTC.
 *
 * @param {string|number|Date} value UTC MySQL datetime, ISO string, unix
 *                                   seconds, or a Date.
 * @return {string|number|Date|null} Parseable value, or null if unusable.
 */
const toUtc = ( value ) => {
	if ( value === null || value === undefined || value === '' ) {
		return null;
	}
	if ( value instanceof Date ) {
		return isNaN( value.getTime() ) ? null : value;
	}
	if ( typeof value === 'number' ) {
		// Unix timestamps arrive in seconds from PHP.
		return new Date( value * 1000 );
	}

	const raw = String( value ).trim();
	if ( '' === raw ) {
		return null;
	}
	// Already carries a zone or offset — leave it alone.
	if ( /(?:Z|[+-]\d{2}:?\d{2})$/.test( raw ) ) {
		return raw;
	}
	// Date only, no time — keep it as a plain day (see formatDay).
	if ( /^\d{4}-\d{2}-\d{2}$/.test( raw ) ) {
		return raw + 'T00:00:00Z';
	}
	// MySQL datetime, which the plugin always stores in UTC.
	if ( /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test( raw ) ) {
		return raw.replace( ' ', 'T' ) + 'Z';
	}
	return raw;
};

/** Format with the site's Date Format + Time Format. */
export const formatDateTime = ( value, fallback = '—' ) => {
	const utc = toUtc( value );
	if ( null === utc ) {
		return fallback;
	}
	try {
		return dateI18n( formats().datetime, utc );
	} catch ( e ) {
		return String( value );
	}
};

/** Format with the site's Date Format only. */
export const formatDate = ( value, fallback = '—' ) => {
	const utc = toUtc( value );
	if ( null === utc ) {
		return fallback;
	}
	try {
		return dateI18n( formats().date, utc );
	} catch ( e ) {
		return String( value );
	}
};

/** Format with the site's Time Format only. */
export const formatTime = ( value, fallback = '—' ) => {
	const utc = toUtc( value );
	if ( null === utc ) {
		return fallback;
	}
	try {
		return dateI18n( formats().time, utc );
	} catch ( e ) {
		return String( value );
	}
};

/**
 * Format a calendar day that was never a moment in time — chart buckets and
 * daily report rows, which the API groups by date in the site's own timezone.
 * Converting those would shift the label a day on either side of UTC, so the
 * day is rendered as given.
 *
 * @param {string} value    Date string, normally "YYYY-MM-DD".
 * @param {string} fallback Returned when value is empty.
 * @param {string} format   Optional PHP date format; defaults to site setting.
 */
export const formatDay = ( value, fallback = '—', format = null ) => {
	const utc = toUtc( value );
	if ( null === utc ) {
		return fallback;
	}
	try {
		return gmdateI18n( format || formats().date, utc );
	} catch ( e ) {
		return String( value );
	}
};

/** Compact "7/29" style axis tick for charts, day preserved as given. */
export const formatDayShort = ( value ) => formatDay( value, '', 'n/j' );

/* -------------------------------------------------------------------------
 * Site-timezone conversion for schedule inputs.
 *
 * <input type="datetime-local"> has no timezone: whatever the user types is
 * the wall clock they mean, and they mean it in the site's timezone, not the
 * browser's. The API columns are UTC (compared against current_time('mysql',
 * true)), so the two have to be converted explicitly rather than leaning on
 * Date's local-time behaviour, which is the browser's timezone.
 * ---------------------------------------------------------------------- */

/** Milliseconds a named timezone is ahead of UTC at a given instant. */
const zoneOffsetMs = ( timezone, date ) => {
	const dtf = new Intl.DateTimeFormat( 'en-US', {
		timeZone: timezone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	} );
	const p = {};
	dtf.formatToParts( date ).forEach( ( part ) => {
		p[ part.type ] = part.value;
	} );
	const asUtc = Date.UTC( +p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second );
	// Drop sub-second precision on both sides so the difference is the offset.
	return asUtc - ( date.getTime() - date.getMilliseconds() );
};

/**
 * The site's UTC offset in milliseconds, resolved at a specific instant so
 * daylight saving is handled rather than assumed constant.
 *
 * @param {Date} date Instant to resolve the offset at.
 */
export const siteOffsetMs = ( date = new Date() ) => {
	const s = getSettings?.() || {};
	const tz = s.timezone?.string;
	// A manual "UTC+6" style setting has no zone name, only a numeric offset.
	if ( tz && /[A-Za-z]/.test( tz ) ) {
		try {
			return zoneOffsetMs( tz, date );
		} catch ( e ) { /* fall through to the numeric offset */ }
	}
	const hours = parseFloat( s.timezone?.offset );
	return isNaN( hours ) ? 0 : hours * 3600000;
};

/**
 * UTC value → "YYYY-MM-DDTHH:mm" for a datetime-local input, in site time.
 *
 * @param {string} value UTC MySQL datetime.
 */
export const toSiteInput = ( value ) => {
	const utc = toUtc( value );
	if ( null === utc ) {
		return '';
	}
	const d = utc instanceof Date ? utc : new Date( utc );
	if ( isNaN( d.getTime() ) ) {
		return '';
	}
	return new Date( d.getTime() + siteOffsetMs( d ) ).toISOString().slice( 0, 16 );
};

/**
 * Site-time wall clock → UTC MySQL datetime for the API.
 *
 * @param {string} value "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD HH:mm[:ss]".
 */
export const siteInputToUtc = ( value ) => {
	if ( ! value ) {
		return '';
	}
	let raw = String( value ).trim().replace( ' ', 'T' );
	if ( /^\d{4}-\d{2}-\d{2}$/.test( raw ) ) {
		raw += 'T00:00';
	}
	if ( /T\d{2}:\d{2}$/.test( raw ) ) {
		raw += ':00';
	}
	const wall = Date.parse( raw + 'Z' );
	if ( isNaN( wall ) ) {
		return '';
	}
	// Resolve the offset against the resulting instant, not the wall clock, so
	// a time near a DST boundary lands on the right side of the change.
	let utc = wall - siteOffsetMs( new Date( wall ) );
	utc = wall - siteOffsetMs( new Date( utc ) );
	return new Date( utc ).toISOString().slice( 0, 19 ).replace( 'T', ' ' );
};

/**
 * Separate date and time fields (site time) → UTC MySQL datetime.
 *
 * @param {string} date "YYYY-MM-DD".
 * @param {string} time "HH:mm", defaults to midnight.
 */
export const siteDateTimeToUtc = ( date, time ) =>
	( date ? siteInputToUtc( `${ date }T${ time || '00:00' }` ) : '' );

/** Today's calendar date in the site timezone, as { year, month, day }. */
export const siteToday = () => {
	const now = new Date();
	const shifted = new Date( now.getTime() + siteOffsetMs( now ) );
	return {
		year: shifted.getUTCFullYear(),
		month: shifted.getUTCMonth(), // 0-indexed, to match Date.getMonth().
		day: shifted.getUTCDate(),
	};
};

export default formatDateTime;
