/**
 * AutomationEditor - visual automation/funnel builder using @xyflow/react.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button, TextControl, SelectControl, TextareaControl, Spinner,
} from '@aime/wp-components';
import {
	ReactFlow, Background, Controls, MiniMap, Handle,
	useNodesState, useEdgesState, addEdge, Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useApi from '../../../hooks/useApi';
import useSlowWarning from '../../../hooks/useSlowWarning';
import LoadingBtn from '../../common/LoadingBtn';
import AiNotice, { isAiConfigured, aiDisabledTitle } from '../../common/AiNotice';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';

/* Custom node */
const ICON_MAP = {
	send_email: '\u2709\uFE0F',
	add_tag: '\uD83C\uDFF7\uFE0F',
	remove_tag: '\uD83C\uDFF7\uFE0F',
	add_to_list: '\uD83D\uDCCB',
	remove_from_list: '\uD83D\uDCCB',
	update_contact: '\uD83D\uDC64',
	webhook: '\uD83C\uDF10',
	condition: '\u2753',
	wait: '\u23F3',
};

const StepNode = ( { data } ) => (
	<div
		className={ `aime-auto-node aime-auto-node-${ data.type || 'action' }` }
		onClick={ data.onEdit }
	>
		<Handle type="target" position={ Position.Top } />
		<div className="aime-auto-node-icon">{ ICON_MAP[ data.actionName ] || '\u26A1' }</div>
		<div className="aime-auto-node-body">
			<strong>{ data.label }</strong>
			<span className="aime-muted">{ data.actionName }</span>
		</div>
		<Handle type="source" position={ Position.Bottom } />
	</div>
);

const TriggerNode = ( { data } ) => (
	<div className="aime-auto-node aime-auto-node-trigger" onClick={ data.onEdit }>
		<div className="aime-auto-node-icon">{ '\uD83D\uDE80' }</div>
		<div className="aime-auto-node-body">
			<strong>{ __( 'Trigger', 'ai-marketing-expert' ) }</strong>
			<span className="aime-muted">{ data.triggerKey || '\u2014' }</span>
		</div>
		<Handle type="source" position={ Position.Bottom } />
	</div>
);

const nodeTypes = { step: StepNode, trigger: TriggerNode };

/* Step settings fields by action */
/* Searchable select component */
const SearchableSelect = ( { label, value, options, onChange, placeholder } ) => {
	const [ search, setSearch ] = useState( '' );
	const [ open, setOpen ] = useState( false );
	const ref = useRef( null );

	const filtered = options.filter( ( o ) =>
		o.label.toLowerCase().includes( search.toLowerCase() )
	);

	const selected = options.find( ( o ) => String( o.value ) === String( value ) );

	/* close on outside click */
	useEffect( () => {
		const handle = ( e ) => { if ( ref.current && ! ref.current.contains( e.target ) ) setOpen( false ); };
		document.addEventListener( 'mousedown', handle );
		return () => document.removeEventListener( 'mousedown', handle );
	}, [] );

	return (
		<div className="aime-premium-form-group">
			<label className="aime-premium-form-label">{ label }</label>
			<div className="aime-searchable-select" ref={ ref }>
				<button type="button" className="aime-searchable-select__trigger" onClick={ () => setOpen( ! open ) }>
					<span>{ selected ? selected.label : ( <span className="aime-placeholder">{ placeholder }</span> ) }</span>
					<span className="aime-searchable-select__arrow">{ '\u25BE' }</span>
				</button>
				{ open && (
					<div className="aime-searchable-select__dropdown">
						<input
							className="aime-searchable-select__search"
							value={ search }
							onChange={ ( e ) => setSearch( e.target.value ) }
							placeholder={ __( 'Type to search...', 'ai-marketing-expert' ) }
							autoFocus
						/>
						<ul className="aime-searchable-select__list">
							{ value && (
								<li className="aime-searchable-select__item aime-searchable-select__item--clear" onClick={ () => { onChange( '' ); setOpen( false ); setSearch( '' ); } }>
									{ __( '\u2715 Clear selection', 'ai-marketing-expert' ) }
								</li>
							) }
							{ filtered.length === 0 && (
								<li className="aime-searchable-select__item aime-searchable-select__empty">{ __( 'No results found', 'ai-marketing-expert' ) }</li>
							) }
							{ filtered.map( ( o ) => (
								<li key={ o.value } className={ `aime-searchable-select__item${ String( o.value ) === String( value ) ? ' aime-searchable-select__item--active' : '' }` } onClick={ () => { onChange( o.value ); setOpen( false ); setSearch( '' ); } }>
									{ o.label }
								</li>
							) ) }
						</ul>
					</div>
				) }
			</div>
		</div>
	);
};

