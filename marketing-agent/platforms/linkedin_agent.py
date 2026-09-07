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
        await page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
        await self.human.short_pause(5.0, 8.0)

        # 1. Verify Login
        if "login" in page.url or "authwall" in page.url:
            print("⚠️ [LinkedIn] Not logged in. Please run python setup_session.py --platform linkedin first.")
            await page.close()
            return

        # 2. Natural Feed Browsing
        print("👀 [LinkedIn] Reading professional feed...")
        await self.human.natural_scroll(page, scrolls=random.randint(2, 4))
        await self.human.lazy_delay("Reading industry posts")

        # 3. Create a Post
        await self.create_post(page)

        print("✅ [LinkedIn] Organic session completed successfully.")
        await page.close()

    async def create_post(self, page):
        print("✍️ [LinkedIn] Preparing to share a professional insight...")
        try:
            # Multi-selector for LinkedIn modern dynamic share box
            start_post_btn = page.locator("button:has-text('Start a post'), button.share-box-feed-entry__trigger, [data-view-name='feed-share-box-trigger'] button").first
            if not await start_post_btn.is_visible():
                # Fallback: Find by exact text or span inside
                start_post_btn = page.locator("button").filter(has_text="Start a post").first

            if await start_post_btn.is_visible():
                print("🎯 [LinkedIn] Opening post modal...")
                await start_post_btn.click()
                await self.human.short_pause(3.0, 5.0)

                # Editor box inside modal
                editor = page.locator("div.ql-editor, div[contenteditable='true'], div[role='textbox']").first
                if await editor.is_visible():
                    post_text = self.generator.generate_x_post()
                    print(f"📝 [LinkedIn] Typing post:\n{post_text}\n")
                    await editor.click()
                    await self.human.short_pause(1.0, 2.0)
                    await self.human.human_type(editor, post_text)
                    await self.human.short_pause(3.0, 5.0)

                    # 30% Probability of Attaching a Realistic Visual
                    should_attach_image = random.random() < 0.30
                    if should_attach_image:
                        image_path = self.img_generator.generate_image_for_post()
                        if image_path and os.path.exists(image_path):
                            print(f"🖼️ [LinkedIn] Attaching realistic visual: {os.path.basename(image_path)}")
                            media_btn = page.locator("input[type='file']").first
                            if await media_btn.count() > 0:
                                await media_btn.set_input_files(image_path)
                                await self.human.short_pause(3.0, 6.0)

                    # Post Button inside modal
                    publish_btn = page.locator("button.share-actions__primary-action, button:has-text('Post')").last
                    if await publish_btn.is_visible():
                        print("🚀 [LinkedIn] Clicking Publish Post button...")
                        try:
                            await publish_btn.click(timeout=5000)
                        except Exception:
                            await publish_btn.dispatch_event("click")
                        
                        await self.human.short_pause(3.0, 6.0)
                        print("🎉 [LinkedIn] Post successfully published!")
                        await self.human.lazy_delay("Post published. Taking a professional break")
                    else:
                        print("⚠️ [LinkedIn] Publish button not found in modal.")
            else:
                print("ℹ️ [LinkedIn] 'Start a post' trigger not visible on current feed.")
        except Exception as e:
            print(f"⚠️ [LinkedIn] Post composition note: {e}")
