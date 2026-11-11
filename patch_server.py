import re
import os

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add fs import
content = content.replace('import path from "path";', 'import path from "path";\nimport fs from "fs";')

# 2. Add express static for uploads and ensure dir exists
content = content.replace(
'''  app.use(express.json({ limit: "50mb" }));''',
'''  app.use(express.json({ limit: "50mb" }));

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
  app.use('/uploads', express.static(uploadsDir));
  
  const processImageUpload = (base64Data, id) => {
    if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;
    const matches = base64Data.match(/^data:image\\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Data;
    const extension = matches[1];
    const data = matches[2];
    const filename = `${id}-${Date.now()}.${extension}`;
    fs.writeFileSync(path.join(uploadsDir, filename), data, 'base64');
    return `/uploads/${filename}`;
  };'''
)

# 3. Post Products base64 logic
content = content.replace(
'''    const newProduct = {
      id: uuidv4(),
      sellerId: userId,
      ...productData,
      createdAt: new Date()
    };

    await db.insert(products).values(newProduct);''',
'''    const id = uuidv4();
    if (productData.imageUrl && productData.imageUrl.startsWith('data:image')) {
      productData.imageUrl = processImageUpload(productData.imageUrl, id);
    }
    const newProduct = {
      id,
      sellerId: userId,
      ...productData,
      createdAt: new Date()
    };

    await db.insert(products).values(newProduct);'''
)

# 4. Put Products base64 logic
content = content.replace(
'''  app.put("/api/products/:id", async (req, res) => {
    const userId = getUserId(req);
    const productId = req.params.id;
    const updates = req.body;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await db.update(products).set(updates).where(and(eq(products.id, productId), eq(products.sellerId, userId)));''',
'''  app.put("/api/products/:id", async (req, res) => {
    const userId = getUserId(req);
    const productId = req.params.id;
    const updates = req.body;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (updates.imageUrl && updates.imageUrl.startsWith('data:image')) {
      updates.imageUrl = processImageUpload(updates.imageUrl, productId);
    }

    await db.update(products).set(updates).where(and(eq(products.id, productId), eq(products.sellerId, userId)));'''
)

# 5. Nearby products mock fix
content = content.replace(
'''        dist: (Math.random() * 5 + 0.1).toFixed(1) + ' km',
        shop: p.seller.shopName || 'Unknown Shop',
        status: p.product.status?.toUpperCase() || 'IN STOCK',
        color: (p.product.stock || 0) > 5 ? 'bg-primary' : 'bg-[#ffb95f]',
        img: p.product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500' // Placeholder''',
'''        dist: '1.5 km',
        shop: p.seller.shopName || 'Unknown Shop',
        status: p.product.status?.toUpperCase() || 'IN STOCK',
        color: (p.product.stock || 0) > 5 ? 'bg-primary' : 'bg-[#ffb95f]',
        img: p.product.imageUrl || '' // Use actual image'''
)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched server.ts")
