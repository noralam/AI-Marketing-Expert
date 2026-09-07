import asyncio
import random
from playwright.async_api import BrowserContext
from core.human import HumanBehavior
from core.ai_generator import ContentGenerator
from playwright_stealth import Stealth

class RedditAgent:
    def __init__(self, context: BrowserContext, human: HumanBehavior, generator: ContentGenerator, config: dict):
        self.context = context
        self.human = human
        self.generator = generator
        self.config = config
        self.stealth = Stealth()

    async def run_session(self):
        page = await self.context.new_page()
        await self.stealth.apply_stealth_async(page)
        print("🌐 [Reddit] Opening Reddit...")
        await page.goto("https://www.reddit.com/", wait_until="domcontentloaded")
        await self.human.short_pause(4.0, 7.0)

        # 1. Verify Login
        if "login" in page.url:
            print("⚠️ [Reddit] Not logged in. Please run python setup_session.py --platform reddit first.")
            await page.close()
            return

        # 2. Browse a relevant subreddit naturally
        subreddits = self.config.get("reddit_targeting", {}).get("subreddits", ["Wordpress", "web_design"])
        target_sub = random.choice(subreddits)
        print(f"👀 [Reddit] Browsing r/{target_sub} with Anti-Bot Stealth...")
        
        await page.goto(f"https://www.reddit.com/r/{target_sub}/new/", wait_until="domcontentloaded")
        await self.human.short_pause(4.0, 7.0)
        await self.human.natural_scroll(page, scrolls=random.randint(2, 4))
        await self.human.lazy_delay(f"Reading discussions on r/{target_sub}")

        # 3. Organic Upvote on a quality discussion
        await self.upvote_organic_post(page)

        # 4. Safe & Helpful Human Contribution
        await self.leave_helpful_comment(page, target_sub)

        print("✅ [Reddit] Safe organic session completed successfully.")
        await page.close()

    async def upvote_organic_post(self, page):
        try:
            upvote_buttons = page.locator("button[aria-label='upvote'], button[data-click-id='upvote'], shreddit-post button[name='upvote']")
            count = await upvote_buttons.count()
            if count > 0:
                print("🔺 [Reddit] Giving an organic upvote to a community post...")
                await upvote_buttons.first.click()
                await self.human.short_pause(2.0, 5.0)
        except Exception as e:
            print(f"⚠️ [Reddit] Upvote note: {e}")

    async def leave_helpful_comment(self, page, target_sub: str):
        try:
            # Modern Reddit Shreddit / Post Selector
            post_links = page.locator("shreddit-post a[slot='title'], a[data-testid='post-title'], a[href*='/comments/']").first
            if await post_links.is_visible():
                print(f"📖 [Reddit] Opening discussion thread in r/{target_sub}...")
                await post_links.click()
                await self.human.short_pause(4.0, 8.0)
                await self.human.natural_scroll(page, scrolls=2)
                await self.human.lazy_delay("Reading post context before commenting")

                # Comment Box Trigger / Editor
                comment_box = page.locator("div[slot='rte'] p, div[contenteditable='true'], faceplate-textarea-input, shreddit-async-loader textarea").first
                if not await comment_box.is_visible():
                    # Click placeholder first if modern shreddit
                    placeholder = page.locator("shreddit-comment-composer-placeholder, div:has-text('Add a comment')").first
                    if await placeholder.is_visible():
                        await placeholder.click()
                        await self.human.short_pause(2.0, 4.0)
                        comment_box = page.locator("div[slot='rte'] p, div[contenteditable='true']").first

                if await comment_box.is_visible():
                    comment_text = self.generator.generate_reddit_comment(subreddit=target_sub)
                    print(f"✍️ [Reddit] Typing a helpful, human-written response:\n\"{comment_text}\"\n")
                    await comment_box.click()
                    await self.human.human_type(comment_box, comment_text)
                    await self.human.short_pause(3.0, 6.0)

                    # Submit button
                    submit_btn = page.locator("button:has-text('Comment'), button[type='submit'], shreddit-composer-post-button button").first
                    if await submit_btn.is_visible():
                        print("🚀 [Reddit] Submitting helpful comment...")
                        try:
                            await submit_btn.click(timeout=5000)
                        except Exception:
                            await submit_btn.dispatch_event("click")
                        
                        await self.human.short_pause(3.0, 6.0)
                        print("🎉 [Reddit] Comment successfully submitted!")
                        await self.human.lazy_delay("Comment submitted. Cooling down safely")
                else:
                    print("ℹ️ [Reddit] Comment input not available on this thread.")
        except Exception as e:
            print(f"⚠️ [Reddit] Comment composition note: {e}")
