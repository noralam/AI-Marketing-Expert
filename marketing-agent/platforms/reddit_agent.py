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
        subreddits = self.config.get("reddit_targeting", {}).get("subreddits", ["SideProject", "webdev", "Wordpress", "WordPressPlugins"])
        target_sub = random.choice(subreddits)
        print(f"👀 [Reddit] Browsing r/{target_sub} for safe zero-karma engagement...")
        
        try:
            await page.goto(f"https://www.reddit.com/r/{target_sub}/new/", wait_until="commit")
        except Exception:
            pass
        await self.human.short_pause(4.0, 7.0)
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
            # Locate posts on feed
            posts = page.locator("shreddit-post")
            count = await posts.count()
            
            if count == 0:
                print(f"ℹ️ [Reddit] No immediate threads found in r/{target_sub}.")
                return

            max_tries = min(5, count)
            comment_posted = False

            for i in range(max_tries):
                post_el = posts.nth(i)
                if not await post_el.is_visible():
                    continue

                # Check if post is locked in feed
                is_post_locked = await post_el.evaluate("el => el.hasAttribute('locked')")
                if is_post_locked:
                    continue

                # Get title and navigate via title link
                title_el = post_el.locator("a[slot='title']").first
                if not await title_el.is_visible():
                    continue
                post_title = (await title_el.inner_text()).strip()
                print(f"📖 [Reddit] Evaluating thread ({i+1}/{max_tries}): \"{post_title[:60]}...\"")

                try:
                    await title_el.click(force=True, timeout=5000)
                except Exception:
                    href = await title_el.get_attribute("href")
                    if href:
                        thread_url = href if href.startswith("http") else f"https://www.reddit.com{href}"
                        await page.goto(thread_url, wait_until="commit")

                await self.human.short_pause(4.0, 6.5)

                # Step A: Check if thread is locked or archived
                is_locked = await page.locator("shreddit-post[locked], [slot='locked-indicator'], :text('Comments are locked')").count() > 0
                if is_locked:
                    print("ℹ️ [Reddit] Thread is locked/archived. Going back...")
                    await page.go_back(wait_until="commit")
                    await self.human.short_pause(2.5, 4.5)
                    continue

                # Step B: Scroll to bring comment area into view
                await page.evaluate("window.scrollBy(0, 450)")
                await self.human.short_pause(2.0, 3.5)

                # Step C: Trigger Comment / Reply Box
                reply_btn = page.locator("button:has-text('Reply')").first
                if await reply_btn.is_visible():
                    print("🎯 [Reddit] Replying to active discussion thread...")
                    await reply_btn.click(force=True)
                    await self.human.short_pause(1.5, 3.0)
                else:
                    placeholder = page.locator("shreddit-comment-composer-placeholder, :text('Join the conversation'), [aria-label*='Add a comment']").first
                    if await placeholder.is_visible():
                        print("🎯 [Reddit] Opening top comment composer...")
                        try:
                            await placeholder.click(force=True, timeout=4000)
                        except Exception:
                            await placeholder.dispatch_event("click")
                        await self.human.short_pause(1.5, 3.0)

                comment_box = page.locator("faceplate-form div[contenteditable='true'], shreddit-comment-composer div[contenteditable='true'], [aria-label*='Reply to'] div[contenteditable='true'], div[slot='rte'] p").last
                if await comment_box.is_visible():
                    comment_text = self.generator.generate_reddit_comment(subreddit=target_sub)
                    print(f"✍️ [Reddit] Typing a helpful, human-written response:\n\"{comment_text}\"\n")
                    await self.human.human_type(page, comment_text, element=comment_box)
                    await self.human.short_pause(2.0, 4.0)

                    # Submit button
                    submit_btn = page.locator("faceplate-form button:has-text('Comment'), shreddit-comment-composer button:has-text('Comment'), button:has-text('Comment')").last
                    if await submit_btn.is_visible() and not await submit_btn.is_disabled():
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
                        await page.go_back(wait_until="commit")
                        await self.human.short_pause(2.5, 4.5)
                else:
                    print("ℹ️ [Reddit] Comment composer not active on this thread. Going back...")
                    await page.go_back(wait_until="commit")
                    await self.human.short_pause(2.5, 4.5)

            if not comment_posted:
                print(f"ℹ️ [Reddit] Finished checking top threads in r/{target_sub}.")
        except Exception as e:
            print(f"⚠️ [Reddit] Comment composition note: {e}")
