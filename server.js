import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
// import createAuth from "edaten-auth";
import "dotenv/config"; 
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:5173", "https://e-link-sage.vercel.app"],
  credentials: true,
}));

const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

await mongoose.connect(process.env.MONGO_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true,
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  phonenumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  refreshTokens: { type: [String], default: [] },
});
const User = mongoose.model("User", userSchema);

const createJwtToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, phonenumber: user.phonenumber },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

const createRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, phonenumber: user.phonenumber },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "30d" }
  );
};

// Middleware для проверки JWT в защищенных маршрутах
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Регистрация нового пользователя
app.post("/auth/register", async (req, res) => {
  const { username, phonenumber, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      phonenumber,
      email,
      password: hashedPassword,
    });

    const accessToken = createJwtToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshTokens = [refreshToken];
    await user.save();

    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        phonenumber: user.phonenumber,
        email: user.email,
      },
      accessToken,
    });

  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }

    return res.status(400).json({ message: error.message });
  }
});

// Вход пользователя
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = createJwtToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        phonenumber: user.phonenumber,
        email: user.email,
      },
      accessToken,
    });

  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: error.message });
  }
});

// Обновление access токена с помощью refresh токена
app.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = createJwtToken(user);
    const newRefreshToken = createRefreshToken(user);

    user.refreshTokens = user.refreshTokens.filter(
      (t) => t !== refreshToken
    );

    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.cookie("refreshToken", newRefreshToken, cookieOptions);

    return res.json({
      accessToken: newAccessToken,
      user: {
        id: user._id,
        username: user.username,
        phonenumber: user.phonenumber,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("Refresh error:", error.message);
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

// Выход пользователя и удаление refresh токена
app.post("/auth/logout", async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }

  try {
    const user = await User.findOne({
      refreshTokens: refreshToken,
    });

    if (user) {
      user.refreshTokens = user.refreshTokens.filter(
        (t) => t !== refreshToken
      );
      await user.save();
    }

    res.clearCookie("refreshToken");

    return res.json({ message: "Logged out" });

  } catch (error) {
    console.error("Logout error:", error.message);
    return res.status(500).json({ message: error.message });
  }
});
// app.use("/auth", createAuth({
//   jwtSecret: process.env.JWT_SECRET,
//   jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
//   requiredFields: ["username", "phonenumber", "password"],
//   loginFields: "password",
// }));
// console.log(createAuth);

app.listen(3000, () => console.log("Server is running on port 3000"));