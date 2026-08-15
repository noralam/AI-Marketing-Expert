# AI Chatbot Tutorial Script – AI Marketing Expert Plugin

**Duration:** ~5 minutes  
**Target Audience:** WordPress site owners (beginner to intermediate)  
**Purpose:** Screen recording tutorial demonstrating the AI Chatbot module configuration and usage

---

## AI Chatbot Feature Summary

### Core Features
- **AI-powered conversational chatbot** with context-aware responses
- **Live chat widget** appears on frontend (bottom-right or bottom-left)
- **Knowledge Base system** – index WordPress pages/posts, WooCommerce products, or manual Q&A pairs
- **Lead capture forms** – collect visitor name/email during conversations
- **Conversation management** – view chat history, messages, and visitor details in admin
- **Multiple chatbot instances** (Pro: unlimited; Free: 1 bot)

### Configuration
- **Bot settings:** name, welcome message, status (active/inactive)
- **AI behavior:** response tone (friendly/professional/neutral), response length, conversation style
- **Theme customization:** 3 built-in themes (Default/Modern/Minimal), widget position, colors (Pro)
- **Page Rules:** show/hide chatbot on specific pages (Pro)
- **Lead capture triggers:** at start, after X messages, or AI-detected intent (Pro)

### Customization
- **Appearance:** widget themes, position (bottom-right/left), custom colors (Pro)
- **Welcome message:** first message visitors see when opening the chat
- **System prompt:** customize AI personality and instructions (Pro)
- **Knowledge configuration:** max conversation history, response style

### Visitor Experience
- **Chat widget bubble** on website frontend
- **Click to open** full chat window
- **Type messages** and receive AI responses
- **Lead form appears** based on configured trigger
- **Mobile-responsive** chat interface

### Admin/Conversation Management
- **Conversations list** with filters (status, bot, lead/anonymous)
- **View full conversation** with all messages
- **Conversation details:** visitor name, email, IP, page URL, timestamps
- **Human takeover** capability (Pro)
- **Analytics dashboard** with conversation stats

### Advanced Features (Pro)
- Unlimited chatbots and conversations
- Custom CSS theming
- WooCommerce product indexing
- Document/URL indexing
- Business hours & offline messages
- Satisfaction ratings
- Public discussions page via shortcode `[aime_discussions]`

---

## Tutorial Structure (Timeline)

| Section | Time | Focus |
|---------|------|-------|
| **Introduction** | 0:00–0:25 | What the AI Chatbot does |
| **Enable & Configure Bot** | 0:25–1:30 | Create/activate chatbot, set welcome message |
| **Knowledge Base Setup** | 1:30–2:30 | Index WordPress content for AI context |
| **Lead Capture Configuration** | 2:30–3:15 | Enable lead forms, configure trigger |
| **Appearance Customization** | 3:15–3:50 | Choose theme and position |
| **Frontend Demo** | 3:50–4:30 | Show visitor experience on website |
| **View Conversation in Admin** | 4:30–4:55 | Review captured conversation and lead |
| **Closing** | 4:55–5:00 | Next steps |

---

## Complete 5-Minute Video Script

---

### [00:00–00:25] — Introduction

**Voiceover:**

"The AI Chatbot module in AI Marketing Expert lets you add an intelligent, AI-powered chat assistant to your WordPress website. It can answer visitor questions using content from your site, capture leads automatically, and help you engage with visitors 24/7. In this tutorial, I'll show you how to set up and customize your first chatbot in under five minutes."

**Screen Action:**

- Show WordPress dashboard home screen
- Hover over "AI Marketing" in the left sidebar
- Click on "Chatbot" submenu item
- The Chatbot Analytics page loads, showing the chatbot dashboard

**Estimated Duration:** 25 seconds

---

### [00:25–1:30] — Create and Configure Your First Bot

**Voiceover:**

