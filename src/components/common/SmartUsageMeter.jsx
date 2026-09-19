/**
 * SmartUsageMeter — Universal Progressive Disclosure Quota Meter.
 *
 * Follows the 4-stage Progressive UX Funnel:
 *  - Stage 0 (Empty State: count === 0): Completely hidden.
 *  - Stage 1 (First Value: 1 <= used < 70%): Discreet, positive remaining count.
 *  - Stage 2 (Threshold: 70% <= used < 100%): Warm milestone encouragement + soft Pro link.
 *  - Stage 3 (Quota Met: used >= limit): Clear quota reached badge + instant Pro upgrade modal trigger.
 *
 * @package WPSpace\AiMarketingExpert
 */

import { __, sprintf } from '@wordpress/i18n';
import usePro from '../../hooks/usePro';
import { ProUpgradeButton } from './ProLock';

export default function SmartUsageMeter( {
	used = 0,
	limit = 10,
	label = 'Items',
	hideWhenEmpty = true,
	threshold = 0.7,
	className = '',
} ) {
	const { hasPro } = usePro();

	// Pro users have unlimited access — never show quota meters.
	if ( hasPro ) {
		return null;
	}

	const usedNum = Math.max( 0, Number( used ) || 0 );
	const limitNum = Number( limit ) || 0;

	// Stage 0: Completely hide when empty / 0 used to prevent premature friction.
	if ( hideWhenEmpty && usedNum === 0 ) {
		return null;
	}

	const left = Math.max( 0, limitNum - usedNum );
	const pct = limitNum > 0 ? Math.min( 100, Math.round( ( usedNum / limitNum ) * 100 ) ) : 100;
	const isNearLimit = pct >= threshold * 100 && pct < 100;
	const isBlocked = pct >= 100 || left === 0;

	return (
		<div className={ `aime-smart-meter ${ isBlocked ? 'is-blocked' : '' } ${ isNearLimit ? 'is-warning' : '' } ${ className }`.trim() }>
			<div className="aime-smart-meter__header">
				<span className="aime-smart-meter__label">{ label }</span>
				<span className="aime-smart-meter__remaining">
					{ isBlocked
						? __( 'Monthly limit reached', 'ai-marketing-expert' )
						: sprintf(
							/* translators: 1: remaining items, 2: total limit */
							__( '%1$d of %2$d remaining', 'ai-marketing-expert' ),
							left,
							limitNum
						) }
				</span>
			</div>

			<div
				className="aime-smart-meter__track"
				role="progressbar"
				aria-label={ label }
				aria-valuenow={ usedNum }
				aria-valuemin={ 0 }
				aria-valuemax={ limitNum }
			>
				<div
					className={ `aime-smart-meter__fill ${ isBlocked ? 'is-danger' : ( isNearLimit ? 'is-warning' : 'is-normal' ) }` }
					style={ { width: `${ pct }%` } }
				/>
			</div>

			{ ( isNearLimit || isBlocked ) && (
				<div className="aime-smart-meter__footer">
					<span className="aime-smart-meter__tip">
						{ isBlocked
							? __( 'Upgrade to Pro for unlimited access without monthly caps.', 'ai-marketing-expert' )
							: __( 'You are scaling fast! Upgrade to Pro for unlimited access.', 'ai-marketing-expert' ) }
					</span>
					<ProUpgradeButton className="aime-smart-meter__btn">
						{ __( 'Upgrade to Pro', 'ai-marketing-expert' ) }
					</ProUpgradeButton>
				</div>
			) }
		</div>
	);
}
