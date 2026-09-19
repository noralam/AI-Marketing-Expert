import sys
import asyncio
import argparse
import random
import yaml
import datetime
import json
from pathlib import Path

# Enforce UTF-8 on Windows terminal so emojis never crash print()
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
from core.browser import BrowserManager
from core.human import HumanBehavior
from core.ai_generator import ContentGenerator
from platforms.x_agent import XAgent
from platforms.ph_agent import ProductHuntAgent
import socket
from platforms.linkedin_agent import LinkedInAgent
from platforms.reddit_agent import RedditAgent
from platforms.facebook_agent import FacebookAgent

# Enforce single instance to prevent duplicate parallel runs
_instance_lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    _instance_lock_socket.bind(('127.0.0.1', 48821))
except socket.error:
    print("\n⚠️ [Agent] Another instance of MarketingAgent is already running!")
    print("🛑 Exiting to prevent duplicate sessions, collisions, and double-posting.\n")
    sys.exit(0)

STATE_FILE = Path("sessions/agent_state.json")

def load_config(config_path: str = "config.yaml") -> dict:
    if Path(config_path).exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}

def get_last_run_time():
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return datetime.datetime.fromisoformat(data.get("last_run"))
        except Exception:
            return None
    return None

def save_last_run_time():
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump({"last_run": datetime.datetime.now().isoformat()}, f)
    except Exception:
        pass

async def run_single_session(args, config):
    min_d = 3 if args.fast else config.get("behavior", {}).get("min_delay_seconds", 5)
    max_d = 8 if args.fast else config.get("behavior", {}).get("max_delay_seconds", 15)
    headless = args.headless or config.get("general", {}).get("headless", False)

    now_str = datetime.datetime.now().strftime("%I:%M:%S %p")
    print("\n" + "="*50)
    print(f"🤖 [Session Started at {now_str}]")
    print(f"🎯 Target Platform: {args.platform.upper()}")
    print(f"⚡ Smart Pacing Active: {min_d}s - {max_d}s")
    print("="*50)

    human = HumanBehavior(min_delay=min_d, max_delay=max_d)
    generator = ContentGenerator()
    browser_mgr = BrowserManager(session_dir="sessions", headless=headless)

    context = await browser_mgr.start()

    try:
        # 1. X.com
        if args.platform in ["x", "all"]:
            x_agent = XAgent(context, human, generator, config)
            await x_agent.run_session()

        if args.platform in ["all"]:
            await human.fast_switch("Moving to Product Hunt")

        # 2. Product Hunt
        if args.platform in ["ph", "all"]:
            ph_agent = ProductHuntAgent(context, human, generator, config)
            await ph_agent.run_session()

        if args.platform in ["all"]:
            await human.fast_switch("Moving to LinkedIn")

        # 3. LinkedIn
        if args.platform in ["linkedin", "all"]:
            li_agent = LinkedInAgent(context, human, generator, config)
            await li_agent.run_session()

        if args.platform in ["all"]:
            await human.fast_switch("Moving to Reddit")

        # 4. Reddit
        if args.platform in ["reddit", "all"]:
            reddit_agent = RedditAgent(context, human, generator, config)
            await reddit_agent.run_session()

        if args.platform in ["all"]:
            await human.fast_switch("Moving to Facebook")

        # 5. Facebook (Page Post + 1st Comment Link)
        if args.platform in ["facebook", "all"]:
            fb_agent = FacebookAgent(context, human, generator, config)
            await fb_agent.run_session()

    except Exception as e:
        print(f"⚠️ Note during session: {e}")
    finally:
        save_last_run_time()
        print("🛑 Session completed. Closing browser cleanly...")
        await browser_mgr.close()
        print("✨ Marketing session finished!")

async def main():
    parser = argparse.ArgumentParser(description="Autonomous Human-Like Marketing Agent")
    parser.add_argument("--platform", choices=["x", "ph", "linkedin", "reddit", "facebook", "all"], default="all", help="Target platform")
    parser.add_argument("--headless", action="store_true", help="Run browser in headless mode")
    parser.add_argument("--fast", action="store_true", help="Fast mode for testing with short delays")
    parser.add_argument("--loop", action="store_true", help="Keep running in background, wakes up every 3-4 hours")
    parser.add_argument("--days", type=int, default=0, help="Run loop for a specific number of days (e.g., --days 15)")
    args = parser.parse_args()

    config = load_config()

    if not args.loop and args.days == 0:
        await run_single_session(args, config)
    else:
        days_limit = args.days
        start_time = datetime.datetime.now()
        end_time = start_time + datetime.timedelta(days=days_limit) if days_limit > 0 else None

        print("\n" + "#"*55)
        print("🔄 AUTONOMOUS DYNAMIC BACKGROUND LOOP ACTIVATED")
        print(f"🎯 Target Platforms: {args.platform.upper()} (X, PH, LinkedIn, Reddit, Facebook)")
        if days_limit > 0:
            print(f"⏳ Campaign Duration: {days_limit} DAYS (Ends on {end_time.strftime('%Y-%m-%d %I:%M %p')})")
        else:
            print("⏳ Campaign Duration: Continuous (Runs until manually stopped)")
        print("⚡ Optimized Pacing: Natural 3-6s transitions, no idle delays.")
        print("Press Ctrl + C anytime in this terminal to stop.")
        print("#"*55)

        min_hours = config.get("loop_schedule", {}).get("min_interval_hours", 2.1)
        max_hours = config.get("loop_schedule", {}).get("max_interval_hours", 4.8)

        last_run = get_last_run_time()
        if last_run and not args.fast:
            elapsed = (datetime.datetime.now() - last_run).total_seconds()
            random_cooldown = random.uniform(min_hours, max_hours) * 3600
            if elapsed < random_cooldown:
                remaining_cooldown = random_cooldown - elapsed
                wake_up_time = datetime.datetime.now() + datetime.timedelta(seconds=remaining_cooldown)
                print(f"🧠 [Smart Memory] Agent ran {(elapsed/60):.1f} mins ago.")
                print(f"⏳ Sleeping until: {wake_up_time.strftime('%I:%M:%S %p')}...")
                await asyncio.sleep(remaining_cooldown)

        session_count = 1
        while True:
            if end_time and datetime.datetime.now() >= end_time:
                print(f"\n🎉 {days_limit}-Day Marketing Campaign successfully completed!")
                break

            print(f"\n🚀 Running Scheduled Cycle #{session_count}...")
            await run_single_session(args, config)
            session_count += 1

            sleep_hours = random.uniform(min_hours, max_hours) if not args.fast else random.uniform(0.01, 0.02)
            sleep_seconds = sleep_hours * 3600
            next_run_time = datetime.datetime.now() + datetime.timedelta(seconds=sleep_seconds)

            if end_time and next_run_time > end_time:
                print(f"🏁 Campaign ends before next cycle ({end_time.strftime('%I:%M %p')}). Shutting down gracefully.")
                break

            print(f"\n💤 Agent entering sleep mode for {sleep_hours:.2f} hours (Randomized)...")
            print(f"⏰ Next session scheduled at: {next_run_time.strftime('%I:%M:%S %p')}")
            if end_time:
                remaining = end_time - datetime.datetime.now()
                print(f"⏳ Remaining campaign time: {remaining.days} days, {remaining.seconds//3600} hours")
            print("You can minimize this window. It will run on autopilot.\n")

            await asyncio.sleep(sleep_seconds)

if __name__ == '__main__':
    asyncio.run(main())
