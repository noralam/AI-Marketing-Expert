/**
 * AiWorkflowModal — Natural Language Text-to-Workflow Generator.
 *
 * Allows users to generate a complete visual automation workflow by
 * describing their goal in natural language (English or Bengali), or
 * by clicking one of the pre-made high-converting recipes.
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Modal, Button, TextareaControl, SelectControl } from '../../common/WpComponents';
import { apiPost } from '../../../utils/api';
import { toast } from '../../common/Toast';
import LoadingBtn from '../../common/LoadingBtn';

const POPULAR_USE_CASES = [
	{
		id: 'cart_recovery',
		icon: '🛒',
		title: __( 'Abandoned Cart Recovery', 'ai-marketing-expert' ),
		badge: __( 'E-Commerce', 'ai-marketing-expert' ),
		prompt: __( 'When a customer abandons their WooCommerce cart, send a personalized AI recovery email with their product details and restore link {event.recovery_url}, then send an email notification to the store manager.', 'ai-marketing-expert' ),
	},
	{
		id: 'smart_cart_recovery',
		icon: '🎯',
		title: __( 'Smart Cart Recovery (Single Item / Duplicate Qty)', 'ai-marketing-expert' ),
		badge: __( 'High Conversion', 'ai-marketing-expert' ),
		prompt: __( 'When a customer abandons their WooCommerce cart, branch on whether they added duplicate quantities. If cart_type equals duplicate_qty, send a 1-click single-quantity checkout email with {event.single_qty_url}. Otherwise, send a recovery email offering 1-click single-item links {event.single_item_links} or full restore {event.recovery_url}.', 'ai-marketing-expert' ),
	},
	{
		id: 'advanced_smart_cart_recovery',
		icon: '⚡',
		title: __( 'Advanced Smart Cart Recovery (3-Way Branching)', 'ai-marketing-expert' ),
		badge: __( 'Max ROI', 'ai-marketing-expert' ),
		prompt: __( 'When a customer abandons their WooCommerce cart, branch on cart contents with 3-way smart recovery: 1) If cart_type equals duplicate_qty, send a 1-click single-quantity checkout email with {event.single_qty_url}; 2) If cart_type equals multiple_items, send an email offering individual item 1-click checkout links with {event.single_item_links}; 3) Otherwise for single items, send a standard recovery email with {event.recovery_url}.', 'ai-marketing-expert' ),
	},
	{
		id: 'weekly_blog',
		icon: '✍️',
		title: __( 'Weekly Auto-Blogger & Social Blast', 'ai-marketing-expert' ),
		badge: __( 'Content & SEO', 'ai-marketing-expert' ),
		prompt: __( 'Every Tuesday at 9 AM, use AI Brain to select a fresh marketing topic, generate a 1500-word SEO blog post, run an SEO audit, and schedule a post on LinkedIn and Facebook.', 'ai-marketing-expert' ),
	},
	{
		id: 'new_user',
		icon: '👤',
		title: __( 'New User Onboarding Drip', 'ai-marketing-expert' ),
		badge: __( 'Community & Growth', 'ai-marketing-expert' ),
		prompt: __( 'When a new user registers on WordPress, wait 5 minutes, send a warm welcome email introducing our top features, and enroll them in the onboarding funnel.', 'ai-marketing-expert' ),
	},
	{
		id: 'order_upsell',
		icon: '🎉',
		title: __( 'Order Completed Review Request', 'ai-marketing-expert' ),
		badge: __( 'Retention', 'ai-marketing-expert' ),
		prompt: __( 'When a WooCommerce order is completed, wait 2 hours, then send a personalized thank you email asking for a product review and offering an exclusive discount on their next purchase.', 'ai-marketing-expert' ),
	},
	{
		id: 'webhook_lead',
		icon: '🌐',
		title: __( 'Inbound Webhook Lead Capture', 'ai-marketing-expert' ),
		badge: __( 'Integrations', 'ai-marketing-expert' ),
		prompt: __( 'When an inbound webhook is received from an external form, enroll the lead into our email marketing funnel and send an email notification to the team.', 'ai-marketing-expert' ),
	},
	{
		id: 'lead_followup',
		icon: '📩',
		title: __( 'Contact Form / Lead AI Follow-up', 'ai-marketing-expert' ),
		badge: __( 'Lead Capture', 'ai-marketing-expert' ),
		prompt: __( 'When a contact form is submitted, wait 5 minutes, send a warm personalized greeting email to the sender, and notify the sales team via email.', 'ai-marketing-expert' ),
	},
	{
		id: 'post_social_blast',
		icon: '📢',
		title: __( 'New Post Auto-Social Blast', 'ai-marketing-expert' ),
		badge: __( 'Distribution', 'ai-marketing-expert' ),
		prompt: __( 'When a new WordPress post is published, wait 10 minutes, generate an SEO-optimized summary, and publish promotional posts on Facebook and LinkedIn.', 'ai-marketing-expert' ),
	},
	{
		id: 'monthly_retention',
		icon: '🎯',
		title: __( 'Monthly AI Re-engagement', 'ai-marketing-expert' ),
		badge: __( 'Retention', 'ai-marketing-expert' ),
		prompt: __( 'On the 1st day of every month at 10 AM, use AI Brain to analyze top marketing ideas, create a re-engagement email campaign, and draft a blog post.', 'ai-marketing-expert' ),
	},
];

const AiWorkflowModal = ( {
	open,
	onClose,
	onGenerate,
	brandVoices = [],
} ) => {
	const [ prompt, setPrompt ] = useState( '' );
	const [ brandVoiceId, setBrandVoiceId ] = useState( 0 );
	const [ loading, setLoading ] = useState( false );

	if ( ! open ) {
		return null;
	}

	const handleGenerate = async () => {
		const cleanPrompt = prompt.trim();
		if ( ! cleanPrompt ) {
			toast( __( 'Please describe the workflow you want to generate.', 'ai-marketing-expert' ), 'warning' );
			return;
		}

		setLoading( true );
		try {
			const res = await apiPost( '/workflow-automation/ai-generate', {
				prompt: cleanPrompt,
				brand_voice_id: brandVoiceId,
			} );

			if ( res?.workflow ) {
				onGenerate( res.workflow );
				onClose();
			} else {
				throw new Error( res?.message || __( 'Failed to generate workflow.', 'ai-marketing-expert' ) );
			}
		} catch ( e ) {
			toast( e?.message || __( 'AI generation failed. Please try rephrasing your prompt.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setLoading( false );
		}
	};

	const applyRecipe = ( recipePrompt ) => {
		setPrompt( recipePrompt );
	};

	return (
		<Modal
			title={ __( '✨ Text-to-Workflow AI Builder (Autopilot)', 'ai-marketing-expert' ) }
			onRequestClose={ loading ? undefined : onClose }
			className="aime-ai-wf-modal"
			overlayClassName="aime-modal-overlay"
		>
			<div className="aime-ai-wf-modal__body">
				<p className="aime-ai-wf-modal__subtitle">
					{ __(
						'Describe your automation goal in plain words (English or Bengali). AI will automatically select the best triggers, actions, and generate the full visual node graph on your canvas.',
						'ai-marketing-expert'
					) }
				</p>

				<div className="aime-ai-wf-modal__section">
					<label className="aime-ai-wf-modal__label">
						{ __( 'Popular Use Cases (Click to load):', 'ai-marketing-expert' ) }
					</label>
					<div className="aime-ai-wf-recipes">
						{ POPULAR_USE_CASES.map( ( item ) => (
							<button
								key={ item.id }
								type="button"
								className={ `aime-ai-wf-recipe-chip ${ prompt === item.prompt ? 'is-selected' : '' }` }
								onClick={ () => applyRecipe( item.prompt ) }
								disabled={ loading }
							>
								<span className="aime-ai-wf-recipe-chip__icon">{ item.icon }</span>
								<span className="aime-ai-wf-recipe-chip__text">{ item.title }</span>
								<span className="aime-ai-wf-recipe-chip__badge">{ item.badge }</span>
							</button>
						) ) }
					</div>
				</div>

				<div className="aime-ai-wf-modal__section" style={ { marginTop: 14 } }>
					<label className="aime-ai-wf-modal__label">
						{ __( 'Describe Your Automation:', 'ai-marketing-expert' ) }
					</label>
					<TextareaControl
						value={ prompt }
						onChange={ setPrompt }
						rows={ 4 }
						placeholder={ __(
							'e.g. When a contact form is submitted, wait 5 minutes, send a personalized welcome email, and notify the team...',
							'ai-marketing-expert'
						) }
						disabled={ loading }
						className="aime-ai-wf-modal__textarea"
					/>

					<div className="aime-ai-wf-guide">
						<div className="aime-ai-wf-guide__row">
							<span className="aime-ai-wf-guide__tag">💡 { __( 'Prompt Formula', 'ai-marketing-expert' ) }</span>
							<code className="aime-ai-wf-guide__formula">
								{ __( '[When this happens...] ➔ [Wait/Delay (optional)] ➔ [Do this action]', 'ai-marketing-expert' ) }
							</code>
						</div>
						<div className="aime-ai-wf-guide__grid">
							<div className="aime-ai-wf-guide__item">
								<span className="aime-ai-wf-guide__item-title">{ __( 'Supported Triggers:', 'ai-marketing-expert' ) }</span>
								<span className="aime-ai-wf-guide__item-desc">
									{ __( 'Schedules, Abandoned Carts, Orders, Signups, Comments, Forms & Webhooks.', 'ai-marketing-expert' ) }
								</span>
							</div>
							<div className="aime-ai-wf-guide__item">
								<span className="aime-ai-wf-guide__item-title">{ __( 'Supported Actions:', 'ai-marketing-expert' ) }</span>
								<span className="aime-ai-wf-guide__item-desc">
									{ __( 'AI Brain, SEO Articles, Social Posts, Funnels, Direct Email, Wait/Delay, Alerts.', 'ai-marketing-expert' ) }
								</span>
							</div>
						</div>
						<div className="aime-ai-wf-guide__hint">
							ℹ️ { __( 'Tip: External services (e.g. Telegram, WhatsApp, SMS) will automatically adapt into Admin Email Notifications.', 'ai-marketing-expert' ) }
						</div>
					</div>
				</div>

				{ brandVoices.length > 0 && (
					<div className="aime-ai-wf-modal__section" style={ { marginTop: 10 } }>
						<SelectControl
							label={ __( 'Brand Voice (Optional)', 'ai-marketing-expert' ) }
							value={ brandVoiceId }
							options={ [
								{ value: 0, label: __( 'Default Brand Voice', 'ai-marketing-expert' ) },
								...brandVoices.map( ( bv ) => ( {
									value: bv.id,
									label: bv.name,
								} ) ),
							] }
							onChange={ ( val ) => setBrandVoiceId( Number( val ) ) }
							disabled={ loading }
						/>
					</div>
				) }

				{ loading && (
					<div className="aime-ai-wf-modal__status">
						<div className="aime-ai-wf-modal__spinner" />
						<span>
							{ __( 'AI is architecting your workflow triggers, actions, and connections…', 'ai-marketing-expert' ) }
						</span>
					</div>
				) }

				<div className="aime-ai-wf-modal__footer" style={ { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 } }>
					<Button variant="tertiary" onClick={ onClose } disabled={ loading }>
						{ __( 'Cancel', 'ai-marketing-expert' ) }
					</Button>
					{ loading ? (
						<LoadingBtn primary>
							{ __( 'Generating Workflow…', 'ai-marketing-expert' ) }
						</LoadingBtn>
					) : (
						<Button variant="primary" onClick={ handleGenerate } disabled={ ! prompt.trim() }>
							{ __( '✨ Generate Workflow', 'ai-marketing-expert' ) }
						</Button>
					)}
				</div>
			</div>
		</Modal>
	);
};

export default AiWorkflowModal;