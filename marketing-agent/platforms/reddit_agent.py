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
        await self.human.short_pause(4.0, 6.0)

        # 1. Verify Login
        if "login" in page.url:
            print("⚠️ [Reddit] Not logged in. Please run python setup_session.py --platform reddit first.")
            await page.close()
            return

        # 2. Browse a relevant subreddit naturally (Prioritizes low-barrier / zero-karma friendly subs)
        subreddits = self.config.get("reddit_targeting", {}).get("subreddits", ["WordPressPlugins", "webdev", "Wordpress"])
        target_sub = random.choice(subreddits)
        print(f"👀 [Reddit] Browsing r/{target_sub} for safe zero-karma engagement...")
        
        await page.goto(f"https://www.reddit.com/r/{target_sub}/new/", wait_until="domcontentloaded")
        await self.human.short_pause(3.0, 6.0)
        await self.human.natural_scroll(page, scrolls=random.randint(2, 3))

        # 3. Organic Upvotes on 1-2 quality discussions to build community trust
        await self.upvote_organic_posts(page)

        # 4. Smart Zero-Karma Commenting on Active Non-Locked Threads
        await self.leave_helpful_comment(page, target_sub)

        print("✅ [Reddit] Safe organic session completed successfully.")
        await page.close()

    async def upvote_organic_posts(self, page):
        try:
            upvote_buttons = page.locator("button[aria-label='upvote'], button[data-click-id='upvote'], shreddit-post button[name='upvote']")
            count = await upvote_buttons.count()
            if count > 0:
                print(f"🔺 [Reddit] Giving an organic upvote to community discussion...")
                await upvote_buttons.first.click()
                await self.human.short_pause(1.5, 3.5)
        except Exception as e:
            print(f"ℹ️ [Reddit] Upvote note: {e}")

    async def leave_helpful_comment(self, page, target_sub: str):
        try:
            # Select active non-locked discussion threads
            posts = page.locator("shreddit-post a[slot='title'], a[data-testid='post-title'], a[href*='/comments/']")
            count = await posts.count()
            
            if count == 0:
                print(f"ℹ️ [Reddit] No immediate threads found in r/{target_sub}.")
                return

            # Pick from first 5 recent discussions to bypass locked/pinned posts
            max_tries = min(5, count)
            comment_posted = False

            for i in range(max_tries):
                target_post = posts.nth(i)
                if not await target_post.is_visible():
                    continue

                post_title = (await target_post.inner_text()).strip()
                print(f"📖 [Reddit] Evaluating thread ({i+1}/{max_tries}): \"{post_title[:60]}...\"")

                try:
                    await target_post.scroll_into_view_if_needed()
                    await self.human.short_pause(1.0, 2.0)
                    await target_post.click()
                except Exception:
                    continue

                await self.human.short_pause(4.0, 6.5)

                # Step A: Check if thread is locked or archived
                is_locked = await page.locator("svg[icon-name='lock-fill'], [aria-label*='locked'], [aria-label*='archived']").count() > 0
                if is_locked:
                    print("ℹ️ [Reddit] Thread is locked/archived. Going back to find next discussion...")
                    await page.go_back(wait_until="domcontentloaded")
                    await self.human.short_pause(2.5, 4.5)
                    continue

                # Step B: Trigger Comment Box
                placeholder = page.locator("shreddit-comment-composer-placeholder, div:has-text('Add a comment'), [aria-label*='Add a comment']").first
                if await placeholder.is_visible():
                    print("🎯 [Reddit] Clicking comment composer placeholder...")
                    try:
                        await placeholder.click(force=True, timeout=4000)
                    except Exception:
                        await placeholder.dispatch_event("click")
                    await self.human.short_pause(1.5, 3.0)

                comment_box = page.locator("div[slot='rte'] p, div[contenteditable='true'][role='textbox'], shreddit-comment-composer div[contenteditable='true'], div[contenteditable='true']").first
                if await comment_box.is_visible():
                    comment_text = self.generator.generate_reddit_comment(subreddit=target_sub)
                    print(f"✍️ [Reddit] Typing a helpful, human-written response:\n\"{comment_text}\"\n")
                    await self.human.human_type(page, comment_text, element=comment_box)
                    await self.human.short_pause(2.0, 4.0)

                    # Submit button
                    submit_btn = page.locator("button:has-text('Comment'), button[type='submit'], shreddit-composer-post-button button, div[slot='submit-button'] button").first
                    if await submit_btn.is_visible():
                        print("🚀 [Reddit] Submitting helpful comment...")
                        try:
                            await submit_btn.click(force=True, timeout=5000)
                        except Exception:
                            await submit_btn.dispatch_event("click")
                        
                        await self.human.short_pause(3.0, 6.0)
                        print("🎉 [Reddit] Comment successfully submitted!")
                        comment_posted = True
                        break
                    else:
                        print("⚠️ [Reddit] Submit button not accessible. Going back...")
                        await page.go_back(wait_until="domcontentloaded")
                        await self.human.short_pause(2.5, 4.5)
                else:
                    print("ℹ️ [Reddit] Comment composer not active on this thread. Going back...")
                    await page.go_back(wait_until="domcontentloaded")
                    await self.human.short_pause(2.5, 4.5)

            if not comment_posted:
                print("ℹ️ [Reddit] Finished checking top threads in r/{target_sub}.")
        except Exception as e:
            print(f"⚠️ [Reddit] Comment composition note: {e}")
