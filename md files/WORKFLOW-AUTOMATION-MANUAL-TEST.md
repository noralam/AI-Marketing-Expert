# Workflow Automation - Manual Test Plan

**Test Date:** _____________  
**Tester:** _____________  
**Plugin Version:** 1.1.2  
**Environment:** □ Local  □ Staging  □ Production

---

## Pre-Test Setup

### Required Modules
- [ ] Content Generator module active
- [ ] Email Marketing module active
- [ ] Social Media module active
- [ ] Chatbot module active
- [ ] SEO module active

### Test Data Preparation
- [ ] At least one email funnel created
- [ ] At least one social media account connected
- [ ] Test email address available
- [ ] Test WordPress post ready (draft status)

---

## Test Workflow 1: Schedule Trigger → Generate Blog Post

**Trigger:** Schedule (Weekly)  
**Actions:** Generate Blog Post  
**Expected Result:** Blog post created as draft on schedule

### Setup Steps
1. Navigate to **Workflows** → **Workflow Automation**
2. Click **Create Workflow**
3. **Name:** "Weekly Blog Auto-Generator"
4. **Description:** "Automatically generates blog posts every week"

### Trigger Configuration
- **Trigger Type:** Schedule
- **Schedule Type:** Weekly
- **Day:** Monday
- **Time:** 09:00
- **Topic:** "Latest trends in digital marketing"
- **Tone:** Professional

### Action Configuration
**Action 1: Generate Blog Post**
- **Topic:** _(leave blank to use workflow topic)_
- **Keywords:** "marketing, automation, AI"
- **Word Count:** 1000
- **Language:** English
- **Category:** Uncategorized (or select test category)
- **Author:** Workflow creator
- **AI-generated tags:** ☑ Enabled
- **Featured image:** Stock photo
- **Publish immediately:** ☐ Disabled (draft only)

### Manual Test Execution
1. [ ] Save workflow as **Active**
2. [ ] Verify `next_run_at` field set in database
3. [ ] Click **Run Now** button
4. [ ] Wait for execution to complete

### Verification
- [ ] Workflow execution status shows **Success**
- [ ] New post created in WordPress → Posts → All Posts
- [ ] Post status is **Draft**
- [ ] Post has generated content (1000± words)
- [ ] Post has AI-generated tags
- [ ] Post has featured image (if stock API configured)
- [ ] Post topic matches workflow topic
- [ ] Workflow history shows execution record

### Test Results
- **Status:** □ Pass  □ Fail  □ Partial
- **Execution Time:** _______ seconds
- **Generated Post ID:** #_______
- **Notes:** _________________________________________________

---

## Test Workflow 2: Post Published Trigger → Run SEO Audit + Send Notification

**Trigger:** Post Published  
**Actions:** Run SEO Audit → Send Notification  
**Expected Result:** SEO audit runs when post published, notification sent

### Setup Steps
1. Navigate to **Workflows** → **Workflow Automation**
2. Click **Create Workflow**
3. **Name:** "Auto SEO Audit on Publish"
4. **Description:** "Audit every published post for SEO"

### Trigger Configuration
- **Trigger Type:** Post Published
- **Post Type:** Post (or "Any post type")

### Action Configuration
**Action 1: Run SEO Audit**
- **Post:** Latest published post
- **URL:** _(leave blank)_
- **Focus keyword:** "digital marketing"

**Action 2: Send Notification**
- **To:** _(leave blank for admin email)_
- **Subject:** "SEO Audit Complete: {topic}"
- **Body:** "Post {topic} published. SEO audit completed. Preview: {previous_preview}"

### Manual Test Execution
1. [ ] Save workflow as **Active**
2. [ ] Open test WordPress post (draft status)
3. [ ] Click **Publish** button on post
4. [ ] Wait 30-60 seconds for workflow execution

### Verification
- [ ] Workflow triggered automatically (check Workflow History)
- [ ] Execution status shows **Success**
- [ ] SEO audit result recorded (check SEO module)
- [ ] Notification email received at admin email
- [ ] Email subject contains post title/topic
- [ ] Email body contains audit preview
- [ ] No duplicate workflow executions (debounce working)

