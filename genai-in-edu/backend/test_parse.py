import video_generator

with open('temp_video_assets/debug_script.txt', 'r', encoding='utf-8') as f:
    text = f.read()

scenes = video_generator.parse_video_script(text)
print("\nFINAL VISUAL DESC SCENE 1:")
print(repr(scenes[0]['visual_desc']))
print("\nFINAL NARRATION SCENE 1:")
print(repr(scenes[0]['narration']))
