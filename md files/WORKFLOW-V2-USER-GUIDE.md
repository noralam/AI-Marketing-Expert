# Workflow Automation v2 - User Guide

## What's New?

Workflow automation just got **smarter** and **more flexible**. Here's what changed and how to use it.

---

## 1. AI Brain - Now Accepts Full Instructions

### Before (v1)
```
Features / topic list:
AI Content Generator
Workflow Automation
Email Marketing
SEO Audit Tool
Chatbot Builder
```

You could only list topics. AI picked one, but didn't understand YOUR strategy.

### After (v2)
```
Strategy prompt:

Check this URL for details: https://yoursite.com/features

Write daily posts about my WordPress plugin "AI Marketing Expert".
The plugin has 6 modules with many features.

Every day write about a different feature.

Always include:
- Free download link: free.com
- Pro upgrade link: pro.com

Focus on this plugin (can mention competitors but stay focused).
Use different keywords each day for Google ranking.
Pick the best relevant keywords for each post.
```

**Now you can:**
- ✅ Give complete instructions
- ✅ Add multiple context URLs (up to 5)
- ✅ Tell AI your goals and requirements
- ✅ Control cache duration (1-30 days)

---

## 2. Smart SEO Keyword Detection

### The Problem

You set up a daily blog workflow:
- Day 1: AI writes about "Email Campaigns"
- Day 2: AI writes about "Chatbot Builder"
- Day 3: AI writes about "SEO Audit"

But your SEO Audit step had a **fixed keyword** → always scored 1/100 ❌

### The Solution

**SEO Audit now automatically detects the right keyword:**

1. If you set a keyword → uses that
2. Else inherits from AI Brain's selected topic
3. Else reads Yoast SEO focus keyword
4. Else reads RankMath focus keyword
5. Else extracts from post title

**Result:** SEO scores match your actual content ✅

**Compatible with:**
- Yoast SEO
- RankMath
- Standalone (no SEO plugin needed)

---

## 3. WooCommerce Product Rotation

### New Feature for E-commerce

**Before:** Manual product list only
```
Product rotation: T-Shirt, Hoodie, Cap
```

**After:** Select from your WooCommerce products
```
WooCommerce products:
☑ Premium T-Shirt (#123)
☑ Designer Hoodie (#124)
☑ Baseball Cap (#125)
```

**Each workflow run picks a different product**

Perfect for:
- Daily product showcase posts
- Rotating ad campaigns
- Email product spotlights

**Requires:** WooCommerce installed + Pro license

---

## How to Upgrade Existing Workflows

### Option 1: Automatic (Do Nothing)

Your old workflows continue working unchanged. No action needed.

### Option 2: Manual Update

1. Edit workflow
2. Open AI Brain step
3. Your old feature list is still there
4. Rewrite it as a full strategy prompt
5. Add context URLs (optional)
6. Save

**Example conversion:**

**Old format:**
```
Features:
Email Campaigns
Chatbot
SEO Tools
```

**New format:**
```
Strategy prompt:

Write daily posts about these features:
- Email Campaigns
- Chatbot
- SEO Tools

Pick a different one each day.
Use simple language for small business owners.
Always include a "Try it free" call-to-action.
```

---

## Real-World Examples

### Example 1: Plugin Marketing

```
Strategy prompt:

Context URLs:
https://wordpress.org/plugins/my-plugin/
https://mysite.com/features

Write weekly blog posts about my WordPress plugin features.

Target audience: WordPress site owners with no coding experience.

Every post should:
- Focus on ONE feature
- Include real-world use case
- Add free download link: wordpress.org/plugins/my-plugin
- Add pro upgrade link: mysite.com/pricing
- Use beginner-friendly language

Pick different features each week.
Avoid topics covered in last 60 days.
Use high-volume keywords for WordPress plugin directory ranking.
```

### Example 2: E-commerce Store

```
Strategy prompt:

Context URLs:
https://mystore.com/shop

Write daily product showcase posts.

Each post should:
- Highlight product benefits (not just features)
- Include 2-3 customer pain points it solves
- Add product photo
- Write compelling call-to-action
- Use emotional language

Rotate through all products.
Avoid repeating same product within 30 days.
Focus on benefits over specifications.
```

### Example 3: SaaS Company

```
Strategy prompt:

Context URLs:
https://myapp.com/features
https://myapp.com/use-cases

Write daily content for software company blog.

Content types to rotate:
- Feature tutorials
- Customer success stories
- Industry tips
- Product updates
- Comparison posts

Each post should:
- Include real screenshots
- Add "Start free trial" CTA
- Target keyword from our list
- Be 800-1200 words
- Include internal links

Avoid repeating same topic type within 7 days.
Use professional but friendly tone.
```

