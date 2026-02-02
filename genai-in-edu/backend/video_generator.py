import re
import os
import requests
from gtts import gTTS
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from moviepy.editor import (
    ImageClip, AudioFileClip, concatenate_videoclips, CompositeAudioClip
)
import textwrap
import time

# Create directories
os.makedirs("temp_video_assets", exist_ok=True)
os.makedirs("generated_videos", exist_ok=True)

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")


def parse_video_script(script_text):
    """
    Parse YOUR LLM's script format exactly as it generates it
    Example format:
    Section Title (0:00 - 0:30)
    (Visuals: description)
    Narration: "text here"
    """
    print("\n🔍 PARSING SCRIPT...")
    scenes = []
    
    # More flexible pattern to match your LLM's output
    lines = script_text.split('\n')
    current_scene = None
    
    for line_num, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # DEBUG: Show what we're processing
        if line_num < 20:  # Show first 20 lines
            print(f"  Line {line_num}: {line[:80]}")
            
        # Check for timestamp pattern: Title (MM:SS - MM:SS)
        timestamp_match = re.search(r'^(.*?)\((\d+:\d+)\s*-\s*(\d+:\d+)\)', line)
        
        if timestamp_match:
            # Save previous scene if exists
            if current_scene:
                print(f"  ✅ Saved scene: {current_scene['title']}")
                scenes.append(current_scene)
            
            # Start new scene
            title = timestamp_match.group(1).strip()
            start = timestamp_match.group(2)
            end = timestamp_match.group(3)
            
            print(f"  🎬 New scene found: '{title}' ({start} - {end})")
            
            current_scene = {
                'title': title,
                'start': start,
                'end': end,
                'narration': '',
                'visual_desc': '',
                'duration': 0
            }
            current_scene['duration'] = (
                time_to_seconds(current_scene['end']) - 
                time_to_seconds(current_scene['start'])
            )
        
        elif current_scene:
            # Check for Visuals line
            if line.startswith('(Visuals:') or line.startswith('Visuals:'):
                visual_text = re.sub(r'^\(?\s*Visuals:\s*', '', line)
                visual_text = visual_text.rstrip(')')
                current_scene['visual_desc'] += ' ' + visual_text
                print(f"    📷 Added visual: {visual_text[:60]}...")
            
            # Check for Narration line
            elif 'Narration:' in line:
                narration_text = re.search(r'Narration:\s*"?(.*?)"?\s*$', line)
                if narration_text:
                    current_scene['narration'] += ' ' + narration_text.group(1)
                    print(f"    🎤 Added narration: {narration_text.group(1)[:60]}...")
            
            # If it's a continuation of narration (no label)
            elif current_scene['narration'] and not line.startswith('('):
                current_scene['narration'] += ' ' + line.strip('"')
                print(f"    🎤 Continuation: {line[:60]}...")
    
    # Add last scene
    if current_scene:
        print(f"  ✅ Saved final scene: {current_scene['title']}")
        scenes.append(current_scene)
    
    # Clean up
    for scene in scenes:
        scene['narration'] = scene['narration'].strip().strip('"')
        scene['visual_desc'] = scene['visual_desc'].strip()
        if not scene['narration']:
            scene['narration'] = scene['title']  # Fallback
    
    print(f"\n📋 Parsed {len(scenes)} scenes:")
    for i, s in enumerate(scenes):
        print(f"  Scene {i+1}: {s['title']} ({s['duration']}s)")
        print(f"    Narration: {s['narration'][:50]}...")
    
    return scenes


def time_to_seconds(time_str):
    """Convert MM:SS to seconds"""
    parts = time_str.split(':')
    return int(parts[0]) * 60 + int(parts[1])