### Test Results
- **Status:** □ Pass  □ Fail  □ Partial
- **Trigger Latency:** _______ seconds
- **Execution Time:** _______ seconds
- **Published Post ID:** #_______
- **Notes:** _________________________________________________

---

## Test Workflow 3: New Subscriber Trigger → Enroll in Funnel

**Trigger:** New Subscriber  
**Actions:** Enroll in Funnel  
**Expected Result:** New subscriber auto-enrolled in email funnel

### Setup Steps
1. Navigate to **Workflows** → **Workflow Automation**
2. Click **Create Workflow**
3. **Name:** "Welcome Funnel Auto-Enrollment"
4. **Description:** "Enroll new subscribers into welcome sequence"

### Trigger Configuration
- **Trigger Type:** New Subscriber
- _(No additional config fields)_

### Action Configuration
**Action 1: Enroll in Funnel**
- **Funnel:** Select test funnel (e.g., "Welcome Series")
- **Subscriber email:** _(leave blank to use trigger event email)_

### Manual Test Execution
1. [ ] Save workflow as **Active**
2. [ ] Navigate to **Email Marketing** → **Subscribers**
3. [ ] Click **Add Subscriber**
4. [ ] Add test subscriber:
   - Email: `test-subscriber@example.com`
   - First Name: Test
   - Last Name: User
5. [ ] Click **Save**
6. [ ] Wait 30-60 seconds

### Verification
- [ ] Workflow triggered automatically (check Workflow History)
- [ ] Execution status shows **Success**
- [ ] Navigate to selected funnel
- [ ] Test subscriber appears in funnel enrollment list
- [ ] Subscriber status is **Active**
- [ ] Event payload captured email correctly

### Alternative Test (Programmatic Trigger)
```php
// Add to functions.php or execute via WP-CLI
do_action( 'aime_subscriber_created', 123, array(
    'email' => 'test@example.com',
    'first_name' => 'Test',
    'last_name' => 'User'
) );
```

### Test Results
- **Status:** □ Pass  □ Fail  □ Partial
- **Trigger Latency:** _______ seconds
- **Execution Time:** _______ seconds
- **Subscriber Email:** _______________________
- **Notes:** _________________________________________________

---

## Test Workflow 4: Chatbot Lead Trigger → Create Email Campaign + Publish Social Post

**Trigger:** Chatbot Lead Captured  
**Actions:** Create Email Campaign → Publish Social Post  
**Expected Result:** When chatbot captures lead, campaign created and social post scheduled

### Setup Steps
1. Navigate to **Workflows** → **Workflow Automation**
2. Click **Create Workflow**
3. **Name:** "Lead Nurture Automation"
4. **Description:** "Auto-respond to chatbot leads with email + social"

### Trigger Configuration
- **Trigger Type:** Chatbot Lead Captured
- _(No additional config fields)_

### Action Configuration
**Action 1: Create Email Campaign (Draft)**
- **Email topic:** "Welcome to our community"
- **Internal campaign title:** "Chatbot Lead Welcome - {event.email}"

**Action 2: Publish Social Post**
- **Account:** Select connected account (e.g., Twitter/X)
- **Topic:** "New member alert: growing our community!"
- **Schedule:** ☑ Enabled

### Manual Test Execution (Programmatic)
Since chatbot lead capture is event-driven, trigger manually:

```php
// Add to functions.php or execute via WP-CLI
do_action( 'aime_chatbot_lead_captured', array(
    'email' => 'chatbot-lead@example.com',
    'first_name' => 'John',
    'source' => 'chatbot',
    'metadata' => array( 'page' => 'pricing', 'interest' => 'pro-plan' )
) );
```

### Manual Test Steps
1. [ ] Save workflow as **Active**
2. [ ] Execute programmatic trigger (above code)
3. [ ] Wait 30-60 seconds
4. [ ] Check workflow execution history

