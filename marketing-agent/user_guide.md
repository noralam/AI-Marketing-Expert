# 📘 Autonomous Marketing Agent — Complete User Guide

Welcome to the **Autonomous Marketing Agent** for **AI Marketing Expert**, **WPThemeSpace**, and **Bijtec**.

This agent runs safe, human-like, anti-ban marketing across **X.com (Twitter), Product Hunt, LinkedIn, Reddit, and Facebook**.

---

## 📂 Project Location
All files live in:
c:\laragon\www\tools\wp-content\plugins\ai-marketing-expert\marketing-agent

---

## 🛠️ Step 1: Login & Session Setup (One-time)

If you ever need to log in or refresh a session, use these commands:

### Log in to a specific platform (Recommended):
`powershell
# Facebook (Only login to your personal Facebook account once)
.\.venv\Scripts\python setup_session.py --platform facebook

# Reddit
.\.venv\Scripts\python setup_session.py --platform reddit

# LinkedIn
.\.venv\Scripts\python setup_session.py --platform linkedin

# X.com (Twitter)
.\.venv\Scripts\python setup_session.py --platform x

# Product Hunt
.\.venv\Scripts\python setup_session.py --platform ph
`

---

## 🚀 Step 2: Running the Marketing Agent

### 1. Specific Days Campaign (All 5 Platforms: X + PH + LinkedIn + Reddit + Facebook):
`powershell
# Run automatically for 15 Days (Auto-stops after 15 days)
.\.venv\Scripts\python agent.py --days 15

# Run automatically for 30 Days (1 Month)
.\.venv\Scripts\python agent.py --days 30
`

### 2. Single Platform Run:
`powershell
# Run only on Facebook once
.\.venv\Scripts\python agent.py --platform facebook

# Run only on X.com once
.\.venv\Scripts\python agent.py --platform x

# Run only on Reddit once
.\.venv\Scripts\python agent.py --platform reddit
`

---

## 🎯 Facebook Page Strategy (Algorithm-Friendly)
- **Direct Page Navigation:** Automatically navigates to https://www.facebook.com/profile.php?id=61589222139426.
- **Auto Switch Identity:** Handles page profile switching automatically.
- **Organic Post:** Publishes clean, engaging English posts (with 30% realistic imagery).
- **First Comment Link Injection:** Automatically leaves the first comment containing official WordPress.org & WPThemeSpace links to protect post reach from Facebook link penalties.
