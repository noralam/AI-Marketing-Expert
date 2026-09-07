import random
import re
import json
from pathlib import Path

class ContentGenerator:
    def __init__(self, knowledge_path: str = "knowledge/plugin_context.json"):
        self.knowledge = {}
        path = Path(knowledge_path)
        if path.exists():
            with open(path, "r", encoding="utf-8-sig") as f:
                self.knowledge = json.load(f)

    def humanize_text(self, text: str) -> str:
        buzzwords = [
            "delve", "elevate", "revolutionize", "game-changer", "unleash",
            "cutting-edge", "seamless", "tapestry", "empower", "testament",
            "beacon", "supercharge", "paramount", "in conclusion"
        ]
        pattern = re.compile(r'\b(' + '|'.join(buzzwords) + r')\b', re.IGNORECASE)
        cleaned = pattern.sub("", text)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def generate_x_post(self) -> str:
        posts = [
            "Most WordPress sites get slowed down by running 5+ separate marketing plugins.\n\nKeeping your email marketing, SEO scoring, and social scheduling self-hosted inside the WP admin cuts server overhead and eliminates costly monthly subscriptions.\n\nClean code > bloated setups.",
            "Quick tip for WordPress agencies:\n\nWhen building client sites, give them built-in marketing automation directly in their dashboard instead of forcing them onto expensive SaaS platforms.\n\nKeeps their data private, saves monthly fees, and makes your agency deliver way more value.",
            "Building high-converting funnels in WordPress without paying recurring monthly fees is totally doable in 2026.\n\nA single optimized plugin that handles funnels, SEO recommendations, and audience segmentation saves hundreds of dollars every month.",
            "If your client’s WordPress dashboard is cluttered with multiple marketing tools, consider streamlining them into a unified, secure system. Faster load times and lower overhead.",
            "WordPress automation done right: native CRM + automated email workflows + on-page SEO suggestions. All self-hosted, with zero data leaks to external third parties."
        ]
        return self.humanize_text(random.choice(posts))

    def generate_facebook_niche_comment(self, post_text: str = "") -> str:
        """Generates natural, short, 100% relevant and safe comments for niche WordPress/marketing posts."""
        short_appreciative = [
            "Spot on! Really clean insight here.",
            "Totally agree with this approach. Simplicity always wins.",
            "Great point! Thanks for sharing this.",
            "Solid advice right here. Love this workflow.",
            "Really well put. Keeping things minimal makes a huge difference.",
            "100% agreed! This saves so much unnecessary headache."
        ]
        
        insightful_comments = [
            "Solid breakdown! Keeping workflows clean inside WordPress without bloated external SaaS tools saves so much time.",
            "Couldn't agree more. A lot of folks overcomplicate their tech stack when straightforward solutions do the job best.",
            "Really valuable takeaway. Regular optimization and keeping data self-hosted is definitely the way to go."
        ]

        # 70% short natural human comments, 30% insightful
        if random.random() < 0.70:
            return random.choice(short_appreciative)
        else:
            return random.choice(insightful_comments)

    def generate_reddit_comment(self, subreddit: str = "Wordpress") -> str:
        wp_comments = [
            "Had a similar headache with WordPress performance a few months back. For us, turning off unnecessary dashboard widgets, switching to native SMTP instead of heavy mail plugins, and keeping DOM tree minimal gave a noticeable speed boost.",
            "Honestly, keeping things self-hosted inside the WP admin is way cheaper in the long run. Third-party SaaS tools get ridiculously expensive once your subscriber or lead list grows past a few thousand.",
            "Good advice here. I'd also recommend checking if your database cron jobs are piling up. Cleaning transient data and unused plugin tables usually fixes random slowdowns like this.",
            "Clean theme code and lightweight structure make a huge difference. A lot of page builders inject way too many nested divs that kill Google PageSpeed scores.",
            "Whenever I run into email delivery issues with client sites, using a dedicated SMTP relay with proper SPF/DKIM records solves 99% of spam folder problems."
        ]
        
        general_helpful = [
            "Really well explained. Keeping things simple without overcomplicating the tech stack is almost always the right call.",
            "Totally agree with this approach. Start with a minimal setup first, test what actually works, and only scale the tooling when you hit real bottlenecks.",
            "Solid advice. I found that doing regular audits every month prevents small tech debts from turning into huge fires later."
        ]

        if "word" in subreddit.lower() or "web" in subreddit.lower() or "dev" in subreddit.lower():
            chosen = random.choice(wp_comments)
        else:
            chosen = random.choice(general_helpful)
        
        return self.humanize_text(chosen)