const StepSettingsFields = ( { actionName, settings, onChange, campaigns, lists, tags } ) => {
	const set = ( key, val ) => onChange( { ...settings, [ key ]: val } );

	const campaignOpts = ( campaigns || [] ).map( ( c ) => ( { value: c.id, label: `#${ c.id } \u2014 ${ c.title || c.email_subject || __( 'Untitled', 'ai-marketing-expert' ) }` } ) );
	const listOpts = ( lists || [] ).map( ( l ) => ( { value: l.id, label: `#${ l.id } \u2014 ${ l.title }` } ) );
	const tagOpts = ( tags || [] ).map( ( t ) => ( { value: t.id, label: `#${ t.id } \u2014 ${ t.title }` } ) );

	switch ( actionName ) {
		case 'send_email':
			return (
				<>
					<div className="aime-premium-form-group">
						<label className="aime-premium-form-label">{ __( 'Email Subject', 'ai-marketing-expert' ) }</label>
						<input className="aime-premium-input" value={ settings.email_subject || '' } onChange={ ( e ) => set( 'email_subject', e.target.value ) } placeholder={ __( 'e.g. Welcome to our newsletter!', 'ai-marketing-expert' ) } />
					</div>
					<TextareaControl
						label={ __( 'Email Body', 'ai-marketing-expert' ) }
						value={ settings.email_body || '' }
						onChange={ ( v ) => set( 'email_body', v ) }
						rows={ 8 }
						__nextHasNoMarginBottom
					/>
					<SearchableSelect
						label={ __( 'Campaign', 'ai-marketing-expert' ) }
						value={ settings.campaign_id || '' }
						options={ campaignOpts }
						onChange={ ( v ) => set( 'campaign_id', v ) }
						placeholder={ __( 'Search & select a campaign (optional)', 'ai-marketing-expert' ) }
					/>
				</>
			);
		case 'add_tag':
		case 'remove_tag':
			return tagOpts.length > 0 ? (
				<SearchableSelect
					label={ __( 'Tag', 'ai-marketing-expert' ) }
					value={ settings.tag_ids?.[ 0 ] || '' }
					options={ tagOpts }
					onChange={ ( v ) => set( 'tag_ids', v ? [ v ] : [] ) }
					placeholder={ __( 'Search & select a tag', 'ai-marketing-expert' ) }
				/>
			) : (
				<div className="aime-premium-form-group">
					<label className="aime-premium-form-label">{ __( 'Tag Name', 'ai-marketing-expert' ) }</label>
					<input className="aime-premium-input" type="number" value={ settings.tag_ids?.[ 0 ] || '' } onChange={ ( e ) => set( 'tag_ids', e.target.value ? [ e.target.value ] : [] ) } placeholder={ __( 'Enter the target tag ID', 'ai-marketing-expert' ) } />
				</div>
			);
		case 'add_to_list':
		case 'remove_from_list':
			return listOpts.length > 0 ? (
				<SearchableSelect
					label={ __( 'List', 'ai-marketing-expert' ) }
					value={ settings.list_ids?.[ 0 ] || '' }
					options={ listOpts }
					onChange={ ( v ) => set( 'list_ids', v ? [ v ] : [] ) }
					placeholder={ __( 'Search & select a list', 'ai-marketing-expert' ) }
				/>
			) : (
				<div className="aime-premium-form-group">
					<label className="aime-premium-form-label">{ __( 'List ID', 'ai-marketing-expert' ) }</label>
					<input className="aime-premium-input" type="number" value={ settings.list_ids?.[ 0 ] || '' } onChange={ ( e ) => set( 'list_ids', e.target.value ? [ e.target.value ] : [] ) } placeholder={ __( 'Enter the target list ID', 'ai-marketing-expert' ) } />
				</div>
			);
		case 'update_contact':
			return (
				<>
					<div className="aime-premium-form-group">
						<label className="aime-premium-form-label">{ __( 'Field', 'ai-marketing-expert' ) }</label>
						<select className="aime-premium-select" value={ Object.keys( settings.fields || {} )[ 0 ] || '' } onChange={ ( e ) => onChange( { fields: e.target.value ? { [ e.target.value ]: '' } : {} } ) }>
							<option value="">{ __( '\u2014 Select Field \u2014', 'ai-marketing-expert' ) }</option>
							<option value="first_name">{ __( 'First Name', 'ai-marketing-expert' ) }</option>
							<option value="last_name">{ __( 'Last Name', 'ai-marketing-expert' ) }</option>
							<option value="status">{ __( 'Status', 'ai-marketing-expert' ) }</option>
						</select>
					</div>
					<div className="aime-premium-form-group">
						<label className="aime-premium-form-label">{ __( 'Value', 'ai-marketing-expert' ) }</label>
						<input className="aime-premium-input" value={ Object.values( settings.fields || {} )[ 0 ] || '' } onChange={ ( e ) => { const field = Object.keys( settings.fields || {} )[ 0 ]; onChange( { fields: field ? { [ field ]: e.target.value } : {} } ); } } placeholder={ __( 'New value for the field', 'ai-marketing-expert' ) } />
					</div>
				</>
			);
		case 'condition':
			return (
				<>
					<div className="aime-premium-form-group">
						<label className="aime-premium-form-label">{ __( 'Condition Type', 'ai-marketing-expert' ) }</label>
						<select className="aime-premium-select" value={ settings.field || '' } onChange={ ( e ) => set( 'field', e.target.value ) }>
							<option value="">{ __( '\u2014 Select Condition \u2014', 'ai-marketing-expert' ) }</option>
							<option value="status">{ __( 'Status', 'ai-marketing-expert' ) }</option>
							<option value="first_name">{ __( 'First Name', 'ai-marketing-expert' ) }</option>
							<option value="last_name">{ __( 'Last Name', 'ai-marketing-expert' ) }</option>
							<option value="email">{ __( 'Email', 'ai-marketing-expert' ) }</option>
						</select>
					</div>
					<SelectControl label={ __( 'Operator', 'ai-marketing-expert' ) } value={ settings.operator || 'equals' } options={ [
						{ label: __( 'Equals', 'ai-marketing-expert' ), value: 'equals' },
						{ label: __( 'Does not equal', 'ai-marketing-expert' ), value: 'not_equals' },
						{ label: __( 'Contains', 'ai-marketing-expert' ), value: 'contains' },
						{ label: __( 'Does not contain', 'ai-marketing-expert' ), value: 'not_contains' },
						{ label: __( 'Is empty', 'ai-marketing-expert' ), value: 'is_empty' },
						{ label: __( 'Is not empty', 'ai-marketing-expert' ), value: 'is_not_empty' },
					] } onChange={ ( v ) => set( 'operator', v ) } __nextHasNoMarginBottom />
					<input className="aime-premium-input" value={ settings.value || '' } onChange={ ( e ) => set( 'value', e.target.value ) } placeholder={ __( 'Value to compare', 'ai-marketing-expert' ) } />
				</>
			);
		case 'webhook':
			return (
				<>
					<div className="aime-premium-form-group">
						<label className="aime-premium-form-label">{ __( 'Webhook URL', 'ai-marketing-expert' ) }</label>
						<input className="aime-premium-input" type="url" value={ settings.url || '' } onChange={ ( e ) => set( 'url', e.target.value ) } placeholder="https://example.com/webhook" />
					</div>
					<div className="aime-premium-form-group">
						<label className="aime-premium-form-label">{ __( 'HTTP Method', 'ai-marketing-expert' ) }</label>
						<select className="aime-premium-select" value={ settings.method || 'POST' } onChange={ ( e ) => set( 'method', e.target.value ) }>
							<option value="POST">POST</option>
							<option value="GET">GET</option>
						</select>
					</div>
				</>
			);
		case 'wait':
		case 'end':
			return null;
		default:
			return (
				<div className="aime-premium-form-group">
					<label className="aime-premium-form-label">{ __( 'Settings (JSON)', 'ai-marketing-expert' ) }</label>
					<textarea className="aime-premium-input" rows={ 4 } style={ { fontFamily: 'monospace', fontSize: 12 } } value={ JSON.stringify( settings || {}, null, 2 ) } onChange={ ( e ) => { try { onChange( JSON.parse( e.target.value ) ); } catch {} } } />
				</div>
			);
	}
};

