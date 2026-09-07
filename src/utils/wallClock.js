/**
 * Wall-clock timezone conversion helpers.
 *
 * Social scheduling stores datetimes as site-timezone wall-clock strings
 * ("Y-m-d H:i:s") — the same frame the cron queue compares against. The
 * composer's datetime-local input, however, is browser-local. These helpers
 * translate between the two frames without a date library, using the
 * Intl round-trip offset iteration (DST-safe for the common cases).
 */

const pad = ( n ) => String( n ).padStart( 2, '0' );

/** Site timezone identifier from wp_localize_script (falls back to browser). */
export const siteTimezone = () =>
	window.aimeData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Format an instant as a wall-clock string in the given IANA timezone. */
export const instantToWall = ( date, timeZone ) => {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat( 'en-CA', {
			timeZone,
			hour12: false,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		} )
			.formatToParts( date )
			.map( ( p ) => [ p.type, p.value ] )
	);
	return `${ parts.year }-${ parts.month }-${ parts.day } ${ pad( parts.hour % 24 ) }:${ parts.minute }:${ parts.second }`;
};

/**
 * Find the instant whose wall clock in `timeZone` equals `wall`
 * ("Y-m-d H:i:s", interpreted in that timezone). Iterates the UTC offset —
 * converges in 2–3 passes, handles DST boundaries adequately.
 */
export const wallToInstant = ( wall, timeZone ) => {
	const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec( ( wall || '' ).trim() );
	if ( ! m ) {
		return null;
	}
	const [ , y, mo, d, h, mi, s ] = m;
	let ts = Date.UTC( +y, +mo - 1, +d, +h, +mi, +( s || 0 ) );
	for ( let i = 0; i < 3; i++ ) {
		const err = Date.parse(
			instantToWall( new Date( ts ), timeZone ).replace( ' ', 'T' ) + 'Z'
		) - ts;
		if ( ! err ) {
			break;
		}
		ts -= err;
	}
	return new Date( ts );
};

/** "Y-m-d H:i:s" in browser tz → the same moment in site-tz wall time. */
export const browserToSiteWall = ( localWall ) => {
	const instant = wallToInstant( localWall, browserTimezone() );
	return instant ? instantToWall( instant, siteTimezone() ) : localWall;
};

/** "Y-m-d H:i:s" in site tz → the same moment in browser-tz wall time. */
export const siteToBrowserWall = ( siteWall ) => {
	const instant = wallToInstant( siteWall, siteTimezone() );
	return instant ? instantToWall( instant, browserTimezone() ) : siteWall;
};

/** True when the composer input needs converting (site ≠ browser). */
export const tzDiffers = () => siteTimezone() !== browserTimezone();
