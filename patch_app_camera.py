import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add states
state_search = r'(const \[fashionValidationState, setFashionValidationState\] = useState<"idle" \| "validating" \| "enhancing" \| "enhanced" \| "rejected">.*?;)'
state_repl = r'''\1
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);'''

content = re.sub(state_search, state_repl, content)

# 2. Refactor handleImageUpload
old_handle_pattern = re.compile(r"const handleImageUpload = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{.*?^\s*\}\s*;", re.MULTILINE | re.DOTALL)

new_code = '''const processImageBase64 = async (base64Str: string, mimeType: string) => {
  setIsUploadingImage(true);
  setUploadProgress(20);
  try {
    const base64Data = base64Str.split(",")[1];

    setUploadedImageUrl(base64Str);
    setFashionValidationState("validating");

    // Simulate file upload progress
    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 90));
    }, 300);

    const res = await fetch("/api/ai/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64Data, mimeType: mimeType })
    });
    clearInterval(interval);
    setUploadProgress(100);

    if (res.ok) {
      const metadata = await res.json();

      if (metadata.isFashionProduct === false) {
        setFashionValidationState("rejected");
        return;
      }

      setConfidenceData({
        name: metadata.nameConf || 0,
        category: metadata.categoryConf || 0,
        subcategory: metadata.subcategoryConf || 0,
        description: metadata.descriptionConf || 0,
        primaryColor: metadata.primaryColorConf || 0,
        pattern: metadata.patternConf || 0,
        brand: metadata.brandConf || 0,
      });

      // Only accept if confidence is >= 60%
      const safeGet = (key: string, original: any) => metadata[`${key}Conf`] >= 60 ? metadata[key] : original;

      setProductFormData((prev) => ({
        ...prev,
        name: safeGet("name", prev.name),
        category: safeGet("category", prev.category),
        subcategory: safeGet("subcategory", prev.subcategory),
        description: safeGet("description", prev.description),
        color: safeGet("primaryColor", prev.color),
        pattern: safeGet("pattern", prev.pattern),
        brand: safeGet("brand", prev.brand),
        images: [base64Str],
        aiMetadata: JSON.stringify(metadata),
      }));

      setFashionValidationState("enhancing");
      const enhancedBase64 = await enhanceImageLocally(base64Str);
      setEnhancedImageUrl(enhancedBase64);
      setFashionValidationState("enhanced");
    }
  } catch (err) {
    console.error(err);
    alert("Failed to analyze image with AI.");
  } finally {
    setTimeout(() => {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }, 500);
  }
};

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files || e.target.files.length === 0) return;
  const file = e.target.files[0];
  const reader = new FileReader();

  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  const base64Str = await base64Promise;
  processImageBase64(base64Str, file.type);
};

const startCamera = async () => {
  setIsCameraOpen(true);
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    setStream(mediaStream);
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
  } catch (err) {
    console.error("Error accessing camera:", err);
    alert("Camera permissions are required. Please check your browser settings.");
    setIsCameraOpen(false);
  }
};

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  setStream(null);
  setIsCameraOpen(false);
};

const capturePhoto = () => {
  if (videoRef.current && canvasRef.current) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64DataUrl = canvas.toDataURL('image/jpeg', 0.9);
      stopCamera();
      processImageBase64(base64DataUrl, "image/jpeg");
    }
  }
};
'''

content = old_handle_pattern.sub(new_code, content)

# 3. Add UI elements for Camera
camera_ui = '''
              {isCameraOpen && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center">
                  <div className="absolute top-4 left-4 z-[110]">
                    <button onClick={stopCamera} className="p-3 bg-black/50 text-white rounded-full">
                      <Icons.Close size={28} />
                    </button>
                  </div>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center z-[110]">
                    <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-xl flex items-center justify-center active:scale-95 transition-all">
                      <div className="w-16 h-16 bg-white rounded-full border border-gray-400"></div>
                    </button>
                  </div>
                </div>
              )}
'''

# We inject camera_ui inside `<motion.div key="unified_ai_hub" ... >`
content = content.replace(
'''            <motion.div
              key="unified_ai_hub"''',
'''            <motion.div
              key="unified_ai_hub"''' + camera_ui)


# Change "Scan Now" button:
# <label className="flex-1 ..."> <input type="file" capture="environment" /> </label> => <button onClick={startCamera}> Scan Now </button>
# Let's target exactly the old button:
button_search = r'<label className="flex-1 h-\[42px\] flex items-center justify-center gap-1\.5 bg-\[#0d7d6f\] text-white rounded-xl font-bold text-\[13px\] active:scale-95 transition-all shadow-md shadow-\[#0d7d6f\]/20 cursor-pointer">([\s\S]*?)<input type="file" accept="image/\*" capture="environment" className="hidden" onChange=\{handleImageUpload\} />\s*</label>'
button_replace = r'<button onClick={startCamera} className="flex-1 h-[42px] flex items-center justify-center gap-1.5 bg-[#0d7d6f] text-white rounded-xl font-bold text-[13px] active:scale-95 transition-all shadow-md shadow-[#0d7d6f]/20 cursor-pointer">\1</button>'

content = re.sub(button_search, button_replace, content)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched App.tsx with Camera Views!")
