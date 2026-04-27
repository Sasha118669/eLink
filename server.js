import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import "dotenv/config";
import cors from "cors";
import createAuth from "edaten-auth";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";
import { authMiddleware } from "edaten-auth/middleware";
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ["http://localhost:5173", "https://e-link-sage.vercel.app"] }
});
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

// Socket.io подключение
io.on("connection", (socket) => {
  console.log("Пользователь подключился:", socket.id);

  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
    console.log(`Пользователь вошёл в чат: ${chatId}`);
  });

  socket.on("leave_chat", (chatId) => {
    socket.leave(chatId);
  });

  socket.on("disconnect", () => {
    console.log("Пользователь отключился:", socket.id);
  });
});

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

// получить сообщения чата
app.get("/chats/:chatId/messages", auth, async (req, res) => {
  const { chatId } = req.params;
  const messages = await Message.find({ chat: chatId }).populate("sender", "username");
  res.json(messages);
});
// отправить сообщение
app.post("/chats/:chatId/messages", auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;

    const message = await Message.create({
      chat: chatId,
      sender: req.user.id,
      text,
    });

    await message.populate("sender", "username");
    
    // Отправляем сообщение всем в комнате этого чата
    io.to(chatId).emit("new_message", message);
    
    res.json(message);
  } catch (err) {
    console.error("Ошибка создания сообщения:", err.message);
    res.status(500).json({ error: err.message });
  }
});

server.listen(process.env.PORT || 3000, () => console.log("Server is running"));