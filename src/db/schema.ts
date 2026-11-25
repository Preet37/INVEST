import { pgTable, serial, integer, text, boolean, timestamp, jsonb, real, date, uniqueIndex } from "drizzle-orm/pg-core";

export type Card = { type: "hook" | "idea" | "example" | "use" | "say"; text: string };
export type Word = { word: string; meaning: string; example: string };
export type Quiz = { question: string; choices: string[]; answer: number };
export type OnboardingDraft = {
  goals?: string[];
  topics?: string[];
  subtopics?: Record<string, string[]>;
  levels?: Record<string, number>;
};

// Single row (id = 1). This app has exactly one user.
export const user = pgTable("user", {
  id: integer("id").primaryKey(),
  goals: jsonb("goals").$type<string[]>().notNull().default([]),
  dailyGoal: integer("daily_goal").notNull().default(5),
  nudgeTime: text("nudge_time"),
  lockMinutes: integer("lock_minutes").notNull().default(15),
  voice: boolean("voice").notNull().default(true),
  watchlist: jsonb("watchlist").$type<string[]>().notNull().default([]),
  timezone: text("timezone").notNull().default("UTC"),
  onboarded: boolean("onboarded").notNull().default(false),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  onboardingDraft: jsonb("onboarding_draft").$type<OnboardingDraft>().notNull().default({}),
});

export const passkey = pgTable("passkey", {
  id: serial("id").primaryKey(),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceLabel: text("device_label").notNull().default("Device"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// subtopic "" is the row for the topic itself (level and weight live there).
export const topicPref = pgTable(
  "topic_pref",
  {
    id: serial("id").primaryKey(),
    topic: text("topic").notNull(),
    subtopic: text("subtopic").notNull().default(""),
    level: integer("level").notNull().default(1),
    weight: real("weight").notNull().default(1),
  },
  (t) => [uniqueIndex("topic_pref_unique").on(t.topic, t.subtopic)],
);

export const source = pgTable("source", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  url: text("url"),
});

export const item = pgTable("item", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  publishedAt: timestamp("published_at"),
  excerpt: text("excerpt"),
});

export const lesson = pgTable("lesson", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().unique(),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  subtopic: text("subtopic").notNull(),
  difficulty: integer("difficulty").notNull().default(1),
  concepts: jsonb("concepts").$type<string[]>().notNull().default([]),
  cards: jsonb("cards").$type<Card[]>().notNull(),
  word: jsonb("word").$type<Word | null>(),
  quiz: jsonb("quiz").$type<Quiz | null>(),
  tutorQuestion: text("tutor_question"),
  sourceTitle: text("source_title").notNull(),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const interaction = pgTable("interaction", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  event: text("event").notNull(), // view, finish, save, unsave, deeper, not_for_me, skip, your_turn
  ms: integer("ms"),
  day: date("day").notNull(), // the user's local day, so "today" is cheap to query
  at: timestamp("at").notNull().defaultNow(),
});

export const review = pgTable("review", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().unique(),
  nextDue: date("next_due"), // null once all four reviews are done
  step: integer("step").notNull().default(0),
});

export const tutorMessage = pgTable("tutor_message", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  day: date("day").notNull(),
  at: timestamp("at").notNull().defaultNow(),
});