/* Helpers */
const seqToNodes = ( sequences, triggerKey, onEdit ) => {
	const nodes = [
		{
			id: 'trigger',
			type: 'trigger',
			position: { x: 250, y: 30 },
			data: { triggerKey, onEdit: () => onEdit( 'trigger' ) },
			initialWidth: 200,
			initialHeight: 52,
		},
	];
	( sequences || [] ).forEach( ( s, i ) => {
		nodes.push( {
			id: `step-${ s.id || i }`,
			type: 'step',
			position: { x: 250, y: 130 + i * 120 },
			data: {
				label: s.title || s.action_name,
				actionName: s.action_name,
				type: s.action_name === 'condition' ? 'condition' : 'action',
				seq: s,
				onEdit: () => onEdit( `step-${ s.id || i }` ),
			},
			initialWidth: 200,
			initialHeight: 52,
		} );
	} );
	return nodes;
};

const seqToEdges = ( sequences ) => {
	const edges = [];
	if ( sequences.length > 0 ) {
		edges.push( { id: 'e-trigger-0', source: 'trigger', target: `step-${ sequences[ 0 ].id || 0 }`, animated: true } );
	}
	for ( let i = 0; i < sequences.length - 1; i++ ) {
		edges.push( {
			id: `e-${ i }-${ i + 1 }`,
			source: `step-${ sequences[ i ].id || i }`,
			target: `step-${ sequences[ i + 1 ].id || ( i + 1 ) }`,
			animated: true,
		} );
	}
	return edges;
};

