import asyncio
import argparse
from core.browser import BrowserManager

async def setup(target_platform="all"):
    print("==================================================")
    print(f"🛠️  Marketing Agent - Session Setup [{target_platform.upper()}]")
    print("==================================================")

    manager = BrowserManager(session_dir="sessions", headless=False)
    context = await manager.start()

    urls = {
        "x": "https://x.com/login",
        "ph": "https://www.producthunt.com/login",
        "linkedin": "https://www.linkedin.com/login",
        "reddit": "https://www.reddit.com/login",
        "facebook": "https://www.facebook.com/login"
    }

    if target_platform in urls:
        print(f"Opening {target_platform.upper()} login page with Anti-Bot Stealth...")
        page = await manager.new_page()
        await page.goto(urls[target_platform])
    else:
        print("Opening all platform login tabs with Anti-Bot Stealth...")
        for name, url in urls.items():
            page = await manager.new_page()
            await page.goto(url)

    input(f"\n👉 Log in to your {target_platform.upper()} account in the browser, complete 2FA, then press ENTER here...")

    print("💾 Saving session data...")
    await manager.close()
    print(f"🎉 {target_platform.upper()} session successfully saved in sessions/ directory!")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="One-time Session Setup")
    parser.add_argument("--platform", choices=["x", "ph", "linkedin", "reddit", "facebook", "all"], default="all", help="Target platform to login")
    args = parser.parse_args()
    asyncio.run(setup(args.platform))
