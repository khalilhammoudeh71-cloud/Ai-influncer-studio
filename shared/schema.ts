import { pgTable, serial, integer, text, timestamp, boolean, real, primaryKey, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status").default("none").notNull(),
  subscriptionPriceId: text("subscription_price_id"),
  credits: integer("credits").default(50).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const workspaceStates = pgTable("workspace_states", {
  userId: text("user_id").notNull(),
  stateKey: text("state_key").notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.stateKey] }),
]);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id"),
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
  clientId: text("client_id").notNull(),
  name: text("name").notNull(),
  niche: text("niche").notNull().default(""),
  tone: text("tone").notNull().default(""),
  platform: text("platform").notNull().default(""),
  status: text("status").notNull().default("Draft"),
  avatar: text("avatar").notNull().default(""),
  referenceImage: text("reference_image"),
  additionalReferenceImages: text("additional_reference_images").default("[]"),
  alternateReferenceImage: text("alternate_reference_image"),
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
  userId: text("user_id").notNull(),
  voiceId: text("voice_id"),
  voiceEngine: text("voice_engine"),
  voiceSampleUrl: text("voice_sample_url"),
  audioSamples: text("audio_samples").default("[]"),
  companionType: text("companion_type").default("intimate"),
  heygenAvatarId: text("heygen_avatar_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  unique("personas_user_client_id_unique").on(table.userId, table.clientId),
]);

export const generatedImages = pgTable("generated_images", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull(),
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
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  unique("generated_images_user_client_id_unique").on(table.userId, table.clientId),
]);

export const revenueEntries = pgTable("revenue_entries", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull(),
  personaClientId: text("persona_client_id").notNull(),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  source: text("source").notNull().default(""),
  platform: text("platform").notNull().default(""),
  notes: text("notes").notNull().default(""),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  unique("revenue_entries_user_client_id_unique").on(table.userId, table.clientId),
]);

export const plannedPosts = pgTable("planned_posts", {
  id: serial("id").primaryKey(),
  personaClientId: text("persona_client_id").notNull(),
  planPlatform: text("plan_platform").notNull().default(""),
  day: integer("day").notNull(),
  type: text("type").notNull().default(""),
  hook: text("hook").notNull().default(""),
  angle: text("angle").notNull().default(""),
  cta: text("cta").notNull().default(""),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const mediaJobs = pgTable("media_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  personaClientId: text("persona_client_id"),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("queued"),
  request: text("request").notNull(),
  result: text("result"),
  error: text("error"),
  modelId: text("model_id"),
  fallbackModelId: text("fallback_model_id"),
  attempt: integer("attempt").notNull().default(0),
  usedFallback: boolean("used_fallback").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