### Verification
- [ ] Workflow triggered automatically
- [ ] Execution shows **2 actions succeeded**
- [ ] Navigate to **Email Marketing** → **Campaigns**
- [ ] New draft campaign created
- [ ] Campaign title contains lead email
- [ ] Navigate to **Social Media** → **Queue**
- [ ] Social post scheduled
- [ ] Post content references community/welcome
- [ ] Event payload tokens resolved correctly

### Test Results
- **Status:** □ Pass  □ Fail  □ Partial
- **Trigger Latency:** _______ seconds
- **Execution Time:** _______ seconds
- **Lead Email:** _______________________
- **Notes:** _________________________________________________

---

## Test Workflow 5: Schedule Trigger → Generate Ad Copy (Product Rotation)

**Trigger:** Schedule (Daily - Pro Feature Test)  
**Actions:** Generate Ad Copy with product rotation  
**Expected Result:** Different product selected on each run

### Setup Steps
1. Navigate to **Workflows** → **Workflow Automation**
2. Click **Create Workflow**
3. **Name:** "Daily Ad Copy Generator"
4. **Description:** "Rotate through products for ad copy generation"

### Trigger Configuration
- **Trigger Type:** Schedule
- **Schedule Type:** Daily (requires Pro)
- **Time:** 10:00

### Action Configuration
**Action 1: Generate Ad Copy**
- **Product:** _(leave blank)_
- **Product rotation:** (Pro feature)
  - Product A
  - Product B
  - Product C
- **Number of variations:** 3

### Manual Test Execution
1. [ ] Save workflow as **Active**
2. [ ] Click **Run Now** (1st time)
3. [ ] Check output - should use Product A
4. [ ] Click **Run Now** (2nd time)
5. [ ] Check output - should use Product B
6. [ ] Click **Run Now** (3rd time)
7. [ ] Check output - should use Product C
8. [ ] Click **Run Now** (4th time)
9. [ ] Check output - should cycle back to Product A

### Verification
- [ ] Rotation state persists between runs
- [ ] No product repeats until all used
- [ ] Generated ad copy reflects correct product
- [ ] Free plan blocks product rotation (if testing free)
- [ ] Pro plan allows product rotation

### Test Results
- **Status:** □ Pass  □ Fail  □ Partial
- **Rotation Sequence:** ___________________________
- **Notes:** _________________________________________________

---

## Test Workflow 6: Complex Multi-Action Chain

**Trigger:** Schedule (Weekly)  
**Actions:** Generate Blog Post → Run SEO Audit → Publish Social Post → Send Notification  
**Expected Result:** All 4 actions execute in sequence, each using previous output

### Setup Steps
1. Navigate to **Workflows** → **Workflow Automation**
2. Click **Create Workflow**
3. **Name:** "Complete Content Pipeline"
4. **Description:** "Generate, audit, promote, and notify"

### Trigger Configuration
- **Trigger Type:** Schedule
- **Schedule Type:** Weekly
- **Day:** Wednesday
- **Time:** 08:00
- **Topic:** "AI-powered marketing strategies"

### Action Configuration
**Action 1: Generate Blog Post**
- **Topic:** _(use workflow topic)_
- **Word Count:** 1500
- **Publish immediately:** ☑ Enabled (so it can be audited)

**Action 2: Run SEO Audit**
- **Post:** Latest published post
- **Focus keyword:** "AI marketing"

**Action 3: Publish Social Post**
- **Account:** Select connected account
- **Topic:** "New blog post: {topic}"
- **Schedule:** ☑ Enabled

**Action 4: Send Notification**
- **To:** _(admin email)_
- **Subject:** "Content Pipeline Complete"
- **Body:** "Published: {topic}. SEO Score: {previous_preview}. Social post scheduled."

### Manual Test Execution
1. [ ] Save workflow as **Active**
2. [ ] Click **Run Now**
3. [ ] Monitor execution progress (may take 2-5 minutes)
4. [ ] Check each step completion