def fetch_image_from_pexels(query, index=0):
    """Fetch image from Pexels with better error handling"""
    if not PEXELS_API_KEY:
        print(f"⚠️  No Pexels API key - using gradient for scene {index}")
        return create_gradient_background(index, query)
    
    try:
        # Extract keywords from query
        keywords = query.lower()
        keywords = re.sub(r'[^\w\s]', '', keywords)  # Remove punctuation
        words = keywords.split()[:3]  # Take first 3 words
        search_query = ' '.join(words) if words else 'education'
        
        print(f"🔍 Searching Pexels for: '{search_query}'")
        
        url = "https://api.pexels.com/v1/search"
        headers = {"Authorization": PEXELS_API_KEY}
        params = {
            "query": search_query,
            "per_page": 5,
            "orientation": "landscape"
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        if data.get('photos') and len(data['photos']) > 0:
            photo = data['photos'][0]
            img_url = photo['src']['large2x']
            
            print(f"✅ Found image: {photo.get('alt', 'No description')}")
            
            # Download image
            img_response = requests.get(img_url, timeout=15)
            img_response.raise_for_status()
            
            img_path = f"temp_video_assets/bg_{index}.jpg"
            with open(img_path, 'wb') as f:
                f.write(img_response.content)
            
            return img_path
        else:
            print(f"⚠️  No images found for '{search_query}'")
            return create_gradient_background(index, query)
            
    except Exception as e:
        print(f"❌ Pexels error: {e}")
        return create_gradient_background(index, query)


def create_gradient_background(index, title=""):
    """Create beautiful gradient backgrounds as fallback"""
    # Nice gradient color schemes
    gradients = [
        [(25, 42, 86), (58, 96, 115)],    # Deep blue
        [(67, 67, 67), (0, 0, 0)],        # Dark elegant
        [(30, 60, 114), (42, 82, 152)],   # Professional blue
        [(72, 52, 212), (130, 72, 210)],  # Purple
        [(34, 193, 195), (253, 187, 45)], # Teal to gold
    ]
    
    colors = gradients[index % len(gradients)]
    
    img = Image.new('RGB', (1920, 1080))
    draw = ImageDraw.Draw(img)
    
    # Create gradient
    for y in range(1080):
        ratio = y / 1080
        r = int(colors[0][0] + (colors[1][0] - colors[0][0]) * ratio)
        g = int(colors[0][1] + (colors[1][1] - colors[0][1]) * ratio)
        b = int(colors[0][2] + (colors[1][2] - colors[0][2]) * ratio)
        draw.line([(0, y), (1920, y)], fill=(r, g, b))
    
    img_path = f"temp_video_assets/gradient_{index}.jpg"
    img.save(img_path, quality=95)
    return img_path


def create_slide_with_text(bg_image_path, title, content, index):
    """Create beautiful slides with proper text overlay"""
    print(f"🎨 Creating slide {index}...")
    
    # Load and resize background
    try:
        img = Image.open(bg_image_path)
        img = img.resize((1920, 1080), Image.Resampling.LANCZOS)
    except Exception as e:
        print(f"❌ Error loading image: {e}")
        img = Image.new('RGB', (1920, 1080), (30, 30, 50))
    
    # Apply slight blur for better text readability
    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    
    # Convert to RGBA for overlay
    img = img.convert('RGBA')
    
    # Create dark overlay (semi-transparent)
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 160))
    img = Image.alpha_composite(img, overlay)
    
    # Back to RGB
    img = img.convert('RGB')
    draw = ImageDraw.Draw(img)
    
    # Load fonts
    try:
        # Try different Windows font paths
        title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 90)
        content_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 45)
    except:
        try:
            title_font = ImageFont.truetype("arial.ttf", 90)
            content_font = ImageFont.truetype("arial.ttf", 45)
        except:
            print("⚠️  Using default font")
            title_font = ImageFont.load_default()
            content_font = ImageFont.load_default()
    
    # Draw title with shadow effect
    title_wrapped = textwrap.fill(title, width=30)
    title_y = 200
    
    # Shadow
    draw.text((105, title_y + 5), title_wrapped, fill=(0, 0, 0), font=title_font)
    # Main text
    draw.text((100, title_y), title_wrapped, fill=(255, 255, 255), font=title_font)
    
    # Draw content with better wrapping
    content_wrapped = textwrap.fill(content, width=55)
    content_y = 500
    
    # Shadow
    draw.text((105, content_y + 3), content_wrapped, fill=(0, 0, 0), font=content_font)
    # Main text
    draw.text((100, content_y), content_wrapped, fill=(220, 220, 220), font=content_font)
    
    # Save slide
    slide_path = f"temp_video_assets/slide_{index}.jpg"
    img.save(slide_path, quality=95)
    
    print(f"✅ Slide {index} created")
    return slide_path


