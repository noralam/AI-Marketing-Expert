import os
import random
import urllib.parse
import requests
from pathlib import Path

class ImageGenerator:
    def __init__(self, output_dir: str = "temp_images"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Context-Aware Aesthetic & Highly Relevant Prompts
        self.category_prompts = {
            "ai_marketing": [
                "Futuristic minimalist digital marketing dashboard interface with glowing AI neural network nodes, analytics charts, dark premium UI, 3D modern octane render, sleek, professional tech aesthetics, no gibberish text",
                "Sleek ultra-modern laptop screen displaying a clean AI automated marketing workflows graph and email funnel metrics, aesthetic neon blue ambient studio lighting, photorealistic, 8k resolution",
                "High-tech glowing digital workspace showing AI content generation and SEO intelligence dashboard, minimalist dark mode interface, 3D abstract visualization, clean, no text"
            ],
            "elementor_builder": [
                "Modern visual web design canvas showing responsive website builder wireframe blocks, clean UI layout editor, aesthetic wooden desk workspace, soft natural window light, photorealistic",
                "Close up shot of a creative web designer working on an interactive drag-and-drop website layout on a high resolution screen, clean minimal studio setup, cinematic depth of field",
                "Sleek modern 3D abstract isometric grid representing modular website building blocks, glowing pastel cyan and purple glass morphism layers, octane render, clean"
            ],
            "wordpress_theme": [
                "Aesthetic ultra-fast modern eCommerce website layout mockup displayed on a sleek laptop, clean minimalist Scandinavian office background, high-end commercial photography",
                "Overhead flat lay photo of a creative web development agency studio with a tablet showing modern WordPress theme design, clean aesthetics, natural lighting"
            ],
            "woocommerce": [
                "Clean modern digital storefront analytics dashboard on a sleek tablet screen, minimalist eCommerce checkout flow visualization, warm modern studio lighting, 8k render"
            ]
        }

    def generate_image_for_post(self, topic: str = "ai_marketing") -> str:
        """Generates a 100% topic-relevant, aesthetic AI visual image using Pollinations SDXL."""
        prompt_list = self.category_prompts.get(topic, self.category_prompts["ai_marketing"])
        chosen_prompt = random.choice(prompt_list)
        encoded_prompt = urllib.parse.quote(chosen_prompt)
        
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={random.randint(1, 999999)}"
        output_file = self.output_dir / f"post_img_{random.randint(1000, 9999)}.jpg"
        
        try:
            print(f"🎨 [AI Image Engine] Generating contextual visual for topic '{topic}'...")
            response = requests.get(image_url, timeout=30)
            if response.status_code == 200:
                with open(output_file, "wb") as f:
                    f.write(response.content)
                print(f"✨ [AI Image Engine] Image generated successfully: {output_file.name}")
                return str(output_file.resolve())
            else:
                print(f"⚠️ Image generation returned status: {response.status_code}")
                return None
        except Exception as e:
            print(f"⚠️ Note during image generation: {e}")
            return None
