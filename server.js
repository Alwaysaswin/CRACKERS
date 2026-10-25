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

// 1. Open the port IMMEDIATELY so Render detects it right away
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
  connectToDatabase();
});

// 2. Connect to MongoDB asynchronously
async function connectToDatabase() {
  if (!MONGO_URI) {
    dbError = "MONGO_URI is missing in Render Environment Variables!";
    console.error("❌ " + dbError);
    return;
  }

  try {
    console.log("⏳ Connecting to MongoDB Atlas...");
    const client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    await client.connect();
    db = client.db(DB_NAME);
    dbError = null;
    console.log(`✅ Connected to MongoDB database: ${DB_NAME}`);
  } catch (err) {
    dbError = err.message;
    console.error("❌ MongoDB Connection Error:", err.message);
  }
}

// Health check route (visit your Render URL in browser to see live status)
app.get("/", (req, res) => {
  res.json({
    server: "online",
    database: db ? "connected ✅" : "disconnected ❌",
    error: dbError,
  });
});

// GET all categories
app.get("/api/categories", async (req, res) => {
  if (!db) return res.status(503).json({ error: dbError || "Database connecting..." });
  const categories = await db
    .collection("categories")
    .find({ isActive: true })
    .sort({ displayOrder: 1 })
    .toArray();
  res.json(categories);
});

// GET all products
app.get("/api/products", async (req, res) => {
  if (!db) return res.status(503).json({ error: dbError || "Database connecting..." });
  const { category } = req.query;
  const filter = category && category !== "All" ? { category } : {};
  const products = await db.collection("products").find(filter).toArray();
  res.json(products);
});

// POST a new order
app.post("/api/orders", async (req, res) => {
  if (!db) return res.status(503).json({ error: dbError || "Database connecting..." });
  const orderData = req.body;
  const newOrder = {
    ...orderData,
    orderNumber: "SPK-" + Date.now().toString().slice(-6),
    status: "CONFIRMED",
    createdAt: new Date(),
  };
  await db.collection("orders").insertOne(newOrder);
  res.status(201).json({
    message: "Order saved to MongoDB!",
    orderNumber: newOrder.orderNumber,
  });
});