"First, let's create a chatbot. Click on 'Chatbots' in the sidebar, then click 'Add New Bot'. Give your bot a name—I'll call mine 'Support Assistant'. The welcome message is the first thing visitors see when they open the chat. I'll set mine to: 'Hi! I'm here to help you with any questions about our products and services.' Make sure the status is set to 'Active' so the chatbot appears on your website. Now, let's configure how the AI responds. Under the General tab, you can set the response tone—I'll choose 'Friendly' for a conversational feel. Response length controls how detailed the answers are—'Short' works well for quick interactions. Click 'Save Bot' to continue."

**Screen Action:**

1. Navigate to **Chatbot → Chatbots** (BotList view)
2. Click **"Add New Bot"** button
3. BotEditor opens on the General tab
4. Fill in **Name field:** "Support Assistant"
5. Fill in **Welcome Message field:** "Hi! I'm here to help you with any questions about our products and services."
6. Show **Status toggle** is set to "Active"
7. Scroll down to show **Response Tone dropdown** → select "Friendly"
8. Show **Response Length dropdown** → select "Short"
9. Show **Response Style dropdown** → "Confident" (default)
10. Click **"Save Bot"** button at the bottom
11. Success notice appears: "Bot created successfully"

**Estimated Duration:** 65 seconds

---

### [1:30–2:30] — Set Up the Knowledge Base

**Voiceover:**

"Next, let's give your chatbot some knowledge. Click on 'Knowledge Base' in the sidebar. This is where you teach the AI about your website content. The easiest way is to index your WordPress pages and posts. Select your bot from the dropdown, then click 'Index WordPress Content'. Choose whether to index posts, pages, or both—I'll select 'All'. Click 'Start Indexing'. The plugin will now scan your published content and make it available to the chatbot. This takes a few moments depending on how much content you have. Once indexing completes, you'll see the number of pages and posts that were successfully indexed. Your chatbot can now answer questions based on this content."

**Screen Action:**

1. Click **"Knowledge Base"** in the sidebar
2. KnowledgeBase view opens
3. Show **bot dropdown filter** → select "Support Assistant"
4. Click **"Index Content"** or **"Bulk Index"** button
5. A modal/panel appears with indexing options
6. Show **Content Type dropdown** → select "WordPress Content"
7. Show **Post Type dropdown** → select "All" (or "Posts & Pages")
8. Click **"Start Indexing"** button
9. Show loading spinner/progress indicator
10. Indexing completes → show success message: "Indexed 12 pages, 8 posts"
11. Knowledge Base table now shows indexed entries (type: WP Content)

**Estimated Duration:** 60 seconds

---

### [2:30–3:15] — Configure Lead Capture

**Voiceover:**

"Now let's set up lead capture to collect visitor information. Go back to your bot by clicking 'Chatbots', then click 'Edit' on your Support Assistant bot. Click on the 'Lead Capture' tab. Toggle 'Enable Lead Capture' to on. The trigger determines when the lead form appears—'After Messages' is a good default. Set the trigger count to 3, so the form appears after the visitor sends three messages. The form will ask for their name and email. You can customize the heading—I'll change it to 'Before we continue, may I have your contact details?' Click 'Save Bot' to apply these settings."

**Screen Action:**

1. Navigate back to **Chatbot → Chatbots**
2. Click **"Edit"** button on "Support Assistant" bot
3. BotEditor opens → click **"Lead Capture"** tab
4. Show **"Enable Lead Capture"** toggle → turn it ON
5. Show **Trigger dropdown** → select "After Messages"
6. Show **Trigger Count field** → enter "3"
7. Show **Fields checklist:** "Name" and "Email" are selected
8. Show **Heading field** → enter "Before we continue, may I have your contact details?"
9. Show **Submit Button Text field** → "Continue Chat" (default)
10. Click **"Save Bot"** button
11. Success notice appears

**Estimated Duration:** 45 seconds

---

### [3:15–3:50] — Customize Appearance

**Voiceover:**

