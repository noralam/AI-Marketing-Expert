@echo off
title Autonomous Marketing Agent - 5 Platforms
cd /d "c:\laragon\www\tools\wp-content\plugins\ai-marketing-expert\marketing-agent"

echo ======================================================
echo ?? Starting Autonomous Marketing Agent (15 Days Campaign)
echo ?? Platforms: X.com + Product Hunt + LinkedIn + Reddit + Facebook
echo ======================================================

.\.venv\Scripts\python.exe agent.py --days 15

pause
