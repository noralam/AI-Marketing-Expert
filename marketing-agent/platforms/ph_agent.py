import asyncio
from playwright.async_api import BrowserContext
from core.human import HumanBehavior
from core.ai_generator import ContentGenerator

class ProductHuntAgent:
    def __init__(self, context: BrowserContext, human: HumanBehavior, generator: ContentGenerator, config: dict):
        self.context = context
        self.human = human
        self.generator = generator
        self.config = config

    async def run_session(self):
        page = await self.context.new_page()
        print("🌐 [Product Hunt] Navigating to Product Hunt homepage...")
        await page.goto("https://www.producthunt.com", wait_until="domcontentloaded")
        await self.human.short_pause(3.0, 6.0)

        print("👀 [Product Hunt] Browsing top launches today...")
        await self.human.natural_scroll(page, scrolls=3)
        await self.human.lazy_delay("Analyzing interesting products")

        # Browse an AI or developer category
        print("🔍 [Product Hunt] Visiting AI category page...")
        await page.goto("https://www.producthunt.com/topics/artificial-intelligence", wait_until="domcontentloaded")
        await self.human.short_pause(4.0, 8.0)
        await self.human.natural_scroll(page, scrolls=2)
        await self.human.lazy_delay("Reviewing maker launches")

        print("✅ [Product Hunt] Session completed smoothly.")
        await page.close()
