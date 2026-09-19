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
        await page.goto("https://www.facebook.com/", wait_until="commit")
        await self.human.short_pause(4.0, 7.0)

        # 1. Verify Login
        if "login" in page.url or "checkpoint" in page.url:
            print("⚠️ [Facebook] Not logged in. Please run python launch_native_chrome.py and log into Facebook.")
            await page.close()
            return

        pages_config = self.config.get("facebook_pages", [])
        if not pages_config:
            pages_config = [{"name": "AI Marketing Expert", "niche": "ai_marketing", "language": "english"}]

        for idx, page_info in enumerate(pages_config, 1):
            page_name = page_info.get("name", "Page")
            page_url = page_info.get("url", "")
            niche = page_info.get("niche", "general")
            is_bangla = page_info.get("language") == "bangla"

            print("\n" + "="*52)
            print(f"📘 [Facebook ({idx}/{len(pages_config)})] Operating for: {page_name}")
            print(f"🎯 Niche: {niche} | Language: {page_info.get('language')}")
            print("="*52)

            # Switch identity to target page
            switched = await self.ensure_page_identity(page, page_name, page_url)
            if not switched:
                print(f"⚠️ [Facebook] Could not guarantee identity for '{page_name}'. Skipping to prevent accidental personal posts.")
                continue

            # Create authentic page post
            await self.create_page_post(page, page_info)
            await self.human.short_pause(3.0, 6.0)

            # Targeted Networking (Pages & Posts)
            targeting = page_info.get("targeting", {})
            page_queries = targeting.get("page_queries", ["Parenting BD" if is_bangla else "WordPress Web Agency"])
            post_queries = targeting.get("post_queries", ["প্যারেন্টিং টিপস" if is_bangla else "#WordPress web design"])
            group_queries = targeting.get("group_queries", [])

            # 1. Discover & follow relevant niche pages
            if page_queries:
                chosen_pq = random.choice(page_queries)
                await self.search_and_like_niche_pages(page, chosen_pq, page_name)
                await self.human.short_pause(2.5, 5.0)

            # 2. Like & leave supportive comments on top niche discussions
            if post_queries:
                chosen_post_q = random.choice(post_queries)
                await self.search_and_engage_niche(page, chosen_post_q, is_bangla=is_bangla)
                await self.human.short_pause(2.5, 5.0)

            # 3. Explore relevant community groups (50% chance)
            if group_queries and random.random() < 0.50:
                chosen_gq = random.choice(group_queries)
                await self.search_and_engage_groups(page, chosen_gq, is_bangla=is_bangla)

            await self.human.short_pause(5.0, 8.0)

        print("\n✅ [Facebook] Safe official marketing & networking session completed for all pages.")
        await page.close()

    async def get_active_profile_name(self, page) -> str:
        """Determines the active Facebook profile name with high accuracy."""
        try:
            # 1. Check aria-label or img alt on top-right avatar button
            avatar_btn = page.locator("div[aria-label='Your profile'], div[aria-label='Account controls and settings'], div[aria-label*='প্রোফাইল']").first
            if await avatar_btn.is_visible():
                btn_label = (await avatar_btn.get_attribute("aria-label")) or ""
                img_alt = await avatar_btn.locator("img").first.get_attribute("alt") if await avatar_btn.locator("img").count() > 0 else ""
                combined = f"{btn_label} {img_alt}".lower()
                if "টুকটুকি" in combined:
                    return "টুকটুকি ওয়ার্ল্ড"
                if "ai marketing" in combined or "marketing expert" in combined:
                    return "AI Marketing Expert"
                if "nur alam" in combined:
                    return "Nur Alam"

            # 2. Check composer placeholder on current view
            composer = page.locator("div[role='region'] div[role='button'], div[role='main'] div[role='button'], div[role='button']").filter(has_text="mind").first
            if await composer.is_visible():
                c_text = (await composer.inner_text()).lower()
                if "টুকটুকি" in c_text:
                    return "টুকটুকি ওয়ার্ল্ড"
                if "ai marketing" in c_text:
                    return "AI Marketing Expert"

            # 3. Check avatar popup header text
            if await avatar_btn.is_visible():
                await avatar_btn.click()
                await self.human.short_pause(1.5, 2.5)
                dialog = page.locator("div[role='dialog'], div[role='menu']").first
                if await dialog.is_visible():
                    text = await dialog.inner_text()
                    first_line = text.split('\n')[0].strip() if text else ""
                    await page.keyboard.press("Escape")
                    await self.human.short_pause(1.0, 1.5)
                    if "টুকটুকি" in first_line:
                        return "টুকটুকি ওয়ার্ল্ড"
                    if "ai marketing" in first_line.lower():
                        return "AI Marketing Expert"
                    if "nur alam" in first_line.lower():
                        return "Nur Alam"
                    return first_line

            return "Unknown"
        except Exception:
            return "Unknown"

    def is_name_match(self, current: str, target: str) -> bool:
        if not current or not target:
            return False
        c = current.lower()
        t = target.lower()
        if "টুকটুকি" in t and "টুকটুকি" in c:
            return True
        if "ai marketing" in t and ("ai marketing" in c or "marketing expert" in c):
            return True
        if "nur alam" in t and "nur alam" in c:
            return True
        return t in c or c in t

    async def ensure_page_identity(self, page, target_name: str, target_url: str = "") -> bool:
        """Ensures active Facebook identity matches target_name using on-page switch or avatar menu with strict verification."""
        print(f"🔍 [Facebook] Verifying active identity for '{target_name}'...")
        
        # Step 0: Check if already active
        current = await self.get_active_profile_name(page)
        if self.is_name_match(current, target_name):
            print(f"✅ [Facebook] Already operating as '{target_name}'.")
            return True

        print(f"ℹ️ [Facebook] Currently active as: '{current}'. Switch required for '{target_name}'.")

        # Step 1: Try direct page URL and on-page Switch button
        if target_url:
            try:
                print(f"🌐 [Facebook] Navigating to page URL: {target_url}...")
                await page.goto(target_url, wait_until="commit")
                await self.human.short_pause(4.0, 6.0)

                switch_btn = page.locator("div[role='button']").filter(has_text="Switch").or_(
                    page.locator("div[role='button']").filter(has_text="সুইচ")
                ).first

                if await switch_btn.is_visible():
                    print(f"🔄 [Facebook] Clicking on-page Switch button for '{target_name}'...")
                    await switch_btn.click()
                    await self.human.short_pause(2.0, 3.5)

                    # Handle confirmation dialog if it appears
                    dialog = page.locator("div[role='dialog']").first
                    if await dialog.is_visible():
                        confirm_btn = dialog.locator("div[role='button'], button").filter(has_text="Switch").or_(
                            dialog.locator("div[role='button'], button").filter(has_text="সুইচ")
                        ).first
                        if await confirm_btn.is_visible():
                            print("🔄 [Facebook] Clicking confirmation Switch button inside modal...")
                            await confirm_btn.click()

                    await self.human.short_pause(6.0, 9.0)
                    current = await self.get_active_profile_name(page)
                    if self.is_name_match(current, target_name):
                        print(f"✨ [Facebook] Successfully switched identity to '{target_name}' via Page URL!")
                        return True
            except Exception as e:
                print(f"ℹ️ [Facebook] Note during Page URL switch: {e}")

        # Step 2: Try top-right Avatar Switcher Menu
        try:
            avatar_btn = page.locator("div[aria-label='Your profile'], div[aria-label='Account controls and settings'], div[aria-label*='প্রোফাইল']").first
            if await avatar_btn.is_visible():
                await avatar_btn.click()
                await self.human.short_pause(2.5, 4.0)

                dialog = page.locator("div[role='dialog'], div[role='menu']").first
                if await dialog.is_visible():
                    search_key = "টুকটুকি" if "টুকটুকি" in target_name else target_name
                    target_btn = dialog.locator("div[role='button'], a[role='link']").filter(has_text=search_key).first
                    
                    if not await target_btn.is_visible():
                        see_all = dialog.locator("div[role='button'], a[role='link']").filter(has_text="See all profiles").or_(
                            dialog.locator("div[role='button'], a[role='link']").filter(has_text="সব প্রোফাইল দেখুন")
                        ).first
                        if await see_all.is_visible():
                            await see_all.click()
                            await self.human.short_pause(2.0, 3.5)
                            target_btn = dialog.locator("div[role='button'], a[role='link']").filter(has_text=search_key).first

                    if await target_btn.is_visible():
                        print(f"🔄 [Facebook] Clicking profile switcher item for '{target_name}'...")
                        await target_btn.click()
                        await self.human.short_pause(2.5, 4.0)

                        # Check if a confirmation dialog appeared
                        confirm_dialog = page.locator("div[role='dialog']").first
                        if await confirm_dialog.is_visible():
                            confirm_btn = confirm_dialog.locator("div[role='button'], button").filter(has_text="Switch").or_(
                                confirm_dialog.locator("div[role='button'], button").filter(has_text="সুইচ")
                            ).first
                            if await confirm_btn.is_visible():
                                await confirm_btn.click()

                        await self.human.short_pause(6.0, 9.0)
                    else:
                        await page.keyboard.press("Escape")
                        await self.human.short_pause(1.0, 2.0)
        except Exception as e:
            print(f"ℹ️ [Facebook] Note during avatar switcher: {e}")

        # Step 3: CRITICAL FINAL VERIFICATION
        current = await self.get_active_profile_name(page)
        if self.is_name_match(current, target_name):
            print(f"✨ [Facebook] Identity confirmed: now operating as '{target_name}'.")
            return True

        print("\n" + "!"*65)
        print(f"🚨 [Facebook IDENTITY SWITCH FAILED]")
        print(f"   Target expected: '{target_name}'")
        print(f"   Actual on screen: '{current}'")
        print(f"⛔ Skipping operations for '{target_name}' to prevent cross-posting!")
        print("!"*65 + "\n")
        return False

    async def create_page_post(self, page, page_info: dict):
        page_name = page_info.get("name", "Page")
        niche = page_info.get("niche", "general")
        is_bangla = page_info.get("language") == "bangla"

        # FAIL-SAFE GUARD: Verify identity matches before typing anything
        active_identity = await self.get_active_profile_name(page)
        if not self.is_name_match(active_identity, page_name):
            print("\n" + "!"*65)
            print(f"🛑 [CRITICAL SAFETY GUARD] Identity mismatch in create_page_post!")
            print(f"   Target Page: '{page_name}'")
            print(f"   Active Identity on Facebook: '{active_identity}'")
            print(f"⛔ Aborting post immediately to protect brand integrity!")
            print("!"*65 + "\n")
            return

        print(f"✍️ [Facebook] Preparing to compose an organic value post for {page_name}...")
        try:
            # First try finding composer directly on current view (feed or page profile)
            composer = page.locator("div[role='region'] div[role='button'], div[role='main'] div[role='button']").filter(has_text="What's on your mind").first
            if not await composer.is_visible():
                composer = page.locator("div[role='button']").filter(has_text="mind").first

            if not await composer.is_visible():
                # Try navigating to home if not on feed
                print("🌐 [Facebook] Navigating to Facebook home to access main composer...")
                await page.goto("https://www.facebook.com/", wait_until="commit")
                await self.human.short_pause(3.0, 5.0)
                composer = page.locator("div[role='region'] div[role='button'], div[role='main'] div[role='button']").filter(has_text="What's on your mind").first
                if not await composer.is_visible():
                    composer = page.locator("div[role='button']").filter(has_text="mind").first

            if await composer.is_visible():
                print(f"🎯 [Facebook] Opening Create Post composer for {page_name}...")
                await composer.click()
                await self.human.short_pause(2.5, 4.5)

                editor = page.locator("div[role='dialog'] div[role='textbox'], div[role='dialog'] div[contenteditable='true']").first
                if await editor.is_visible():
                    product_url = None
                    if is_bangla or niche == "parenting_kids":
                        post_data = self.generator.generate_tuktuki_post()
                        post_caption = post_data.get("caption")
                        topic = post_data.get("topic", "parenting")
                    else:
                        post_data = self.generator.generate_facebook_page_post()
                        post_caption = post_data.get("caption")
                        topic = post_data.get("topic", "ai_marketing")
                        product_url = post_data.get("url")

                    print(f"📝 [Facebook] Typing post ({topic}):\n{post_caption}\n")
                    await self.human.human_type(page, post_caption, element=editor)
                    await self.human.short_pause(2.0, 4.0)

                    # High-Resolution Visual Photo Attachment:
                    # For Tuktuki World / parenting_kids: ~90% probability with crystal-clear, photorealistic cute baby, toy, and mother visuals
                    # For AI Marketing: 40% probability with modern tech/workflow visuals
                    attach_prob = 0.90 if (is_bangla or niche == "parenting_kids") else 0.40
                    should_attach_photo = random.random() < attach_prob

                    if should_attach_photo:
                        image_path = self.img_generator.generate_image_for_post(topic=topic)
                        
                        if image_path and os.path.exists(image_path):
                            print(f"🖼️ [Facebook] Attaching High-Res Visual Photo ({topic}): {os.path.basename(image_path)}")
                            photo_icon_btn = page.locator("div[role='dialog'] div[aria-label*='Photo/video'], div[role='dialog'] div[aria-label*='photo'], div[role='dialog'] div[aria-label*='ছবি/ভিডিও'], div[role='dialog'] div[aria-label*='ছবি']").first
                            if await photo_icon_btn.is_visible():
                                try:
                                    await photo_icon_btn.click()
                                except Exception:
                                    await photo_icon_btn.dispatch_event("click")
                                await self.human.short_pause(2.0, 3.5)

                            file_input = page.locator("div[role='dialog'] input[type='file']").first
                            if await file_input.count() > 0:
                                await file_input.set_input_files(image_path)
                                await self.human.short_pause(5.0, 8.0)
                                print("✨ [Facebook] High-Res Visual Photo uploaded and attached to post!")

                    # STEP 1: Click the Primary Action Button ('Next' or 'Post')
                    primary_btn = page.locator("div[role='dialog'] div[aria-label='Next'][role='button'], div[role='dialog'] div[aria-label='Post'][role='button'], div[role='dialog'] div[role='button']:has-text('Next'), div[role='dialog'] div[role='button']:has-text('Post')").last
                    
                    if await primary_btn.is_visible():
                        btn_txt = await primary_btn.inner_text()
                        print(f"🚀 [Facebook] Clicking primary action button ('{btn_txt.strip()}')...")
                        try:
                            await primary_btn.click(timeout=6000)
                        except Exception:
                            await primary_btn.dispatch_event("click")

                        await self.human.short_pause(2.5, 4.5)

                        # STEP 2: Handle Page Post Final Step ('Publish' / 'Post' modal)
                        final_publish_btn = page.locator("div[role='dialog'] div[aria-label='Publish'][role='button'], div[role='dialog'] div[aria-label='Post'][role='button'], div[role='dialog'] div[role='button']:has-text('Publish'), div[role='dialog'] div[role='button']:has-text('Post')").last
                        if await final_publish_btn.is_visible():
                            print("🚀 [Facebook] Clicking final 'Publish' button...")
                            try:
                                await final_publish_btn.click(timeout=6000)
                            except Exception:
                                await final_publish_btn.dispatch_event("click")
                            await self.human.short_pause(5.0, 8.0)

                        print(f"🎉 [Facebook] Post successfully published for {page_name}!")

                        # First comment with product link if applicable
                        comment_links = page_info.get("comment_links", [])
                        if product_url or comment_links:
                            link_to_post = product_url or (random.choice(comment_links) if comment_links else None)
                            if link_to_post:
                                await self.post_first_comment_under_our_post(page, link_to_post)
                                await self.human.short_pause(3.0, 5.0)
                    else:
                        print("⚠️ [Facebook] Post / Next button not found in modal.")
            else:
                print("ℹ️ [Facebook] Create Post box not found on feed.")
        except Exception as e:
            print(f"⚠️ [Facebook] Post composition error: {e}")

    async def post_first_comment_under_our_post(self, page, product_url: str):
        try:
            print("💬 [Facebook] Dropping 1st comment with matching official link under OUR post...")
            await self.human.short_pause(3.0, 5.0)
            await page.mouse.wheel(0, 400)
            await self.human.short_pause(1.5, 3.0)

            trigger = page.locator("div[aria-label='Leave a comment'][role='button'], div[aria-label='Write a comment'][role='button'], div[role='button']:has-text('Comment')").first
            if await trigger.is_visible():
                try:
                    await trigger.scroll_into_view_if_needed()
                    await trigger.click(force=True, timeout=5000)
                except Exception:
                    await trigger.dispatch_event("click")
                await self.human.short_pause(1.5, 3.0)

            comment_box = page.locator("div[role='textbox'][contenteditable='true']").first
            if await comment_box.is_visible():
                comment_text = f"Explore or download directly here: {product_url}"
                print(f"📝 [Facebook] Typing 1st Comment: {comment_text}")
                await self.human.human_type(page, comment_text, element=comment_box)
                await self.human.short_pause(1.5, 3.0)
                await page.keyboard.press("Enter")
                await self.human.short_pause(3.0, 5.0)
                print("✨ [Facebook] First comment posted successfully!")
            else:
                print("ℹ️ [Facebook] First comment textbox not immediately found.")
        except Exception as e:
            print(f"ℹ️ [Facebook] First comment note: {e}")

    async def search_and_engage_groups(self, page, group_query: str, is_bangla: bool = False):
        print(f"\n👥 [Facebook Groups] Exploring niche groups for: '{group_query}'...")
        try:
            encoded_q = urllib.parse.quote(group_query)
            groups_search_url = f"https://www.facebook.com/search/groups/?q={encoded_q}"
            await page.goto(groups_search_url, wait_until="domcontentloaded")
            await self.human.short_pause(4.0, 6.0)
            await self.human.natural_scroll(page, scrolls=2)

            group_links = page.locator("div[role='main'] a[href*='/groups/']").first
            if await group_links.is_visible():
                print("📖 [Facebook Groups] Visiting active group...")
                await group_links.click()
                await self.human.short_pause(4.0, 7.0)
                await self.human.natural_scroll(page, scrolls=2)

                like_btns = page.locator("div[aria-label='Like'][role='button'], div[aria-label='Like']")
                if await like_btns.count() > 0:
                    print("❤️ [Facebook Groups] Liking a discussion inside the group...")
                    await like_btns.first.click()
                    await self.human.short_pause(1.5, 3.5)

                comment_trigger = page.locator("div[aria-label='Leave a comment'][role='button'], div[aria-label='Write a comment'][role='button'], div[role='button']:has-text('Comment')").first
                if await comment_trigger.is_visible():
                    print("💬 [Facebook Groups] Opening comment box on a group post...")
                    try:
                        await comment_trigger.scroll_into_view_if_needed()
                        await comment_trigger.click(force=True, timeout=5000)
                    except Exception:
                        await comment_trigger.dispatch_event("click")
                    await self.human.short_pause(2.0, 4.0)

                    comment_box = page.locator("div[role='textbox'][contenteditable='true']").first
                    if await comment_box.is_visible():
                        niche_comment = self.generator.generate_tuktuki_comment() if is_bangla else self.generator.generate_facebook_niche_comment()
                        print(f"✍️ [Facebook Groups] Typing helpful comment:\n\"{niche_comment}\"")
                        await self.human.human_type(page, niche_comment, element=comment_box)
                        await self.human.short_pause(1.5, 3.0)
                        await page.keyboard.press("Enter")
                        await self.human.short_pause(3.0, 5.0)
                        print("🎉 [Facebook Groups] Group comment posted successfully!")
            else:
                print("ℹ️ [Facebook Groups] No direct public group links found.")
        except Exception as e:
            print(f"⚠️ [Facebook Groups] Group engagement note: {e}")

    async def search_and_engage_niche(self, page, query: str, is_bangla: bool = False):
        print(f"\n🔍 [Facebook Posts] Searching niche discussions: '{query}'...")
        try:
            encoded_q = urllib.parse.quote(query)
            search_url = f"https://www.facebook.com/search/posts/?q={encoded_q}"
            await page.goto(search_url, wait_until="domcontentloaded")
            await self.human.short_pause(4.0, 6.0)
            await self.human.natural_scroll(page, scrolls=2)

            like_btns = page.locator("div[aria-label='Like'][role='button'], div[aria-label='Like']")
            if await like_btns.count() > 0:
                print("❤️ [Facebook Posts] Giving an organic like to a top niche post...")
                await like_btns.first.click()
                await self.human.short_pause(1.5, 3.5)

            comment_trigger = page.locator("div[aria-label='Leave a comment'][role='button'], div[aria-label='Write a comment'][role='button'], div[role='button']:has-text('Comment')").first
            if await comment_trigger.is_visible():
                print("💬 [Facebook Posts] Opening comment on a top niche discussion...")
                try:
                    await comment_trigger.scroll_into_view_if_needed()
                    await comment_trigger.click(force=True, timeout=5000)
                except Exception:
                    await comment_trigger.dispatch_event("click")
                await self.human.short_pause(2.0, 4.0)

                comment_box = page.locator("div[role='textbox'][contenteditable='true']").first
                if await comment_box.is_visible():
                    niche_comment = self.generator.generate_tuktuki_comment() if is_bangla else self.generator.generate_facebook_niche_comment()
                    print(f"✍️ [Facebook Posts] Typing niche comment: \"{niche_comment}\"")
                    await self.human.human_type(page, niche_comment, element=comment_box)
                    await self.human.short_pause(1.5, 3.0)
                    await page.keyboard.press("Enter")
                    await self.human.short_pause(3.0, 5.0)
                    print("🎉 [Facebook Posts] Natural niche comment posted successfully!")
        except Exception as e:
            print(f"⚠️ [Facebook Posts] Niche search engagement note: {e}")

    async def search_and_like_niche_pages(self, page, page_query: str, page_name: str = ""):
        print(f"\n👥 [Facebook Pages] Discovering targeted pages for '{page_name}': '{page_query}'...")
        try:
            encoded_q = urllib.parse.quote(page_query)
            search_url = f"https://www.facebook.com/search/pages/?q={encoded_q}"
            await page.goto(search_url, wait_until="commit")
            await self.human.short_pause(3.0, 6.0)
            await self.human.natural_scroll(page, scrolls=2)

            follow_btns = page.locator("div[role='button']:has-text('Follow'), div[aria-label*='Follow'][role='button']")
            if await follow_btns.count() > 0:
                print(f"➕ [Facebook Pages] Following a targeted page related to '{page_query}'...")
                await follow_btns.first.click()
                await self.human.short_pause(2.0, 4.0)
        except Exception as e:
            print(f"⚠️ [Facebook Pages] Page networking note: {e}")
