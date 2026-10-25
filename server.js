const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "crackers_store";
let db;

async function startServer() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`✅ Connected to MongoDB database: ${DB_NAME}`);

    app.get("/api/categories", async (req, res) => {
      const categories = await db
        .collection("categories")
        .find({ isActive: true })
        .sort({ displayOrder: 1 })
        .toArray();
      res.json(categories);
    });

    app.get("/api/products", async (req, res) => {
      const { category } = req.query;
      const filter = category && category !== "All" ? { category } : {};
      const products = await db.collection("products").find(filter).toArray();
      res.json(products);
    });

    app.post("/api/orders", async (req, res) => {
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

    app.listen(PORT, () => {
      console.log(`🚀 Crackers API running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err);
  }
}

startServer();