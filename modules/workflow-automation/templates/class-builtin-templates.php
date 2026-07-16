<?php
/**
 * Built-in workflow templates — starter blueprints for the template picker.
 *
 * Registered on the `aime_workflow_templates` filter by the module bootstrap.
 * Step keys are placeholders; the REST apply handler re-keys them with UUIDs.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Templates
 */

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Templates;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BuiltinTemplates {

	public static function register( array $templates ): array {

		/* ── Free ─────────────────────────────────────────── */

		$templates['weekly_blog_engine'] = array(
			'name'             => __( 'Weekly Blog Engine', 'ai-marketing-expert' ),
			'description'      => __( 'Every week, AI writes a fresh blog draft on your topic and runs an SEO audit on it.', 'ai-marketing-expert' ),
			'icon'             => 'edit',
			'is_pro'           => false,
			'requires_modules' => array( 'content-generator', 'seo' ),
			'workflow'         => array(
				'name'          => __( 'Weekly Blog Engine', 'ai-marketing-expert' ),
				'description'   => __( 'AI blog draft + SEO audit, once a week.', 'ai-marketing-expert' ),
				'trigger_type'  => 'schedule',
				'schedule_type' => 'weekly',
				'schedule_time' => '09:00',
				'schedule_days' => '1',
				'topic'         => '',
			),
			'steps'            => array(
				array( 'key' => 'blog', 'parent_key' => '', 'branch' => 'default', 'action_type' => 'generate_blog_post', 'config' => array( 'word_count' => 1200 ) ),
				array( 'key' => 'audit', 'parent_key' => 'blog', 'branch' => 'default', 'action_type' => 'run_seo_audit', 'config' => array( 'wp_post_id' => 0 ) ),
			),
		);

		$templates['welcome_new_subscriber'] = array(
			'name'             => __( 'Welcome New Subscriber', 'ai-marketing-expert' ),
			'description'      => __( 'When someone subscribes, automatically enroll them into your welcome funnel.', 'ai-marketing-expert' ),
			'icon'             => 'users',
			'is_pro'           => false,
			'requires_modules' => array( 'email-marketing' ),
			'workflow'         => array(
				'name'          => __( 'Welcome New Subscriber', 'ai-marketing-expert' ),
				'description'   => __( 'Enroll every new subscriber into a funnel.', 'ai-marketing-expert' ),
				'trigger_type'  => 'event',
				'trigger_event' => 'subscriber_created',
			),
			'steps'            => array(
				array( 'key' => 'enroll', 'parent_key' => '', 'branch' => 'default', 'action_type' => 'enroll_in_funnel', 'config' => array( 'funnel_id' => 0, 'subscriber_email' => '' ) ),
			),
		);

		/* ── Pro ──────────────────────────────────────────── */

		$templates['publish_promote'] = array(
			'name'             => __( 'Publish + Promote', 'ai-marketing-expert' ),
			'description'      => __( 'When a post is published, AI drafts a social post and an email campaign promoting it.', 'ai-marketing-expert' ),
			'icon'             => 'share',
			'is_pro'           => true,
			'requires_modules' => array( 'social-media', 'email-marketing' ),
			'workflow'         => array(
				'name'          => __( 'Publish + Promote', 'ai-marketing-expert' ),
				'description'   => __( 'Promote every published post on social + email.', 'ai-marketing-expert' ),
				'trigger_type'  => 'event',
				'trigger_event' => 'post_published',
			),
			'steps'            => array(
				array( 'key' => 'social', 'parent_key' => '', 'branch' => 'default', 'action_type' => 'publish_social_post', 'config' => array( 'schedule' => true ) ),
				array( 'key' => 'campaign', 'parent_key' => '', 'branch' => 'default', 'action_type' => 'send_email_campaign', 'config' => array() ),
			),
		);

		$templates['seo_gatekeeper'] = array(
			'name'             => __( 'SEO Gatekeeper', 'ai-marketing-expert' ),
			'description'      => __( 'AI writes a draft and audits it. If the audit passes it gets promoted on social; if not, you get an email.', 'ai-marketing-expert' ),
			'icon'             => 'shield',
			'is_pro'           => true,
			'requires_modules' => array( 'content-generator', 'seo', 'social-media' ),
			'workflow'         => array(
				'name'          => __( 'SEO Gatekeeper', 'ai-marketing-expert' ),
				'description'   => __( 'Blog draft → audit → branch: promote or notify.', 'ai-marketing-expert' ),
				'trigger_type'  => 'schedule',
				'schedule_type' => 'weekly',
				'schedule_time' => '08:00',
				'schedule_days' => '2',
				'topic'         => '',
			),
			'steps'            => array(
				array( 'key' => 'blog', 'parent_key' => '', 'branch' => 'default', 'action_type' => 'generate_blog_post', 'config' => array( 'word_count' => 1200 ) ),
				array( 'key' => 'audit', 'parent_key' => 'blog', 'branch' => 'default', 'action_type' => 'run_seo_audit', 'config' => array( 'wp_post_id' => 0 ) ),
				array( 'key' => 'gate', 'parent_key' => 'audit', 'branch' => 'default', 'action_type' => 'condition', 'config' => array( 'check' => 'previous_step_succeeded' ) ),
				array( 'key' => 'promote', 'parent_key' => 'gate', 'branch' => 'yes', 'action_type' => 'publish_social_post', 'config' => array( 'schedule' => true ) ),
				array( 'key' => 'alert', 'parent_key' => 'gate', 'branch' => 'no', 'action_type' => 'send_notification', 'config' => array(
					'subject' => __( 'SEO audit failed for {workflow_name}', 'ai-marketing-expert' ),
					'body'    => __( "The SEO audit did not pass for the latest draft.\n\nLast output: {previous_preview}", 'ai-marketing-expert' ),
				) ),
			),
		);

		$templates['chatbot_lead_nurture'] = array(
			'name'             => __( 'Chatbot Lead Nurture', 'ai-marketing-expert' ),
			'description'      => __( 'When the chatbot captures a lead, enroll them into a nurture funnel and notify your team.', 'ai-marketing-expert' ),
			'icon'             => 'message-circle',
			'is_pro'           => true,
			'requires_modules' => array( 'chatbot', 'email-marketing' ),
			'workflow'         => array(
				'name'          => __( 'Chatbot Lead Nurture', 'ai-marketing-expert' ),
				'description'   => __( 'Funnel-enroll and announce every chatbot lead.', 'ai-marketing-expert' ),
				'trigger_type'  => 'event',
				'trigger_event' => 'chatbot_lead',
			),
			'steps'            => array(
				array( 'key' => 'enroll', 'parent_key' => '', 'branch' => 'default', 'action_type' => 'enroll_in_funnel', 'config' => array( 'funnel_id' => 0, 'subscriber_email' => '' ) ),
				array( 'key' => 'notify', 'parent_key' => '', 'branch' => 'default', 'action_type' => 'send_notification', 'config' => array(
					'subject' => __( 'New chatbot lead: {event.email}', 'ai-marketing-expert' ),
					'body'    => __( "The chatbot captured a new lead.\n\nEmail: {event.email}\nName: {event.first_name}\nSource: {event.source}", 'ai-marketing-expert' ),
				) ),
			),
		);

		$templates['monthly_content_batch'] = array(
			'name'             => __( 'Monthly Content Batch', 'ai-marketing-expert' ),
			'description'      => __( 'Once a month, AI produces a blog draft, ad-copy variations, and a draft email campaign in one run.', 'ai-marketing-expert' ),
			'icon'             => 'layers',
			'is_pro'           => true,
			'requires_modules' => array( 'content-generator', 'email-marketing' ),
			'workflow'         => array(
				'name'                  => __( 'Monthly Content Batch', 'ai-marketing-expert' ),
				'description'           => __( 'Blog + ad copy + campaign draft, monthly.', 'ai-marketing-expert' ),
				'trigger_type'          => 'schedule',
				'schedule_type'         => 'monthly',
				'schedule_time'         => '07:00',
				'schedule_day_of_month' => 1,
				'topic'                 => '',
			),
			'steps'            => array(
				array( 'key' => 'blog', 'parent_key' => '', 'branch' => 'default', 'action_type' => 'generate_blog_post', 'config' => array( 'word_count' => 1500 ) ),
				array( 'key' => 'adcopy', 'parent_key' => 'blog', 'branch' => 'default', 'action_type' => 'generate_ad_copy', 'config' => array( 'variations' => 3 ) ),
				array( 'key' => 'campaign', 'parent_key' => 'adcopy', 'branch' => 'default', 'action_type' => 'send_email_campaign', 'config' => array() ),
			),
		);

		return $templates;
	}
}
