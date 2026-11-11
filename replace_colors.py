import os

def replace_colors_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content.replace('indigo-', 'teal-')
    new_content = new_content.replace('purple-', 'emerald-')
    new_content = new_content.replace('violet-', 'teal-')
    new_content = new_content.replace('#4F46E5', '#0d7d6f')
    new_content = new_content.replace('#4338CA', '#0a6659')
    new_content = new_content.replace('#7C3AED', '#0d7d6f')
    new_content = new_content.replace('#6D28D9', '#0a6659')

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.css'):
            replace_colors_in_file(os.path.join(root, file))
