import os
from pathlib import Path
from playwright.async_api import async_playwright, BrowserContext, Page
from playwright_stealth import Stealth

class BrowserManager:
    def __init__(self, session_dir: str = "sessions", headless: bool = False):
        self.session_dir = Path(session_dir)
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.user_data_dir = self.session_dir / "user_data"
        self.user_data_dir.mkdir(parents=True, exist_ok=True)
        self.headless = headless
        self.playwright = None
        self.context = None
        self.stealth = Stealth()

    async def start(self) -> BrowserContext:
        self.playwright = await async_playwright().start()
        
        # Use real installed Google Chrome if available on Windows, fallback to bundled chromium
        chrome_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
        ]
        executable_path = None
        for p in chrome_paths:
            if os.path.exists(p):
                executable_path = p
                break

        launch_kwargs = {
            "user_data_dir": str(self.user_data_dir),
            "headless": self.headless,
            "viewport": {"width": 1366, "height": 768},
            "ignore_default_args": ["--enable-automation"],
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-infobars",
                "--disable-features=IsolateOrigins,site-per-process"
            ]
        }
        if executable_path:
            launch_kwargs["executable_path"] = executable_path

        self.context = await self.playwright.chromium.launch_persistent_context(**launch_kwargs)
        return self.context

    async def new_page(self) -> Page:
        page = await self.context.new_page()
        await self.stealth.apply_stealth_async(page)
        return page

    async def close(self):
        if self.context:
            await self.context.close()
        if self.playwright:
            await self.playwright.stop()
