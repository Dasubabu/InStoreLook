from pathlib import Path
import subprocess

ROOT = Path(__file__).parent
WORK = ROOT / 'rendered'
WORK.mkdir(exist_ok=True)
OUT = ROOT / 'instorelook-vc-demo.mp4'

slides = [
    ('THE IDEA', 'Local fashion, finally searchable.', 'InStoreLook connects shoppers to what independent stores actually have nearby — visible, local, actionable.'),
    ('THE PROBLEM', 'Shoppers cannot see local inventory.', 'Great stores remain invisible online. Customers lose time travelling store to store.'),
    ('THE SHOPPER JOURNEY', 'From current location to confident visit.', 'Detect location  /  discover nearby  /  check stock  /  call or get directions'),
    ('INDIA-FIRST DISCOVERY', 'Nearby stores. Prices in Indian rupees.', 'Current city  •  address  •  landmark  •  phone  •  distance  •  directions  •  ₹ pricing'),
    ('PRODUCT DETAIL', 'Every visit starts with better information.', 'See product photos, current stock, sizes, material, discount, and the exact store carrying it.'),
    ('RETAILER SIDE', 'One upload becomes a discoverable storefront.', 'Photo upload  →  AI-assisted listing  →  seller review  →  local shopper discovery'),
    ('BUSINESS OPPORTUNITY', 'Between maps and marketplaces.', 'Maps show where a store is. InStoreLook shows what is available now.'),
    ('THE ASK', 'Make every local rack discoverable.', 'Next: seed Hyderabad retail density, onboard sellers, and measure discovery-to-store visits.'),
]

def esc(value: str) -> str:
    return value.replace('\\', '\\\\').replace(':', '\\:').replace(',', '\\,').replace("'", "\\'")

def render_slide(index: int, eyebrow: str, title: str, body: str) -> Path:
    output = WORK / f'slide-{index:02d}.mp4'
    filters = [
        "drawbox=x=0:y=0:w=1920:h=12:color=0xd6ff62:t=fill",
        "drawbox=x='-120+90*sin(t/2)':y='-80+40*cos(t/2)':w=620:h=620:color=0x8f86ff@0.12:t=fill",
        "drawbox=x='1460+100*cos(t/2)':y='590+55*sin(t/2)':w=520:h=520:color=0x67e4c0@0.08:t=fill",
        f"drawtext=text='{esc('INSTORELOOK  /  INVESTOR DEMO  0'+str(index))}':x=100:y=80:fontsize=24:fontcolor=0xd6ff62",
        f"drawtext=text='{esc(eyebrow)}':x=100:y=170:fontsize=24:fontcolor=0x8f86ff",
        f"drawtext=text='{esc(title)}':x=100:y=235:fontsize=66:fontcolor=0xf6f8f3",
        f"drawtext=text='{esc(body)}':x=100:y=360:fontsize=30:fontcolor=0xaeb8ad",
        "drawbox=x=118:y=518:w=1720:h=280:color=0x000000@0.35:t=fill",
        "drawbox=x=100:y=500:w=1720:h=280:color=0x18221d@1:t=fill",
        "drawbox=x=100:y=500:w=1720:h=280:color=0x2f4538:t=3",
        "drawbox=x=140:y=540:w=430:h=175:color=0x243c32:t=fill",
        "drawbox=x=695:y=540:w=430:h=175:color=0x26314a:t=fill",
        "drawbox=x=1250:y=540:w=430:h=175:color=0x32294d:t=fill",
        f"drawtext=text='{esc('DISCOVER')}' :x=155:y=575:fontsize=22:fontcolor=0xd6ff62",
        f"drawtext=text='{esc('PRODUCT')}' :x=710:y=575:fontsize=22:fontcolor=0x67e4c0",
        f"drawtext=text='{esc('VISIT')}' :x=1260:y=575:fontsize=22:fontcolor=0x8f86ff",
        f"drawtext=text='{esc('A better local retail loop')}' :x=155:y=650:fontsize=38:fontcolor=0xf6f8f3",
        f"drawtext=text='{esc('Location-aware  •  inventory-aware  •  retailer-friendly')}' :x=710:y=650:fontsize=24:fontcolor=0xaeb8ad",
        f"drawtext=text='{esc('₹  +  map  +  stock')}' :x=1260:y=650:fontsize=30:fontcolor=0xd6ff62",
        f"drawtext=text='{esc('Find it nearby. Know before you go.')}' :x=100:y=1000:fontsize=20:fontcolor=0xaeb8ad",
        f"drawtext=text='{index}/8':x=1810:y=1000:fontsize=20:fontcolor=0xd6ff62",
        "scale=iw*1.08:ih*1.08",
        "crop=1920:1080:x='(iw-1920)*(0.5+0.12*sin(t/2))':y='(ih-1080)*(0.5+0.08*cos(t/2))'",
        "rotate='0.004*sin(t*1.5)':fillcolor=0x101915",
        "fade=t=in:st=0:d=0.35,fade=t=out:st=3.65:d=0.35",
    ]
    filter_graph = ','.join(filters)
    subprocess.run([
        'ffmpeg', '-y', '-f', 'lavfi', '-i', 'color=c=0x101915:s=1920x1080:d=4:r=30',
        '-vf', filter_graph, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return output

def main() -> None:
    clips = [render_slide(i, *slide) for i, slide in enumerate(slides, 1)]
    concat = WORK / 'concat.txt'
    concat.write_text(''.join(f"file '{clip.resolve().as_posix()}'\n" for clip in clips), encoding='utf-8')
    subprocess.run([
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat),
        '-c', 'copy', '-movflags', '+faststart', str(OUT)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(OUT)

if __name__ == '__main__':
    main()