/* Automation templates */
const AUTOMATION_TEMPLATES = [
	{
		name: 'welcome_series',
		icon: '\uD83D\uDC4B',
		title: __( 'Welcome Email Series', 'ai-marketing-expert' ),
		description: __( 'Send a welcome email when a new contact is created, followed by a follow-up after 2 days.', 'ai-marketing-expert' ),
		trigger: 'subscriber_created',
		steps: [
			{ action_name: 'send_email', title: 'Send Welcome Email', delay_value: 0, delay_unit: 'minutes', settings: {} },
			{ action_name: 'wait', title: 'Wait 2 Days', delay_value: 2, delay_unit: 'days', settings: {} },
			{ action_name: 'send_email', title: 'Send Follow-Up Email', delay_value: 0, delay_unit: 'minutes', settings: {} },
			{ action_name: 'add_tag', title: 'Tag as Onboarded', delay_value: 0, delay_unit: 'minutes', settings: { tag: 'onboarded' } },
		],
	},
	{
		name: 'tag_nurture',
		icon: '\uD83C\uDFF7\uFE0F',
		title: __( 'Tag-Based Nurture', 'ai-marketing-expert' ),
		description: __( 'When a tag is added, send a targeted email and move the contact to a specific list.', 'ai-marketing-expert' ),
		trigger: 'tag_added',
		steps: [
			{ action_name: 'send_email', title: 'Send Targeted Email', delay_value: 0, delay_unit: 'minutes', settings: {} },
			{ action_name: 'wait', title: 'Wait 1 Day', delay_value: 1, delay_unit: 'days', settings: {} },
			{ action_name: 'add_to_list', title: 'Add to Nurture List', delay_value: 0, delay_unit: 'minutes', settings: {} },
		],
	},
	{
		name: 're_engagement',
		icon: '\uD83D\uDD04',
		title: __( 'Re-Engagement Campaign', 'ai-marketing-expert' ),
		description: __( 'Re-engage inactive contacts with a special offer email and follow-up.', 'ai-marketing-expert' ),
		trigger: 'tag_added',
		steps: [
			{ action_name: 'send_email', title: 'Send Re-Engagement Offer', delay_value: 0, delay_unit: 'minutes', settings: {} },
			{ action_name: 'wait', title: 'Wait 3 Days', delay_value: 3, delay_unit: 'days', settings: {} },
			{ action_name: 'send_email', title: 'Send Reminder', delay_value: 0, delay_unit: 'minutes', settings: {} },
			{ action_name: 'remove_tag', title: 'Remove Inactive Tag', delay_value: 0, delay_unit: 'minutes', settings: {} },
		],
	},
	{
		name: 'post_purchase',
		icon: '\uD83D\uDED2',
		title: __( 'Post-Purchase Follow-Up', 'ai-marketing-expert' ),
		description: __( 'After a WooCommerce order, send a thank-you email, request a review, and tag the customer.', 'ai-marketing-expert' ),
		trigger: 'woo_order_completed',
		steps: [
			{ action_name: 'send_email', title: 'Send Thank You Email', delay_value: 0, delay_unit: 'minutes', settings: {} },
			{ action_name: 'add_tag', title: 'Tag as Customer', delay_value: 0, delay_unit: 'minutes', settings: { tag: 'customer' } },
			{ action_name: 'wait', title: 'Wait 5 Days', delay_value: 5, delay_unit: 'days', settings: {} },
			{ action_name: 'send_email', title: 'Request Review', delay_value: 0, delay_unit: 'minutes', settings: {} },
		],
	},
	{
		name: 'new_user_onboarding',
		icon: '\uD83D\uDE80',
		title: __( 'New User Onboarding', 'ai-marketing-expert' ),
		description: __( 'When a WordPress user registers, add them to a list, send a getting-started email, and follow up.', 'ai-marketing-expert' ),
		trigger: 'user_registered',
		steps: [
			{ action_name: 'add_to_list', title: 'Add to Users List', delay_value: 0, delay_unit: 'minutes', settings: {} },
			{ action_name: 'send_email', title: 'Send Getting Started Guide', delay_value: 0, delay_unit: 'minutes', settings: {} },
			{ action_name: 'wait', title: 'Wait 3 Days', delay_value: 3, delay_unit: 'days', settings: {} },
			{ action_name: 'send_email', title: 'Tips & Tricks Email', delay_value: 0, delay_unit: 'minutes', settings: {} },
			{ action_name: 'add_tag', title: 'Tag as Onboarded', delay_value: 0, delay_unit: 'minutes', settings: { tag: 'onboarded' } },
		],
	},
];

