import mongoose from "mongoose";

const articleSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    publisher: { type: String, required: true },
    publishedAt: { type: Date, required: true },
    fetchedAt: { type: Date, default: Date.now },
    summary: { type: String },
    content: { type: String },
    topics: { type: [String], default: [] },
    primaryCategory: { type: String, default: "world" },
    language: { type: String, default: "en" },
    imageUrl: { type: String },
    sourceType: { type: String, default: "crawl" },
    aiSummary: {
      text: { type: String },
      keyPoints: { type: [String], default: [] },
      category: { type: String },
      generatedAt: { type: Date },
      model: { type: String },
    },
  },
  { timestamps: true }
);

articleSchema.index({ publishedAt: -1 });
articleSchema.index({ publisher: 1, publishedAt: -1 });
articleSchema.index({ topics: 1, publishedAt: -1 });
articleSchema.index({ primaryCategory: 1, publishedAt: -1 });

export const Article = mongoose.model("Article", articleSchema);
