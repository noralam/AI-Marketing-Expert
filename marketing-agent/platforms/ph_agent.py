import asyncio
import random
import json
from pathlib import Path
from playwright.async_api import BrowserContext, Page
from core.human import HumanBehavior
from core.ai_generator import ContentGenerator

class ProductHuntAgent:
    def __init__(self, context: BrowserContext, human: HumanBehavior, generator: ContentGenerator, config: dict):
        self.context = context
        self.human = human
        self.generator = generator
        self.config = config
        self.history_file = Path("sessions/ph_history.json")
        self.history = self._load_history()

    def _load_history(self) -> dict:
        default_hist = {
            "commented_products": [],
            "upvoted_products": [],
            "followed_users": []
        }
        if self.history_file.exists():
            try:
                with open(self.history_file, "r", encoding="utf-8-sig") as f:
                    data = json.load(f)
                    return {
                        "commented_products": data.get("commented_products", []),
                        "upvoted_products": data.get("upvoted_products", []),
                        "followed_users": data.get("followed_users", [])
                    }
            except Exception:
                pass
        return default_hist

    def _save_history(self):
        try:
            with open(self.history_file, "w", encoding="utf-8") as f:
                json.dump(self.history, f, indent=2)
        except Exception as e:
            print(f"⚠️ [Product Hunt] Could not save history: {e}")

    async def run_session(self):
        page = await self.context.new_page()
        try:
            print("🌐 [Product Hunt] Navigating to Product Hunt homepage...")
            await page.goto("https://www.producthunt.com/", wait_until="commit")
            await self.human.short_pause(4.0, 7.0)

            # 1. Verify Login State
            is_logged_in = await self.verify_login(page)
            if not is_logged_in:
                print("⚠️ [Product Hunt] User not logged in. Please run setup_session.py to login.")
                return

            print("👀 [Product Hunt] Browsing top launches today...")
            await self.human.natural_scroll(page, scrolls=random.randint(2, 3))
            await self.human.short_pause(2.0, 4.0)

            # 2. Upvote 1-2 Fresh Products (Strictly prevents re-clicking already voted products)
            await self.upvote_featured_products(page, count=random.randint(1, 2))

            # 3. Engage with a Brand New Product (Random selection from un-commented products)
            await self.engage_with_product_launch(page)

            print("✅ [Product Hunt] Session completed smoothly.")
        except Exception as e:
            print(f"⚠️ [Product Hunt] Session note: {e}")
        finally:
            self._save_history()
            await page.close()

    async def verify_login(self, page: Page) -> bool:
        try:
            user_avatar = await page.locator("button[aria-label*='user'], [data-test='user-menu-button'], img[alt*='avatar']").count()
            login_btn = await page.locator("button:has-text('Sign in'), a[href*='/login']").count()
            if user_avatar > 0 or login_btn == 0:
                print("👤 [Product Hunt] Logged in successfully.")
                return True
            return False
        except Exception:
            return True

    async def upvote_featured_products(self, page: Page, count: int = 1):
        try:
            vote_buttons = page.locator("button[data-test='vote-button']")
            total = await vote_buttons.count()
            if total == 0:
                print("ℹ️ [Product Hunt] No vote buttons found on feed.")
                return

            voted = 0
            for i in range(min(total, 25)):
                if voted >= count:
                    break
                btn = vote_buttons.nth(i)
                if not await btn.is_visible():
                    continue

                # Inspect button state and associated product link
                btn_info = await btn.evaluate("""el => {
                    const inner = el.querySelector('div');
                    const svg = el.querySelector('svg');
                    const linkEl = el.closest('li, div, section')?.querySelector('a[href*="/products/"]');
                    return {
                        dataFilled: inner ? inner.getAttribute('data-filled') : null,
                        svgClass: svg ? svg.getAttribute('class') : '',
                        link: linkEl ? linkEl.getAttribute('href') : null
                    };
                }""")

                prod_link = btn_info.get("link") or ""
                data_filled = btn_info.get("dataFilled")
                svg_class = btn_info.get("svgClass") or ""

                # Strictly skip if already upvoted
                is_already_voted = (
                    data_filled == "true" or
                    "!fill-brand-500" in svg_class or
                    prod_link in self.history["upvoted_products"] or
                    any(p in prod_link for p in self.history["upvoted_products"] if p)
                )

                if is_already_voted:
                    if prod_link and prod_link not in self.history["upvoted_products"]:
                        self.history["upvoted_products"].append(prod_link)
                    continue

                # Upvote fresh product
                await btn.scroll_into_view_if_needed()
                await self.human.short_pause(1.0, 2.0)
                print(f"🔺 [Product Hunt] Upvoting fresh product ({prod_link or f'Launch #{i+1}'})...")
                await btn.click()
                voted += 1

                if prod_link:
                    self.history["upvoted_products"].append(prod_link)
                    self._save_history()

                await self.human.short_pause(2.0, 4.0)

            if voted == 0:
                print("ℹ️ [Product Hunt] All visible launches already upvoted. None toggled off.")
        except Exception as e:
            print(f"ℹ️ [Product Hunt] Upvote note: {e}")

    async def engage_with_product_launch(self, page: Page):
        try:
            # 1. Collect all product candidate links from homepage
            candidates = await self._collect_uncommented_products(page)

            # If homepage has no fresh products, check a category feed
            if not candidates:
                categories = self.config.get("product_hunt_targeting", {}).get("categories", ["artificial-intelligence", "developer-tools", "marketing"])
                chosen_cat = random.choice(categories)
                print(f"🔍 [Product Hunt] Homepage products already engaged. Exploring category: {chosen_cat}...")
                await page.goto(f"https://www.producthunt.com/topics/{chosen_cat}", wait_until="commit")
                await self.human.short_pause(4.0, 6.0)
                await self.human.natural_scroll(page, scrolls=2)
                candidates = await self._collect_uncommented_products(page)

            if not candidates:
                print("ℹ️ [Product Hunt] No new un-commented products available right now.")
                return

            # 2. Pick a product RANDOMLY (Ensures diverse engagement, avoids #1 repetition)
            chosen_product = random.choice(candidates)
            product_title = chosen_product["title"]
            chosen_url = chosen_product["url"]
            product_slug = chosen_product["slug"]

            print(f"🚀 [Product Hunt] Selected fresh product: \"{product_title}\" ({chosen_url})...")
            await page.goto(chosen_url, wait_until="commit")
            await self.human.short_pause(4.0, 6.5)

            # 3. Double-check on the product page itself if user already commented
            already_commented = await self._check_if_user_already_commented(page)
            if already_commented:
                print(f"⚠️ [Product Hunt] User already left a comment on \"{product_title}\". Skipping comment to prevent duplicates.")
                if product_slug not in self.history["commented_products"]:
                    self.history["commented_products"].append(product_slug)
                    self._save_history()
                return

            # 4. Follow product (if not already followed)
            await self.follow_current_product(page, product_title)

            # 5. Scroll down to Discussion section
            print("📜 [Product Hunt] Scrolling to launch discussion & reviews...")
            await page.evaluate("window.scrollBy(0, 800)")
            await self.human.short_pause(3.0, 5.0)

            # 6. Follow makers and active commenters (skips already followed users)
            await self.follow_makers_and_commenters(page)

            # 7. Upvote 1-2 constructive comments
            await self.upvote_comments(page)

            # 8. Post exactly ONE supportive maker praise comment
            posted = await self.leave_maker_comment(page, product_title)
            if posted:
                self.history["commented_products"].append(product_slug)
                if chosen_url not in self.history["commented_products"]:
                    self.history["commented_products"].append(chosen_url)
                self._save_history()
                print(f"💾 [Product Hunt] Recorded \"{product_title}\" in comment history. Will never comment on it again.")

        except Exception as e:
            print(f"⚠️ [Product Hunt] Engagement note: {e}")

    async def _collect_uncommented_products(self, page: Page) -> list:
        product_links = page.locator("a[href*='/products/']")
        count = await product_links.count()
        candidates = []
        seen_slugs = set()

        for i in range(min(count, 35)):
            link = product_links.nth(i)
            href = await link.get_attribute("href")
            if not href or "/products/" not in href or href.endswith("/products/"):
                continue

            slug = href.split("/products/")[-1].split("/")[0].split("?")[0].strip()
            if not slug or slug in seen_slugs:
                continue
            seen_slugs.add(slug)

            # Check history
            is_already_commented = (
                slug in self.history["commented_products"] or
                f"/products/{slug}" in self.history["commented_products"] or
                any(slug in item for item in self.history["commented_products"] if item)
            )
            if is_already_commented:
                continue

            txt = (await link.inner_text()).strip()
            title = txt.split("\n")[0] if txt else slug
            full_url = href if href.startswith("http") else f"https://www.producthunt.com{href}"
            candidates.append({
                "title": title,
                "url": full_url,
                "slug": slug
            })

        return candidates

    async def _check_if_user_already_commented(self, page: Page) -> bool:
        try:
            # Scroll down to ensure discussion stream is hydrated
            await page.evaluate("window.scrollBy(0, 700)")
            await asyncio.sleep(2)
            feed = page.locator("[data-test='comments-feed']")
            if await feed.is_visible():
                user_match = await feed.locator(":text('Noor Alam'), a[href*='noor_alam']").count()
                return user_match > 0
            return False
        except Exception:
            return False

    async def follow_current_product(self, page: Page, product_title: str):
        try:
            follow_btns = page.locator("button:has-text('Follow')")
            count = await follow_btns.count()
            for i in range(count):
                btn = follow_btns.nth(i)
                txt = (await btn.inner_text()).strip().lower()
                if txt == "follow":
                    print(f"➕ [Product Hunt] Following product: \"{product_title}\"...")
                    await btn.click()
                    await self.human.short_pause(1.5, 3.0)
                    break
        except Exception as e:
            print(f"ℹ️ [Product Hunt] Follow product note: {e}")

    async def follow_makers_and_commenters(self, page: Page, max_follows: int = 2):
        try:
            user_links = page.locator("a[href^='/@']")
            count = await user_links.count()
            followed = 0

            # Collect unique user handles
            handles = []
            for i in range(min(count, 15)):
                href = await user_links.nth(i).get_attribute("href")
                if href and href.startswith("/@") and "noor_alam" not in href.lower():
                    if href not in handles and href not in self.history["followed_users"]:
                        handles.append(href)

            for handle in handles:
                if followed >= max_follows:
                    break

                profile_url = f"https://www.producthunt.com{handle}"
                sub_page = await self.context.new_page()
                try:
                    await sub_page.goto(profile_url, wait_until="commit")
                    await self.human.short_pause(3.0, 5.0)

                    follow_btn = sub_page.locator("button:has-text('Follow')").first
                    if await follow_btn.is_visible():
                        btn_txt = (await follow_btn.inner_text()).strip().lower()
                        if btn_txt == "follow":
                            print(f"🤝 [Product Hunt] Following maker/commenter: {handle}...")
                            await follow_btn.click()
                            followed += 1
                            self.history["followed_users"].append(handle)
                            self._save_history()
                            await self.human.short_pause(2.0, 3.5)
                except Exception:
                    pass
                finally:
                    await sub_page.close()

        except Exception as e:
            print(f"ℹ️ [Product Hunt] Follow users note: {e}")

    async def upvote_comments(self, page: Page, max_upvotes: int = 2):
        try:
            upvote_btns = page.locator("button[data-test='action-bar-vote-button']")
            count = await upvote_btns.count()
            voted = 0
            for i in range(min(count, 5)):
                if voted >= max_upvotes:
                    break
                btn = upvote_btns.nth(i)
                if await btn.is_visible():
                    await btn.scroll_into_view_if_needed()
                    await self.human.short_pause(1.0, 2.0)
                    print(f"👍 [Product Hunt] Upvoting insightful community comment...")
                    await btn.click()
                    voted += 1
                    await self.human.short_pause(1.5, 3.0)
        except Exception as e:
            print(f"ℹ️ [Product Hunt] Comment upvote note: {e}")

    async def leave_maker_comment(self, page: Page, product_title: str) -> bool:
        try:
            editor = page.locator("[data-test='comment-form-editor'] [contenteditable='true'], [data-test='comment-form-editor']").first
            if not await editor.is_visible():
                print("ℹ️ [Product Hunt] Comment editor not visible on this launch.")
                return False

            comment_text = self.generator.generate_ph_comment(product_name=product_title)
            print(f"✍️ [Product Hunt] Writing supportive maker feedback:\n\"{comment_text}\"\n")

            await editor.scroll_into_view_if_needed()
            await editor.click()
            await self.human.short_pause(1.0, 2.0)

            await self.human.human_type(page, comment_text, element=editor)
            await self.human.short_pause(2.0, 4.0)

            submit_btn = page.locator("[data-test='comment-form'] button:has-text('Comment'), [data-test='comment-form'] button[type='submit']").first
            if await submit_btn.is_visible() and not await submit_btn.is_disabled():
                print("🚀 [Product Hunt] Submitting comment...")
                await submit_btn.click()
                await self.human.short_pause(3.0, 5.0)
                print("🎉 [Product Hunt] Comment successfully posted!")
                return True
            else:
                print("ℹ️ [Product Hunt] Submit button was not ready or disabled.")
                return False
        except Exception as e:
            print(f"⚠️ [Product Hunt] Comment composition error: {e}")
            return False
