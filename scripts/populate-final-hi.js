const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'translation-cache.json');
const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));

const FINAL_HI = {
  "Replace 7 expensive subscriptions (Mailchimp, Apollo, Zapier, Jasper, Intercom, CartBounty & Semrush) with a single powerhouse plugin running directly inside your WordPress site. Free forever tier available with unlimited subscribers.": "७ महंगे सब्सक्रिप्शन (Mailchimp, Apollo, Zapier, Jasper, Intercom, CartBounty और Semrush) को सीधे अपनी वर्डप्रेस साइट के भीतर चलने वाले एक शक्तिशाली प्लगइन से बदलें। असीमित ग्राहकों के साथ मुफ़्त प्लान हमेशा उपलब्ध।",
  "✓ Unlimited Contacts & Lists": "✓ असीमित संपर्क और सूचियाँ",
  "✓ Multi-SMTP Free Relay Stacking": "✓ मल्टी-SMTP मुफ़्त रिले स्टैकिंग",
  "✓ Free Google Gemini & OpenAI Keys": "✓ मुफ़्त Google Gemini और OpenAI कुंजियाँ",
  "✓ 100% Data Privacy (GDPR Ready)": "✓ १००% डेटा गोपनीयता (GDPR तैयार)",
  "MySQL / MariaDB:": "MySQL / MariaDB:",
  "Log in to your WordPress Admin dashboard and navigate to": "अपने वर्डप्रेस एडमिन डैशबोर्ड में लॉग इन करें और",
  "Plugins → Add New": "Plugins → Add New पर जाएं",
  "Click": "क्लिक करें",
  "Upload Plugin": "Upload Plugin",
  "at the top and select the": "शीर्ष पर और चुनें",
  "file.": "फ़ाइल।",
  "Install Now": "Install Now",
  "and then click": "और फिर क्लिक करें",
  "Activate Plugin": "Activate Plugin",
  "A new top-level menu item named": "एक नया मुख्य मेनू आइटम जिसका नाम है",
  "AI Marketing": "AI Marketing",
  "will appear in your WordPress sidebar.": "आपके वर्डप्रेस साइडबार में दिखाई देगा।",
  "If you have purchased a Pro license, enter and verify your key under": "यदि आपने प्रो लाइसेंस खरीदा है, तो अपनी कुंजी दर्ज करें और सत्यापित करें",
  "Settings → License": "Settings → License के तहत",
  "All sensitive credentials (AI provider API keys, SMTP passwords, OAuth access tokens) are automatically encrypted at rest in your MySQL database using": "सभी संवेदनशील क्रेडेंशियल (AI API कुंजियाँ, SMTP पासवर्ड, OAuth एक्सेस टोकन) आपके MySQL डेटाबेस में स्वचालित रूप से एन्क्रिप्ट किए जाते हैं",
  "with keys derived from your WordPress security salts (": "वर्डप्रेस सुरक्षा साल्ट से प्राप्त कुंजियों के साथ (",
  "). No plain text secrets are ever logged or exposed.": ")। कोई भी सादा पाठ कभी लॉग या उजागर नहीं किया जाता है।",
  "Go to": "जाएं",
  "AI Providers": "AI Providers",
  ", paste your free Gemini API key from Google AI Studio, and click": ", Google AI Studio से अपनी मुफ़्त जेमिनी API कुंजी पेस्ट करें और क्लिक करें",
  "Test Connection": "Test Connection",
  "In": "में",
  "Email Marketing → SMTP": "Email Marketing → SMTP",
  ", enter your Gmail App Password, Brevo, SendGrid, or host SMTP credentials and send a test email.": ", अपना Gmail ऐप पासवर्ड, Brevo, SendGrid, या होस्ट SMTP क्रेडेंशियल दर्ज करें और एक टेस्ट ईमेल भेजें।",
  "Activate Cart Recovery": "कार्ट रिकवरी सक्रिय करें",
  "Under": "के तहत",
  "Workflow Automation": "Workflow Automation",
  ", activate the pre-built \"WooCommerce Abandoned Cart Recovery\" template.": ", पूर्व-निर्मित \"WooCommerce Abandoned Cart Recovery\" टेम्प्लेट को सक्रिय करें।",
  "Discover Cold Leads": "कोल्ड लीड्स खोजें",
  "Email Marketing → Lead Finder": "Email Marketing → Lead Finder",
  ", search for your target niche (e.g. \"Marketing Director, United States\").": ", अपनी लक्षित श्रेणी खोजें (जैसे \"मार्केटिंग डायरेक्टर, संयुक्त राज्य अमेरिका\")।",
  "Here are the four highest-demand, game-changing features in AI Marketing Expert that deliver immediate ROI for agency owners, store managers, and marketers:": "यहाँ AI Marketing Expert की चार सबसे लोकप्रिय और प्रभावशाली विशेषताएं हैं जो तुरंत लाभ प्रदान करती हैं:",
  "Killer Feature 1": "प्रमुख विशेषता १",
  "Find thousands of verified B2B prospects by job title, industry, and country without any external Apollo subscription. Real-time DNS MX validation filters out invalid domains and enrolls verified leads directly into cold nurture sequences.": "बिना किसी अपोलो सदस्यता के पद, उद्योग और देश के अनुसार हजारों सत्यापित B2B संभावनाएं खोजें। रीयल-टाइम DNS MX सत्यापन अमान्य डोमेन को फ़िल्टर करता है और लीड्स को सीधे कोल्ड फनल में जोड़ता है।",
  "Explore Lead Finder →": "लीड खोजकर्ता देखें →",
  "Killer Feature 2": "प्रमुख विशेषता २",
  "Captures guest shopper emails live during checkout as they type. Automatically sends recovery emails with single-item & single-quantity deep links so customers never accidentally purchase duplicate items upon returning.": "चेकआउट के दौरान विज़िटर का ईमेल टाइप करते ही कैप्चर करता है। १-क्लिक डीप लिंक के साथ स्वचालित रूप से रिकवरी ईमेल भेजता है ताकि लौटने पर ग्राहक गलती से डुप्लिकेट आइटम न खरीदें।",
  "View Cart Recovery Guide →": "कार्ट रिकवरी गाइड देखें →",
  "Killer Feature 3": "प्रमुख विशेषता ३",
  "Describe your marketing flow in plain natural language (e.g., \"Send a 15% discount email 1 hour after cart abandonment, and follow up in 2 days if unopened\"). AI automatically generates all nodes, timers, conditions, and email copies onto the canvas.": "सरल प्राकृतिक भाषा में अपना मार्केटिंग फ़्लो बताएं (जैसे \"कार्ट छोड़ने के १ घंटे बाद १५% छूट वाला ईमेल भेजें, और २ दिन बाद फ़ॉलोअप करें\")। AI कैनवास पर सभी नोड्स, टाइमर, शर्तें और ईमेल कॉपी स्वचालित रूप से उत्पन्न करता है।",
  "See AI Canvas Maker →": "AI कैनवास निर्माता देखें →",
  "Killer Feature 4": "प्रमुख विशेषता ४",
  "Generates long-form 2,000+ word SEO articles that bypass AI detectors while strictly preserving headers, formatted comparison tables, key takeaways, and FAQ schema.": "शीर्षकों, तुलना तालिकाओं, मुख्य बिंदुओं और FAQ स्कीमा को बनाए रखते हुए २,०००+ शब्दों के लंबे एसईओ लेख तैयार करता है जो AI डिटेक्टरों को बायपास करते हैं।",
  "Open Humanize Studio →": "ह्यूमनाइज़ स्टूडियो खोलें →",
  "The main plugin dashboard serves as your mission control center, aggregating real-time performance indicators and operational health across all active modules.": "मुख्य प्लगइन डैशबोर्ड आपके मिशन नियंत्रण केंद्र के रूप में कार्य करता है, जो सभी सक्रिय मॉड्यूल में रीयल-टाइम प्रदर्शन संकेतकों को एकत्रित करता है।",
  "Figure 1.1: Unified Dashboard with real-time KPI metrics, module shortcuts, and trend charts": "चित्र १.१: रीयल-टाइम KPI मेट्रिक्स, मॉड्यूल शॉर्टकट और ट्रेंड चार्ट के साथ एकीकृत डैशबोर्ड",
  "Top KPI Cards:": "शीर्ष KPI कार्ड:",
  "Total active subscribers, average email open rate (CTR), active automated workflows, and estimated monthly cost savings.": "कुल सक्रिय ग्राहक, औसत ईमेल ओपन दर (CTR), सक्रिय स्वचालित वर्कफ़्लो, और अनुमानित मासिक लागत बचत।",
  "Quick Action Shortcuts:": "त्वरित कार्रवाई शॉर्टकट:",
  "One-click launchers to draft a new campaign, generate an AI blog post, schedule social media, or review cart recovery.": "नया अभियान शुरू करने, ब्लॉग पोस्ट बनाने, सोशल मीडिया शेड्यूल करने या कार्ट रिकवरी की समीक्षा करने के लिए १-क्लिक शॉर्टकट।",
  "System Health Monitor:": "सिस्टम स्वास्थ्य मॉनिटर:",
  "Green/Red indicators verifying that background cron workers are firing on schedule without delays.": "हरे/लाल संकेतक जो सत्यापित करते हैं कि बैकग्राउंड क्रॉन बिना किसी देरी के समय पर काम कर रहे हैं।",
  "How to Use the Dashboard": "डैशबोर्ड का उपयोग कैसे करें",
  "Not at all. The front-end tracking script is under 5KB and loads asynchronously. All heavy AI generation and email batching runs in isolated background processes managed by cron.": "बिल्कुल नहीं। फ्रंट-एंड ट्रैकिंग स्क्रिप्ट ५KB से कम है और एसिंक्रोनस रूप से लोड होती है। सभी भारी AI कार्य और ईमेल बैकग्राउंड प्रक्रियाओं में क्रॉन द्वारा चलते हैं।"
};

for (const [en, hi] of Object.entries(FINAL_HI)) {
  cache[`hi:${en.trim()}`] = hi.trim();
}

fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
console.log('✓ Added all final Hindi fragments to cache');
