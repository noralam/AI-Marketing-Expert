import asyncio
import random
from playwright.async_api import Page, Locator

class HumanBehavior:
    def __init__(self, min_delay: int = 45, max_delay: int = 180):
        self.min_delay = min_delay
        self.max_delay = max_delay

    async def lazy_delay(self, label: str = "Pondering / Browsing"):
        delay = random.uniform(self.min_delay, self.max_delay)
        print(f"⏳ [Human Simulation] {label} - waiting {delay:.1f}s...")
        await asyncio.sleep(delay)

    async def short_pause(self, min_s: float = 1.5, max_s: float = 4.5):
        delay = random.uniform(min_s, max_s)
        await asyncio.sleep(delay)

    async def human_type(self, element: Locator, text: str):
        await element.click()
        await self.short_pause(0.5, 1.2)
        for char in text:
            await element.press_sequentially(char)
            # Random cadence per keystroke
            await asyncio.sleep(random.uniform(0.04, 0.12))
            if char in [".", ",", "\n", "!"]:
                await asyncio.sleep(random.uniform(0.3, 0.7))

    async def natural_scroll(self, page: Page, scrolls: int = 3):
        for _ in range(scrolls):
            delta_y = random.randint(300, 700)
            await page.mouse.wheel(0, delta_y)
            await self.short_pause(2.0, 5.0)
            # Occasionally scroll slightly back up
            if random.random() < 0.3:
                await page.mouse.wheel(0, -random.randint(100, 250))
                await self.short_pause(1.0, 2.5)
