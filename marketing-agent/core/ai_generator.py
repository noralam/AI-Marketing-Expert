import random
import re
import json
from pathlib import Path
from core.wporg_tracker import WPOrgTracker

class ContentGenerator:
    def __init__(self, knowledge_path: str = "knowledge/plugin_context.json"):
        self.knowledge = {}
        path = Path(knowledge_path)
        if path.exists():
            with open(path, "r", encoding="utf-8-sig") as f:
                self.knowledge = json.load(f)
        self.tracker = WPOrgTracker(author="nalam-1")

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

    def generate_x_post(self) -> dict:
        """Generates dynamic X.com post with direct links and matching topic."""
        product = self.tracker.get_featured_product()
        topic = product.get("topic", "ai_marketing")
        url = product.get("url", "https://wordpress.org/plugins/ai-marketing-expert/")
        name = product.get("name")

        if topic == "ai_marketing":
            posts = [
                f"Most WordPress sites get slowed down by 5+ separate marketing plugins.\n\nKeeping your email CRM, AI content generator, and SEO tools self-hosted inside WordPress cuts server overhead and saves hundreds in monthly SaaS fees.\n\n👉 Free download: {url}\n\n#WordPress #AIMarketing",
                f"Quick tip for WordPress web agencies:\n\nDeliver built-in marketing automation directly inside client dashboards instead of pushing them to costly third-party subscriptions. Higher value, zero data leaks.\n\nExplore AI Marketing Expert:\n{url}\n\n#WebDesign #WordPress",
                f"Building high-converting funnels in WordPress without paying monthly SaaS subscriptions is 100% doable in 2026.\n\nNative email marketing + on-page SEO recommendations right in your admin:\n{url}\n\n#BuildInPublic #WordPress"
            ]
        elif topic == "elementor_builder":
            posts = [
                f"Just updated {name}!\n\nNow with full Theme Builder support, Header/Footer builder, and 60+ responsive widgets to design fast websites without touching code.\n\n👉 Check it out on WordPress.org:\n{url}\n\n#Elementor #WordPress #WebDesign",
                f"Need a lightweight Theme Builder & custom Header/Footer solution for Elementor? {name} makes it super straightforward.\n\nFree on WP.org:\n{url}\n\n#WordPress #ElementorAddons"
            ]
        elif topic == "wordpress_theme":
            posts = [
                f"Looking for a clean, lightning-fast WordPress theme that scores 95+ on Google PageSpeed? Check out {name}.\n\nBuilt for high performance & clean code:\n{url}\n\n#WordPressThemes #WebDesign",
                f"Minimal design, zero bloat, and fully responsive layouts. Explore {name} for your next client project:\n{url}\n\n#WordPress #WPThemeSpace"
            ]
        else:
            posts = [
                f"Streamline your WordPress workflows with {name}. Lightweight, secure, and built for performance.\n\nGet the free plugin here:\n{url}\n\n#WordPress #Plugins"
            ]

        chosen_text = random.choice(posts)
        return {
            "text": self.humanize_text(chosen_text),
            "topic": topic,
            "product": product
        }

    def generate_facebook_page_post(self) -> dict:
        """Generates Facebook post with clean caption and explicit 'Link in first comment' note."""
        product = self.tracker.get_featured_product()
        topic = product.get("topic", "ai_marketing")
        name = product.get("name")
        url = product.get("url", "https://wordpress.org/plugins/ai-marketing-expert/")

        if topic == "ai_marketing":
            captions = [
                "Most small businesses and agencies overcomplicate their WordPress marketing by juggling 5+ separate monthly subscriptions.\n\nRunning native email automation, CRM funnels, and on-page SEO directly inside your WordPress dashboard keeps data private and saves massive overhead.\n\n👇 Details & download link in the first comment!",
                "WordPress agencies: delivering automated marketing directly inside your clients' dashboard gives your agency an incredible competitive edge.\n\nSelf-hosted email campaigns, SEO scoring, and lead capture workflows.\n\n👇 Official WordPress.org link in the first comment!",
                "Clean code and self-hosted tools always beat bloated external setups. Build automated lead funnels and send unlimited marketing emails without recurring monthly fees.\n\n👇 Check the first comment for the link!"
            ]
        elif topic == "elementor_builder":
            captions = [
                f"Big update for Elementor creators! {name} brings a full Theme Builder, custom Header/Footer builder, and 60+ free widgets to build high-speed websites effortlessly.\n\n👇 Download link in the first comment!",
                f"Designing custom headers, footers, and archive layouts in Elementor doesn't have to be complicated. {name} keeps your site fast and flexible.\n\n👇 Explore the free plugin in the first comment!"
            ]
        elif topic == "wordpress_theme":
            captions = [
                f"Looking for a clean, modern, and SEO-friendly WordPress theme for your next project? {name} is optimized for ultra-fast load times and seamless mobile responsiveness.\n\n👇 Preview and details in the first comment!"
            ]
        else:
            captions = [
                f"Keep your WordPress site lightweight and efficient with {name}.\n\n👇 Get the official link in the first comment!"
            ]

        chosen_caption = random.choice(captions)
        return {
            "caption": self.humanize_text(chosen_caption),
            "topic": topic,
            "url": url,
            "product": product
        }

    def generate_facebook_niche_comment(self, post_text: str = "") -> str:
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
