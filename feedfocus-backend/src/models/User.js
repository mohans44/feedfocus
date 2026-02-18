import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    preferences: { type: [String], default: [] },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Article" }],
    lastLogin: { type: Date },
    aiSummaryUsage: {
      dateKey: { type: String, default: "" }, // UTC YYYY-MM-DD
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
