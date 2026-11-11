import re
with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("<Icons.KeyboardArrowDown", "<Icons.ChevronRight")
content = content.replace("Icons.Autorenew", "Icons.Refresh")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
