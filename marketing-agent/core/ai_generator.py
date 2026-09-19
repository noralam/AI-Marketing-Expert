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

        # Prevent social platforms from auto-linking domain names and creating duplicate preview cards
        domain_pattern = re.compile(r'(?<!https://)(?<!http://)(?<!/)\b(?:wordpress|wp)\.org\b', re.IGNORECASE)
        cleaned = domain_pattern.sub("WordPress Plugin Repository", cleaned)

        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def generate_x_post(self) -> dict:
        """Generates dynamic X.com post with direct links and matching topic."""
        product = self.tracker.get_featured_product()
        topic = product.get("topic", "ai_marketing")
        url = product.get("url", "https://wordpress.org/plugins/ai-marketing-expert/")
        name = product.get("name")
        repo_name = "WordPress Theme Repository" if topic == "wordpress_theme" else "WordPress Plugin Repository"

        if topic == "ai_marketing":
            posts = [
                f"Most WordPress sites get slowed down by 5+ separate marketing plugins.\n\nKeeping your email CRM, AI content generator, and SEO tools self-hosted inside WordPress cuts server overhead and saves hundreds in monthly SaaS fees.\n\n👉 Free download on {repo_name}:\n{url}\n\n#WordPress #AIMarketing",
                f"Quick tip for WordPress web agencies:\n\nDeliver built-in marketing automation directly inside client dashboards instead of pushing them to costly third-party subscriptions. Higher value, zero data leaks.\n\nExplore {name} on {repo_name}:\n{url}\n\n#WebDesign #WordPress",
                f"Building high-converting funnels in WordPress without paying monthly SaaS subscriptions is 100% doable in 2026.\n\nNative email marketing + on-page SEO recommendations right in your admin on {repo_name}:\n{url}\n\n#BuildInPublic #WordPress"
            ]
        elif topic == "elementor_builder":
            posts = [
                f"Just updated {name}!\n\nNow with full Theme Builder support, Header/Footer builder, and 60+ responsive widgets to design fast websites without touching code.\n\n👉 Check it out on {repo_name}:\n{url}\n\n#Elementor #WordPress #WebDesign",
                f"Need a lightweight Theme Builder & custom Header/Footer solution for Elementor? {name} makes it super straightforward.\n\nFree on {repo_name}:\n{url}\n\n#WordPress #ElementorAddons"
            ]
        elif topic == "wordpress_theme":
            posts = [
                f"Looking for a clean, lightning-fast WordPress theme that scores 95+ on Google PageSpeed? Check out {name}.\n\nBuilt for high performance & clean code on {repo_name}:\n{url}\n\n#WordPressThemes #WebDesign",
                f"Minimal design, zero bloat, and fully responsive layouts. Explore {name} on {repo_name} for your next client project:\n{url}\n\n#WordPress #WPThemeSpace"
            ]
        else:
            posts = [
                f"Streamline your WordPress workflows with {name}. Lightweight, secure, and built for performance.\n\nGet the free plugin on {repo_name}:\n{url}\n\n#WordPress #Plugins"
            ]

        chosen_text = random.choice(posts)
        return {
            "text": self.humanize_text(chosen_text),
            "topic": topic,
            "product": product
        }

    def generate_facebook_page_post(self) -> dict:
        """Generates Facebook post EXCLUSIVELY for the AI Marketing Expert plugin and its core features."""
        url = "https://wordpress.org/plugins/ai-marketing-expert/"
        topic = "ai_marketing"
        product = {
            "name": "AI Marketing Expert",
            "url": url,
            "topic": topic
        }

        captions = [
            # 1. AI Content Generator & Article Writer
            "Creating high-ranking, SEO-optimized articles shouldn't require jumping between 4 different tabs. With AI Marketing Expert, generate long-form, keyword-targeted blog posts and WooCommerce product descriptions directly inside WordPress.\n\nAutomate research, drafting, and meta tags natively with top-tier AI models.\n\n👇 Download the free plugin in the first comment!",

            # 2. On-Page SEO Analyzer
            "Stop guessing what search engines want. AI Marketing Expert scores your WordPress articles in real-time, highlights missing keywords, and optimizes internal linking structure before you hit publish.\n\nClean on-page SEO intelligence without paying $100+/mo for external audit tools.\n\n👇 Official WordPress plugin link in the first comment!",

            # 3. Self-Hosted Email Marketing & Automation
            "Why pay rising monthly subscription fees to Mailchimp or Klaviyo when your list grows? AI Marketing Expert gives you complete, self-hosted email automation directly inside your WordPress dashboard.\n\nDesign beautiful newsletters, trigger automated welcome drips, and manage unlimited subscribers with zero third-party data leaks.\n\n👇 Explore the free plugin in the first comment!",

            # 4. Visual Marketing Workflow Automation
            "Tired of repetitive manual marketing tasks? Build visual, automated trigger-action workflows right inside your WordPress admin with AI Marketing Expert.\n\nWhen a customer buys, a user registers, or a cart is abandoned — automatically trigger emails, webhooks, and status updates without third-party integration apps.\n\n👇 Link to the free plugin in the first comment!",

            # 5. 24/7 AI Customer Support Chatbot
            "Turn casual website visitors into paying clients 24/7. AI Marketing Expert includes an autonomous AI chatbot trained on your site's content and products to answer questions, handle support, and capture qualified leads on autopilot.\n\nDirectly embedded in your WordPress site.\n\n👇 Try the free plugin in the first comment!",

            # 6. WooCommerce Abandoned Cart Recovery
            "Over 70% of online shopping carts are abandoned before checkout. AI Marketing Expert automatically tracks unfinished checkouts and sends smart, timely recovery emails to recover lost revenue.\n\nBoost your WooCommerce store sales by 15-25% without buying extra software.\n\n👇 Free WordPress plugin link in the first comment!",

            # 7. Agency Competitive Edge
            "For WordPress agencies and web designers: stop handing your clients a bare website and sending them to expensive third-party SaaS subscriptions.\n\nDeliver a complete, built-in marketing automation hub — AI content, SEO, email funnels, and chatbots — right inside their client dashboard.\n\n👇 Free download from the WordPress Repository in the first comment!",

            # 8. Cutting SaaS Overhead for Businesses
            "The average WordPress business spends $200+ every single month on disconnected marketing tools. Consolidating your AI writer, email CRM, SEO optimizer, and chatbot into AI Marketing Expert cuts overhead and keeps your site lightning fast.\n\nSelf-hosted, private, and lightweight.\n\n👇 Check out the details in the first comment!"
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

    def generate_ph_comment(self, product_name: str = "") -> str:
        """Generates authentic, constructive maker praise comments for Product Hunt launches."""
        templates = [
            "Congrats on the launch! Really love how clean and intuitive the interface looks. What's currently next on the product roadmap?",
            "Huge congratulations to the team on shipping this today! The onboarding flow and overall UX look super crisp. Bookmarking this to test out this week.",
            "Super sleek launch! Really impressed by the execution here. How has the initial community feedback been so far?",
            "Exciting launch! Love seeing innovative tools built with such a clean user experience. Best of luck on the leaderboard today!",
            "Congrats on the launch! Really solid value proposition here. Curious to see how you expand this going forward.",
            "Awesome work shipping this! The design and core feature set look remarkably smooth. Congrats to all makers involved!"
        ]
        chosen = random.choice(templates)
        return self.humanize_text(chosen)

    def generate_tuktuki_post(self) -> dict:
        """Generates highly engaging, value-driven Bengali posts for 'টুকটুকি ওয়ার্ল্ড' with rich random coverage of child care, mother care, and busy learning toys."""
        pillars = [
            {
                "topic": "busy_kids_learning_toys",
                "posts": [
                    "ঘরের কাজে ব্যস্ত? বাচ্চাকে মোবাইল না দিয়ে কীভাবে ঘণ্টার পর ঘণ্টা ব্যস্ত রাখবেন? 🧸🎨\n\nশিশুকে গঠনমূলক কাজে ব্যস্ত রাখার সেরা উপায় হলো ওপেন-এন্ডেড খেলনা! যেমন: কালারফুল ক্লথ বা উডেন বুকস, ম্যাগনেটিক ড্রয়িং প্যাড, অ্যাক্টিভিটি বোর্ড এবং বিল্ডিং ব্লক। এগুলো নিয়ে খেলার সময় শিশুরা নিজের কল্পনায় মেতে থাকে এবং মোবাইল খোঁজার কথা ভুলেই যায়!\n\nআপনার শিশুকে গঠনমূলকভাবে ব্যস্ত রাখতে আপনি কোন খেলনা বা পড়ার উপকরণ ব্যবহার করেন? কমেন্টে জানান!\n\n#বাচ্চাদেরখেলনা #BusyToys #স্ক্রিনফ্রি #টুকটুকিওয়ার্ল্ড #পড়ারউপকরণ #EducationalPlay #SmartKids",
                    "পড়াশোনা আর খেলা এখন একই সাথে! শিশুর প্রথম পড়ার আনন্দময় সূচনা 📖✨\n\nগতানুগতিক বই দেখে অনেক বাচ্চাই পড়তে চায় না। কিন্তু বড় বড় ছবিওয়ালা ফ্লাশকার্ড, সাউন্ড বুক, কিংবা থ্রি-ডি পপ-আপ বই দিলে তারা গভীর মনোযোগ দিয়ে পাতার পর পাতা উল্টায়। খেলতে খেলতে বর্ণমালা, সংখ্যা ও সাধারণ জ্ঞান শেখার চেয়ে সুন্দর আর কী হতে পারে!\n\nআপনার ছোট্ট সোনামণির প্রিয় পড়ার উপকরণ কোনটি?\n\n#পড়ারউপকরণ #ফ্লাশকার্ড #বাচ্চাদেরবই #টুকটুকিওয়ার্ল্ড #EarlyLearning #MontessoriAtHome #BabyToys",
                    "বাচ্চা বারবার মোবাইল চাইছে? এই ৩ ধরনের শিক্ষণীয় উপকরণ শিশুর মনোযোগ দীর্ঘক্ষণ ধরে রাখবে! 🧩🚀\n\n১. বিল্ডিং ব্লক ও লেগো সেট (সমস্যা সমাধান ও ধৈর্য শেখায়)\n২. ম্যাগনেটিক শেপ সর্টার ও পাজল (লজিক্যাল চিন্তাশক্তি বাড়ায়)\n৩. ওয়াটার ড্রয়িং ম্যাট বা নো-মেস কালারিং বুক (রং চেনা ও সৃজনশীলতা বাড়ায়)\n\nশিশুর স্ক্রিনটাইম কমাতে আজই তার হাতে গঠনমূলক পড়ার ও খেলার সামগ্রী তুলে দিন!\n\n#শিক্ষণীয়খেলনা #বাচ্চাদেরব্যস্তরাখা #টুকটুকিওয়ার্ল্ড #MontessoriBD #ScreenFreeKids #LearningThroughPlay"
                ]
            },
            {
                "topic": "child_health_care",
                "posts": [
                    "শিশুর সুস্থতায় প্রতিদিনের ছোট ছোট অভ্যাসই সবচেয়ে বড় ভূমিকা রাখে! 🌸\n\nঋতু পরিবর্তনের এই সময়ে ছোটদের সর্দি-কাশি বা ঠাণ্ডা লাগার সমস্যা খুব স্বাভাবিক। শিশুদের নিয়মিত কুসুম গরম পানি পান করান এবং পুষ্টিকর মৌসুমি ফল খাওয়ার অভ্যাস তৈরি করুন। এছাড়া ঘরের ধুলাবালি থেকে শিশুদের দূরে রাখা জরুরি।\n\nআপনার ছোট্ট সোনামণির শরীর কি আবহাওয়া পরিবর্তনের সাথে সাথে সহজেই খাপ খাওয়াতে পারছে? কমেন্টে শেয়ার করুন!\n\n#শিশুযত্ন #BabyCareBD #সুস্থশিশু #টুকটুকিওয়ার্ল্ড #প্যারেন্টিং",
                    "শিশুর মানসিক ও শারীরিক বৃদ্ধির জন্য পর্যাপ্ত ঘুম অপরিহার্য! 🌙✨\n\n১ থেকে ৫ বছর বয়সী শিশুদের দিনে অন্তত ১০-১২ ঘণ্টা নিশ্চিন্ত ঘুম প্রয়োজন। ঘুমানোর অন্তত এক ঘণ্টা আগে টিভি বা মোবাইল স্ক্রিন সম্পূর্ণ বন্ধ রাখুন এবং রাতে হালকা গল্পের বই পড়ে শোনান।\n\nআপনার শিশু কি রাতে সহজে ঘুমাতে চায়? কমেন্টে জানান আপনার অভিজ্ঞতা!\n\n#শিশুঘুম #ParentingTips #টুকটুকিওয়ার্ল্ড #মাওশিশু #প্যারেন্টিংটিপস",
                    "শিশুর কোমল ত্বকের যত্ন: ডায়াপার র‍্যাশ ও শুষ্কতা দূর করার সহজ টিপস! 👶💧\n\nবাচ্চাদের ত্বক বড়দের চেয়ে অনেক বেশি সংবেদনশীল। সবসময় ডায়াপার পরা না রেখে দিনে কিছুক্ষণ ত্বককে মুক্ত বাতাস পেতে দিন। প্রতিবার ডায়াপার বদলানোর সময় কুসুম গরম পানি ও নরম সুতি কাপড় ব্যবহার করুন এবং মাইল্ড বেবি ময়েশ্চারাইজার লাগান।\n\nআপনার শিশুর ত্বকের যত্নে আপনি কী ব্যবহার করেন?\n\n#শিশুরত্বক #BabySkinCare #টুকটুকিওয়ার্ল্ড #শিশুস্বাস্থ্য #মায়েরযত্ন"
                ]
            },
            {
                "topic": "play_and_brain_development",
                "posts": [
                    "স্ক্রিন নয়, শিশুর হাতে তুলে দিন গঠনমূলক খেলনা ও বাস্তব সময়! 🧸💡\n\nঅতিরিক্ত মোবাইল বা টিভি দেখা শিশুদের মনোযোগ কমিয়ে দেয় এবং ভাষা বিকাশে বিলম্ব তৈরি করে। এর বদলে রঙ মেলানো, ব্লক তৈরি করা বা সহজ ড্রয়িংয়ের মতো খেলার মাধ্যমে শিশুর চিন্তাশক্তি ও সৃজনশীলতা বহুগুণ বৃদ্ধি পায়।\n\nআজকের দিনে আপনার শিশুর প্রিয় খেলা কোনটি? কমেন্টে আমাদের জানান!\n\n#বুদ্ধিবিকাশ #শিশুরখেলাধূলা #টুকটুকিওয়ার্ল্ড #SmartKids #EarlyLearning",
                    "শিশুর ছোট ছোট হাতের কাজই তৈরি করে ভবিষ্যৎ মেধা! 🎨🧩\n\nকাগজ ভাঁজ করা, মাটির খেলনা বা বিল্ডিং ব্লক দিয়ে কোনো কিছু গড়া শিশুদের 'Fine Motor Skills' বা পেশির নিয়ন্ত্রণ মজবুত করে। খেলাধুলাই শিশুদের প্রথম পাঠশালা।\n\nশিশুকে ঘরের ছোট ছোট মজার কার্যক্রমে যুক্ত করছেন তো?\n\n#মোটরস্কিল #শিশুরমেধাবিকাশ #টুকটুকিওয়ার্ল্ড #CreativePlay #ParentingBD"
                ]
            },
            {
                "topic": "educational_toys",
                "posts": [
                    "খেলতে খেলতে শেখা—শিশুর প্রথম শিক্ষার সবচেয়ে আনন্দময় মাধ্যম! 📚🎈\n\nশিশুরা যখন নিজে হাতে কাঠের পাজল মেলায়, বিভিন্ন আকৃতি স্পর্শ করে বা বর্ণমালার ব্লক সাজায়, তখন তাদের ব্রেইনে নতুন নিউরন সক্রিয় হয়। মুখস্থ করানোর চেয়ে দেখে ও ছুঁয়ে শেখা শিশুর স্মৃতিতে অনেক বেশি স্থায়ী হয়।\n\nআপনার সোনামণি কি খেলার ছলে পড়ালেখা করতে বেশি ভালোবাসে?\n\n#শিক্ষণীয়খেলনা #খেলতেখেলতেশেখা #টুকটুকিওয়ার্ল্ড #MontessoriAtHome #EducationalToys",
                    "সঠিক বয়সে সঠিক শিক্ষণীয় উপকরণ শিশুর শেখার আগ্রহ বহুগুণ বাড়িয়ে দেয়! 🧩✨\n\n২ থেকে ৬ বছর বয়সে শিশুদের মস্তিষ্কের বিকাশ ঘটে সবচেয়ে দ্রুত। এসময় রঙ চেনা, সংখ্যা গণনা ও সমস্যা সমাধানের ধাঁধা তাদের কৌতূহল বাড়ায়।\n\nশেখার প্রক্রিয়াকে আনন্দময় করতে আপনি আপনার শিশুকে কেমন উপকরণ দিচ্ছেন?\n\n#টুকটুকিওয়ার্ল্ড #লার্নিংটয়স #বাচ্চাদেরখেলনা #ParentingHacks #CreativeLearning"
                ]
            },
            {
                "topic": "positive_parenting",
                "posts": [
                    "বাচ্চা জেদ করলে রাগ নয়, প্রয়োজন সহমর্মিতা ও শান্ত আচরণ! ❤️\n\nঅনেক সময় শিশু তার অনুভূতি ভাষায় প্রকাশ করতে না পেরে কান্না বা জেদের আশ্রয় নেয়। এসময় বকাবকি না করে তাকে জড়িয়ে ধরে শান্ত সুরে কথা বলুন। তাকে বুঝতে দিন যে তার অনুভূতির মূল্য আছে।\n\nজেদ সামলাতে আপনি কোন পদ্ধতি ব্যবহার করেন? কমেন্টে শেয়ার করুন আপনার কৌশল!\n\n#প্যারেন্টিংটিপস #সন্তানেরযত্ন #টুকটুকিওয়ার্ল্ড #PositiveParenting #GentleParenting",
                    "প্রতিদিন অন্তত ২০ মিনিট সন্তানকে পূর্ণ মনোযোগ দিন! ⏳👨‍👩‍👧\n\nকোনো মোবাইল বা ল্যাপটপের ব্যাঘাত ছাড়াই সন্তানের সাথে খেলা করা, তার কথা মনোযোগ দিয়ে শোনা শিশুর আত্মবিশ্বাস ও পারিবারিক বন্ধনকে পাহাড়ের মতো শক্ত করে।\n\nআজ আপনার সন্তানের সাথে কী কী নিয়ে আড্ডা দিলেন?\n\n#কোয়ালিটিটাইম #প্যারেন্টিং #টুকটুকিওয়ার্ল্ড #FamilyTime #HappyKids"
                ]
            },
            {
                "topic": "pregnancy_care",
                "posts": [
                    "গর্ভবতী মায়ের সুস্থতা ও মানসিক প্রশান্তিই অনাগত শিশুর প্রথম উপহার! 🤰🌸\n\nগর্ভাবস্থায় পুষ্টিকর সুষম খাদ্য, প্রচুর পানি পান এবং পরিমিত বিশ্রাম অত্যন্ত গুরুত্বপূর্ণ। ভারী ওজন তোলা বা তাড়াহুড়ো করে হাঁটাচলা পরিহার করুন এবং প্রতিদিন হালকা হাঁটার অভ্যাস রাখুন।\n\nপরিবারের প্রতিটি সদস্যের উচিত হবু মায়ের মুখে হাসি রাখা ও তার যত্ন নেওয়া।\n\n#গর্ভবতীরযত্ন #মাওশিশু #সুস্থমা #টুকটুকিওয়ার্ল্ড #PregnancyCareBD",
                    "গর্ভাবস্থায় মনকে প্রফুল্ল রাখা সন্তানের মানসিক বিকাশে দারুণ ভূমিকা রাখে! 💖✨\n\nঅতিরিক্ত দুশ্চিন্তা বা মানসিক চাপ এড়িয়ে চলুন। সুন্দর বই পড়া, হালকা গান শোনা এবং প্রিয়জনদের সাথে খোশগল্প হবু মায়ের মনকে উৎফুল্ল রাখে।\n\nআপনার পরিবারের কোনো গর্ভবতী মায়ের সাথে এই পোস্টটি শেয়ার করে তাকে ভালোবাসার কথা জানিয়ে দিন!\n\n#মাতৃত্বেরযত্ন #গর্ভবতীমা #টুকটুকিওয়ার্ল্ড #MotherCare #HealthyPregnancy",
                    "মায়েদের নিজের যত্ন নেওয়াও কিন্তু শিশুর সেরা যত্নের অংশ! 🌸☕\n\nসন্তান লালন-পালনের ব্যস্ততায় মায়েরা প্রায়ই নিজের স্বাস্থ্য ও বিশ্রামের কথা ভুলে যান। প্রতিদিন অন্তত আধা ঘণ্টা নিজের পছন্দের কিছু করুন, নিয়মিত পুষ্টিকর খাবার খান এবং পর্যাপ্ত বিশ্রাম নিন। একজন সুস্থ ও হাসিখুশি মা-ই একটি শিশুকে সবচেয়ে সুন্দরভাবে বড় করে তুলতে পারেন।\n\nসব মায়েদের প্রতি টুকটুকি ওয়ার্ল্ডের অগাধ শ্রদ্ধা ও ভালোবাসা!\n\n#মায়েদেরযত্ন #MotherWellness #টুকটুকিওয়ার্ল্ড #SuperMom #মাওশিশু"
                ]
            }
        ]

        chosen_pillar = random.choice(pillars)
        post_text = random.choice(chosen_pillar["posts"])

        return {
            "caption": post_text.strip(),
            "topic": chosen_pillar["topic"],
            "language": "bangla",
            "page_name": "টুকটুকি ওয়ার্ল্ড"
        }

    def generate_tuktuki_comment(self) -> str:
        """Generates authentic, empathetic Bengali comments for parenting and mother care discussions."""
        comments = [
            "অনেক সুন্দর ও সময়োপযোগী তথ্য! প্রতিটি মা-বাবার এই বিষয়গুলো জানা খুবই দরকার।",
            "একদম খাঁটি কথা! শিশুদের সঠিক মানসিক ও শারীরিক বিকাশে মা-বাবার একটু ধৈর্য ও সচেতনতাই সবচেয়ে বড় ভূমিকা রাখে।",
            "দারুণ পরামর্শ! বাচ্চার সাথে কোয়ালিটি টাইম কাটানো আসলে যেকোনো ডিজিটাল স্ক্রিনের চেয়ে হাজার গুণ বেশি মূল্যবান।",
            "খুবই চমৎকার লিখেছেন। অনেক নতুন অভিভাবকের উপকারে আসবে এই তথ্যগুলো। শেয়ার করার জন্য ধন্যবাদ!",
            "সন্তানের সুন্দর ভবিষ্যতের জন্য ছোটবেলা থেকেই এই অভ্যাসগুলো গড়ে তোলা প্রয়োজন। দারুণ লাগলো পোস্টটি!",
            "মা ও শিশুর যত্নে এমন তথ্যবহুল ও পজিটিভ পোস্ট সত্যিই অনুপ্রেরণাদায়ক। শুভকামনা রইল!"
        ]
        return random.choice(comments)

