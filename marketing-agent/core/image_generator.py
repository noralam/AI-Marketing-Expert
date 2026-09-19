import os
import sys
import random
import urllib.parse
import requests
from pathlib import Path

# Enforce UTF-8 on Windows terminal so emoji prints never crash
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

class ImageGenerator:
    def __init__(self, output_dir: str = "temp_images"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Context-Aware Aesthetic & Highly Relevant Prompts
        self.category_prompts = {
            "ai_marketing": [
                "Futuristic minimalist digital marketing dashboard interface with glowing AI neural network nodes, analytics charts, dark premium UI, 3D modern octane render, sleek, professional tech aesthetics, no text",
                "Sleek ultra-modern laptop screen displaying a clean AI automated marketing workflows graph and email funnel metrics, aesthetic neon blue ambient studio lighting, photorealistic, 8k resolution",
                "High-tech glowing digital workspace showing AI content generation and SEO intelligence dashboard, minimalist dark mode interface, 3D abstract visualization, clean, no text",
                "Professional workspace with a dual-monitor setup displaying WordPress AI marketing automation, email campaign conversion analytics, modern cozy office lighting, cinematic 8k photo",
                "Clean minimal UI mockup of an intelligent AI customer support chatbot assistant on a sleek tablet, glowing conversational nodes, modern commercial tech photography",
                "Aesthetic eCommerce marketing command center showing live abandoned cart recovery graphs and automated revenue boost metrics on a curved monitor, elegant ambient light"
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
            ],
            "child_health_care": [
                "Candid photorealistic portrait of an adorable cute Bangladeshi toddler sleeping peacefully in a soft cozy bed with a pastel blanket and small teddy bear, silky jet black hair, soft warm morning window light, heartwarming commercial photography, authentic South Asian child, 8k",
                "Cute smiling Bangladeshi baby girl with big dark brown eyes and silky black hair happily drinking from a colorful baby cup, loving South Asian mother smiling softly in background, cozy bright Dhaka home, soft natural light, photorealistic 8k",
                "Healthy happy cute Bangladeshi toddler boy with silky black hair smiling cheerfully at the camera holding a small fresh fruit, bright baby portrait photography, natural candid smile, soft bokeh background"
            ],
            "play_and_brain_development": [
                "Joyful cute Bangladeshi toddler brother and sister with silky black hair playing together with colorful wooden building blocks on a soft play rug, bright dark eyes, creative playtime, warm aesthetic photography, 8k",
                "Adorable 3-year-old Bangladeshi child with black hair happily coloring a drawing with bright crayons at a small wooden play table, creative focus, natural window lighting, candid cute moment, photorealistic",
                "Happy playful Bangladeshi toddler boy with shiny black hair laughing while building a tall tower out of colorful wooden blocks, cozy sunny playroom, authentic South Asian child, 8k"
            ],
            "educational_toys": [
                "Cute Bangladeshi toddler girl with dark silky hair carefully fitting a wooden geometric shape into a Montessori puzzle board, focused cute expression, early learning development, close up commercial photography",
                "Adorable Bangladeshi toddler with big dark brown eyes laughing with delight while holding a cute wooden animal puzzle, bright cheerful nursery room, natural warm light, photorealistic 8k",
                "Beautiful clean flat lay of colorful wooden Montessori educational toys, alphabet wooden blocks, shape sorter and counting rings on a soft pastel surface, bright aesthetic product photography, no text",
                "Cute Bangladeshi toddler boy with silky black hair happily exploring a colorful wooden activity board, tactile sensory play, warm natural lighting, 8k commercial photo"
            ],
            "positive_parenting": [
                "Heartwarming emotional moment of a loving Bangladeshi mother wearing comfortable salwar kameez gently hugging and kissing the forehead of her cute smiling toddler, silky black hair, warm soft morning sunlight, genuine love and parenting, photorealistic 8k",
                "Loving Bangladeshi mother and father sitting on the rug reading a colorful storybook with their attentive toddler child, silky black hair, happy family bond, cozy living room, warm ambient lighting",
                "Affectionate Bangladeshi mother laughing joyfully with her cute little daughter in a bright sunny room, candid authentic moment, heartwarming parenting photography, 8k"
            ],
            "pregnancy_care": [
                "Beautiful glowing pregnant Bangladeshi mother in comfortable modest pastel dress, silky black hair, gently cradling her baby bump with a warm serene smile, bright airy window with sheer curtains, soft natural sunlight, heartwarming 8k",
                "Loving Bangladeshi husband gently offering a fresh nutritious bowl of fruits to his smiling pregnant wife sitting comfortably on a sofa, caring South Asian family moment, warm ambient lighting, photorealistic",
                "Gentle and aesthetic portrait of an expectant Bangladeshi mother holding a pair of tiny cute baby shoes near her pregnant bump, soft pastel tones, serene emotional atmosphere, commercial photography"
            ],
            "busy_kids_learning_toys": [
                "Cute Bangladeshi toddler with silky black hair deeply focused and happily playing with a colorful Montessori busy board and wooden activity toys on a soft play mat, bright cheerful playroom, soft natural lighting, aesthetic commercial photography, 8k",
                "Adorable Bangladeshi toddler sitting on the floor with colorful educational flashcards and illustrated storybooks, silky black hair, big curious dark brown eyes, bright modern nursery room, warm candid photography",
                "Happy playful Bangladeshi child with dark hair laughing while stacking wooden rainbow sorting toys and counting blocks, clean aesthetic playroom, bright cheerful colors, high-end commercial photo"
            ],
            "parenting_kids": [
                "Super cute cheerful Bangladeshi toddler with silky black hair and sparkling dark brown eyes smiling delightfully at the camera, wearing cute clothes, soft bokeh cozy home background, professional portrait photography, 8k",
                "Adorable Bangladeshi baby with silky black hair playing happily with a soft plush toy on a white fluffy blanket, laughing with bright innocent eyes, warm natural lighting"
            ]
        }

    def generate_image_for_post(self, topic: str = "ai_marketing") -> str:
        """Generates a 100% topic-relevant, aesthetic AI visual image using Pollinations SDXL with retry protection."""
        prompt_list = self.category_prompts.get(topic, self.category_prompts.get("parenting_kids" if "tuktuki" in topic or "child" in topic or "toy" in topic else "ai_marketing"))
        chosen_prompt = random.choice(prompt_list)
        
        for attempt in range(1, 4):
            try:
                encoded_prompt = urllib.parse.quote(chosen_prompt)
                image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={random.randint(1, 999999)}"
                output_file = self.output_dir / f"post_img_{random.randint(1000, 9999)}.jpg"
                
                print(f"🎨 [AI Visual Engine] Generating visual for '{topic}' (attempt {attempt}/3)...")
                response = requests.get(image_url, timeout=35)
                if response.status_code == 200 and len(response.content) > 1000:
                    with open(output_file, "wb") as f:
                        f.write(response.content)

                    # Auto-crop bottom 35px to ensure 100% watermark-free presentation
                    try:
                        from PIL import Image
                        with Image.open(output_file) as img:
                            w, h = img.size
                            if h > 100:
                                clean_img = img.crop((0, 0, w, h - 35))
                                clean_img.save(output_file, quality=95)
                    except Exception:
                        pass

                    print(f"✨ [AI Visual Engine] Image generated successfully: {output_file.name}")
                    return str(output_file.resolve())
                else:
                    print(f"⚠️ Attempt {attempt} returned status: {response.status_code}")
                    import time
                    time.sleep(2)
            except Exception as e:
                print(f"⚠️ Attempt {attempt} error: {e}")
                import time
                time.sleep(2)

        return None

    def create_animated_video(self, image_path: str, duration_sec: int = 10, fps: int = 24, target_w: int = 1280, target_h: int = 720) -> str:
        """Transforms a static image into a smooth 10-second 16:9 cinematic animated MP4 video with gentle Ken Burns motion."""
        try:
            from PIL import Image
            import numpy as np
            import imageio

            print(f"🎬 [Video Engine] Animating image into 10s (16:9) video clip...")
            img = Image.open(image_path).convert("RGB")
            orig_w, orig_h = img.size

            target_aspect = target_w / target_h
            current_aspect = orig_w / orig_h

            if current_aspect > target_aspect:
                crop_w = int(orig_h * target_aspect)
                crop_h = orig_h
                left = (orig_w - crop_w) // 2
                top = 0
            else:
                crop_w = orig_w
                crop_h = int(orig_w / target_aspect)
                left = 0
                top = (orig_h - crop_h) // 2

            base_16_9 = img.crop((left, top, left + crop_w, top + crop_h))
            base_w, base_h = base_16_9.size

            output_video = self.output_dir / f"post_vid_{random.randint(1000, 9999)}.mp4"
            total_frames = duration_sec * fps
            writer = imageio.get_writer(str(output_video), fps=fps, codec="libx264", pixelformat="yuv420p", quality=8)

            max_zoom = 1.12  # Subtle, elegant 12% zoom over 10 seconds

            for i in range(total_frames):
                progress = i / total_frames
                zoom = 1.0 + (max_zoom - 1.0) * (0.5 * (1.0 - np.cos(np.pi * progress)))

                cur_w = int(base_w / zoom)
                cur_h = int(base_h / zoom)

                pan_x = int((base_w - cur_w) * 0.5 * (0.5 + 0.5 * progress))
                pan_y = int((base_h - cur_h) * 0.4 * (0.3 + 0.7 * progress))

                crop_box = (pan_x, pan_y, pan_x + cur_w, pan_y + cur_h)
                frame_img = base_16_9.crop(crop_box).resize((target_w, target_h), Image.Resampling.BILINEAR)

                writer.append_data(np.array(frame_img))

            writer.close()
            print(f"✨ [Video Engine] 10s animated video ready: {output_video.name} ({output_video.stat().st_size / 1024 / 1024:.2f} MB)")
            return str(output_video.resolve())
        except Exception as e:
            print(f"⚠️ Video generation fallback to image: {e}")
            return image_path

    def generate_media_for_post(self, topic: str = "ai_marketing", as_video: bool = False) -> str:
        """Generates either a high-res photo or a 10s 16:9 animated video based on as_video flag."""
        image_path = self.generate_image_for_post(topic=topic)
        if not image_path:
            return None

        if as_video:
            return self.create_animated_video(image_path)
        return image_path
