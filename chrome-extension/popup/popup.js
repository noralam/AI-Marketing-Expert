// SocialPulse AI - Universal E-Commerce & Creator Post Engine
document.addEventListener('DOMContentLoaded', () => {
  let selectedPlatform = 'x';
  let currentGeneratedText = '';
  let currentGeneratedImageUrl = '';

  const tabs = document.querySelectorAll('.tab');
  const industrySelect = document.getElementById('industrySelect');
  const topicInput = document.getElementById('topicInput');
  const toneSelect = document.getElementById('toneSelect');
  const generateBtn = document.getElementById('generateBtn');
  const resultBox = document.getElementById('resultBox');
  const resultText = document.getElementById('resultText');
  const imagePreview = document.getElementById('imagePreview');
  const insertBtn = document.getElementById('insertBtn');

  // Tab Selection
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedPlatform = tab.getAttribute('data-platform');
    });
  });

  // Dynamic Prompt & Visual Engine per Industry
  const industryVisuals = {
    ecommerce_bags: 'Aesthetic minimal studio shot of a premium handcrafted leather bag on a clean marble pedestal, soft directional lighting, luxury commercial photography, 8k, photorealistic',
    cosmetics: 'High-end cosmetic skincare glass bottle serum with delicate water droplets on clean pastel background, soft natural lighting, beauty product photography',
    hardware: 'Sleek modern minimalist hardware tool and gadget on dark matte industrial surface, clean high-tech studio lighting, product design showcase',
    software: 'Futuristic minimalist modern analytics dashboard interface, dark theme with glowing neon nodes, sleek 3D render, octane render, 8k',
    creator: 'Cozy aesthetic desk with an open creative journal, fountain pen, and warm coffee cup next to a soft lamp, cinematic photography',
    food: 'Gourmet artisanal dish beautifully plated with fresh ingredients, warm restaurant ambient lighting, culinary magazine photography',
    general: 'Ultra-clean modern workspace with a sleek laptop and minimal aesthetic office background, high-end commercial photo'
  };

  // Generate Post & AI Visual
  generateBtn.addEventListener('click', async () => {
    const industry = industrySelect.value;
    const topic = topicInput.value.trim() || 'New premium collection showcase';
    const tone = toneSelect.value;

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>⏳ Generating Post & Visual...</span>';

    // 1. Contextual Image URL (Free Pollinations SDXL)
    const seed = Math.floor(Math.random() * 99999);
    const baseVisual = industryVisuals[industry] || industryVisuals.general;
    currentGeneratedImageUrl = https://image.pollinations.ai/prompt/?width=1024&height=1024&nologo=true&seed=;

    // 2. Universal Human-Like Copywriting
    if (industry === 'ecommerce_bags') {
      if (selectedPlatform === 'x') {
        currentGeneratedText = Every great journey starts with the right gear.\n\nDesigned for creators and travelers who value durability without compromising on clean aesthetics.\n\nCrafted with premium materials for everyday carry.\n\n#EverydayCarry #MinimalistStyle #Fashion;
      } else if (selectedPlatform === 'linkedin') {
        currentGeneratedText = Product design is all about balance: eliminating unnecessary bulk while ensuring functional durability.\n\nWhen we conceptualized this new carry collection, our goal was simple: seamless transition between professional office work and weekend travel.\n\nQuality craftsmanship speaks for itself.;
      } else {
        currentGeneratedText = Upgrade your daily carry! Thoughtfully designed compartments, weather-resistant finish, and sleek minimal aesthetics.\n\nPerfect for your daily commute or next weekend getaway.\n\n👇 Check the details in the first comment!;
      }
    } else if (industry === 'cosmetics') {
      if (selectedPlatform === 'x') {
        currentGeneratedText = Clean ingredients. Visible results.\n\nFormulated with natural extracts to keep your skin hydrated and glowing all day long.\n\nSimplify your daily skincare routine.\n\n#SkincareRoutine #CleanBeauty #SelfCare;
      } else {
        currentGeneratedText = Healthy skin shouldn't require a 10-step complicated routine. Pure, organic nourishment designed for daily hydration.\n\n👇 Explore ingredients and details in the first comment!;
      }
    } else if (industry === 'creator') {
      if (selectedPlatform === 'x') {
        currentGeneratedText = Writing is about distilling thoughts until only what truly matters remains.\n\nNew chapter out today. Grateful for everyone following this creative journey.\n\n#WritingCommunity #Creativity #Authors;
      } else {
        currentGeneratedText = Creating authentic work takes patience and consistency. Excited to share the latest release with you all.\n\nThank you for the continuous support along this journey!;
      }
    } else {
      if (selectedPlatform === 'x') {
        currentGeneratedText = Quality speaks for itself.\n\nBuilt with precision and designed for peak reliability. Elevate your daily workflow today.\n\n#Innovation #Productivity #Growth;
      } else if (selectedPlatform === 'linkedin') {
        currentGeneratedText = Innovation isn't about adding more features; it's about solving real-world challenges with simplicity and elegance.\n\nPleased to unveil our latest development aimed at streamlining everyday efficiency.;
      } else {
        currentGeneratedText = Excited to introduce our latest launch! Built from the ground up to bring you the best performance and value.\n\n👇 Full details available in the first comment!;
      }
    }

    // Display Results
    resultText.innerText = currentGeneratedText;
    imagePreview.src = currentGeneratedImageUrl;
    resultBox.style.display = 'block';

    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>✨ Generate Post & AI Visual</span>';
  });

  // 1-Click Send to Compose Box
  insertBtn.addEventListener('click', async () => {
    insertBtn.innerHTML = '<span>⏳ Injecting to social tab...</span>';
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      alert('Please open X.com, LinkedIn, or Facebook in an active tab first!');
      insertBtn.innerHTML = '<span>🚀 1-Click Send to Compose Box</span>';
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectIntoSocialComposer,
      args: [selectedPlatform, currentGeneratedText]
    }, () => {
      insertBtn.innerHTML = '<span>✅ Sent to Compose Box!</span>';
      setTimeout(() => {
        insertBtn.innerHTML = '<span>🚀 1-Click Send to Compose Box</span>';
      }, 2500);
    });
  });
});

function injectIntoSocialComposer(platform, text) {
  let composer = null;
  
  if (platform === 'x') {
    composer = document.querySelector("[data-testid='tweetTextarea_0']");
  } else if (platform === 'linkedin') {
    composer = document.querySelector("div.ql-editor, div[contenteditable='true'][role='textbox']");
    if (!composer) {
      const trigger = document.querySelector("button:has-text('Start a post'), button.share-box-feed-entry__trigger");
      if (trigger) trigger.click();
    }
  } else if (platform === 'facebook') {
    composer = document.querySelector("div[role='dialog'] div[role='textbox'], div[role='textbox']");
  }

  if (composer) {
    composer.focus();
    document.execCommand('insertText', false, text);
    return true;
  } else {
    navigator.clipboard.writeText(text);
    alert('Post text copied to clipboard! Click inside the post box to paste.');
    return false;
  }
}
