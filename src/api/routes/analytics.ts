import express from "express";
import { db } from "../../db";
import { products, users } from "../../db/schema";
import { eq, and } from "drizzle-orm";

const router = express.Router();
const getUserId = (req: express.Request) => req.headers['x-user-id'] as string;

router.get("/dashboard", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const allProducts = await db.query.products.findMany({
      where: eq(products.sellerId, userId)
    });

    const totalProducts = allProducts.length;
    const activeProducts = allProducts.filter(p => p.status === 'In Stock' && !p.isArchived).length;
    const lowStock = allProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
    const outOfStock = allProducts.filter(p => p.status === 'Out of Stock' || (p.stock || 0) === 0).length;
    
    const totalInventoryValue = allProducts.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);

    const recentlyUploaded = allProducts
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);

    // Group by category
    const categoryDistribution: Record<string, number> = {};
    allProducts.forEach(p => {
      const cat = p.category || 'Uncategorized';
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });

    const lowStockItems = allProducts
      .filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5)
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 5);

    res.json({
      totalProducts,
      activeProducts,
      lowStock,
      outOfStock,
      totalInventoryValue,
      recentlyUploaded,
      lowStockItems,
      categoryDistribution,
      uploadCompletionRate: 95 // Simulated metric
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
