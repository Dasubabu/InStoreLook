import express from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../db";
import { products } from "../../db/schema";
import { eq, and, like, desc, or } from "drizzle-orm";
import fs from "fs";
import path from "path";

const router = express.Router();
const getUserId = (req: express.Request) => req.headers['x-user-id'] as string;

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const processImageUpload = (base64Data: string, id: string, index: number = 0) => {
  if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;
  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return base64Data;
  const extension = matches[1];
  const data = matches[2];
  const filename = `${id}-${Date.now()}-${index}.${extension}`;
  fs.writeFileSync(path.join(uploadsDir, filename), data, 'base64');
  return `/uploads/${filename}`;
};

const normaliseImages = (value: unknown, id: string): string[] => {
  if (!Array.isArray(value)) return [];
  const uniqueInputs = [...new Set(value
    .filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
  )];
  return uniqueInputs.map((image, index) => image.startsWith('data:image') ? processImageUpload(image, id, index) : image)
    .slice(0, 10);
};

// GET all products with pagination and filtering
router.get("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || "";
  const category = req.query.category as string;
  const status = req.query.status as string;

  let conditions = [eq(products.sellerId, userId), eq(products.isArchived, false)];

  if (search) {
    conditions.push(like(products.name, `%${search}%`));
  }
  if (category && category !== "All") {
    conditions.push(eq(products.category, category));
  }
  if (status && status !== "All") {
    conditions.push(eq(products.status, status as "In Stock" | "Out of Stock"));
  }

  const allProducts = await db.query.products.findMany({
    where: and(...conditions),
    limit,
    offset: (page - 1) * limit,
    orderBy: [desc(products.createdAt)]
  });

  // Calculate total for pagination (sqlite doesn't have easy count with conditions via query builder yet, so we fetch all matching or use sql)
  // For simplicity, just return the data. Proper pagination needs a count query.
  res.json({ data: allProducts, page, limit });
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  const productData = { ...req.body };
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const id = uuidv4();
  
  // Handle single image
  if (productData.imageUrl && productData.imageUrl.startsWith('data:image')) {
    productData.imageUrl = processImageUpload(productData.imageUrl, id, 0);
  }

  // Handle mandatory 10 images array
  if (productData.images && Array.isArray(productData.images)) {
    const processedImages = normaliseImages(productData.images, id);
    productData.images = JSON.stringify(processedImages);
    if (!productData.imageUrl && processedImages[0]) productData.imageUrl = processedImages[0];
  }

  if (productData.tags && Array.isArray(productData.tags)) {
    productData.tags = JSON.stringify(productData.tags);
  }

  // The AI review screen sends its result as `aiData`, while the database
  // column is named `aiMetadata`. Map it explicitly instead of passing an
  // unknown property through the Drizzle insert payload.
  if (productData.aiData !== undefined && productData.aiMetadata === undefined) {
    productData.aiMetadata = JSON.stringify(productData.aiData);
  }
  delete productData.aiData;
  if (productData.stock !== undefined) {
    productData.status = Number(productData.stock) > 0 ? "In Stock" : "Out of Stock";
  }
  
  const sizes = productData.sizes;
  delete productData.sizes; // Remove from products table payload

  const newProduct = {
    id,
    sellerId: userId,
    ...productData,
    createdAt: new Date()
  };

  await db.insert(products).values(newProduct);
  
  // Insert sizes if available
  if (sizes && Array.isArray(sizes) && sizes.length > 0) {
    const { productSizes } = require("../../db/schema");
    const sizeRecords = sizes.map(s => ({
      id: uuidv4(),
      productId: id,
      sizeLabel: s.size,
      stockQuantity: parseInt(s.stock) || 0
    }));
    await db.insert(productSizes).values(sizeRecords);
  }
  
  const io = req.app.get("io");
  if (io) {
    io.emit("product_created", newProduct);
  }

  res.json(newProduct);
});

router.put("/:id", async (req, res) => {
  const userId = getUserId(req);
  const productId = req.params.id;
  const updates = { ...req.body };
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (updates.imageUrl && updates.imageUrl.startsWith('data:image')) {
    updates.imageUrl = processImageUpload(updates.imageUrl, productId, 0);
  }

  if (updates.images && Array.isArray(updates.images)) {
    const processedImages = normaliseImages(updates.images, productId);
    updates.images = JSON.stringify(processedImages);
    if (!updates.imageUrl && processedImages[0]) updates.imageUrl = processedImages[0];
  }

  if (updates.tags && Array.isArray(updates.tags)) {
    updates.tags = JSON.stringify(updates.tags);
  }

  if (updates.aiData !== undefined && updates.aiMetadata === undefined) {
    updates.aiMetadata = JSON.stringify(updates.aiData);
  }
  delete updates.aiData;
  if (updates.stock !== undefined) {
    updates.status = Number(updates.stock) > 0 ? "In Stock" : "Out of Stock";
  }

  const sizes = updates.sizes;
  delete updates.sizes; // Remove from products table payload

  await db.update(products).set(updates).where(and(eq(products.id, productId), eq(products.sellerId, userId)));

  // Update sizes
  if (sizes && Array.isArray(sizes)) {
    const { productSizes } = require("../../db/schema");
    // Clear old sizes
    await db.delete(productSizes).where(eq(productSizes.productId, productId));
    // Insert new sizes
    if (sizes.length > 0) {
      const sizeRecords = sizes.map(s => ({
        id: uuidv4(),
        productId: productId,
        sizeLabel: s.size,
        stockQuantity: parseInt(s.stock) || 0
      }));
      await db.insert(productSizes).values(sizeRecords);
    }
  }

  const updated = await db.query.products.findFirst({
    where: eq(products.id, productId)
  });
  
  const io = req.app.get("io");
  if (io && updated) {
    io.emit("product_updated", updated);
  }

  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  const productId = req.params.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await db.delete(products).where(and(eq(products.id, productId), eq(products.sellerId, userId)));
  
  const io = req.app.get("io");
  if (io) {
    io.emit("product_deleted", { id: productId });
  }

  res.json({ success: true });
});

router.post("/:id/duplicate", async (req, res) => {
  const userId = getUserId(req);
  const productId = req.params.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const existingProduct = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.sellerId, userId))
  });

  if (!existingProduct) return res.status(404).json({ error: "Not found" });

  const newId = uuidv4();
  const duplicatedProduct = {
    ...existingProduct,
    id: newId,
    name: `${existingProduct.name} (Copy)`,
    createdAt: new Date()
  };

  await db.insert(products).values(duplicatedProduct);
  
  const io = req.app.get("io");
  if (io) {
    io.emit("product_created", duplicatedProduct);
  }

  res.json(duplicatedProduct);
});

export default router;