/* Main component */
const AutomationEditor = ( { id, onBack } ) => {
	const { get, post, put, loading, error, clearError } = useApi();
	const slowWarning = useSlowWarning();
	const [ automation, setAutomation ] = useState( null );
	const [ sequences, setSequences ] = useState( [] );
	const [ triggers, setTriggers ] = useState( [] );
	const [ actions, setActions ] = useState( [] );
	const [ campaigns, setCampaigns ] = useState( [] );
	const [ allLists, setAllLists ] = useState( [] );
	const [ allTags, setAllTags ] = useState( [] );
	const [ saving, setSaving ] = useState( false );
	const [ editingNode, setEditingNode ] = useState( null );
	const [ aiLoading, setAiLoading ] = useState( false );
	const [ aiModalOpen, setAiModalOpen ] = useState( false );
	const [ aiInstruction, setAiInstruction ] = useState( '' );
	const [ successMsg, setSuccessMsg ] = useState( '' );
	const stepsRef = useRef( null );

	/* form fields */
	const [ title, setTitle ] = useState( '' );
	const [ triggerKey, setTriggerKey ] = useState( '' );
	const [ triggerSettings, setTriggerSettings ] = useState( {} );
	const [ status, setStatus ] = useState( 'draft' );

	/* flow state */
	const [ nodes, setNodes, onNodesChange ] = useNodesState( [] );
	const [ edges, setEdges, onEdgesChange ] = useEdgesState( [] );
	const onConnect = useCallback( ( c ) => setEdges( ( eds ) => addEdge( { ...c, animated: true }, eds ) ), [ setEdges ] );
	const rfInstance = useRef( null );

	/* fetch triggers & actions lists */
	useEffect( () => {
		( async () => {
			try {
				const [ t, a, camp, ls, tg ] = await Promise.all( [
					get( '/email/automations/triggers' ),
					get( '/email/automations/actions' ),
					get( '/email/campaigns', { per_page: 100 } ),
					get( '/email/lists', { per_page: 100 } ),
					get( '/email/tags', { per_page: 100 } ),
				] );
				setTriggers( t || [] );
				setActions( a || [] );
				setCampaigns( camp?.items || camp || [] );
				setAllLists( ls?.items || ls || [] );
				setAllTags( tg?.items || tg || [] );
			} catch ( e ) { /* */ }
		} )();
	}, [ get ] );

	/* load automation */
	useEffect( () => {
		if ( ! id ) return;
		( async () => {
			try {
				const res = await get( `/email/automations/${ id }` );
				setAutomation( res );
				setTitle( res.title || '' );
				setTriggerKey( res.trigger_name || '' );
				setTriggerSettings( typeof res.settings === 'object' ? res.settings : {} );
				setStatus( res.status || 'draft' );
				setSequences( res.sequences || [] );
			} catch ( e ) { /* */ }
		} )();
	}, [ get, id ] );

	/* rebuild flow nodes when sequences change */
	const handleEditNode = useCallback( ( nodeId ) => setEditingNode( nodeId ), [] );

	useEffect( () => {
		const newNodes = seqToNodes( sequences, triggerKey, handleEditNode );
		setNodes( newNodes );
		setEdges( seqToEdges( sequences ) );
		/* Re-fit viewport after nodes are measured */
		if ( rfInstance.current && newNodes.length > 0 ) {
			setTimeout( () => rfInstance.current?.fitView( { padding: 0.2 } ), 50 );
		}
	}, [ sequences, triggerKey, handleEditNode, setNodes, setEdges ] );

	/* Track the automation ID locally so new automations use the returned ID. */
	const [ autoId, setAutoId ] = useState( id || null );

	/* apply a template */
	const handleApplyTemplate = ( tpl ) => {
		setTitle( tpl.title );
		setTriggerKey( tpl.trigger );
		setSequences( tpl.steps.map( ( s, i ) => ( { ...s, id: `tpl-${ Date.now() }-${ i }`, sequence: i + 1 } ) ) );
	};

	/* save */
	const handleSave = async () => {
		setSaving( true );
		try {
			const payload = { title, trigger_name: triggerKey, settings: triggerSettings, status };
			let currentId = autoId;
			if ( currentId ) {
				await put( `/email/automations/${ currentId }`, payload );
			} else {
				const res = await post( '/email/automations', payload );
				currentId = res.id;
				setAutoId( currentId );
			}
			/* save sequences */
			await put( `/email/automations/${ currentId }/sequences`, {
				sequences: sequences.map( ( s, i ) => ( { ...s, action_name: s.action_name, sequence: i + 1 } ) ),
			} );
			setSuccessMsg( __( 'Automation saved successfully!', 'ai-marketing-expert' ) );
			setTimeout( () => setSuccessMsg( '' ), 4000 );
		} catch ( e ) { /* error shown via useApi (incl. free-tier funnel limit) */ }
		setSaving( false );
	};

	/* add step */
	const handleAddStep = ( actionName ) => {
		const newSeq = {
			id: `new-${ Date.now() }`,
			action_name: actionName,
			title: ( actionName || '' ).replace( /_/g, ' ' ),
			settings: {},
			delay_value: 0,
			delay_unit: 'minutes',
			sequence: sequences.length + 1,
		};
		setSequences( [ ...sequences, newSeq ] );
	};

	/* remove step */
	const handleRemoveStep = ( idx ) => {
		setSequences( sequences.filter( ( _, i ) => i !== idx ) );
		setEditingNode( null );
	};

	/* update step */
	const handleUpdateStep = ( idx, key, value ) => {
		const updated = [ ...sequences ];
		updated[ idx ] = { ...updated[ idx ], [ key ]: value };
		setSequences( updated );
	};

	/* AI suggestions */
	const handleAiSuggest = async () => {
		setAiLoading( true );
		slowWarning.start();
		try {
			const res = await get( '/email/ai/automation-suggestions', {
				instruction: aiInstruction,
				goal: title || aiInstruction || 'general automation',
				trigger: triggerKey,
			} );
			/* Backend returns { suggestions: [ { title, steps: [{action, delay, details}] } ] } */
			const suggestions = Array.isArray( res?.suggestions ) ? res.suggestions : ( res?.suggestions?.steps ? [ res.suggestions ] : [] );
			const picked = suggestions[ 0 ];
			if ( picked && Array.isArray( picked.steps ) ) {
				const steps = picked.steps.map( ( s, i ) => ( {
					id: `ai-${ Date.now() }-${ i }`,
					action_name: s.action || 'send_email',
					title: s.details || s.title || s.action || 'Step',
					settings: s.settings || {},
					delay_value: parseInt( s.delay_value || s.delay ) || 0,
					delay_unit: s.delay_unit || 'minutes',
					sequence: i + 1,
				} ) );
				setSequences( steps );
				if ( picked.title && ! title ) {
					setTitle( picked.title );
				}
				if ( picked.trigger && ! triggerKey ) {
					setTriggerKey( picked.trigger );
				}
				if ( picked.description && ! aiInstruction ) {
					setAiInstruction( picked.description );
				}
				setAiModalOpen( false );
				setSuccessMsg( __( 'AI steps added successfully!', 'ai-marketing-expert' ) );
				setTimeout( () => setSuccessMsg( '' ), 4000 );
				setTimeout( () => stepsRef.current?.scrollIntoView( { behavior: 'smooth', block: 'start' } ), 100 );
			}
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setAiLoading( false );
		}
	};

	/* editing node modal */
	const getEditingIdx = () => {
		if ( ! editingNode || editingNode === 'trigger' ) return -1;
		return sequences.findIndex( ( s ) => `step-${ s.id }` === editingNode );
	};

	const triggerOptions = useMemo( () => [
		{ label: __( '\u2014 Select Trigger \u2014', 'ai-marketing-expert' ), value: '' },
		...triggers.map( ( t ) => ( { label: t.label || t.name, value: t.name } ) ),
	], [ triggers ] );

	const actionOptions = useMemo( () => [
		{ label: __( '\u2014 Select Action \u2014', 'ai-marketing-expert' ), value: '' },
		...actions.map( ( a ) => ( { label: a.label || a.name, value: a.name } ) ),
	], [ actions ] );

	const triggerTagOptions = useMemo( () => ( allTags || [] ).map( ( t ) => ( { value: t.id, label: `#${ t.id } \u2014 ${ t.title }` } ) ), [ allTags ] );
	const triggerListOptions = useMemo( () => ( allLists || [] ).map( ( l ) => ( { value: l.id, label: `#${ l.id } \u2014 ${ l.title }` } ) ), [ allLists ] );

	if ( loading && ! automation && id ) {
		return <Loader variant="form" text={ __( 'Loading automation...', 'ai-marketing-expert' ) } />;
	}

	return (
		<div className="aime-automation-editor">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }
			{ successMsg && <Notice type="success" message={ successMsg } dismissible onDismiss={ () => setSuccessMsg( '' ) } /> }

			<div className="aime-page-header">
				<div>
					<Button variant="link" onClick={ onBack }>{ __( '\u2190 Back to Automations', 'ai-marketing-expert' ) }</Button>
					<h2>{ id ? __( 'Edit Automation', 'ai-marketing-expert' ) : __( 'New Automation', 'ai-marketing-expert' ) }</h2>
				</div>
				<div className="aime-header-actions">
					<Button variant="secondary" onClick={ () => setAiModalOpen( true ) } disabled={ ! isAiConfigured() } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }>
						{ __( '\u2728 AI Suggest Steps', 'ai-marketing-expert' ) }
					</Button>
					<Button variant="primary" onClick={ handleSave } isBusy={ saving } disabled={ saving }>
						{ saving
							? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
							: __( 'Save Automation', 'ai-marketing-expert' )
						}
					</Button>
				</div>
			</div>

			{ /* Top bar - title + trigger + status */ }
			<Card>
				<div className="aime-form-grid aime-form-grid-3">
					<TextControl label={ __( 'Title', 'ai-marketing-expert' ) } value={ title } onChange={ setTitle } __nextHasNoMarginBottom />
					<SelectControl label={ __( 'Trigger', 'ai-marketing-expert' ) } options={ triggerOptions } value={ triggerKey } onChange={ setTriggerKey } __nextHasNoMarginBottom />
					<SelectControl label={ __( 'Status', 'ai-marketing-expert' ) } options={ [
						{ label: __( 'Draft', 'ai-marketing-expert' ), value: 'draft' },
						{ label: __( 'Published', 'ai-marketing-expert' ), value: 'published' },
					] } value={ status } onChange={ setStatus } __nextHasNoMarginBottom />
				</div>
			</Card>

			{ /* Templates - show for new automations or when no steps */ }
			{ ! id && sequences.length === 0 && (
				<Card title={ __( 'Start from a Template', 'ai-marketing-expert' ) }>
					<div className="aime-automation-templates">
						{ AUTOMATION_TEMPLATES.map( ( tpl ) => (
							<button key={ tpl.name } type="button" className="aime-automation-tpl-card" onClick={ () => handleApplyTemplate( tpl ) }>
								<span className="aime-automation-tpl-icon">{ tpl.icon }</span>
								<div className="aime-automation-tpl-body">
									<strong>{ tpl.title }</strong>
									<span>{ tpl.description }</span>
								</div>
								<span className="aime-automation-tpl-steps">{ tpl.steps.length } { __( 'steps', 'ai-marketing-expert' ) }</span>
							</button>
						) ) }
					</div>
				</Card>
			) }

			{ /* Visual builder */ }
			<Card title={ __( 'Automation Flow', 'ai-marketing-expert' ) }>
				<div className="aime-flow-canvas" style={ { height: 480 } }>
					<ReactFlow
						nodes={ nodes }
						edges={ edges }
						onNodesChange={ onNodesChange }
						onEdgesChange={ onEdgesChange }
						onConnect={ onConnect }
						nodeTypes={ nodeTypes }
					defaultViewport={ { x: 0, y: 0, zoom: 1 } }
					onInit={ ( instance ) => { rfInstance.current = instance; } }
						proOptions={ { hideAttribution: true } }
					>
						<Background gap={ 16 } size={ 1 } />
						<Controls />
						<MiniMap nodeStrokeWidth={ 3 } />
					</ReactFlow>
				</div>
			</Card>

			{ /* Add step panel */ }
			<Card title={ __( 'Add Step', 'ai-marketing-expert' ) }>
				<div className="aime-action-palette">
					{ actions.map( ( a ) => (
						<Button key={ a.name } variant="secondary" className="aime-action-chip" onClick={ () => handleAddStep( a.name ) }>
							{ ICON_MAP[ a.name ] || '\u26A1' } { a.label || a.name }
						</Button>
					) ) }
				</div>
			</Card>

			{ /* Sequence list (linear) */ }
			<div ref={ stepsRef }></div>
			{ successMsg && <Notice type="success" message={ successMsg } dismissible onDismiss={ () => setSuccessMsg( '' ) } /> }
			<Card title={ __( 'Steps', 'ai-marketing-expert' ) }>
				{ sequences.length === 0 && <p className="aime-empty-msg">{ __( 'No steps yet. Add one above or use AI to suggest steps.', 'ai-marketing-expert' ) }</p> }
				{ sequences.map( ( s, i ) => (
					<div key={ s.id } className="aime-step-row">
						<span className="aime-step-num">{ i + 1 }</span>
						<div className="aime-step-row-body">
							<strong>{ s.title || s.action_name }</strong>
							<span className="aime-muted">{ s.action_name }</span>
						</div>
						<div className="aime-step-row-delay">
							<TextControl
								type="number"
								value={ s.delay_value || 0 }
								onChange={ ( v ) => handleUpdateStep( i, 'delay_value', parseInt( v ) || 0 ) }
								__nextHasNoMarginBottom
							/>
							<SelectControl
								value={ s.delay_unit || 'minutes' }
								options={ [
									{ label: __( 'Minutes', 'ai-marketing-expert' ), value: 'minutes' },
									{ label: __( 'Hours', 'ai-marketing-expert' ), value: 'hours' },
									{ label: __( 'Days', 'ai-marketing-expert' ), value: 'days' },
								] }
								onChange={ ( v ) => handleUpdateStep( i, 'delay_unit', v ) }
								__nextHasNoMarginBottom
							/>
						</div>
						<Button isDestructive variant="tertiary" size="small" onClick={ () => handleRemoveStep( i ) }>
							{ __( 'Remove', 'ai-marketing-expert' ) }
						</Button>
					</div>
				) ) }
			</Card>

			{ aiModalOpen && (
				<div className="aime-premium-modal-overlay" onClick={ () => ! aiLoading && setAiModalOpen( false ) }>
					<div className="aime-premium-modal" style={ { maxWidth: 620 } } onClick={ ( e ) => e.stopPropagation() }>
						<div className="aime-premium-modal-header">
							<div>
								<h3>{ __( 'AI Suggest Automation Steps', 'ai-marketing-expert' ) }</h3>
								<p className="aime-muted">{ __( 'Describe what you want, or leave it empty and AI will suggest a useful automation from your current title and trigger.', 'ai-marketing-expert' ) }</p>
							</div>
							<button className="aime-premium-modal-close" onClick={ () => ! aiLoading && setAiModalOpen( false ) } disabled={ aiLoading }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<TextareaControl
								label={ __( 'Instruction', 'ai-marketing-expert' ) }
								value={ aiInstruction }
								onChange={ setAiInstruction }
								rows={ 5 }
								placeholder={ __( 'Example: Send a welcome email, wait 2 days, then send a follow-up and add the contact to my nurture list.', 'ai-marketing-expert' ) }
								__nextHasNoMarginBottom
							/>
							<p className="aime-muted" style={ { marginTop: 10 } }>
								{ __( 'Leave empty for a random automation idea. The selected trigger and title will still be used when possible.', 'ai-marketing-expert' ) }
							</p>
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-secondary" onClick={ () => setAiModalOpen( false ) } disabled={ aiLoading }>{ __( 'Cancel', 'ai-marketing-expert' ) }</button>
							{ aiLoading ? (
								<LoadingBtn>{ __( 'Generating...', 'ai-marketing-expert' ) }</LoadingBtn>
							) : (
								<button className="aime-btn-primary" onClick={ handleAiSuggest }>{ __( 'Generate Steps', 'ai-marketing-expert' ) }</button>
							) }
						</div>
					</div>
				</div>
			) }

			{ /* Node edit modal */ }
			{ editingNode && editingNode === 'trigger' && (
				<div className="aime-premium-modal-overlay" onClick={ () => setEditingNode( null ) }>
					<div className="aime-premium-modal" style={ { maxWidth: 520 } } onClick={ ( e ) => e.stopPropagation() }>
						<div className="aime-premium-modal-header">
							<div><h3>{ __( 'Edit Trigger', 'ai-marketing-expert' ) }</h3></div>
							<button className="aime-premium-modal-close" onClick={ () => setEditingNode( null ) }>&times;</button>
						</div>
						<div className="aime-premium-modal-body">
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'Trigger', 'ai-marketing-expert' ) }</label>
								<SelectControl value={ triggerKey } options={ triggerOptions } onChange={ setTriggerKey } __nextHasNoMarginBottom />
							</div>
							{ ( triggerKey === 'tag_added' || triggerKey === 'tag_removed' ) && (
								<SearchableSelect
									label={ __( 'Tag', 'ai-marketing-expert' ) }
									value={ triggerSettings.tag_id || '' }
									options={ triggerTagOptions }
									onChange={ ( v ) => setTriggerSettings( { ...triggerSettings, tag_id: v } ) }
									placeholder={ __( 'Any tag', 'ai-marketing-expert' ) }
								/>
							) }
							{ ( triggerKey === 'list_added' || triggerKey === 'list_removed' ) && (
								<SearchableSelect
									label={ __( 'List', 'ai-marketing-expert' ) }
									value={ triggerSettings.list_id || '' }
									options={ triggerListOptions }
									onChange={ ( v ) => setTriggerSettings( { ...triggerSettings, list_id: v } ) }
									placeholder={ __( 'Any list', 'ai-marketing-expert' ) }
								/>
							) }
							{ ( triggerKey === 'link_clicked' ) && (
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Link URL', 'ai-marketing-expert' ) }</label>
									<input className="aime-premium-input" type="url" value={ triggerSettings.url || '' } onChange={ ( e ) => setTriggerSettings( { ...triggerSettings, url: e.target.value } ) } placeholder="https://example.com/page" />
								</div>
							) }
						</div>
						<div className="aime-premium-modal-footer">
							<button className="aime-btn-primary" onClick={ () => setEditingNode( null ) }>{ __( 'Done', 'ai-marketing-expert' ) }</button>
						</div>
					</div>
				</div>
			) }

			{ editingNode && editingNode !== 'trigger' && getEditingIdx() >= 0 && ( () => {
				const idx = getEditingIdx();
				const s = sequences[ idx ];
				return (
					<div className="aime-premium-modal-overlay" onClick={ () => setEditingNode( null ) }>
						<div className="aime-premium-modal" style={ { maxWidth: 560 } } onClick={ ( e ) => e.stopPropagation() }>
							<div className="aime-premium-modal-header">
								<div><h3>{ __( 'Edit Step', 'ai-marketing-expert' ) }</h3></div>
								<button className="aime-premium-modal-close" onClick={ () => setEditingNode( null ) }>&times;</button>
							</div>
							<div className="aime-premium-modal-body">
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Title', 'ai-marketing-expert' ) }</label>
									<input className="aime-premium-input" value={ s.title || '' } onChange={ ( e ) => handleUpdateStep( idx, 'title', e.target.value ) } />
								</div>
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Action', 'ai-marketing-expert' ) }</label>
									<SelectControl value={ s.action_name } options={ actionOptions } onChange={ ( v ) => handleUpdateStep( idx, 'action_name', v ) } __nextHasNoMarginBottom />
								</div>
								<StepSettingsFields actionName={ s.action_name } settings={ s.settings || {} } onChange={ ( val ) => handleUpdateStep( idx, 'settings', val ) } campaigns={ campaigns } lists={ allLists } tags={ allTags } />
								<div className="aime-premium-form-row">
									<div className="aime-premium-form-group">
										<label className="aime-premium-form-label">{ __( 'Delay', 'ai-marketing-expert' ) }</label>
										<input className="aime-premium-input" type="number" value={ s.delay_value || 0 } onChange={ ( e ) => handleUpdateStep( idx, 'delay_value', parseInt( e.target.value ) || 0 ) } />
									</div>
									<div className="aime-premium-form-group">
										<label className="aime-premium-form-label">{ __( 'Unit', 'ai-marketing-expert' ) }</label>
										<select className="aime-premium-select" value={ s.delay_unit || 'minutes' } onChange={ ( e ) => handleUpdateStep( idx, 'delay_unit', e.target.value ) }>
											<option value="minutes">{ __( 'Minutes', 'ai-marketing-expert' ) }</option>
											<option value="hours">{ __( 'Hours', 'ai-marketing-expert' ) }</option>
											<option value="days">{ __( 'Days', 'ai-marketing-expert' ) }</option>
										</select>
									</div>
								</div>
							</div>
							<div className="aime-premium-modal-footer">
								<button className="aime-btn-primary" onClick={ () => setEditingNode( null ) }>{ __( 'Done', 'ai-marketing-expert' ) }</button>
							</div>
						</div>
					</div>
				);
			} )() }
		</div>
	);
};

export default AutomationEditor;
