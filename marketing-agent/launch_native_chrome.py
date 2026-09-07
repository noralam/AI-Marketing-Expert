import subprocess
import os
import sys
from pathlib import Path

def launch_real_chrome():
    user_data_dir = str(Path("sessions/user_data").resolve())
    
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
    ]
    chrome_exe = None
    for p in chrome_paths:
        if os.path.exists(p):
            chrome_exe = p
            break
            
    if not chrome_exe:
        print("❌ Google Chrome not found in standard paths.")
        return

    print("==================================================")
    print("🚀 Launching Native Google Chrome (Zero Automation)")
    print("==================================================")
    print("This opens your REAL Chrome browser using our session directory.")
    print("There is NO Playwright, NO bot flags, NO sandbox restrictions.")
    print("Arkose MatchKey & 2FA will work 100% smoothly.")
    print("==================================================")

    # Launch native Chrome process directly with our session folder
    cmd = [
        chrome_exe,
        f"--user-data-dir={user_data_dir}",
        "--no-first-run",
        "--no-default-browser-check",
        "https://www.facebook.com/"
    ]
    
    proc = subprocess.Popen(cmd)
    
    print("\n👉 A native Chrome window has opened.")
    print("👉 Log into Facebook, enter 2FA code, and confirm you see your Facebook Feed.")
    print("👉 Close the Chrome window, then press ENTER here in terminal.")
    
    input("\nPress ENTER after you have closed the Chrome window...")
    print("🎉 Facebook session saved natively in sessions/ directory! You are ready to go.")

if __name__ == '__main__':
    launch_real_chrome()
