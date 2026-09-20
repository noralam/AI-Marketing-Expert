<?php
/**
 * Text-to-Workflow AI Generator Service.
 *
 * Translates natural language instructions into a fully-structured,
 * valid workflow definition with triggers, conditions, and actions
 * rendered on the visual canvas.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Services
 */

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Services;

use WPSpace\AiMarketingExpert\AiProvider;
use WPSpace\AiMarketingExpert\Plugin;
use WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Includes\ActionRegistry;
use WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Includes\TriggerRegistry;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AiWorkflowGenerator {

	/**
	 * Generate a complete workflow definition from natural language prompt.
	 *
	 * @param string $user_prompt User prompt in plain English or Bengali.
	 * @param int    $brand_voice_id Optional brand voice ID.
	 * @return array|\WP_Error Structured workflow definition or error.
	 */
	public static function generate( string $user_prompt, int $brand_voice_id = 0 ) {
		$user_prompt = trim( $user_prompt );
		if ( empty( $user_prompt ) ) {
			return new \WP_Error( 'empty_prompt', __( 'Please provide a description of the workflow you want to create.', 'ai-marketing-expert' ) );
		}

		// Gather all registered triggers for the AI architect.
		$available_triggers = array();
		foreach ( TriggerRegistry::all() as $key => $def ) {
			$available_triggers[ $key ] = array(
				'label'          => $def['label'] ?? $key,
				'description'    => $def['description'] ?? '',
				'hook'           => ! empty( $def['hook'] ),
				'payload_fields' => array_column( (array) ( $def['payload_fields'] ?? array() ), 'key' ),
			);
		}

		// Gather available actions.
		$available_actions = array();
		foreach ( ActionRegistry::all() as $key => $def ) {
			$avail = true;
			if ( is_callable( $def['available'] ?? null ) ) {
				$avail = (bool) call_user_func( $def['available'] );
			}
			if ( $avail ) {
				$field_keys = array();
				foreach ( (array) ( $def['fields'] ?? array() ) as $f ) {
					$field_keys[] = array(
						'key'      => $f['key'] ?? '',
						'label'    => $f['label'] ?? '',
						'type'     => $f['type'] ?? 'text',
						'required' => ! empty( $f['required'] ),
					);
				}
				$available_actions[ $key ] = array(
					'label'       => $def['label'] ?? $key,
					'description' => $def['description'] ?? '',
					'fields'      => $field_keys,
				);
			}
		}

		// Context hints (WooCommerce, Contact Form 7, active social platforms).
		$has_wc  = class_exists( 'WooCommerce' );
		$has_cf7 = class_exists( 'WPCF7_ContactForm' ) || defined( 'WPCF7_VERSION' );
		global $wpdb;
		$social_table = $wpdb->prefix . 'aime_social_accounts';
		$connected_social = array();
		if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $social_table ) ) === $social_table ) {
			$connected_social = (array) $wpdb->get_col( "SELECT DISTINCT platform FROM {$social_table} WHERE status = 'connected'" );
		}

		$system_prompt = "You are an expert Marketing Automation Architect for WordPress.
Your job is to translate the user's natural language goal into a strictly valid, JSON-structured automation workflow.

### ENVIRONMENT CONTEXT:
- E-Commerce (WooCommerce): AVAILABLE via 'woo_cart_abandoned' and 'woo_order_completed' triggers.
- Form Submissions: AVAILABLE via 'cf7_submission' and 'inbound_webhook' triggers.
- Social Media Publishing: AVAILABLE via 'publish_social_post' action (supports Facebook, LinkedIn, Instagram, Twitter, etc.).

### AVAILABLE TRIGGERS:
" . wp_json_encode( $available_triggers, JSON_PRETTY_PRINT ) . "

### AVAILABLE ACTIONS:
" . wp_json_encode( $available_actions, JSON_PRETTY_PRINT ) . "

