/**
 * ConfigPanel — right-hand settings panel for the workflow builder.
 * Shows trigger settings, the selected step's config, or workflow-level
 * fields when nothing is selected.
 */

import { __, sprintf } from '@wordpress/i18n';
import ConfigFields from './ConfigFields';
import { Button, SelectControl, TextControl, TextareaControl } from '../../common/WpComponents';
import Notice from '../../common/Notice';
import { toast } from '../../common/Toast';
import { PRO_TONES, toneSelectOptions } from '../../../utils/aiOptions';

const WEEKDAYS = [
	{ value: 1, label: __( 'Mon', 'ai-marketing-expert' ) },
	{ value: 2, label: __( 'Tue', 'ai-marketing-expert' ) },
	{ value: 3, label: __( 'Wed', 'ai-marketing-expert' ) },
	{ value: 4, label: __( 'Thu', 'ai-marketing-expert' ) },
	{ value: 5, label: __( 'Fri', 'ai-marketing-expert' ) },
	{ value: 6, label: __( 'Sat', 'ai-marketing-expert' ) },
	{ value: 0, label: __( 'Sun', 'ai-marketing-expert' ) },
];

/**
 * Tone dropdown matching the Content Generator editor: shared tone list,
 * "(PRO)" labels + block-with-toast on free, and any unknown legacy value
 * kept selectable so old workflows don't silently change.
 */
const ToneSelect = ( { label, value, onChange, hasPro, emptyLabel, help } ) => {
	const options = [
		...( emptyLabel ? [ { value: '', label: emptyLabel } ] : [] ),
		...toneSelectOptions( hasPro ),
	];
	if ( value && ! options.some( ( o ) => o.value === value ) ) {
		options.push( { value, label: value } );
	}
	return (
		<SelectControl
			label={ label }
			value={ value || '' }
			options={ options }
			onChange={ ( v ) => {
				if ( ! hasPro && PRO_TONES.includes( v ) ) {
					toast( __( 'This tone is available in Pro.', 'ai-marketing-expert' ), 'warning' );
					return;
				}
				onChange( v );
			} }
			help={ help }
		/>
	);
};

const PRO_SCHEDULES = [ 'daily', 'custom' ];

const ScheduleControls = ( { wf, set, hasPro = false } ) => {
	const selectedDays = ( wf.schedule_days || '' ).split( ',' ).filter( ( d ) => d !== '' ).map( Number );
	const toggleDay = ( day ) => {
		const next = selectedDays.includes( day )
			? selectedDays.filter( ( d ) => d !== day )
			: [ ...selectedDays, day ];
		set( 'schedule_days', next.sort( ( a, b ) => a - b ).join( ',' ) );
	};

	return (
		<>
			<SelectControl
				label={ __( 'Run', 'ai-marketing-expert' ) }
				value={ wf.schedule_type }
				options={ [
					{ value: 'once', label: __( 'Once', 'ai-marketing-expert' ) },
					{ value: 'daily', label: __( 'Daily', 'ai-marketing-expert' ) + ( hasPro ? '' : ' (Pro)' ) },
					{ value: 'weekly', label: __( 'Weekly', 'ai-marketing-expert' ) },
					{ value: 'monthly', label: __( 'Monthly', 'ai-marketing-expert' ) },
					{ value: 'custom', label: __( 'Custom interval', 'ai-marketing-expert' ) + ( hasPro ? '' : ' (Pro)' ) },
				] }
				onChange={ ( v ) => {
					if ( ! hasPro && PRO_SCHEDULES.includes( v ) ) {
						toast( __( 'Daily and custom-interval schedules require Pro.', 'ai-marketing-expert' ), 'warning' );
						return;
					}
					set( 'schedule_type', v );
				} }
			/>
			{ wf.schedule_type === 'once' && (
				<TextControl
					type="datetime-local"
					label={ __( 'Run at', 'ai-marketing-expert' ) }
					value={ wf.run_at || '' }
					onChange={ ( v ) => set( 'run_at', v ) }
				/>
			) }
			{ [ 'daily', 'weekly', 'monthly' ].includes( wf.schedule_type ) && (
				<TextControl
					type="time"
					label={ __( 'Time of day', 'ai-marketing-expert' ) }
					value={ wf.schedule_time }
					onChange={ ( v ) => set( 'schedule_time', v ) }
				/>
			) }
			{ wf.schedule_type === 'weekly' && (
				<div className="aime-wf-weekdays">
					<span className="aime-wf-weekdays__label">{ __( 'Days of week', 'ai-marketing-expert' ) }</span>
					<div className="aime-wf-weekdays__chips">
						{ WEEKDAYS.map( ( d ) => (
							<button
								key={ d.value }
								type="button"
								onClick={ () => toggleDay( d.value ) }
								className={ selectedDays.includes( d.value ) ? 'aime-wf-chip is-active' : 'aime-wf-chip' }
							>
								{ d.label }
							</button>
						) ) }
					</div>
				</div>
			) }
			{ wf.schedule_type === 'monthly' && (
				<TextControl
					type="number"
					label={ __( 'Day of month (1–31)', 'ai-marketing-expert' ) }
					value={ wf.schedule_day_of_month }
					onChange={ ( v ) => set( 'schedule_day_of_month', v ) }
				/>
			) }
			{ wf.schedule_type === 'custom' && (
				<div className="aime-wf-field-row">
					<TextControl
						type="number"
						label={ __( 'Every', 'ai-marketing-expert' ) }
						value={ wf.interval_value }
						onChange={ ( v ) => set( 'interval_value', v ) }
					/>
					<SelectControl
						label={ __( 'Unit', 'ai-marketing-expert' ) }
						value={ wf.interval_unit }
						options={ [
							{ value: 'hours', label: __( 'Hours', 'ai-marketing-expert' ) },
							{ value: 'days', label: __( 'Days', 'ai-marketing-expert' ) },
						] }
						onChange={ ( v ) => set( 'interval_unit', v ) }
					/>
				</div>
			) }
		</>
	);
};

