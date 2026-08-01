/**
 * Free-plan usage indicator.
 *
 * Shows remaining quota while it lasts, then an upgrade banner once exhausted.
 * Renders nothing for Pro (the API reports limit === null for unlimited).
 *
 * Two shapes, chosen with `kind`:
 *  - 'monthly' (default) — a per-month allowance that resets, e.g. AI generations.
 *  - 'storage' — a standing row cap, e.g. saved topics. Exhausting it asks the
 *    user to delete something rather than wait for the month to roll over.
 */

import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';

const REMAINING_STYLE = {
	display: 'inline-flex',
	alignItems: 'center',
	gap: 6,
	marginBottom: 16,
	padding: '4px 10px',
	borderRadius: 4,
	background: '#f0f6fc',
	border: '1px solid #c5d9ed',
	fontSize: 12,
	color: '#1d2327',
};

const EXHAUSTED_STYLE = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: 12,
	flexWrap: 'wrap',
	marginBottom: 16,
	padding: '12px 16px',
	borderRadius: 6,
	background: '#fff8e5',
	border: '1px solid #f0c33c',
};

const UsageNotice = ( { usage, featureLabel, proUrl, kind = 'monthly' } ) => {
	if ( ! usage || usage.limit == null ) {
		return null;
	}

	const used = usage.used || 0;
	const left = Math.max( 0, usage.limit - used );

	if ( left > 0 ) {
		return (
			<div style={ REMAINING_STYLE }>
				<span>{ '\u{2728}' }</span>
				<span>
					{ kind === 'storage'
						? sprintf(
							/* translators: 1: rows used, 2: row limit, 3: feature name, 4: rows remaining */
							__( 'Free plan: %1$d of %2$d %3$s used, %4$d left.', 'ai-marketing-expert' ),
							used,
							usage.limit,
							featureLabel,
							left
						)
						: sprintf(
							/* translators: 1: uses spent, 2: monthly limit, 3: uses remaining */
							__( 'Free plan: %1$d of %2$d uses this month, %3$d left.', 'ai-marketing-expert' ),
							used,
							usage.limit,
							left
						)
					}
				</span>
			</div>
		);
	}

	return (
		<div style={ EXHAUSTED_STYLE }>
			<span style={ { fontSize: 13 } }>
				{ kind === 'storage'
					? sprintf(
						/* translators: 1: row limit, 2: feature name */
						__( 'You have reached the free plan limit of %1$d %2$s. Delete one to make room, or upgrade to Pro for unlimited.', 'ai-marketing-expert' ),
						usage.limit,
						featureLabel
					)
					: sprintf(
						/* translators: 1: feature name, 2: monthly limit */
						__( 'You have used all %2$d free %1$s runs for this month. Upgrade to Pro for unlimited access.', 'ai-marketing-expert' ),
						featureLabel,
						usage.limit
					)
				}
			</span>
			<a href={ proUrl } target="_blank" rel="noopener noreferrer">
				<Button variant="primary" size="compact" className="aime-btn-pro">
					{ __( 'Upgrade to Pro', 'ai-marketing-expert' ) }
				</Button>
			</a>
		</div>
	);
};

export default UsageNotice;