### RULES & SCHEMA:
1. Decide whether the workflow is 'schedule' or 'event'.
   - If recurring or time-based (e.g. 'every Monday', 'daily', 'every week'):
     'trigger_type': 'schedule', 'schedule_type': 'weekly'|'daily'|'monthly'|'custom', 'schedule_time': '09:00', 'schedule_days': '1' (1=Mon, 2=Tue...)
   - If reacting to an event:
     'trigger_type': 'event', 'trigger_event': '<exact_trigger_key>'
     * When user mentions WooCommerce order / completed order / purchase / review request: ALWAYS use 'trigger_event': 'woo_order_completed'! NEVER use 'inbound_webhook'!
     * When user mentions abandoned cart / WooCommerce cart recovery: ALWAYS use 'trigger_event': 'woo_cart_abandoned'!
     * When user mentions Contact Form 7 / form submission: ALWAYS use 'trigger_event': 'cf7_submission'!
     * When user mentions external webhook or API: use 'trigger_event': 'inbound_webhook'!
2. Dynamic tokens: You can use dynamic placeholders in text/email/content configs:
   - {topic}
   - {event.customer_name} or {event.name}
   - {event.email} or {event.customer_email}
   - {event.cart_total}
   - {event.recovery_url} (for abandoned carts: 1-click restore full cart)
   - {event.single_qty_url} (for abandoned carts: 1-click single-quantity checkout)
   - {event.single_item_links} (for abandoned carts: HTML 1-click checkout links for each item)
   - {event.cart_type} ('single_item', 'duplicate_qty', or 'multiple_items')
   - {event.product_names}
   - {event.order_id}
   - {event.post_title}
   - {event.message} (for form submissions)
3. Special Actions & Config Defaults:
   - 'condition': Used to branch workflow into Yes/No paths. Config: { 'check': 'event_field_equals'|'event_field_contains'|'previous_step_succeeded'|'reference_compare', 'field': 'cart_type', 'value': 'duplicate_qty' }. Steps attached to this condition MUST set 'branch': 'yes' or 'branch': 'no'.
   - 'woo_cart_abandoned' Smart Recovery: When user mentions smart cart recovery or single-item / duplicate quantity / multiple items handling, use trigger 'woo_cart_abandoned'.
     * Available cart types: 'duplicate_qty' (accidental multiple quantity of 1 product), 'multiple_items' (multiple distinct products), and 'single_item' (1 product, quantity 1).
     * For 3-Way Smart Cart Branching:
       - step_1 (action_type: 'condition'): config { 'check': 'event_field_equals', 'field': 'cart_type', 'value': 'duplicate_qty' }
       - step_2 (action_type: 'send_email', parent_key: 'step_1', branch: 'yes'): send single-quantity checkout email with '{event.single_qty_url}' and '{event.recovery_url}'
       - step_3 (action_type: 'condition', parent_key: 'step_1', branch: 'no'): config { 'check': 'event_field_equals', 'field': 'cart_type', 'value': 'multiple_items' }
       - step_4 (action_type: 'send_email', parent_key: 'step_3', branch: 'yes'): send multiple-items email offering individual product links '{event.single_item_links}' and '{event.recovery_url}'
       - step_5 (action_type: 'send_email', parent_key: 'step_3', branch: 'no'): send single-item recovery email with '{event.recovery_url}'
   - 'publish_social_post': When the user asks for social media updates, posting to LinkedIn, Facebook, Instagram, Twitter, or social blast, ALWAYS use 'publish_social_post'! Config: { 'account_id': 0, 'topic': '', 'schedule': true }. NOTE: Leave 'topic' as empty string '' (blank) so it automatically inherits from the upstream AI Brain step or workflow! NEVER put '{ai_brain.topic}' into the topic field!
   - 'generate_blog_post': If an AI Brain step is present, leave 'topic' as empty string '' (it inherits automatically from AI Brain). NEVER put '{ai_brain.topic}' into the topic field!
   - 'run_seo_audit': Config: { 'wp_post_id': -1, 'keyword_focus': '' }. NOTE: 'wp_post_id' MUST be -1 (numeric, meaning previous step). NEVER use token strings like '{step_2.post_id}' or '{generate_blog_post.post_id}' for wp_post_id!
   - 'enroll_in_funnel': Config: { 'funnel_id': 0, 'create_if_missing': true, 'subscriber_email': '{event.email}' }. NOTE: 'funnel_id' MUST be 0. NEVER use strings like 'onboarding_funnel'.
   - 'delay': When user specifies a pause or wait between actions (e.g. 'wait 5 minutes', 'wait 2 hours'), create a 'delay' step with config: { 'delay_value': 5, 'delay_unit': 'minutes'|'hours'|'days'|'seconds' }.
   - 'send_email': Direct customer email dispatch. Config: { 'to': '{event.email}', 'subject': '...', 'body': '...' }.
   - 'send_notification': Internal admin email alert. Config: { 'subject': '...', 'body': '...' }.
