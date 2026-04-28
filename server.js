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
import crypto from "crypto";

// Шифрование сообщений
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
const ALGORITHM = "aes-256-gcm";

const encrypt = (text) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
};

const decrypt = (data) => {
  try {
    const [ivHex, authTagHex, encryptedHex] = data.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return data; // Если не удалось расшифровать, возвращаем как есть
  }
};

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
  const decrypted = messages.map(m => ({
    ...m.toObject(),
    text: decrypt(m.text)
  }));
  res.json(decrypted);
});
// отправить сообщение
app.post("/chats/:chatId/messages", auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;

    const message = await Message.create({
      chat: chatId,
      sender: req.user.id,
      text: encrypt(text),
    });

    await message.populate("sender", "username");
    message.text = decrypt(message.text);
    
    // Отправляем сообщение всем в комнате этого чата
    io.to(chatId).emit("new_message", message);
    
    res.json(message);
  } catch (err) {
    console.error("Ошибка создания сообщения:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// копировать текст сообщения
app.post("/chats/:chatId/messages/:messageId/copy", auth, async (req, res) => {
  const { chatId, messageId } = req.params;
  const message = await Message.findOne({ _id: messageId, chat: chatId }).populate("sender", "username");
  if (!message) return res.status(404).json({ error: "Message not found" });
  message.text = decrypt(message.text);
  res.json({ text: message.text });
});

// редактировать сообщение
app.post("/chats/:chatId/messages/:messageId/edit", auth, async (req, res) => {
  const { chatId, messageId } = req.params;
  const { text } = req.body;
  const message = await Message.findOne({ _id: messageId, chat: chatId }).populate("sender", "username");
  if (!message) return res.status(404).json({ error: "Message not found" });
  if (message.sender._id.toString() !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  message.text = encrypt(text);
  await message.save();
  message.text = decrypt(message.text);
  res.json(message);
});

// удалить сообщение
app.post("/chats/:chatId/messages/:messageId/delete", auth, async (req, res) => {
  const { chatId, messageId } = req.params;
  const message = await Message.findOne({ _id: messageId, chat: chatId }).populate("sender", "username");
  if (!message) return res.status(404).json({ error: "Message not found" });
  if (message.sender._id.toString() !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  await Message.deleteOne({ _id: messageId, chat: chatId });
  res.json({ message: "Message deleted" });
});

server.listen(process.env.PORT || 3000, () => console.log("Server is running"));