"Let's customize how the chatbot looks. Click on the 'Appearance' tab. You can choose from three built-in themes—Default, Modern, or Minimal. I'll select 'Modern' for a dark theme. The widget position controls where the chat bubble appears—bottom-right is the most common. You can see a live preview of the theme colors here. Pro users can also customize individual colors and add custom CSS. Once you're happy with the appearance, click 'Save Bot'."

**Screen Action:**

1. Still in BotEditor → click **"Appearance"** tab
2. Show **Theme dropdown** → select "Modern (Dark)"
3. Show **Position dropdown** → "Bottom Right" is selected
4. Show **theme preview box** displaying the Modern theme colors
5. Briefly show **Offset controls** (Y and X position fine-tuning)
6. Scroll down to show **(Pro badge)** on custom color pickers
7. Click **"Save Bot"** button
8. Success notice appears

**Estimated Duration:** 35 seconds

---

### [3:50–4:30] — Frontend Visitor Experience

**Voiceover:**

"Now let's see the chatbot in action. Open your website in a new tab. You'll see the chat bubble in the bottom-right corner. Click on it to open the chat window. The welcome message appears immediately. Type a question—I'll ask: 'What services do you offer?' The AI responds based on the content we indexed earlier. Let me send two more messages to trigger the lead capture form. After the third message, the lead form appears asking for my name and email. I'll fill it in and click 'Continue Chat'. The conversation resumes, and the lead has been captured."

**Screen Action:**

1. Open website **frontend** in a new browser tab (or use the "Visit Site" link)
2. Show the **chatbot widget bubble** in the bottom-right corner (Modern theme)
3. **Click the chat bubble** → chat window opens
4. Show the **welcome message:** "Hi! I'm here to help you with any questions about our products and services."
5. **Type a message** in the input field: "What services do you offer?"
6. Press Enter → show **typing indicator** (three dots animation)
7. **AI response appears** with relevant content
8. **Type a second message:** "Do you have pricing information?"
9. AI responds again
10. **Type a third message:** "Can I schedule a demo?"
11. **Lead capture form appears** with heading and Name/Email fields
12. **Fill in the form:** Name: "John Doe", Email: "john@example.com"
13. **Click "Continue Chat"** button
14. Chat resumes with AI response
15. Close the chat window

**Estimated Duration:** 40 seconds

---

### [4:30–4:55] — View Captured Conversation in Admin

**Voiceover:**

"Let's check the admin panel to see the captured conversation. Go back to the WordPress dashboard and click on 'Conversations' in the Chatbot menu. You'll see the conversation we just had listed here, with John Doe's name and email. A green badge shows this is a captured lead. Click on the conversation to view the full chat history. You can see all the messages exchanged, the visitor's details, and the page they were on. This is where you can review conversations, export leads, and even take over the chat manually if needed."

**Screen Action:**

1. Switch back to **WordPress admin** tab
2. Click **"Conversations"** in the Chatbot sidebar
3. Conversations list loads → show the **new conversation** at the top
4. Show **visitor name:** "John Doe"
5. Show **lead badge** or indicator (green "Lead Captured" badge)
6. Show **message count:** "5 messages"
7. Show **timestamp:** "A few seconds ago"
8. **Click on the conversation** row to open it
9. ConversationView opens → show **full message thread:**
   - Visitor: "What services do you offer?"
   - AI: [response]
   - Visitor: "Do you have pricing information?"
   - AI: [response]
   - Visitor: "Can I schedule a demo?"
   - AI: [response with lead form]
   - System: "Lead captured: John Doe (john@example.com)"
10. Show **conversation details panel** on the right:
    - Visitor Name: John Doe
    - Email: john@example.com
    - Status: Closed
    - Bot: Support Assistant
    - Page URL: [website URL]

**Estimated Duration:** 25 seconds

---

### [4:55–5:00] — Closing

**Voiceover:**