---

## FAQ

### Do I need to update my workflows?

**No.** Old workflows continue working. Update when convenient.

### Can I still use the simple feature list?

**Yes.** Just write your features as a list in the strategy prompt:

```
Strategy prompt:

Pick one topic daily:
- Email Marketing
- SEO Tools
- Chatbot
- Analytics
```

### How many context URLs can I add?

**Up to 5 URLs.** Add them one per line:

```
Context URLs:
https://site.com/page1
https://site.com/page2
https://site.com/page3
```

### How long are URLs cached?

**7 days by default.** You can change it:
- 1 day (frequently updated content)
- 7 days (recommended)
- 14 days (stable content)
- 30 days (rarely changes)

### Does WooCommerce product rotation work without Pro?

**No.** Product rotation requires Pro license. Free users can:
- Use manual product field (one product per workflow)
- Use AI Brain to pick products
- Use manual product list (no rotation)

### Will SEO audit work without Yoast or RankMath?

**Yes.** Smart detection works standalone. It extracts keywords from:
- AI Brain output
- Post title
- Post meta (if SEO plugin exists)

### Can I use multiple languages?

**Yes.** Write your strategy prompt in any language:

```
Strategy prompt:

Écrivez des articles quotidiens sur nos produits.
Chaque article doit inclure:
- Description détaillée
- Prix et lien d'achat
- Photos du produit

Utilisez un ton professionnel.
```

AI responds in the same language.

---

## Best Practices

### 1. Be Specific in Strategy Prompts

**Bad:**
```
Write posts about our products.
```

**Good:**
```
Write daily posts about our eco-friendly products.
Target: environmentally conscious consumers age 25-45.
Always mention: organic materials, carbon-neutral shipping.
Tone: inspiring and educational.
Include: product link and 10% off coupon code.
```

### 2. Use Context URLs Wisely

**Good URLs:**
- Product pages with full descriptions
- Feature documentation
- About page with brand story
- Pricing page with plans

**Bad URLs:**
- Login pages (no public content)
- Dynamic pages (cart, checkout)
- Large PDFs (will be truncated)
- Paginated content (only first page loads)

### 3. Set Appropriate Lookback Days

**Daily workflows:** 30 days  
**Weekly workflows:** 60 days  
**Monthly workflows:** 90 days  

**Why:** More frequency = longer lookback to avoid repeats.

### 4. Test Before Going Live

1. Create workflow
2. Set schedule to "Manual" (not automatic)
3. Click "Run Now" to test
4. Check execution history
5. Verify output quality
6. Then enable automatic schedule

### 5. Monitor First Week

Check execution history daily for first week:
- Are topics diverse?
- Are keywords relevant?
- Is tone consistent?
- Are CTAs included?

Adjust strategy prompt if needed.

---

## Troubleshooting

### "No strategy prompt provided"

**Cause:** AI Brain field is empty  
**Fix:** Add your instructions in the Strategy prompt field

### "Same topic keeps repeating"

**Cause 1:** Lookback days too short  
**Fix:** Increase from 30 to 60 days

**Cause 2:** Not enough topics in rotation  
**Fix:** Add more variety to strategy prompt

### "SEO score is still low"

**Cause:** Content doesn't match detected keyword  
**Fix:** Check execution history to see what keyword was used. Adjust strategy prompt to focus on that keyword.

### "WooCommerce products not showing"

**Cause:** WooCommerce not active  
**Fix:** Install and activate WooCommerce

### "Workflow keeps failing"

**Cause 1:** Context URL is broken  
**Fix:** Remove URL or fix the link

**Cause 2:** AI provider not configured  
**Fix:** Settings → AI Provider → Add API key

**Cause 3:** Too many workflows running  
**Fix:** Stagger schedules (don't run all at same time)

---

## Getting Help

**Plugin Documentation:** Settings → Help  
**Support Forum:** [Plugin support page]  
**Premium Support:** Pro license holders get priority email support  

---

## What's Next?

Coming in future versions:
- Keyword Vault (save/reuse keyword groups)
- A/B testing (run workflow variants)
- Performance analytics (track which topics perform best)
- Multi-language briefs
- External triggers (Zapier, webhooks)

---

**Ready to upgrade?** Edit your workflows and try the new strategy prompt mode! 🚀
