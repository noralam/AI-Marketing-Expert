import asyncio
import random
import os
from playwright.async_api import BrowserContext
from core.human import HumanBehavior
from core.ai_generator import ContentGenerator
from core.image_generator import ImageGenerator
from playwright_stealth import Stealth

class LinkedInAgent:
    def __init__(self, context: BrowserContext, human: HumanBehavior, generator: ContentGenerator, config: dict):
        self.context = context
        self.human = human
        self.generator = generator
        self.img_generator = ImageGenerator()
        self.config = config
        self.stealth = Stealth()

    async def run_session(self):
        page = await self.context.new_page()
        await self.stealth.apply_stealth_async(page)
        print("🌐 [LinkedIn] Opening LinkedIn feed...")
        await page.goto("https://www.linkedin.com/feed/", wait_until="commit")
        await self.human.short_pause(4.0, 7.0)

        # 1. Verify Login
        if "login" in page.url or "authwall" in page.url:
            print("⚠️ [LinkedIn] Not logged in. Please run python setup_session.py --platform linkedin first.")
            await page.close()
            return

        # 2. Natural Feed Browsing & Organic Post Liking
        print("👀 [LinkedIn] Reading professional feed & engaging...")
        await self.human.natural_scroll(page, scrolls=random.randint(2, 4))
        await self.like_feed_posts(page)
        await self.human.short_pause(3.0, 6.0)

        # 3. Create a Value Post (Direct Share URL / Multi-Selector)
        await self.create_post(page)

        print("✅ [LinkedIn] Organic session completed successfully.")
        await page.close()

    async def like_feed_posts(self, page):
        """Gives an organic reaction (Like/Insightful) to top industry feed posts."""
        try:
            like_btns = page.locator("button[aria-label*='React Like'], button.react-button__trigger, button:has-text('Like')")
            count = await like_btns.count()
            if count > 0:
                print("👍 [LinkedIn] Giving an organic like to a fellow creator's post...")
                await like_btns.first.click()
                await self.human.short_pause(2.0, 4.0)
        except Exception as e:
            print(f"ℹ️ [LinkedIn] Like note: {e}")

    async def create_post(self, page):
        print("✍️ [LinkedIn] Preparing to share a professional insight...")
        try:
            # Step 1: Scroll to top of feed to reveal 'Start a post' composer
            print("⬆️ [LinkedIn] Scrolling back to top of feed...")
            await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
            await self.human.short_pause(2.0, 3.5)

            # Step 2: Try clicking the feed composer trigger
            editor = None
            start_post_btn = page.locator("button:has-text('Start a post'), button.share-box-feed-entry__trigger, [data-view-name='feed-share-box-trigger'] button, div.share-box-feed-entry__wrapper button, div.share-box-feed-entry__wrapper span:has-text('Start a post')").first
            
            if await start_post_btn.is_visible():
                print("🎯 [LinkedIn] Clicking 'Start a post' trigger...")
                try:
                    await start_post_btn.click(force=True, timeout=5000)
                except Exception:
                    await start_post_btn.dispatch_event("click")
                await self.human.short_pause(2.5, 4.5)
            else:
                print("🔄 [LinkedIn] Button not directly visible, navigating to direct share URL...")
                await page.goto("https://www.linkedin.com/feed/?shareActive=true", wait_until="domcontentloaded")
                await self.human.short_pause(3.5, 6.0)

            # Step 3: Locate editor in modal with wait_for
            editor = page.locator("div.ql-editor, div[contenteditable='true'][role='textbox'], div[role='textbox']").first
            try:
                await editor.wait_for(state="visible", timeout=6000)
            except Exception:
                pass

            if await editor.is_visible():
                post_data = self.generator.generate_x_post()
                post_text = post_data.get("text") if isinstance(post_data, dict) else str(post_data)
                topic = post_data.get("topic", "ai_marketing") if isinstance(post_data, dict) else "ai_marketing"
                print(f"📝 [LinkedIn] Typing post:\n{post_text}\n")
                await self.human.human_type(page, post_text, element=editor)
                await self.human.short_pause(2.5, 4.5)

                # 30% Probability of Attaching a Realistic Visual
                should_attach_image = random.random() < 0.30
                if should_attach_image:
                    image_path = self.img_generator.generate_image_for_post(topic=topic)
                    if image_path and os.path.exists(image_path):
                        print(f"🖼️ [LinkedIn] Attaching realistic visual: {os.path.basename(image_path)}")
                        media_btn = page.locator("input[type='file']").first
                        if await media_btn.count() > 0:
                            await media_btn.set_input_files(image_path)
                            await self.human.short_pause(4.0, 7.0)

                # Step 4: Publish Button inside modal
                publish_btn = page.locator("button.share-actions__primary-action, button:has-text('Post'), div[role='dialog'] button:has-text('Post')").last
                if await publish_btn.is_visible():
                    print("🚀 [LinkedIn] Clicking Publish Post button...")
                    try:
                        await publish_btn.click(force=True, timeout=6000)
                    except Exception:
                        await publish_btn.dispatch_event("click")
                    
                    await self.human.short_pause(4.0, 7.0)
                    print("🎉 [LinkedIn] Post successfully published!")
                else:
                    print("⚠️ [LinkedIn] Publish button not found in modal.")
            else:
                print("ℹ️ [LinkedIn] Post editor modal did not load.")
        except Exception as e:
            print(f"⚠️ [LinkedIn] Post composition note: {e}")