def generate_voiceover(text, index):
    """Generate clear voiceover with gTTS"""
    audio_path = f"temp_video_assets/audio_{index}.mp3"
    
    if not text or text.strip() == "":
        print(f"❌ Scene {index}: No narration text provided!")
        return None
    
    try:
        print(f"🎤 Generating voiceover {index}...")
        print(f"   Text length: {len(text)} chars")
        print(f"   Preview: '{text[:80]}...'")
        
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(audio_path)
        
        # Verify file was created and has size
        if os.path.exists(audio_path):
            size = os.path.getsize(audio_path)
            if size > 0:
                print(f"✅ Audio {index} generated ({size} bytes)")
                return audio_path
            else:
                print(f"❌ Audio file is empty (0 bytes)")
                return None
        else:
            print(f"❌ Audio file was not created at {audio_path}")
            return None
            
    except Exception as e:
        print(f"❌ TTS error for scene {index}: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None


def create_video_from_script(script_text, output_filename="output_video.mp4"):
    """
    Generate video from YOUR LLM's script format
    """
    print("\n" + "="*60)
    print("🎬 VIDEO GENERATION STARTED")
    print("="*60 + "\n")
    
    # DEBUG: Save the raw script to file
    debug_path = "temp_video_assets/debug_script.txt"
    with open(debug_path, 'w', encoding='utf-8') as f:
        f.write(script_text)
    print(f"📝 Raw script saved to: {debug_path}")
    print(f"📊 Script length: {len(script_text)} characters")
    print(f"📄 First 500 chars:\n{script_text[:500]}\n")
    
    # Parse script
    scenes = parse_video_script(script_text)
    
    if not scenes:
        print("❌ PARSING FAILED - No scenes found!")
        print("📋 This usually means the LLM script format doesn't match expected format")
        print("💡 Check temp_video_assets/debug_script.txt to see what was received")
        
        # Emergency fallback: create 1 scene from entire text
        print("\n🚨 FALLBACK MODE: Creating single scene from entire script")
        scenes = [{
            'title': 'Generated Content',
            'start': '0:00',
            'end': '0:30',
            'narration': script_text[:500],  # First 500 chars
            'visual_desc': 'Educational content',
            'duration': 30
        }]
    
    print(f"\n✅ Found {len(scenes)} scenes\n")
    
    video_clips = []
    
    for i, scene in enumerate(scenes):
        print(f"\n--- Scene {i+1}/{len(scenes)}: {scene['title']} ---")
        
        # 1. Get background image
        bg_image = fetch_image_from_pexels(scene['title'], i)
        
        # 2. Create slide
        slide_path = create_slide_with_text(
            bg_image,
            scene['title'],
            scene['narration'][:300],  # First 300 chars on slide
            i
        )
        
        # 3. Generate voiceover
        audio_path = generate_voiceover(scene['narration'], i)
        
        # 4. Create video clip
        if audio_path and os.path.exists(audio_path):
            try:
                audio_clip = AudioFileClip(audio_path)
                duration = audio_clip.duration
                print(f"📏 Audio duration: {duration:.2f}s")
                
                # Create video clip with image
                video_clip = ImageClip(slide_path, duration=duration)
                video_clip = video_clip.set_audio(audio_clip)
                
                video_clips.append(video_clip)
                print(f"✅ Scene {i+1} complete")
                
            except Exception as e:
                print(f"❌ Error creating clip {i}: {e}")
                # Fallback: use default duration
                video_clip = ImageClip(slide_path, duration=max(scene['duration'], 5))
                video_clips.append(video_clip)
        else:
            # No audio - use duration from script
            duration = max(scene['duration'], 5)
            video_clip = ImageClip(slide_path, duration=duration)
            video_clips.append(video_clip)
            print(f"⚠️  Scene {i+1} has no audio, using {duration}s duration")
    
    if not video_clips:
        print("❌ No video clips created!")
        return None
    
    # 5. Concatenate all scenes
    print("\n🎞️  Assembling final video...")
    try:
        final_video = concatenate_videoclips(video_clips, method="compose")
        
        # 6. Export
        output_path = f"generated_videos/{output_filename}"
        print(f"💾 Exporting to {output_path}...")
        
        final_video.write_videofile(
            output_path,
            fps=24,
            codec='libx264',
            audio_codec='aac',
            bitrate='5000k',
            preset='medium',
            threads=4
        )
        
        print("\n" + "="*60)
        print(f"✅ VIDEO GENERATED SUCCESSFULLY!")
        print(f"📁 Location: {output_path}")
        print(f"⏱️  Duration: {final_video.duration:.2f} seconds")
        print("="*60 + "\n")
        
        # Cleanup
        final_video.close()
        for clip in video_clips:
            clip.close()
        
        return output_path
        
    except Exception as e:
        print(f"\n❌ Error assembling video: {e}")
        import traceback
        traceback.print_exc()
        return None


# Test function
if __name__ == "__main__":
    # Use YOUR LLM's actual format
    sample_script = """
Video Lesson: Understanding Private Cloud
Introduction (0:00 - 0:30)
(Visuals: A title slide appears on screen with the words "Understanding Private Cloud" in bold font. The background is a serene sky with a few white clouds.)
Narration: "Welcome to this lesson on understanding private cloud. In this video, we'll explore what a private cloud is, its benefits, and how it differs from public cloud and hybrid cloud. Let's get started!"

What is Private Cloud? (0:30 - 2:00)
(Visuals: An animation of a cloud appears on screen, and the words "Private Cloud" start to form around it.)
Narration: "So, what is private cloud? A private cloud is a cloud computing infrastructure that is managed and hosted on-premises, within an organization's own data center. It is a centralized, secure, and highly scalable computing environment that provides storage, processing, and networking capabilities to users."
    """
    
    video_path = create_video_from_script(sample_script, "test_video.mp4")