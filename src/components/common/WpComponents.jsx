import * as wpComponents from '@wordpress/components';

const withDefaultProps = ( Component, defaultProps, displayName ) => {
	const WrappedComponent = ( props ) => <Component { ...defaultProps } { ...props } />;
	WrappedComponent.displayName = displayName;
	return WrappedComponent;
};

const {
	Button,
	CheckboxControl: BaseCheckboxControl,
	ColorPicker,
	ComboboxControl,
	FormTokenField,
	Icon,
	Modal,
	Panel,
	PanelBody,
	RangeControl,
	SearchControl: BaseSearchControl,
	SelectControl: BaseSelectControl,
	Spinner,
	TabPanel,
	TextControl: BaseTextControl,
	TextareaControl: BaseTextareaControl,
	ToggleControl,
} = wpComponents;

export {
	Button,
	ColorPicker,
	ComboboxControl,
	FormTokenField,
	Icon,
	Modal,
	Panel,
	PanelBody,
	RangeControl,
	Spinner,
	TabPanel,
	ToggleControl,
};

export const SelectControl = withDefaultProps(
	BaseSelectControl,
	{ __next40pxDefaultSize: true },
	'SelectControl'
);

export const SearchControl = withDefaultProps(
	BaseSearchControl,
	{ __nextHasNoMarginBottom: true },
	'SearchControl'
);

export const CheckboxControl = withDefaultProps(
	BaseCheckboxControl,
	{ __nextHasNoMarginBottom: true },
	'CheckboxControl'
);

export const TextControl = withDefaultProps(
	BaseTextControl,
	{
		__next40pxDefaultSize: true,
		__nextHasNoMarginBottom: true,
	},
	'TextControl'
);

export const TextareaControl = withDefaultProps(
	BaseTextareaControl,
	{ __nextHasNoMarginBottom: true },
	'TextareaControl'
);
