import express from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { phone, name } = req.body;
  try {
    let isNewUser = false;
    let user = await db.query.users.findFirst({
      where: eq(users.phone, phone)
    });

    if (!user) {
      isNewUser = true;
      const id = uuidv4();
      await db.insert(users).values({
        id,
        phone,
        name: name || 'User',
        isStoreOpen: true,
        createdAt: new Date()
      });

      user = await db.query.users.findFirst({ where: eq(users.id, id) });
    }

    const token = `dev-token-${user?.id}`;

    res.json({ user, token, isNewUser });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
