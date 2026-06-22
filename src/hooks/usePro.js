/**
 * Custom hook for Pro status.
 */

const usePro = () => {
	const { hasPro, proUrl, freeLimits } = window.aimeData || {};

	return {
		hasPro: !! hasPro,
		proUrl: proUrl || '#/pro',
		freeLimits: freeLimits || {},
	};
};

export default usePro;
