import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

async def export_storage():
    print("==================================================")
    print("🛠️ Facebook Basic HTML 2FA Helper")
    print("==================================================")
    
    user_data_dir = Path("sessions/user_data").resolve()
    
    playwright = await async_playwright().start()
    
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

    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=str(user_data_dir),
        headless=False,
        executable_path=executable_path,
        viewport={"width": 1280, "height": 800},
        ignore_default_args=["--enable-automation"],
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox"
        ]
    )

    page = await context.new_page()
    page.set_default_timeout(0)

    # Use mbasic.facebook.com - Pure ultra-lightweight HTML with ZERO JavaScript loops
    print("Opening Pure HTML Facebook (mbasic.facebook.com)...")
    await page.goto("https://mbasic.facebook.com/login/checkpoint/", timeout=0)

    print("\n" + "="*50)
    print("👉 Pure HTML 2FA loaded (No JavaScript or Infinite Spinner).")
    print("👉 Enter your 2FA code and click Continue/Submit.")
    print("👉 When you reach the Facebook Home page, press ENTER here.")
    print("="*50)

    input("\nPress ENTER after you have successfully completed 2FA...")

    print("Checking desktop version...")
    await page.goto("https://www.facebook.com/", timeout=0)
    await asyncio.sleep(3)

    print("💾 Saving session data...")
    await context.close()
    await playwright.stop()
    print("🎉 Facebook session successfully saved!")

if __name__ == '__main__':
    asyncio.run(export_storage())
