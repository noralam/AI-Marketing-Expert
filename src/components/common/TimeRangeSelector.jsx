/**
 * Time range selector for analytics.
 */

import { SelectControl } from '@aime/wp-components';

const TIME_RANGES = [
	{ label: 'Last 7 days', value: '7' },
	{ label: 'Last 14 days', value: '14' },
	{ label: 'Last 30 days', value: '30' },
	{ label: 'Last 60 days', value: '60' },
	{ label: 'Last 90 days', value: '90' },
];

const TimeRangeSelector = ( { value = '30', onChange } ) => {
	return (
		<SelectControl
			value={ value }
			options={ TIME_RANGES }
			onChange={ onChange }
			__nextHasNoMarginBottom
			style={ { minWidth: 150 } }
		/>
	);
};

export default TimeRangeSelector;