const ConfigPanel = ( {
	selectedNode,
	workflow,
	setWorkflowField,
	triggers,
	actionsByType,
	onUpdateStep,
	onUpdateStepConfig,
	onDeleteNode,
	onDeselect,
	hasPro = false,
	keywordSuggestions = [],
	tagSuggestions = [],
	brandVoices = [],
	nodes = [],
	edges = [],
} ) => {
	const backLink = onDeselect && (
		<Button variant="link" size="small" className="aime-wf-config__back" onClick={ onDeselect }>
			{ __( '← Workflow settings', 'ai-marketing-expert' ) }
		</Button>
	);

	// -- Trigger node selected --------------------------------------------
	if ( selectedNode && selectedNode.id === 'trigger' ) {
		const triggerKey = workflow.trigger_type === 'schedule' ? 'schedule' : workflow.trigger_event;
		const triggerDef = ( triggers || [] ).find( ( t ) => t.key === triggerKey );
		return (
			<div className="aime-wf-config">
				{ backLink }
				<div className="aime-wf-config__head">
					<h3 className="aime-wf-config__title">{ __( 'Trigger Settings', 'ai-marketing-expert' ) }</h3>
				</div>
				<div className="aime-wf-trigger-group">
					<SelectControl
						label={ __( 'When should this workflow run?', 'ai-marketing-expert' ) }
						value={ triggerKey || 'schedule' }
						options={ ( triggers || [] ).map( ( t ) => {
							let statusLabel = '';
							if ( t.available === false ) {
								const req = t.requires_label || t.requires_plugin;
								statusLabel = req
									? ` (${ sprintf( __( 'Requires %s — Not Installed', 'ai-marketing-expert' ), req ) })`
									: ` (${ __( 'inactive', 'ai-marketing-expert' ) })`;
							}
							return {
								value: t.key,
								label: `${ t.label }${ statusLabel }`,
							};
						} ) }
						onChange={ ( v ) => {
							if ( v === 'schedule' ) {
								setWorkflowField( { trigger_type: 'schedule', trigger_event: '', trigger_config: {} } );
							} else {
								setWorkflowField( { trigger_type: 'event', trigger_event: v, trigger_config: {} } );
							}
						} }
					/>
					{ triggerDef?.description && (
						<p className="aime-wf-trigger-desc">{ triggerDef.description }</p>
					) }
					{ ( triggerKey === 'woo_cart_abandoned' || workflow.trigger_event === 'woo_cart_abandoned' ) && (
						<div
							style={ {
								marginTop: 8,
								padding: '8px 12px',
								background: '#f0f9ff',
								border: '1px solid #bae6fd',
								borderRadius: '6px',
								fontSize: '12px',
								color: '#0369a1',
								lineHeight: 1.5,
							} }
						>
							<strong>⏱️ { __( 'Inactivity Cutoff:', 'ai-marketing-expert' ) }</strong>{ ' ' }
							{ sprintf(
								__( 'This workflow automatically runs after %d minutes of inactivity on checkout/cart. You can change this in Settings > General.', 'ai-marketing-expert' ),
								workflow.woo_cart_cutoff_minutes || window.aimeData?.wooCartCutoffMinutes || 30
							) }
						</div>
					) }
				</div>
				{ triggerDef && triggerDef.available === false && (
					<Notice
						type="error"
						dismissible={ false }
						message={
							triggerDef.requires_label || triggerDef.requires_plugin
								? sprintf(
									__( '⚠️ This trigger requires the %s plugin, which is not installed or active on this site. You can save this workflow as a draft, but it cannot be activated until %s is installed and activated.', 'ai-marketing-expert' ),
									triggerDef.requires_label || triggerDef.requires_plugin,
									triggerDef.requires_label || triggerDef.requires_plugin
								)
								: __( 'The module or plugin for this trigger is not active. The workflow cannot be activated until it is enabled.', 'ai-marketing-expert' )
						}
					/>
				) }
				{ workflow.trigger_type === 'schedule' ? (
					<ScheduleControls wf={ workflow } set={ ( k, v ) => setWorkflowField( { [ k ]: v } ) } hasPro={ hasPro } />
				) : (
					<ConfigFields
						fields={ triggerDef?.fields || [] }
						config={ workflow.trigger_config || {} }
						hasPro={ hasPro }
						keywordSuggestions={ keywordSuggestions }
						tagSuggestions={ tagSuggestions }
						onChange={ ( key, value ) =>
							setWorkflowField( {
								trigger_config: { ...( workflow.trigger_config || {} ), [ key ]: value },
							} )
						}
					/>
				) }
			</div>
		);
	}

	// -- Action / condition node selected ---------------------------------
	if ( selectedNode ) {
		const step = selectedNode.data?.step || {};
		const def = actionsByType[ step.action_type ];

		// Compute parent_key from edges to evaluate field visibility rules
		const parentEdge = edges.find( ( e ) => e.target === selectedNode.id );
		const parentKey = parentEdge && parentEdge.source !== 'trigger' ? parentEdge.source : '';
		const parentStep = parentKey ? nodes.find( ( n ) => n.id === parentKey )?.data?.step : null;
		const parentActionType = parentStep?.action_type || '';

		return (
			<div className="aime-wf-config">
				{ backLink }
				<div className="aime-wf-config__head">
					<h3 className="aime-wf-config__title">{ def?.label || step.action_type }</h3>
					<Button
						variant="tertiary"
						size="small"
						isDestructive
						onClick={ () => onDeleteNode( selectedNode.id ) }
					>
						{ __( 'Delete', 'ai-marketing-expert' ) }
					</Button>
				</div>
				{ def?.description && <p className="aime-wf-config__desc">{ def.description }</p> }
				{ def && def.available === false && (
					<Notice
						type="warning"
						dismissible={ false }
						message={ __( 'The module for this action is not active. This step will be skipped until you enable the module.', 'ai-marketing-expert' ) }
					/>
				) }
				{ parentActionType === 'ai_brain' && step.action_type === 'generate_blog_post' && (
					<Notice
						type="info"
						dismissible={ false }
						message={ __( 'Some fields are hidden because AI Brain provides topic and keywords automatically.', 'ai-marketing-expert' ) }
					/>
				) }
				<ConfigFields
					fields={ def?.fields || [] }
					config={ step.config || {} }
					hasPro={ hasPro }
					keywordSuggestions={ keywordSuggestions }
					tagSuggestions={ tagSuggestions }
					onChange={ ( key, value ) => onUpdateStepConfig( selectedNode.id, key, value ) }
					parentActionType={ parentActionType }
				/>
				<ToneSelect
					label={ __( 'Tone override (optional)', 'ai-marketing-expert' ) }
					value={ step.tone_override || '' }
					hasPro={ hasPro }
					emptyLabel={ __( 'Use workflow tone', 'ai-marketing-expert' ) }
					onChange={ ( v ) => onUpdateStep( selectedNode.id, { tone_override: v } ) }
				/>
				<SelectControl
					label={ __( 'Run condition', 'ai-marketing-expert' ) }
					value={ step.run_condition || 'always' }
					options={ [
						{ value: 'always', label: __( 'Always run', 'ai-marketing-expert' ) },
						{ value: 'if_previous_succeeded', label: __( 'Only if the parent step succeeded', 'ai-marketing-expert' ) },
					] }
					onChange={ ( v ) => onUpdateStep( selectedNode.id, { run_condition: v } ) }
				/>
			</div>
		);
	}

	// -- Nothing selected: workflow-level settings -------------------------
	return (
		<div className="aime-wf-config">
			<div className="aime-wf-config__head">
				<h3 className="aime-wf-config__title">{ __( 'Workflow settings', 'ai-marketing-expert' ) }</h3>
			</div>
			<TextControl
				label={ __( 'Name', 'ai-marketing-expert' ) }
				value={ workflow.name }
				onChange={ ( v ) => setWorkflowField( { name: v } ) }
			/>
			<TextareaControl
				label={ __( 'Description', 'ai-marketing-expert' ) }
				value={ workflow.description }
				onChange={ ( v ) => setWorkflowField( { description: v } ) }
				help={ workflow.trigger_event === 'woo_cart_abandoned' ? sprintf( __( '⏱️ Runs after %d minutes of inactivity on checkout/cart (configured in Settings > General).', 'ai-marketing-expert' ), workflow.woo_cart_cutoff_minutes || window.aimeData?.wooCartCutoffMinutes || 30 ) : undefined }
			/>
			<TextControl
				label={ __( 'Default topic', 'ai-marketing-expert' ) }
				help={ __( 'Passed to steps that need a topic.', 'ai-marketing-expert' ) }
				value={ workflow.topic }
				onChange={ ( v ) => setWorkflowField( { topic: v } ) }
			/>
			<ToneSelect
				label={ __( 'Default tone', 'ai-marketing-expert' ) }
				value={ workflow.tone || 'professional' }
				hasPro={ hasPro }
				onChange={ ( v ) => setWorkflowField( { tone: v } ) }
			/>
			{ brandVoices.length > 0 && (
				<SelectControl
					label={
						hasPro
							? __( 'Brand voice', 'ai-marketing-expert' )
							: `${ __( 'Brand voice', 'ai-marketing-expert' ) } (PRO)`
					}
					value={ String( workflow.brand_voice_id || 0 ) }
					options={ [
						{ value: '0', label: __( 'Default voice', 'ai-marketing-expert' ) },
						...brandVoices.map( ( v ) => ( { value: String( v.id ), label: v.name } ) ),
					] }
					help={ __( 'Applied to AI content steps in this workflow.', 'ai-marketing-expert' ) }
					onChange={ ( v ) => {
						if ( ! hasPro && Number( v ) !== 0 ) {
							toast( __( 'Brand Voice is available in Pro.', 'ai-marketing-expert' ), 'warning' );
							return;
						}
						setWorkflowField( { brand_voice_id: Number( v ) || 0 } );
					} }
				/>
			) }
			<SelectControl
				label={ __( 'If a step fails', 'ai-marketing-expert' ) }
				value={ workflow.failure_policy }
				options={ [
					{ value: 'stop', label: __( 'Stop the workflow', 'ai-marketing-expert' ) },
					{ value: 'skip', label: __( 'Skip the step and continue', 'ai-marketing-expert' ) },
					{ value: 'retry', label: __( 'Retry the step (up to 3×) then continue', 'ai-marketing-expert' ) },
				] }
				onChange={ ( v ) => setWorkflowField( { failure_policy: v } ) }
			/>
			<p className="aime-wf-config__hint">
				{ __( 'Select a node on the canvas to edit its settings.', 'ai-marketing-expert' ) }
			</p>
		</div>
	);
};

export default ConfigPanel;
