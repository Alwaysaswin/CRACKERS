require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DB_NAME = "crackers_store";
let db = null;
let dbError = null;

// 1. Open port IMMEDIATELY so Render marks the deploy as LIVE
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  connectDB();
});

// 2. Connect to MongoDB Atlas in the background
async function connectDB() {
  if (!MONGO_URI) {
    dbError = "MONGO_URI is not set in Render -> Environment tab";
    console.error("⚠️ " + dbError);
    return;
  }
  try {
    const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    db = client.db(DB_NAME);
    dbError = null;
    console.log(`✅ Connected to MongoDB Atlas: ${DB_NAME}`);
  } catch (err) {
    dbError = err.message;
    console.error("❌ MongoDB Atlas connection failed:", err.message);
  }
}

app.get("/", (req, res) => {
  res.json({
    status: "Render Server is Live 🎉",
    databaseConnected: !!db,
    databaseError: dbError
  });
});

app.get("/api/categories", async (req, res) => {
  if (!db) return res.status(503).json({ error: dbError || "DB not connected" });
  const categories = await db.collection("categories").find({ isActive: true }).sort({ displayOrder: 1 }).toArray();
  res.json(categories);
});

app.get("/api/products", async (req, res) => {
  if (!db) return res.status(503).json({ error: dbError || "DB not connected" });
  const { category } = req.query;
  const filter = category && category !== "All" ? { category } : {};
  const products = await db.collection("products").find(filter).toArray();
  res.json(products);
});

app.post("/api/orders", async (req, res) => {
  if (!db) return res.status(503).json({ error: dbError || "DB not connected" });
  const newOrder = {
    ...req.body,
    orderNumber: "SPK-" + Date.now().toString().slice(-6),
    status: "CONFIRMED",
    createdAt: new Date(),
  };
  await db.collection("orders").insertOne(newOrder);
  res.status(201).json({ message: "Order saved!", orderNumber: newOrder.orderNumber });
});
