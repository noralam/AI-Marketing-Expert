import asyncio
import random
import os
import urllib.parse
from playwright.async_api import BrowserContext
from core.human import HumanBehavior
from core.ai_generator import ContentGenerator
from core.image_generator import ImageGenerator
from playwright_stealth import Stealth

class XAgent:
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
        print("🌐 [X.com] Opening home feed...")
        await page.goto("https://x.com/home", wait_until="domcontentloaded")
        await self.human.short_pause(4.0, 7.0)

        # 1. Verify Login
        if "login" in page.url or "i/flow/login" in page.url:
            print("⚠️ [X.com] Not logged in. Run python setup_session.py --platform x first.")
            await page.close()
            return

        # 2. Natural Feed Browsing
        print("👀 [X.com] Natural feed browsing (reading posts)...")
        await self.human.natural_scroll(page, scrolls=random.randint(2, 4))
        await self.human.lazy_delay("Reading timeline")

        # 3. Post Creation (70% Text Only, 30% Realistic Visual)
        await self.create_post(page)

        # 4. Search Targeted Niche & Like Quality Post with Smart Fallback
        queries = self.config.get("x_targeting", {}).get("search_queries", ["#WordPress"])
        await self.search_and_engage_with_fallback(page, queries)

        # 5. Targeted Niche Networking with Smart Fallback
        people_queries = self.config.get("x_targeting", {}).get("people_search_queries", ["wordpress developer"])
        await self.search_and_follow_with_fallback(page, people_queries)

        print("✅ [X.com] Organic human-like session completed successfully.")
        await page.close()

    async def create_post(self, page):
        print("✍️ [X.com] Preparing to compose an authentic value post...")
        try:
            compose_box = page.locator("[data-testid='tweetTextarea_0']").first
            if await compose_box.is_visible():
                post_text = self.generator.generate_x_post()
                print(f"📝 [X.com] Writing post:\n{post_text}\n")
                await compose_box.click()
                await self.human.short_pause(1.0, 2.0)
                await self.human.human_type(compose_box, post_text)
                await self.human.short_pause(2.0, 4.0)

                # 30% Probability of Attaching a Realistic Visual Asset
                should_attach_image = random.random() < 0.30
                if should_attach_image:
                    image_path = self.img_generator.generate_image_for_post()
                    if image_path and os.path.exists(image_path):
                        print(f"🖼️ [X.com] Attaching realistic visual: {os.path.basename(image_path)}")
                        file_input = page.locator("input[data-testid='fileInput']").first
                        if await file_input.count() > 0:
                            await file_input.set_input_files(image_path)
                            await self.human.short_pause(3.0, 6.0)

                # Send / Tweet Button - Robust Multi-Selector & JS Dispatch
                print("🚀 [X.com] Clicking Publish post button...")
                post_btn = page.locator("[data-testid='tweetButtonInline'], [data-testid='tweetButton']").first
                if await post_btn.is_visible():
                    try:
                        await post_btn.click(timeout=5000)
                    except Exception:
                        await post_btn.dispatch_event("click")
                    
                    await self.human.short_pause(3.0, 6.0)
                    print("🎉 [X.com] Post successfully published!")
                    await self.human.lazy_delay("Post published. Taking a natural break")
                else:
                    print("⚠️ [X.com] Tweet button selector not found.")
            else:
                print("ℹ️ [X.com] Compose box not immediately found on feed.")
        except Exception as e:
            print(f"⚠️ [X.com] Post composition note: {e}")

    async def search_and_engage_with_fallback(self, page, query_list: list):
        """Searches niche discussions. If no results found, falls back to broader queries."""
        random.shuffle(query_list)
        for query in query_list:
            print(f"🔍 [X.com] Searching discussion: '{query}'...")
            try:
                encoded_q = urllib.parse.quote(query)
                search_url = f"https://x.com/search?q={encoded_q}&f=top"
                await page.goto(search_url, wait_until="domcontentloaded")
                await self.human.short_pause(3.0, 6.0)
                await self.human.natural_scroll(page, scrolls=2)

                # Check if results exist
                like_buttons = page.locator("[data-testid='like']")
                count = await like_buttons.count()
                if count > 0:
                    print(f"❤️ [X.com] Found {count} posts for '{query}'. Liking a top post...")
                    await like_buttons.first.click()
                    await self.human.short_pause(2.0, 5.0)
                    await self.human.lazy_delay(f"Finished engaging on '{query}'")
                    return
                else:
                    print(f"ℹ️ [X.com] No immediate posts for '{query}'. Trying next search query...")
            except Exception as e:
                print(f"⚠️ [X.com] Search attempt note: {e}")
        
        print("ℹ️ [X.com] Search engagement cycle concluded.")

    async def search_and_follow_with_fallback(self, page, people_list: list):
        """Searches target creators. If 0 results, automatically tries broader keywords."""
        random.shuffle(people_list)
        for people_query in people_list:
            print(f"👥 [X.com] Searching creators: '{people_query}'...")
            try:
                encoded_q = urllib.parse.quote(people_query)
                people_url = f"https://x.com/search?q={encoded_q}&f=user"
                await page.goto(people_url, wait_until="domcontentloaded")
                await self.human.short_pause(4.0, 7.0)
                await self.human.natural_scroll(page, scrolls=2)

                # Look for follow buttons
                follow_buttons = page.locator("button:has-text('Follow')")
                count = await follow_buttons.count()
                
                if count > 0:
                    max_to_follow = min(random.randint(1, 2), count)
                    print(f"🎯 [X.com] Found {count} creators for '{people_query}'. Following {max_to_follow}...")
                    for i in range(max_to_follow):
                        btn = follow_buttons.nth(i)
                        if await btn.is_visible():
                            print(f"➕ [X.com] Followed creator ({i+1}/{max_to_follow}).")
                            await btn.click()
                            await self.human.short_pause(3.0, 6.0)

                    await self.human.lazy_delay("Creator networking done. Cooling down")
                    return
                else:
                    print(f"ℹ️ [X.com] Zero creators for '{people_query}'. Switching to broader keyword...")
            except Exception as e:
                print(f"⚠️ [X.com] People search attempt note: {e}")

        print("ℹ️ [X.com] Creator networking concluded.")
