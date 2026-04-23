import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import "dotenv/config";
import cors from "cors";
import createAuth from "edaten-auth";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";
import { authMiddleware } from "edaten-auth/middleware";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:5173", "https://e-link-sage.vercel.app"],
  credentials: true,
}));

await mongoose.connect(process.env.MONGO_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true,
});

app.use("/auth", createAuth({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  requiredFields: ["username", "phonenumber", "email", "password"],
  loginFields: "email",
}));

const auth = authMiddleware(process.env.JWT_SECRET);

app.get("/auth/me", auth, async (req, res) => {
  const user = await mongoose
    .model("User")
    .findById(req.user.id)
    .select("_id username phonenumber email");

  if (!user) return res.status(404).json({ error: "User not found" });

  res.json(user);
});

// найти юзера по нику или телефону
app.get("/users/search", auth, async (req, res) => {
  const { username, phonenumber } = req.query;
  const query = {};
  if (username) query.username = username;
  if (phonenumber) query.phonenumber = phonenumber;
  const user = await mongoose.model("User").findOne(query).select("_id username phonenumber");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// получить все чаты текущего юзера
app.get("/chats", auth, async (req, res) => {
  const chats = await Chat.find({ members: req.user.id }).populate("members", "username phonenumber");
  res.json(chats);
});

// создать чат
app.post("/chats", auth, async (req, res) => {
  const { contactId } = req.body;
  const existing = await Chat.findOne({ members: { $all: [req.user.id, contactId] } });
  if (existing) return res.json(existing);
  const chat = new Chat({ members: [req.user.id, contactId] });
  await chat.save();
  res.status(201).json(chat);
});

app.listen(3000, () => console.log("Server is running on port 3000"));