"And that's it! You've successfully set up an AI-powered chatbot that can answer questions, capture leads, and engage visitors automatically. Explore the Analytics tab to track performance, or create additional bots for different purposes. Happy chatting!"

**Screen Action:**

- Show the **Chatbot Analytics dashboard** with conversation stats
- Briefly hover over the **Analytics** tab to show charts
- End on the AI Marketing Expert dashboard or logo

**Estimated Duration:** 5 seconds

---

## Recording Preparation Checklist

Before you start recording, prepare the following:

### WordPress Setup
- [ ] Fresh WordPress installation or staging site (recommended)
- [ ] AI Marketing Expert plugin installed and activated
- [ ] At least **10-15 published pages or posts** with real content (for indexing demo)
- [ ] AI provider configured (OpenAI, Anthropic, or other) with valid API key in **AI Providers** settings
- [ ] Sample content that can answer visitor questions (e.g., "Services" page, "About" page, "Pricing" page)

### Browser & Recording
- [ ] Browser window set to **1920×1080** resolution (or 1280×720 for smaller file size)
- [ ] WordPress admin logged in and ready
- [ ] Two browser tabs/windows open: **WordPress admin** and **website frontend**
- [ ] Screen recording software ready (OBS, Camtasia, ScreenFlow, or similar)
- [ ] Audio setup tested for voiceover recording (optional: record voice separately and sync later)

### Chatbot Module
- [ ] Chatbot module is **enabled** in AI Marketing Expert → Settings → Modules
- [ ] No existing chatbots configured (start fresh for the tutorial)
- [ ] Knowledge Base is empty (we'll index during the demo)
- [ ] Conversations list is empty (we'll generate a new one during the demo)

### Demo Data (Optional)
- [ ] Test visitor name ready: "John Doe"
- [ ] Test visitor email ready: "john@example.com"
- [ ] Sample questions prepared:
  - "What services do you offer?"
  - "Do you have pricing information?"
  - "Can I schedule a demo?"

### Text-to-Speech Preparation
- [ ] Voiceover script copied to text-to-speech tool (ElevenLabs, Azure TTS, Google TTS, or similar)
- [ ] Voice selected: natural, clear, conversational tone (neutral accent recommended)
- [ ] Speech speed: normal (not too fast, not too slow)
- [ ] Audio exported as high-quality MP3 or WAV

### Final Checks
- [ ] Test the full workflow once before recording (create bot → index content → configure lead capture → test frontend → view conversation)
- [ ] Clear browser cache and cookies (for a clean frontend demo)
- [ ] Close unnecessary browser tabs and desktop applications (clean screen)
- [ ] Set browser zoom to **100%** (no zoom in/out)
- [ ] Disable browser extensions that might interfere (ad blockers, privacy tools)
- [ ] Test the chatbot widget appears correctly on the frontend
- [ ] Verify the chatbot responds to test questions (confirm AI provider is working)

---

**Total Word Count:** ~725 words  
**Estimated Speaking Duration:** ~4:55 at natural pace  
**Target Video Length:** 5 minutes (including on-screen action time)

---

## Notes for Editor

- **Pace:** Keep the narration steady and clear—allow 1-2 seconds of silence between major actions for viewers to follow along
- **Annotations:** Consider adding text overlays for key field names and buttons (e.g., "Name field", "Save Bot", "Start Indexing")
- **Zoom/Highlight:** Use cursor highlights or zoom effects on important UI elements (buttons, toggles, form fields)
- **Transitions:** Smooth fade or slide transitions between major sections (Introduction → Configuration → Frontend Demo → Admin Review)
- **Background Music:** Optional subtle background music (low volume, non-distracting)
- **End Screen:** Add a call-to-action end screen with links to documentation or upgrade page (5-10 seconds after the tutorial ends)

---

**File Version:** 1.0  
**Last Updated:** 2026-08-10  
**Plugin Version:** 1.1.2+  
**Author:** AI Marketing Expert Documentation Team
