# 🤖 Autonomous Social Media Marketing Agent

Autonomous Python agent designed for **safe, human-like organic marketing** across **X.com (Twitter), Product Hunt, LinkedIn, and Reddit** to promote **AI Marketing Expert**, **WPThemeSpace**, and **Bijtec**.

---

## 🎯 What This Agent Does

1. **X.com (Twitter):**
   - Researches WordPress/Web Design discussions.
   - Publishes authentic founder posts (70% text, 30% realistic AI imagery).
   - Follows 1-2 targeted USA/UK creators per session and likes quality niche tweets.

2. **Product Hunt:**
   - Browses daily top maker launches in AI & Developer Tools.
   - Drops genuine, encouraging maker comments and upvotes.

3. **LinkedIn:**
   - Navigates industry feed with natural scrolling.
   - Posts value-driven thought leadership content tailored for web agencies & founders.

4. **Reddit (r/Wordpress, r/web_design, r/SideProject):**
   - Safe Karma Building & Helpful Discussion Mode.
   - Zero links policy to guarantee 100% anti-ban immunity.
   - Drops real developer advice to build organic authority.

---

## 🛡️ Anti-Ban & Humanization Highlights
- **Dynamic Random Intervals:** Sleeps between **2.1 to 4.8 hours** randomly between cycles (No fixed robotic schedules).
- **Smart Memory:** Automatically pauses if started too soon after a previous session.
- **Anti-AI Word Banning:** Filters out generic buzzwords (*delve, elevate, revolutionize, robust, tapestry*) in favor of simple plain English.
- **USA/Europe Targeted:** Searches and engages specifically with US/UK web agency founders and buyers.

---

## 🚀 Quick Commands

### Run Multi-Day Campaign (Recommended):
`powershell
# Run automatically for 15 Days
.\.venv\Scripts\python agent.py --days 15

# Run automatically for 30 Days (1 Month)
.\.venv\Scripts\python agent.py --days 30
`

### Log into a single platform:
`powershell
.\.venv\Scripts\python setup_session.py --platform reddit
.\.venv\Scripts\python setup_session.py --platform linkedin
.\.venv\Scripts\python setup_session.py --platform x
.\.venv\Scripts\python setup_session.py --platform ph
`

👉 *For full instructions, read [user_guide.md](user_guide.md).*
