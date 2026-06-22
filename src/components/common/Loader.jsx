/**
 * Loader/Spinner component.
 */

import { Spinner } from '@aime/wp-components';

const Loader = ( { text } ) => {
	return (
		<div className="aime-loader">
			<Spinner />
			{ text && <p className="aime-loader-text">{ text }</p> }
		</div>
	);
};

export default Loader;
