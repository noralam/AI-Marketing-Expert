/**
 * QuotaMeters — the free-plan allowance strip that sits above a list.
 *
 * The old signal for "you are out of campaigns" was a 403 after the user had
 * already written the email and clicked Send. This puts the wall in front of
 * the work instead of behind it, in the one place the user is already looking.
 *
 * Deliberately quiet at rest: a plan label, a number, a hairline track. It only
 * raises its voice — amber, then an upgrade button — as a quota actually runs
 * out, so it does not compete with the list it introduces.
 *
 * Renders nothing when every quota reports `limit === null`, which is what the
 * API says for Pro. Unlimited is not a number worth showing.
 */

import { __, sprintf } from '@wordpress/i18n';
import { ProUpgradeButton } from './ProLock';

/** Below this share of the allowance, a meter starts warning. */
const LOW_RATIO = 0.2;

const QuotaMeters = ( { items = [], className = '' } ) => {
	const meters = items
		.filter( ( item ) => item?.usage && item.usage.limit != null )
		.map( ( item ) => {
			const limit = Number( item.usage.limit ) || 0;
			const used = Number( item.usage.used ) || 0;
			// Trust the server's `remaining` when present: `used` can legitimately
			// exceed `limit` on a site downgraded from Pro, and limit-used would
			// then render a negative countdown.
			const left = item.usage.remaining == null
				? Math.max( 0, limit - used )
				: Math.max( 0, Number( item.usage.remaining ) || 0 );
			const pct = limit > 0 ? Math.min( 100, Math.round( ( used / limit ) * 100 ) ) : 100;

			return { ...item, limit, used, left, pct };
		} );

	if ( meters.length === 0 ) {
		return null;
	}

	const blocked = meters.some( ( m ) => m.left === 0 );

	return (
		<div className={ `aime-quota-strip${ blocked ? ' is-blocked' : '' } ${ className }`.trim() }>
			<span className="aime-quota-strip__plan">{ __( 'Free plan', 'ai-marketing-expert' ) }</span>

			<div className="aime-quota-strip__meters">
				{ meters.map( ( m ) => {
					const state = m.left === 0
						? ' is-empty'
						: ( m.left <= Math.max( 1, m.limit * LOW_RATIO ) ? ' is-low' : '' );

					return (
						<div key={ m.key } className={ `aime-quota-meter${ state }` }>
							<div className="aime-quota-meter__head">
								<span className="aime-quota-meter__label">{ m.label }</span>
								<span className="aime-quota-meter__left">
									{ m.left === 0
										? __( 'None left', 'ai-marketing-expert' )
										: sprintf(
											/* translators: %d: number of items still available on the free plan. */
											__( '%d left', 'ai-marketing-expert' ),
											m.left
										) }
								</span>
							</div>

							<div
								className="aime-quota-meter__track"
								role="progressbar"
								aria-label={ m.label }
								aria-valuenow={ m.used }
								aria-valuemin={ 0 }
								aria-valuemax={ m.limit }
							>
								<span className="aime-quota-meter__fill" style={ { width: `${ m.pct }%` } } />
							</div>

							<p className="aime-quota-meter__note">
								{ sprintf(
									/* translators: 1: amount used, 2: total allowance. */
									__( '%1$d of %2$d used', 'ai-marketing-expert' ),
									m.used,
									m.limit
								) }
								{ m.note ? ` · ${ m.note }` : '' }
							</p>
						</div>
					);
				} ) }
			</div>

			{ blocked && (
				<div className="aime-quota-strip__action">
					<ProUpgradeButton>{ __( 'Upgrade to Pro', 'ai-marketing-expert' ) }</ProUpgradeButton>
				</div>
			) }
		</div>
	);
};

export default QuotaMeters;
