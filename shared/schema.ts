import { pgTable, serial, integer, text, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const personas = pgTable("personas", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  name: text("name").notNull(),
  niche: text("niche").notNull().default(""),
  tone: text("tone").notNull().default(""),
  platform: text("platform").notNull().default(""),
  status: text("status").notNull().default("Draft"),
  avatar: text("avatar").notNull().default(""),
  referenceImage: text("reference_image"),
  personalityTraits: text("personality_traits").notNull().default("[]"),
  visualStyle: text("visual_style").notNull().default(""),
  audienceType: text("audience_type").notNull().default(""),
  contentBoundaries: text("content_boundaries").notNull().default(""),
  bio: text("bio").notNull().default(""),
  brandVoiceRules: text("brand_voice_rules").notNull().default(""),
  contentGoals: text("content_goals").notNull().default(""),
  personaNotes: text("persona_notes").notNull().default(""),
  faceDescriptor: text("face_descriptor"),
  naturalLook: boolean("natural_look").default(true),
  identityLock: boolean("identity_lock").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const generatedImages = pgTable("generated_images", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  personaClientId: text("persona_client_id").notNull(),
  url: text("url").notNull(),
  prompt: text("prompt").notNull().default(""),
  timestamp: real("timestamp").notNull(),
  environment: text("environment"),
  outfit: text("outfit"),
  framing: text("framing"),
  isFavorite: boolean("is_favorite").default(false),
  model: text("model"),
  mediaType: text("media_type").default("image"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const revenueEntries = pgTable("revenue_entries", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  personaClientId: text("persona_client_id").notNull(),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  source: text("source").notNull().default(""),
  platform: text("platform").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const plannedPosts = pgTable("planned_posts", {
  id: serial("id").primaryKey(),
  personaClientId: text("persona_client_id").notNull(),
  planPlatform: text("plan_platform").notNull().default(""),
  day: integer("day").notNull(),
  type: text("type").notNull().default(""),
  hook: text("hook").notNull().default(""),
  angle: text("angle").notNull().default(""),
  cta: text("cta").notNull().default(""),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
