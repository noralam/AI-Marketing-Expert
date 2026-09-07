import os
import winshell
from win32com.client import Dispatch

startup_folder = winshell.startup()
shortcut_path = os.path.join(startup_folder, "MarketingAgent.lnk")
target_bat = r"c:\laragon\www\tools\wp-content\plugins\ai-marketing-expert\marketing-agent\start_agent.bat"
working_dir = r"c:\laragon\www\tools\wp-content\plugins\ai-marketing-expert\marketing-agent"

shell = Dispatch('WScript.Shell')
shortcut = shell.CreateShortCut(shortcut_path)
shortcut.Targetpath = target_bat
shortcut.WorkingDirectory = working_dir
shortcut.IconLocation = target_bat
shortcut.WindowStyle = 7 # Minimized window
shortcut.save()
print(f"Shortcut created at: {shortcut_path}")