4. The 'steps' array must be a valid tree graph:
   - 'step_key': unique string like 'step_1', 'step_2', 'step_3'
   - 'parent_key': '' for the first step connected to the trigger, or the 'step_key' of its parent step.
   - 'branch': 'default' (or 'yes'/'no' if the parent is a 'condition' action).
   - 'action_type': must match an exact key from AVAILABLE ACTIONS.
   - 'config': key-value pairs appropriate for that action's fields.
5. Keep the workflow concise and high-converting (typically 2 to 4 steps).
6. Graceful Fallback for Unsupported Tools:
   - Social media (Facebook, LinkedIn, Instagram, Twitter) IS SUPPORTED via 'publish_social_post'. Always use 'publish_social_post' for them.
   - WooCommerce order/cart events ARE SUPPORTED via 'woo_order_completed' and 'woo_cart_abandoned'. Always use them for WooCommerce requests.
   - If user requests truly external services NOT in AVAILABLE ACTIONS (e.g. Telegram, WhatsApp, SMS, Slack, Google Sheets, Zapier):
     * NEVER hallucinate fake action keys.
     * Intelligently adapt to the closest supported action: use 'send_notification' (for admin alerts) or 'send_email' (for user messaging).
     * In the workflow 'description', add a brief note: '(Adapted external tool to Email Alert)'.
