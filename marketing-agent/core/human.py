import asyncio
import random
from playwright.async_api import Page, Locator

class HumanBehavior:
    def __init__(self, min_delay: int = 5, max_delay: int = 15):
        self.min_delay = min_delay
        self.max_delay = max_delay

    async def lazy_delay(self, label: str = "Pondering / Browsing"):
        delay = random.uniform(self.min_delay, self.max_delay)
        print(f"⏳ [Human Simulation] {label} - waiting {delay:.1f}s...")
        await asyncio.sleep(delay)

    async def fast_switch(self, label: str = "Switching platform"):
        delay = random.uniform(4.0, 7.5)
        print(f"⚡ [Platform Switch] {label} - {delay:.1f}s...")
        await asyncio.sleep(delay)

    async def short_pause(self, min_s: float = 2.0, max_s: float = 4.0):
        delay = random.uniform(min_s, max_s)
        await asyncio.sleep(delay)

    async def human_type(self, page: Page, text: str, element: Locator = None):
        """Types text with authentic human cadence, realistic pauses, and robust focus."""
        if element is not None:
            try:
                # Scroll element into comfortable center view
                await element.evaluate("el => el.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'smooth'})")
                await self.short_pause(0.8, 1.5)
            except Exception:
                pass

            try:
                # Click with force to bypass any transparent overlays
                await element.click(force=True, timeout=5000)
            except Exception:
                try:
                    await element.focus()
                except Exception:
                    pass
            await self.short_pause(0.8, 1.8)

        # Realistic typing speed with subtle variation
        for char in text:
            await page.keyboard.type(char, delay=random.randint(45, 95))
            
            # Natural micro-pauses at punctuation (breathing / thinking moments)
            if char in [".", "!", "?", "\n"]:
                await asyncio.sleep(random.uniform(0.35, 0.70))
            elif char in [",", ";", ":", "-"]:
                await asyncio.sleep(random.uniform(0.20, 0.40))
            elif char == " " and random.random() < 0.12:
                # Occasional brief mid-sentence pause
                await asyncio.sleep(random.uniform(0.15, 0.30))

    async def natural_scroll(self, page: Page, scrolls: int = 2):
        """Scrolls gently in realistic micro-increments with human reading pauses."""
        for _ in range(scrolls):
            # Smooth incremental scroll steps instead of single jerky jumps
            steps = random.randint(3, 5)
            total_y = random.randint(220, 480)
            step_y = total_y // steps
            
            for _ in range(steps):
                await page.mouse.wheel(0, step_y)
                await asyncio.sleep(random.uniform(0.08, 0.18))

            # Natural pause as if the user is reading posts on screen
            await self.short_pause(2.5, 4.5)

            # 25% chance to scroll slightly back up (re-reading a headline or visual)
            if random.random() < 0.25:
                await page.mouse.wheel(0, -random.randint(80, 160))
                await self.short_pause(1.5, 2.5)
