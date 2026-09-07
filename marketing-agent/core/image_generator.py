import os
import random
import urllib.parse
import requests
from pathlib import Path

class ImageGenerator:
    def __init__(self, output_dir: str = "temp_images"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Real-looking, aesthetic, human-photorealistic & clean 3D graphic prompt styles
        self.prompts = [
            # 1. Clean Modern Workspace / Developer realism (No fake text)
            "Clean modern minimal desk setup with a laptop showing a clean website analytics dashboard, warm aesthetic lighting, indoor plant, photorealistic, 8k resolution, professional photography",
            
            # 2. WordPress & Tech Infrastructure realism
            "Sleek modern laptop on a wooden table displaying clean user interface wireframe, soft natural sunlight from window, coffee cup nearby, realistic documentary photography style",
            
            # 3. High-Speed Architecture / Concept (Clean visual)
            "Minimalist modern 3D abstract concept of speed and connectivity, glowing soft orange and cyan neon lights, dark premium matte background, octane render, clean, no text",
            
            # 4. Email / Community Growth realism
            "Overhead flat lay photo of an open notebook, sleek pen, and modern tablet on a creative agency studio desk, natural daylight, photorealistic",
            
            # 5. UI/UX & Web Design realism
            "Close up shot of a designer hands working on a modern keyboard next to a crisp screen showing minimalist web layout, cinematic depth of field, realistic"
        ]

    def generate_image_for_post(self) -> str:
        """Generates a realistic, clean image using Pollinations AI (free, no watermark, fast)."""
        prompt = random.choice(self.prompts)
        encoded_prompt = urllib.parse.quote(prompt)
        
        # Pollinations SDXL URL with realism parameters
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={random.randint(1, 999999)}"
        
        output_file = self.output_dir / f"post_img_{random.randint(1000, 9999)}.jpg"
        
        try:
            print("🎨 [AI Image Engine] Generating realistic visual context...")
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