7. Output MUST be ONLY valid JSON matching this schema:
{
  \"name\": \"Short descriptive workflow title\",
  \"description\": \"One-sentence explanation of what this automation accomplishes\",
  \"trigger_type\": \"schedule\" or \"event\",
  \"trigger_event\": \"trigger_key if event, otherwise empty string\",
  \"trigger_config\": {},
  \"schedule_type\": \"weekly\",
  \"schedule_time\": \"09:00\",
  \"schedule_days\": \"1\",
  \"topic\": \"Default topic if applicable\",
  \"steps\": [
    {
      \"step_key\": \"step_1\",
      \"parent_key\": \"\",
      \"branch\": \"default\",
      \"action_type\": \"exact_action_key\",
      \"config\": {}
    }
  ]
}";

		$messages_prompt = $system_prompt . "\n\n### USER REQUEST:\n" . $user_prompt . "\n\nRespond ONLY with the raw JSON object.";

		$response = AiProvider::generate( $messages_prompt, 'text', 2500, array( 'json_mode' => true ) );

		if ( is_wp_error( $response ) ) {
			$fallback = self::match_fallback_recipe( $user_prompt, $brand_voice_id );
			if ( $fallback ) {
				return $fallback;
			}
			return $response;
		}

		$raw_content = trim( (string) ( $response['content'] ?? '' ) );
		if ( empty( $raw_content ) ) {
			$fallback = self::match_fallback_recipe( $user_prompt, $brand_voice_id );
			if ( $fallback ) {
				return $fallback;
			}
			return new \WP_Error( 'ai_empty_response', __( 'AI did not return any workflow content. Please try again with more details.', 'ai-marketing-expert' ) );
		}

		// Strip markdown fences if AI included them.
		if ( 0 === strpos( $raw_content, '```' ) ) {
			$raw_content = preg_replace( '/^```(?:json)?\s*/i', '', $raw_content );
			$raw_content = preg_replace( '/\s*```$/', '', $raw_content );
			$raw_content = trim( (string) $raw_content );
		}

		$data = json_decode( $raw_content, true );
		if ( ! is_array( $data ) || empty( $data['steps'] ) ) {
			$fallback = self::match_fallback_recipe( $user_prompt, $brand_voice_id );
			if ( $fallback ) {
				return $fallback;
			}
			return new \WP_Error( 'invalid_json', __( 'Failed to parse AI-generated workflow. Please rephrase your request.', 'ai-marketing-expert' ) );
		}

		// Sanitize & enforce valid tree structure.
		$sanitized_steps = array();
		$valid_keys      = array();

		foreach ( (array) $data['steps'] as $idx => $step ) {
			if ( ! is_array( $step ) || empty( $step['action_type'] ) ) {
				continue;
			}

			$action_type = sanitize_key( (string) $step['action_type'] );
			if ( ! ActionRegistry::get( $action_type ) ) {
				continue;
			}

			$step_key = sanitize_key( (string) ( $step['step_key'] ?? ( 'step_' . ( $idx + 1 ) ) ) );
			$parent   = sanitize_key( (string) ( $step['parent_key'] ?? '' ) );

			// Ensure valid parent key.
			if ( ! empty( $parent ) && ! in_array( $parent, $valid_keys, true ) ) {
				$parent = ! empty( $valid_keys ) ? end( $valid_keys ) : '';
			}

			$valid_keys[] = $step_key;

			$config = is_array( $step['config'] ?? null ) ? $step['config'] : array();

			// Normalize specific action configs to ensure clean UI state.
			if ( 'run_seo_audit' === $action_type ) {
				// Must be -1 for previous step; AI often outputs tokens like '{step_2.post_id}'
				if ( ! isset( $config['wp_post_id'] ) || ! is_numeric( $config['wp_post_id'] ) || 0 === (int) $config['wp_post_id'] ) {
					$config['wp_post_id'] = -1;
				} else {
					$config['wp_post_id'] = (int) $config['wp_post_id'];
				}
			} elseif ( 'enroll_in_funnel' === $action_type ) {
				// funnel_id must be integer (0 = unselected)
				$config['funnel_id'] = isset( $config['funnel_id'] ) && is_numeric( $config['funnel_id'] ) ? absint( $config['funnel_id'] ) : 0;
			} elseif ( 'publish_social_post' === $action_type ) {
				// account_id must be integer (0 = unselected)
				$config['account_id'] = isset( $config['account_id'] ) && is_numeric( $config['account_id'] ) ? absint( $config['account_id'] ) : 0;
			}

			// Clean any literal dynamic tokens from topic field so it properly inherits from AI Brain or workflow topic.
			if ( isset( $config['topic'] ) ) {
				$t = trim( (string) $config['topic'] );
				if ( '{ai_brain.topic}' === $t || '{topic}' === $t || '{step_1.topic}' === $t || false !== stripos( $t, 'ai_brain' ) ) {
					$config['topic'] = '';
				}
			}

			$sanitized_steps[] = array(
				'step_key'       => $step_key,
				'parent_key'     => $parent,
				'branch'         => in_array( $step['branch'] ?? '', array( 'yes', 'no' ), true ) ? $step['branch'] : 'default',
				'action_type'    => $action_type,
				'config'         => $config,
				'position_x'     => 0,
				'position_y'     => 0,
				'run_condition'  => 'always',
			);
		}

		if ( empty( $sanitized_steps ) ) {
			return new \WP_Error( 'no_valid_steps', __( 'AI could not find matching actions for your request. Please try with different instructions.', 'ai-marketing-expert' ) );
		}

		$trigger_type  = in_array( $data['trigger_type'] ?? '', array( 'schedule', 'event' ), true ) ? $data['trigger_type'] : 'schedule';
		$trigger_event = sanitize_key( (string) ( $data['trigger_event'] ?? '' ) );

		// Failsafe normalization for trigger_event based on user prompt.
		if ( ( empty( $trigger_event ) || 'inbound_webhook' === $trigger_event ) && ( false !== stripos( $user_prompt, 'order' ) || false !== stripos( $user_prompt, 'purchase' ) ) ) {
			$trigger_event = 'woo_order_completed';
			$trigger_type  = 'event';
		} elseif ( ( empty( $trigger_event ) || 'inbound_webhook' === $trigger_event ) && false !== stripos( $user_prompt, 'cart' ) ) {
			$trigger_event = 'woo_cart_abandoned';
			$trigger_type  = 'event';
		} elseif ( ( empty( $trigger_event ) || 'inbound_webhook' === $trigger_event ) && ( false !== stripos( $user_prompt, 'contact form' ) || false !== stripos( $user_prompt, 'cf7' ) || false !== stripos( $user_prompt, 'form submission' ) ) ) {
			$trigger_event = 'cf7_submission';
			$trigger_type  = 'event';
		}

		$workflow_topic = sanitize_text_field( (string) ( $data['topic'] ?? '' ) );
		if ( false !== stripos( $workflow_topic, 'ai_brain' ) || '{topic}' === $workflow_topic ) {
			$workflow_topic = '';
		}

		return array(
			'name'           => sanitize_text_field( (string) ( $data['name'] ?? __( 'AI Autopilot Workflow', 'ai-marketing-expert' ) ) ),
			'description'    => sanitize_textarea_field( (string) ( $data['description'] ?? '' ) ),
			'trigger_type'   => $trigger_type,
			'trigger_event'  => $trigger_event,
			'trigger_config' => is_array( $data['trigger_config'] ?? null ) ? $data['trigger_config'] : array(),
			'schedule_type'  => sanitize_key( (string) ( $data['schedule_type'] ?? 'weekly' ) ),
			'schedule_time'  => sanitize_text_field( (string) ( $data['schedule_time'] ?? '09:00' ) ),
			'schedule_days'  => sanitize_text_field( (string) ( $data['schedule_days'] ?? '1' ) ),
			'topic'          => $workflow_topic,
			'brand_voice_id' => absint( $brand_voice_id ),
			'steps'          => $sanitized_steps,
		);
	}

	/**
	 * Matches fallback recipe for popular built-in prompts if AI provider is unavailable.
	 *
	 * @param string $user_prompt    User prompt.
	 * @param int    $brand_voice_id Brand voice ID.
	 * @return array|null
	 */
	public static function match_fallback_recipe( string $user_prompt, int $brand_voice_id = 0 ): ?array {
		$lower = strtolower( $user_prompt );

		// 1. Advanced 3-Way Smart Cart Recovery
		if ( ( false !== strpos( $lower, '3-way' ) || false !== strpos( $lower, 'multiple_items' ) || false !== strpos( $lower, 'multiple items' ) || false !== strpos( $lower, 'মাল্টিপল' ) || false !== strpos( $lower, 'তিনটা' ) ) && ( false !== strpos( $lower, 'cart' ) || false !== strpos( $lower, 'কার্ট' ) ) ) {
			return array(
				'name'           => __( 'WooCommerce Advanced Smart Cart Recovery (3-Way)', 'ai-marketing-expert' ),
				'description'    => __( 'Advanced 3-way abandoned cart recovery branching on duplicate quantities, multiple products, and single items.', 'ai-marketing-expert' ),
				'trigger_type'   => 'event',
				'trigger_event'  => 'woo_cart_abandoned',
				'trigger_config' => array(),
				'schedule_type'  => 'weekly',
				'schedule_time'  => '09:00',
				'schedule_days'  => '1',
				'topic'          => '',
				'brand_voice_id' => $brand_voice_id,
				'steps'          => array(
					array(
						'step_key'      => 'step_1',
						'parent_key'    => '',
						'branch'        => 'default',
						'action_type'   => 'condition',
						'config'        => array(
							'check' => 'event_field_equals',
							'field' => 'cart_type',
							'value' => 'duplicate_qty',
						),
						'position_x'    => 0,
						'position_y'    => 0,
						'run_condition' => 'always',
					),
					array(
						'step_key'      => 'step_2',
						'parent_key'    => 'step_1',
						'branch'        => 'yes',
						'action_type'   => 'send_email',
						'config'        => array(
							'to'      => '{event.email}',
							'subject' => __( 'Did you mean to add just 1 item, {event.customer_name}?', 'ai-marketing-expert' ),
							'body'    => __( "Hi {event.customer_name},\n\nWe noticed you left {event.product_names} in your cart with multiple quantities (Total: {event.cart_total} {event.currency}).\n\nIf you only wanted a SINGLE item, no need to manually remove extras — simply click below to check out directly with 1 item:\n👉 Buy 1 Item (1-Click): {event.single_qty_url}\n\nOr if you would like to restore your entire cart:\n👉 Restore Full Cart: {event.recovery_url}\n\nWarm regards,\n{workflow_name}", 'ai-marketing-expert' ),
						),
						'position_x'    => 0,
						'position_y'    => 0,
						'run_condition' => 'always',
					),
					array(
						'step_key'      => 'step_3',
						'parent_key'    => 'step_1',
						'branch'        => 'no',
						'action_type'   => 'condition',
						'config'        => array(
							'check' => 'event_field_equals',
							'field' => 'cart_type',
							'value' => 'multiple_items',
						),
						'position_x'    => 0,
						'position_y'    => 0,
						'run_condition' => 'always',
					),
					array(
						'step_key'      => 'step_4',
						'parent_key'    => 'step_3',
						'branch'        => 'yes',
						'action_type'   => 'send_email',
						'config'        => array(
							'to'      => '{event.email}',
							'subject' => __( 'Can\'t decide on all items in your cart, {event.customer_name}?', 'ai-marketing-expert' ),
							'body'    => __( "Hi {event.customer_name},\n\nWe saved the items you left in your cart ({event.product_names}) for a total of {event.cart_total} {event.currency}.\n\nIf the total was a bit high or you prefer to purchase just one of your favorite items, you can buy that specific product directly in 1-click:\n{event.single_item_links}\n\nOr if you want to complete your entire order:\n👉 Restore Entire Cart: {event.recovery_url}\n\nWarm regards,\n{workflow_name}", 'ai-marketing-expert' ),
						),
						'position_x'    => 0,
						'position_y'    => 0,
						'run_condition' => 'always',
					),
					array(
						'step_key'      => 'step_5',
						'parent_key'    => 'step_3',
						'branch'        => 'no',
						'action_type'   => 'send_email',
						'config'        => array(
							'to'      => '{event.email}',
							'subject' => __( 'Your cart is waiting for you, {event.customer_name}!', 'ai-marketing-expert' ),
							'body'    => __( "Hi {event.customer_name},\n\nWe noticed you didn't finish ordering your {event.product_names} (Total: {event.cart_total} {event.currency}).\n\nYour item is still reserved, but popular stock can run out quickly! Click below to restore your cart and complete your checkout in 1-click:\n👉 Complete My Order Now: {event.recovery_url}\n\nWarm regards,\n{workflow_name}", 'ai-marketing-expert' ),
						),
						'position_x'    => 0,
						'position_y'    => 0,
						'run_condition' => 'always',
					),
				),
			);
		}

		// 2. Simple Smart Cart Recovery (Duplicate Qty)
		if ( ( false !== strpos( $lower, 'smart cart' ) || false !== strpos( $lower, 'duplicate_qty' ) || false !== strpos( $lower, 'duplicate' ) || false !== strpos( $lower, 'ডুপ্লিকেট' ) ) && ( false !== strpos( $lower, 'cart' ) || false !== strpos( $lower, 'কার্ট' ) ) ) {
			return array(
				'name'           => __( 'WooCommerce Smart Cart Recovery', 'ai-marketing-expert' ),
				'description'    => __( 'Smart abandoned cart recovery with automatic branching for duplicate quantities and single items.', 'ai-marketing-expert' ),
				'trigger_type'   => 'event',
				'trigger_event'  => 'woo_cart_abandoned',
				'trigger_config' => array(),
				'schedule_type'  => 'weekly',
				'schedule_time'  => '09:00',
				'schedule_days'  => '1',
				'topic'          => '',
				'brand_voice_id' => $brand_voice_id,
				'steps'          => array(
					array(
						'step_key'      => 'step_1',
						'parent_key'    => '',
						'branch'        => 'default',
						'action_type'   => 'condition',
						'config'        => array(
							'check' => 'event_field_equals',
							'field' => 'cart_type',
							'value' => 'duplicate_qty',
						),
						'position_x'    => 0,
						'position_y'    => 0,
						'run_condition' => 'always',
					),
					array(
						'step_key'      => 'step_2',
						'parent_key'    => 'step_1',
						'branch'        => 'yes',
						'action_type'   => 'send_email',
						'config'        => array(
							'to'      => '{event.email}',
							'subject' => __( 'Did you mean to add just 1 item, {event.customer_name}?', 'ai-marketing-expert' ),
							'body'    => __( "Hi {event.customer_name},\n\nWe noticed you left {event.product_names} in your cart with multiple quantities (Total: {event.cart_total} {event.currency}).\n\nIf you only wanted a SINGLE item, no need to manually remove extras — simply click below to check out directly with 1 item:\n👉 Buy 1 Item (1-Click): {event.single_qty_url}\n\nOr if you would like to restore your entire cart:\n👉 Restore Full Cart: {event.recovery_url}\n\nWarm regards,\n{workflow_name}", 'ai-marketing-expert' ),
						),
						'position_x'    => 0,
						'position_y'    => 0,
						'run_condition' => 'always',
					),
					array(
						'step_key'      => 'step_3',
						'parent_key'    => 'step_1',
						'branch'        => 'no',
						'action_type'   => 'send_email',
						'config'        => array(
							'to'      => '{event.email}',
							'subject' => __( 'Did you leave something behind, {event.customer_name}?', 'ai-marketing-expert' ),
							'body'    => __( "Hi {event.customer_name},\n\nWe noticed you left some great items in your cart ({event.product_names}) for a total of {event.cart_total} {event.currency}.\n\nDon't worry, we saved everything for you!\n\n👉 Restore Full Cart: {event.recovery_url}\n\nPrefer to purchase just one of the items? Click below to check out with that specific item in 1-click:\n{event.single_item_links}\n\nWarm regards,\n{workflow_name}", 'ai-marketing-expert' ),
						),
						'position_x'    => 0,
						'position_y'    => 0,
						'run_condition' => 'always',
					),
				),
			);
		}

		// 3. Basic Abandoned Cart Recovery
		if ( false !== strpos( $lower, 'cart' ) || false !== strpos( $lower, 'কার্ট' ) ) {
			return array(
				'name'           => __( 'WooCommerce Cart Recovery', 'ai-marketing-expert' ),
				'description'    => __( 'Automated abandoned cart recovery email with 1-click restore link.', 'ai-marketing-expert' ),
				'trigger_type'   => 'event',
				'trigger_event'  => 'woo_cart_abandoned',
				'trigger_config' => array(),
				'schedule_type'  => 'weekly',
				'schedule_time'  => '09:00',
				'schedule_days'  => '1',
				'topic'          => '',
				'brand_voice_id' => $brand_voice_id,
				'steps'          => array(
					array(
						'step_key'      => 'step_1',
						'parent_key'    => '',
						'branch'        => 'default',
						'action_type'   => 'send_email',
						'config'        => array(
							'to'      => '{event.email}',
							'subject' => __( 'Did you leave something behind, {event.customer_name}?', 'ai-marketing-expert' ),
							'body'    => __( "Hi {event.customer_name},\n\nWe noticed you left {event.product_names} in your cart (Total: {event.cart_total} {event.currency}).\n\nClick below to complete your checkout with 1-click:\n👉 Restore My Cart: {event.recovery_url}\n\nWarm regards,\n{workflow_name}", 'ai-marketing-expert' ),
						),
						'position_x'    => 0,
						'position_y'    => 0,
						'run_condition' => 'always',
					),
					array(
						'step_key'      => 'step_2',
						'parent_key'    => 'step_1',
						'branch'        => 'default',
						'action_type'   => 'send_notification',
						'config'        => array(
							'subject' => __( 'Abandoned Cart Alert: {event.customer_name}', 'ai-marketing-expert' ),
							'body'    => __( "Customer {event.customer_name} abandoned a cart with {event.product_names} ({event.cart_total} {event.currency}). Recovery email was dispatched.", 'ai-marketing-expert' ),
						),
						'position_x'    => 0,
						'position_y'    => 0,
						'run_condition' => 'always',
					),
				),
			);
		}

		return null;
	}
}