### Verification
- [ ] All 4 actions completed successfully
- [ ] Blog post published (not draft)
- [ ] SEO audit recorded with score
- [ ] Social post scheduled
- [ ] Notification email received
- [ ] Email contains outputs from previous steps
- [ ] No action skipped or failed
- [ ] Total execution time < 5 minutes

### Test Results
- **Status:** □ Pass  □ Fail  □ Partial
- **Total Execution Time:** _______ seconds
- **Post ID:** #_______
- **SEO Score:** _______
- **Notes:** _________________________________________________

---

## Edge Case Testing

### Test 7: Workflow Failure Handling
**Scenario:** Action fails mid-execution

1. [ ] Create workflow with invalid config (e.g., missing required field)
2. [ ] Run workflow
3. [ ] Verify execution status shows **Failed**
4. [ ] Verify error message logged
5. [ ] Verify subsequent actions skipped (if failure_policy = "stop")

**Result:** □ Pass  □ Fail

### Test 8: Monthly Run Limit (Free Plan)
**Scenario:** Exceed 30 runs per month on free plan

1. [ ] Query database: `SELECT COUNT(*) FROM wp_aime_workflow_executions WHERE started_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`
2. [ ] If count < 30, trigger workflows until limit reached
3. [ ] Attempt to trigger 31st workflow
4. [ ] Verify execution skipped with limit message

**Result:** □ Pass  □ Fail

### Test 9: Duplicate Event Debouncing
**Scenario:** Same event fires twice within 60 seconds

1. [ ] Create post_published workflow
2. [ ] Publish a post
3. [ ] Immediately update and re-save post (without status change)
4. [ ] Verify only ONE workflow execution created
5. [ ] Check for debounce transient in database

**Result:** □ Pass  □ Fail

### Test 10: Inactive Module Handling
**Scenario:** Action targets inactive module

1. [ ] Create workflow with Email Marketing action
2. [ ] Deactivate Email Marketing module
3. [ ] Run workflow
4. [ ] Verify action skipped with "module inactive" message

**Result:** □ Pass  □ Fail

---

## Database Verification

### Workflow Tables Populated
```sql
-- Check workflows table
SELECT id, name, status, trigger_type, next_run_at FROM wp_aime_workflows;

-- Check steps table
SELECT workflow_id, step_key, action_type, step_order FROM wp_aime_workflow_steps ORDER BY workflow_id, step_order;

-- Check executions table
SELECT id, workflow_id, status, steps_total, steps_succeeded, started_at FROM wp_aime_workflow_executions ORDER BY started_at DESC LIMIT 10;

-- Check outputs table
SELECT execution_id, action_type, status, LEFT(preview, 50) as preview_snippet FROM wp_aime_workflow_outputs ORDER BY created_at DESC LIMIT 10;
```

- [ ] All tables exist
- [ ] Sample records inserted
- [ ] Foreign keys intact
- [ ] Indexes functioning

---

## Performance Testing

### Test 11: Concurrent Workflow Execution
1. [ ] Create 3 active schedule-triggered workflows
2. [ ] Set all to trigger within same 5-minute window
3. [ ] Verify all execute (cron dispatcher handles queue)
4. [ ] No deadlocks or race conditions

**Result:** □ Pass  □ Fail

### Test 12: Large Workflow (10+ Steps)
1. [ ] Create workflow with 10 sequential actions
2. [ ] Run workflow
3. [ ] Measure total execution time
4. [ ] Verify no timeouts
5. [ ] All steps complete

**Expected:** < 10 minutes total  
**Actual:** _______ seconds  
**Result:** □ Pass  □ Fail

---

## Summary

### Total Tests: 12
- **Passed:** _______
- **Failed:** _______
- **Partial:** _______
- **Blocked:** _______

### Critical Issues Found
1. _____________________________________________________________
2. _____________________________________________________________
3. _____________________________________________________________

### Non-Critical Issues Found
1. _____________________________________________________________
2. _____________________________________________________________

### Recommendations
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

### Sign-Off
**Tester Signature:** ____________________  **Date:** __________  
**Reviewer Signature:** __________________  **Date:** __________
