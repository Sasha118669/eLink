import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import createAuth from "edaten-auth";
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

app.use("/auth", createAuth({
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  requiredFields: ["username", "phonenumber", "email", "password"],
  loginFields: "email",
}));

app.listen(3000, () => console.log("Server is running on port 3000"));