import re

def parse_video_script(script: str):
    """
    Splits LLM video script into slides.
    """
    slides = []
    sections = re.split(r"\n\s*\n", script)

    for sec in sections:
        if len(sec.strip()) < 30:
            continue
        slides.append(sec.strip())

    return slides
from PIL import Image, ImageDraw, ImageFont
import textwrap
import os

def create_slide(text, index, out_dir="videos/slides"):
    os.makedirs(out_dir, exist_ok=True)

    img = Image.new("RGB", (1280, 720), color=(20, 20, 20))
    draw = ImageDraw.Draw(img)

    font = ImageFont.load_default()
    wrapped = textwrap.fill(text, width=60)

    draw.multiline_text(
        (100, 100),
        wrapped,
        fill=(255, 255, 255),
        font=font,
        spacing=8
    )

    path = f"{out_dir}/slide_{index}.png"
    img.save(path)
    return path
import pyttsx3

def generate_audio(text, out_path="videos/audio.wav"):
    engine = pyttsx3.init()
    voices = engine.getProperty("voices")

    # female voice (best-effort)
    for v in voices:
        if "female" in v.name.lower():
            engine.setProperty("voice", v.id)
            break

    engine.save_to_file(text, out_path)
    engine.runAndWait()

    return out_path
import subprocess

def create_video(slide_dir="videos/slides", audio="videos/audio.wav", out="videos/video.mp4"):
    cmd = [
        "ffmpeg",
        "-y",
        "-framerate", "1",
        "-i", f"{slide_dir}/slide_%d.png",
        "-i", audio,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-shortest",
        out
    ]
    subprocess.run(cmd, check=True)
    return out
