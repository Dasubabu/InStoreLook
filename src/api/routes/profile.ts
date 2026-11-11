import express from "express";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

const getUserId = (req: express.Request) => req.headers['x-user-id'] as string;

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  res.json(user);
});

router.put("/", async (req, res) => {
  const userId = getUserId(req);
  const updates = req.body;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await db.update(users).set({
    name: updates.name,
    email: updates.email,
    shopName: updates.shopName,
    shopCategory: updates.shopCategory,
    shopAddress: updates.shopAddress,
    latitude: updates.latitude,
    longitude: updates.longitude,
    formattedAddress: updates.formattedAddress,
    city: updates.city,
    district: updates.district,
    state: updates.state,
    postalCode: updates.postalCode,
    country: updates.country,
    locationVerified: updates.locationVerified,
    isStoreOpen: updates.isStoreOpen !== undefined ? updates.isStoreOpen : undefined,
    logo: updates.logo,
    banner: updates.banner,
    gstNumber: updates.gstNumber,
    businessRegistration: updates.businessRegistration,
    workingHours: updates.workingHours,
    socialLinks: updates.socialLinks ? JSON.stringify(updates.socialLinks) : undefined,
    pickupAddress: updates.pickupAddress,
    returnPolicy: updates.returnPolicy
  }).where(eq(users.id, userId));

  const updatedUser = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  res.json(updatedUser);
});

export default router;
