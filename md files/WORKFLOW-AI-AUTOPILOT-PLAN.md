# AI Marketing Expert — Workflow & Cart Abandonment Autopilot Plan (v1.2.6)

> **Objective:** Transform the Workflow Automation and Email Marketing modules into a fully automated, AI-driven revenue engine for WordPress & WooCommerce.
>
> **Scope:**
> 1. **WooCommerce Abandoned Cart Recovery Engine** (Triggers in both Email Marketing & Workflow Automation).
> 2. **Text-to-Workflow AI Builder** ("Prompt-to-Flow" canvas generation via natural language).
> 3. **Expanded High-Impact Triggers** (WooCommerce New Order, User Registered, Inbound Webhooks).

---

## 1. WooCommerce Abandoned Cart Recovery Engine

### 1.1 Architecture & Tracking Mechanism
- **Cart Capture:**
  - **Logged-in Users:** Hook into `woocommerce_cart_updated` and `woocommerce_add_to_cart`. Automatically capture customer email, name, cart items (product ID, name, quantity, price, image, variant), and cart total into a dedicated table: `aime_abandoned_carts`.
  - **Guest Users:** Real-time capture on checkout page via AJAX as soon as the visitor enters their email address in the checkout billing field (`#billing_email`), before order submission.
- **Inactivity Detection (Cron):**
  - A background cron task runs every 15 minutes (`aime_check_abandoned_carts`).
  - If a cart has had no updates or checkout completed for >= 30 minutes (configurable: 15m, 30m, 60m) and `status = 'in_progress'`, mark `status = 'abandoned'`.
  - Fires the action hook: `do_action('aime_woo_cart_abandoned', $cart_data)`.
- **Order Recovery Listener:**
  - When an order completes (`woocommerce_order_status_completed` or `woocommerce_thankyou`), mark associated cart as `recovered` and record recovered revenue.
- **Cart Restore URL:**
  - Generate a secure, one-click cart restoration deep link: `{site}/cart/?aime_restore_cart={cart_hash}` that instantly repopulates the visitor's cart and applies any dynamic recovery coupons.

### 1.2 Multi-Module Integration
1. **Email Marketing Funnels:**
   - Dedicated Trigger: `cart_abandoned`.
   - Built-in multi-stage drip templates:
     - 1 hour: Friendly reminder with product thumbnails.
     - 24 hours: Urgency + dynamic 10% coupon code.
     - 48 hours: Final call before cart expires.
2. **Workflow Automation:**
   - Universal Event Trigger: `woo_cart_abandoned`.
   - Provides payload tokens: `{event.customer_name}`, `{event.customer_email}`, `{event.cart_total}`, `{event.product_names}`, `{event.recovery_url}`.
   - Allows intelligent decision branches:
     - High-value carts (> $100): Generate hyper-personalized AI recovery pitch + Telegram/Slack admin alert + VIP subscriber tag.
     - Standard carts: Standard automated email.

---

## 2. Text-to-Workflow AI Builder ("Prompt-to-Flow")

### 2.1 Concept & User Journey
Allow users to simply describe their automation goals in plain English or Bengali:
> *"Whenever a customer abandons a cart over $50, wait 1 hour, send a personalized AI recovery email with a 10% coupon, and if they don't buy in 24 hours, notify me on Telegram and tag as Lost Cart."*

The AI automatically analyzes the intent, maps it to available triggers and actions, and renders the complete node graph directly on the React Flow canvas.

### 2.2 Technical Implementation
1. **REST API Endpoint:**
   - `POST /wp-json/aime/v1/workflow-automation/ai-generate`
   - Request: `{ prompt: string, brand_voice_id?: number }`
   - Response: JSON with workflow name, trigger, and structured step array.
2. **System Prompt & JSON Schema:**
   - Injected with full documentation of all available triggers, actions, condition operators, and field schemas.
   - Enforced with `AiProvider` structured output mode (JSON Schema).
3. **Frontend Integration (`WorkflowBuilder.jsx`):**
   - Modal: **"Create with AI"** with sample starter prompts.
   - Takes returned steps, passes through `stepsToFlow(steps)` and `autoLayout(nodes, edges)`.
   - Instantly populates the canvas with animated edges and formatted nodes.
   - User reviews the visual diagram, tweaks any parameter if desired, and clicks **"Activate & Save"**.

---

## 3. High-Impact Triggers Expansion

1. **WooCommerce Triggers:**
   - `woo_cart_abandoned`: Inactivity on checkout/cart.
   - `woo_order_completed`: Post-purchase upsell, review requests, customer tagging.
   - `woo_order_refunded`: Customer retention and feedback loops.
   - `woo_low_stock`: Admin alerts or automatic ad pausing.
2. **User & Membership Triggers:**
   - `user_registered`: Welcome onboarding sequence.
3. **Inbound Webhook Trigger:**
   - Universal endpoint `/wp-json/aime/v1/webhook/{secret}` allowing Elementor forms, CF7, WPForms, Gravity Forms, and external SaaS tools to trigger workflows.

---

## 4. Execution Phases for v1.2.6

| Phase | Deliverables | Effort |
|---|---|---|
| **Phase 1** | Database schema for abandoned carts + checkout AJAX listener + 15m cron detection + `aime_woo_cart_abandoned` hook | Medium |
| **Phase 2** | Email Marketing Abandoned Cart trigger & default drip template | Small |
| **Phase 3** | Workflow Automation `woo_cart_abandoned`, `woo_order_completed`, and `user_registered` event triggers | Small |
| **Phase 4** | Backend endpoint `ai-generate` with structured JSON schema + `AiProvider` integration | Medium |
| **Phase 5** | Frontend `WorkflowBuilder.jsx` AI generator modal + one-click canvas populate & layout | Medium |
| **Phase 6** | End-to-end testing, abandoned cart simulation, and performance verification | Small |
