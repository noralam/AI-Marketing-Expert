import urllib.request
import json
import random
import sys
from pathlib import Path

# Enforce UTF-8 so emoji prints never crash on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

class WPOrgTracker:
    def __init__(self, author: str = "nalam-1", cache_file: str = "knowledge/wporg_cache.json"):
        self.author = author
        self.cache_file = Path(cache_file)
        self.plugins = []
        self.themes = []
        self.load_cache_or_fetch()

    def load_cache_or_fetch(self):
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.plugins = data.get("plugins", [])
                    self.themes = data.get("themes", [])
                    if self.plugins and self.themes:
                        return
            except Exception:
                pass
        self.fetch_live_data()

    def fetch_live_data(self):
        print(f"📡 [WP.org Tracker] Fetching live plugins & themes for author '{self.author}'...")
        # 1. Fetch Plugins
        try:
            url_plugins = f"https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[author]={self.author}&request[per_page]=20"
            req = urllib.request.Request(url_plugins, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                self.plugins = [
                    {
                        "name": p.get("name"),
                        "slug": p.get("slug"),
                        "version": p.get("version"),
                        "url": f"https://wordpress.org/plugins/{p.get('slug')}/",
                        "short_description": p.get("short_description", ""),
                        "last_updated": p.get("last_updated")
                    }
                    for p in data.get("plugins", [])
                ]
        except Exception as e:
            print(f"⚠️ Plugin fetch note: {e}")

        # 2. Fetch Themes
        try:
            url_themes = f"https://api.wordpress.org/themes/info/1.2/?action=query_themes&request[author]={self.author}&request[per_page]=20"
            req = urllib.request.Request(url_themes, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                self.themes = [
                    {
                        "name": t.get("name"),
                        "slug": t.get("slug"),
                        "version": t.get("version"),
                        "url": f"https://wordpress.org/themes/{t.get('slug')}/",
                        "preview_url": t.get("preview_url")
                    }
                    for t in data.get("themes", [])
                ]
        except Exception as e:
            print(f"⚠️ Theme fetch note: {e}")

        # Save Cache
        try:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump({"plugins": self.plugins, "themes": self.themes}, f, indent=2)
            print(f"💾 [WP.org Tracker] Saved {len(self.plugins)} plugins & {len(self.themes)} themes.")
        except Exception as e:
            print(f"⚠️ Cache write note: {e}")

    def get_featured_product(self) -> dict:
        """Rotates between AI Marketing Expert (50%), Magical Addons (25%), and other themes/plugins (25%)."""
        rand_val = random.random()
        
        # 1. AI Marketing Expert (Main Hero Product - 50%)
        if rand_val < 0.50 or not self.plugins:
            return {
                "type": "ai_marketing",
                "name": "AI Marketing Expert",
                "headline": "All-in-One AI Marketing, Email CRM & SEO Suite for WordPress",
                "url": "https://wordpress.org/plugins/ai-marketing-expert/",
                "wpthemespace_url": "https://wpthemespace.com/product/ai-marketing-expert/",
                "topic": "ai_marketing"
            }
        
        # 2. Magical Addons for Elementor (25%)
        elif rand_val < 0.75:
            return {
                "type": "elementor_addon",
                "name": "Magical Addons For Elementor",
                "headline": "Theme Builder, Header Footer Builder & 60+ Free Elementor Widgets",
                "url": "https://wordpress.org/plugins/magical-addons-for-elementor/",
                "wpthemespace_url": "https://wpthemespace.com/",
                "topic": "elementor_builder"
            }
        
        # 3. Rotate among other nalam-1 Themes & Plugins (25%)
        else:
            if self.themes and random.random() < 0.5:
                t = random.choice(self.themes)
                return {
                    "type": "theme",
                    "name": t.get("name"),
                    "headline": f"Fast, Clean & SEO-Optimized WordPress Theme ({t.get('name')})",
                    "url": t.get("url"),
                    "wpthemespace_url": "https://wpthemespace.com/",
                    "topic": "wordpress_theme"
                }
            elif self.plugins:
                p = random.choice(self.plugins)
                return {
                    "type": "plugin",
                    "name": p.get("name"),
                    "headline": f"Enhance your WordPress site with {p.get('name')}",
                    "url": p.get("url"),
                    "wpthemespace_url": "https://wpthemespace.com/",
                    "topic": "woocommerce" if "woo" in p.get("slug", "") else "wordpress_general"
                }
            else:
                return {
                    "type": "ai_marketing",
                    "name": "AI Marketing Expert",
                    "headline": "All-in-One AI Marketing Suite for WordPress",
                    "url": "https://wordpress.org/plugins/ai-marketing-expert/",
                    "wpthemespace_url": "https://wpthemespace.com/ai-marketing-expert/",
                    "topic": "ai_marketing"
                }
