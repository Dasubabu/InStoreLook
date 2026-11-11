import express from "express";
import { db } from "../../db";
import { notifications } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

const router = express.Router();
const getUserId = (req: express.Request) => req.headers['x-user-id'] as string;

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const list = await db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit: 50
  });

  res.json(list);
});

router.put("/:id/read", async (req, res) => {
  const userId = getUserId(req);
  const notifId = req.params.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notifId));
  res.json({ success: true });
});

export default router;
