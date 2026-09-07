import asyncio
import random
import os
import urllib.parse
from playwright.async_api import BrowserContext
from core.human import HumanBehavior
from core.ai_generator import ContentGenerator
from core.image_generator import ImageGenerator
from playwright_stealth import Stealth

class FacebookAgent:
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

        print("\n🌐 [Facebook] Opening Facebook...")
        await page.goto("https://www.facebook.com/", wait_until="domcontentloaded")
        await self.human.short_pause(5.0, 8.0)

        # 1. Verify Login
        if "login" in page.url or "checkpoint" in page.url:
            print("⚠️ [Facebook] Not logged in. Please run python launch_native_chrome.py and log into Facebook.")
            await page.close()
            return

        # 2. Strict Identity Guard (Auto-switch to AI Marketing Expert Page)
        await self.ensure_ai_marketing_expert_page(page)

        # 3. Create Authentic Page Post (50% with Realistic Visual Image)
        await self.create_page_post(page)

        # 4. Facebook Groups Niche Engagement (Search, Browse, Like & Comment in WP Groups)
        group_queries = self.config.get("facebook_targeting", {}).get("group_search_queries", ["WordPress Developers", "WordPress Plugins & Themes"])
        selected_group = random.choice(group_queries)
        await self.search_and_engage_groups(page, selected_group)

        # 5. Smart Niche Engagement: Search WordPress Topics, Like & Leave Short Relevant Comment
        fb_queries = self.config.get("facebook_targeting", {}).get("post_search_queries", ["#WordPress web design", "wordpress email marketing"])
        selected_query = random.choice(fb_queries)
        await self.search_and_engage_niche(page, selected_query)

        # 6. Targeted Page Networking (Follow relevant WordPress pages)
        page_queries = self.config.get("facebook_targeting", {}).get("page_networking_queries", ["WordPress Web Agency"])
        await self.search_and_like_niche_pages(page, random.choice(page_queries))

        print("✅ [Facebook] Full intelligent marketing & group session completed successfully.")
        await page.close()

    async def ensure_ai_marketing_expert_page(self, page):
        print("🔍 [Facebook] Verifying active identity (Personal Profile vs Page)...")
        try:
            avatar_btn = page.locator("div[aria-label='Your profile'], div[aria-label='Account controls and settings']").first
            if await avatar_btn.is_visible():
                await avatar_btn.click()
                await self.human.short_pause(2.0, 4.0)

                page_switch_target = page.locator("div[role='dialog'] div[role='button'], div[role='menu'] div[role='button']").filter(has_text="AI Marketing Expert").first
                
                if await page_switch_target.is_visible():
                    print("🔄 [Facebook] Detected Personal Profile. Switching into 'AI Marketing Expert' Page...")
                    await page_switch_target.click()
                    await self.human.short_pause(5.0, 9.0)
                    print("✨ [Facebook] Successfully switched to 'AI Marketing Expert' Page identity!")
                else:
                    print("✅ [Facebook] Already operating as 'AI Marketing Expert' Page.")
                    await page.keyboard.press("Escape")
                    await self.human.short_pause(1.5, 3.0)
        except Exception as e:
            print(f"ℹ️ [Facebook] Profile switch check note: {e}")

    async def create_page_post(self, page):
        print("✍️ [Facebook] Preparing to compose an organic value post for AI Marketing Expert...")
        try:
            composer = page.locator("div[role='region'] div[role='button'], div[role='main'] div[role='button']").filter(has_text="What's on your mind").first
            if not await composer.is_visible():
                composer = page.locator("div[role='button']").filter(has_text="mind").first

            if await composer.is_visible():
                print("🎯 [Facebook] Opening Create Post composer...")
                await composer.click()
                await self.human.short_pause(3.0, 5.0)

                editor = page.locator("div[role='dialog'] div[role='textbox'], div[role='dialog'] div[contenteditable='true']").first
                if await editor.is_visible():
                    post_text = self.generator.generate_x_post()
                    print(f"📝 [Facebook] Typing post:\n{post_text}\n")
                    await editor.click()
                    await self.human.short_pause(1.0, 2.0)
                    await page.keyboard.type(post_text, delay=random.randint(40, 80))
                    await self.human.short_pause(3.0, 5.0)

                    # 50% Probability of Attaching a Realistic Visual Image
                    should_attach_image = random.random() < 0.50
                    if should_attach_image:
                        image_path = self.img_generator.generate_image_for_post()
                        if image_path and os.path.exists(image_path):
                            print(f"🖼️ [Facebook] Attaching realistic visual image: {os.path.basename(image_path)}")
                            photo_icon_btn = page.locator("div[role='dialog'] div[aria-label*='Photo/video'], div[role='dialog'] div[aria-label*='photo']").first
                            if await photo_icon_btn.is_visible():
                                await photo_icon_btn.click()
                                await self.human.short_pause(2.0, 4.0)

                            file_input = page.locator("div[role='dialog'] input[type='file']").first
                            if await file_input.count() > 0:
                                await file_input.set_input_files(image_path)
                                await self.human.short_pause(5.0, 8.0)
                                print("✨ [Facebook] Image uploaded and attached to post!")

                    # STEP 1: Click the Primary Blue Action Button ('Next' or 'Post')
                    primary_btn = page.locator("div[role='dialog'] div[aria-label='Next'][role='button'], div[role='dialog'] div[aria-label='Post'][role='button'], div[role='dialog'] div[role='button']:has-text('Next'), div[role='dialog'] div[role='button']:has-text('Post')").last
                    
                    if await primary_btn.is_visible():
                        btn_txt = await primary_btn.inner_text()
                        print(f"🚀 [Facebook] Clicking primary action button ('{btn_txt.strip()}')...")
                        try:
                            await primary_btn.click(timeout=6000)
                        except Exception:
                            await primary_btn.dispatch_event("click")

                        await self.human.short_pause(3.0, 5.0)

                        # STEP 2: Handle Page Post Final Step ('Publish' / 'Post' modal)
                        final_publish_btn = page.locator("div[role='dialog'] div[aria-label='Publish'][role='button'], div[role='dialog'] div[aria-label='Post'][role='button'], div[role='dialog'] div[role='button']:has-text('Publish'), div[role='dialog'] div[role='button']:has-text('Post')").last
                        if await final_publish_btn.is_visible():
                            print("🚀 [Facebook] Clicking final 'Publish' button...")
                            try:
                                await final_publish_btn.click(timeout=6000)
                            except Exception:
                                await final_publish_btn.dispatch_event("click")
                            await self.human.short_pause(7.0, 11.0)

                        print("🎉 [Facebook] Post successfully published!")

                        # First comment with product link under our post
                        await self.post_first_comment_under_our_post(page)
                        await self.human.lazy_delay("Post & Link comment completed")
                    else:
                        print("⚠️ [Facebook] Post / Next button not found in modal.")
            else:
                print("ℹ️ [Facebook] Create Post box not found on feed.")
        except Exception as e:
            print(f"⚠️ [Facebook] Post composition error: {e}")

    async def post_first_comment_under_our_post(self, page):
        """Drops the first comment with the product link under newly published post."""
        try:
            print("💬 [Facebook] Dropping 1st comment with official link under OUR post...")
            await self.human.short_pause(4.0, 7.0)
            await page.mouse.wheel(0, 400)
            await self.human.short_pause(2.0, 4.0)

            # Step 1: Click the comment trigger ('Leave a comment' / 'Comment')
            trigger = page.locator("div[aria-label='Leave a comment'][role='button'], div[aria-label='Write a comment'][role='button'], div[role='button']:has-text('Comment')").first
            if await trigger.is_visible():
                await trigger.click()
                await self.human.short_pause(2.0, 3.5)

            # Step 2: The real active contenteditable textbox
            comment_box = page.locator("div[role='textbox'][contenteditable='true']").first
            if await comment_box.is_visible():
                link = "https://wordpress.org/plugins/ai-marketing-expert/"
                comment_text = f"Explore or install AI Marketing Expert here: {link}"
                print(f"📝 [Facebook] Typing 1st Comment: {comment_text}")
                await comment_box.click()
                await self.human.short_pause(1.0, 2.0)
                await page.keyboard.type(comment_text, delay=random.randint(30, 70))
                await self.human.short_pause(2.0, 3.5)
                await page.keyboard.press("Enter")
                await self.human.short_pause(3.0, 5.0)
                print("✨ [Facebook] First comment posted successfully!")
            else:
                print("ℹ️ [Facebook] First comment textbox not immediately found.")
        except Exception as e:
            print(f"ℹ️ [Facebook] First comment note: {e}")

    async def search_and_engage_groups(self, page, group_query: str):
        """Discovers active niche WordPress groups, enters relevant public groups, likes and leaves helpful comments."""
        print(f"\n👥 [Facebook Groups] Exploring niche groups for: '{group_query}'...")
        try:
            encoded_q = urllib.parse.quote(group_query)
            groups_search_url = f"https://www.facebook.com/search/groups/?q={encoded_q}"
            await page.goto(groups_search_url, wait_until="domcontentloaded")
            await self.human.short_pause(5.0, 8.0)
            await self.human.natural_scroll(page, scrolls=2)

            # Click on the first relevant group result
            group_links = page.locator("div[role='main'] a[href*='/groups/']").first
            if await group_links.is_visible():
                print(f"📖 [Facebook Groups] Visiting active group...")
                await group_links.click()
                await self.human.short_pause(5.0, 9.0)
                await self.human.natural_scroll(page, scrolls=2)
                await self.human.lazy_delay(f"Browsing discussions in {group_query} group")

                # Like a quality post inside the group
                like_btns = page.locator("div[aria-label='Like'][role='button'], div[aria-label='Like']")
                if await like_btns.count() > 0:
                    print("❤️ [Facebook Groups] Liking an interesting discussion inside the group...")
                    await like_btns.first.click()
                    await self.human.short_pause(2.0, 5.0)

                # Leave a helpful human comment on a discussion in group
                comment_trigger = page.locator("div[aria-label='Leave a comment'][role='button'], div[aria-label='Write a comment'][role='button'], div[role='button']:has-text('Comment')").first
                if await comment_trigger.is_visible():
                    print("💬 [Facebook Groups] Opening comment box on a group post...")
                    await comment_trigger.click()
                    await self.human.short_pause(2.0, 4.0)

                    comment_box = page.locator("div[role='textbox'][contenteditable='true']").first
                    if await comment_box.is_visible():
                        niche_comment = self.generator.generate_facebook_niche_comment()
                        print(f"✍️ [Facebook Groups] Typing helpful comment:\n\"{niche_comment}\"")
                        await comment_box.click()
                        await self.human.short_pause(1.0, 2.0)
                        await page.keyboard.type(niche_comment, delay=random.randint(40, 90))
                        await self.human.short_pause(2.0, 4.0)
                        await page.keyboard.press("Enter")
                        await self.human.short_pause(3.0, 6.0)
                        print("🎉 [Facebook Groups] Group comment posted successfully!")

                await self.human.lazy_delay("Group engagement completed")
            else:
                print("ℹ️ [Facebook Groups] No direct public group links immediately found.")
        except Exception as e:
            print(f"⚠️ [Facebook Groups] Group engagement note: {e}")

    async def search_and_engage_niche(self, page, query: str):
        print(f"\n🔍 [Facebook Posts] Searching niche discussions: '{query}'...")
        try:
            encoded_q = urllib.parse.quote(query)
            search_url = f"https://www.facebook.com/search/posts/?q={encoded_q}"
            await page.goto(search_url, wait_until="domcontentloaded")
            await self.human.short_pause(5.0, 8.0)
            await self.human.natural_scroll(page, scrolls=2)

            like_btns = page.locator("div[aria-label='Like'][role='button'], div[aria-label='Like']")
            if await like_btns.count() > 0:
                print("❤️ [Facebook Posts] Giving an organic like to a top niche post...")
                await like_btns.first.click()
                await self.human.short_pause(2.0, 5.0)

            # Click Comment trigger & Leave Short Natural Comment
            comment_trigger = page.locator("div[aria-label='Leave a comment'][role='button'], div[aria-label='Write a comment'][role='button'], div[role='button']:has-text('Comment')").first
            if await comment_trigger.is_visible():
                print("💬 [Facebook Posts] Opening comment on a top niche discussion...")
                await comment_trigger.click()
                await self.human.short_pause(2.0, 4.0)

                comment_box = page.locator("div[role='textbox'][contenteditable='true']").first
                if await comment_box.is_visible():
                    niche_comment = self.generator.generate_facebook_niche_comment()
                    print(f"✍️ [Facebook Posts] Typing niche comment: \"{niche_comment}\"")
                    await comment_box.click()
                    await self.human.short_pause(1.0, 2.0)
                    await page.keyboard.type(niche_comment, delay=random.randint(40, 90))
                    await self.human.short_pause(2.0, 4.0)
                    await page.keyboard.press("Enter")
                    await self.human.short_pause(3.0, 6.0)
                    print("🎉 [Facebook Posts] Natural niche comment posted successfully!")

            await self.human.lazy_delay(f"Finished engaging on '{query}'")
        except Exception as e:
            print(f"⚠️ [Facebook Posts] Niche search engagement note: {e}")

    async def search_and_like_niche_pages(self, page, page_query: str):
        print(f"\n👥 [Facebook Pages] Discovering targeted industry pages: '{page_query}'...")
        try:
            encoded_q = urllib.parse.quote(page_query)
            search_url = f"https://www.facebook.com/search/pages/?q={encoded_q}"
            await page.goto(search_url, wait_until="domcontentloaded")
            await self.human.short_pause(4.0, 7.0)
            await self.human.natural_scroll(page, scrolls=2)

            follow_btns = page.locator("div[role='button']:has-text('Follow'), div[aria-label*='Follow'][role='button']")
            if await follow_btns.count() > 0:
                print(f"➕ [Facebook Pages] Following a targeted WordPress industry page...")
                await follow_btns.first.click()
                await self.human.short_pause(3.0, 6.0)

            await self.human.lazy_delay("Industry networking completed")
        except Exception as e:
            print(f"⚠️ [Facebook Pages] Page networking note: {e}")
