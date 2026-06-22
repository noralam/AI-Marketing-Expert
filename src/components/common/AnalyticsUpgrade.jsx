import { __ } from '@wordpress/i18n';
import usePro from '../../hooks/usePro';
import { ProUpgradeButton } from './ProLock';

const AnalyticsUpgrade = ( { title, description, features = [] } ) => {
	const { hasPro } = usePro();

	if ( hasPro ) {
		return null;
	}

	const items = features.length ? features : [
		__( 'Advanced trends', 'ai-marketing-expert' ),
		__( 'Unlimited usage', 'ai-marketing-expert' ),
		__( 'Priority insights', 'ai-marketing-expert' ),
	];

	return (
		<section className="aime-analytics-upgrade">
			<div>
				<span className="aime-analytics-upgrade__eyebrow">{ __( 'Pro Analytics', 'ai-marketing-expert' ) }</span>
				<h3>{ title || __( 'Unlock deeper analytics', 'ai-marketing-expert' ) }</h3>
				<p>{ description || __( 'Upgrade to Pro for richer reporting, higher limits, and growth tools across this module.', 'ai-marketing-expert' ) }</p>
			</div>
			<ul>
				{ items.map( ( item ) => <li key={ item }>{ item }</li> ) }
			</ul>
			<ProUpgradeButton>{ __( 'Upgrade Pro', 'ai-marketing-expert' ) }</ProUpgradeButton>
		</section>
	);
};

export default AnalyticsUpgrade;