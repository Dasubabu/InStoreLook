import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Part 1
content = content.replace(
'''  const [fashionValidationState, setFashionValidationState] = useState<"idle" | "validating" | "enhancing" | "enhanced" | "rejected">("idle");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [showEnhanced, setShowEnhanced] = useState(true);''',
'''  const [fashionValidationState, setFashionValidationState] = useState<"idle" | "validating" | "enhancing" | "enhanced" | "rejected">("idle");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [enhancedImageUrl, setEnhancedImageUrl] = useState<string | null>(null);
  const [showEnhanced, setShowEnhanced] = useState(true);

  const enhanceImageLocally = async (base64Img: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.filter = "contrast(1.1) brightness(1.05)";
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        } else {
          resolve(base64Img);
        }
      };
      img.src = base64Img.startsWith('data:') ? base64Img : `data:image/jpeg;base64,${base64Img}`;
    });
  };'''
)

# Part 2
content = content.replace(
'''        setFashionValidationState("enhancing");
        setTimeout(() => {
          setFashionValidationState("enhanced");
        }, 3000); // simulate 3 sec enhancement delay''',
'''        setFashionValidationState("enhancing");
        const enhancedBase64 = await enhanceImageLocally(base64Str);
        setEnhancedImageUrl(enhancedBase64);
        setFashionValidationState("enhanced");'''
)

# Part 3
content = content.replace(
'''          imageUrl: productFormData.images?.[0] || "",
          status: "In Stock"''',
'''          imageUrl: showEnhanced && enhancedImageUrl ? enhancedImageUrl : (productFormData.images?.[0] || ""),
          status: "In Stock"'''
)

# Part 4
content = content.replace(
'''            dist: (Math.random() * 5 + 0.1).toFixed(1) + " km",
            shop: authUser.shopName || "Unknown Shop",
            status: newProduct.status?.toUpperCase() || "IN STOCK",
            color: (newProduct.stock || 0) > 5 ? "bg-primary" : "bg-[#ffb95f]",
            img: newProduct.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",''',
'''            dist: "1.5 km",
            shop: authUser.shopName || "Unknown Shop",
            status: newProduct.status?.toUpperCase() || "IN STOCK",
            color: (newProduct.stock || 0) > 5 ? "bg-primary" : "bg-[#ffb95f]",
            img: newProduct.imageUrl || "",'''
)

# Part 5: Toggle UI Image
content = content.replace(
'''                      <img
                        src={`data:image/jpeg;base64,${uploadedImageUrl}`}
                        className={`w-full h-full object-cover transition-all duration-[2000ms] ease-in-out ${fashionValidationState === "enhancing" ? "blur-md brightness-75 scale-105" : (showEnhanced ? "blur-0 brightness-110 contrast-105 scale-100" : "blur-0 brightness-100 contrast-100 scale-100")}`}
                        alt="Uploaded Product"
                      />''',
'''                      <img
                        src={showEnhanced && enhancedImageUrl && fashionValidationState === "enhanced" ? enhancedImageUrl : `data:image/jpeg;base64,${uploadedImageUrl}`}
                        className={`w-full h-full object-cover transition-all duration-700 ease-in-out ${fashionValidationState === "enhancing" ? "blur-md brightness-75 scale-105" : "blur-0 brightness-100 contrast-100 scale-100"}`}
                        alt="Uploaded Product"
                      />'''
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched App.tsx")
