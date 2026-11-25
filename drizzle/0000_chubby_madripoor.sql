CREATE TABLE "interaction" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer NOT NULL,
	"event" text NOT NULL,
	"ms" integer,
	"day" date NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"published_at" timestamp,
	"excerpt" text,
	CONSTRAINT "item_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "lesson" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"subtopic" text NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"concepts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cards" jsonb NOT NULL,
	"word" jsonb,
	"quiz" jsonb,
	"tutor_question" text,
	"source_title" text NOT NULL,
	"source_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" serial PRIMARY KEY NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"device_label" text DEFAULT 'Device' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "passkey_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer NOT NULL,
	"next_due" date,
	"step" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "review_lesson_id_unique" UNIQUE("lesson_id")
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"topic" text NOT NULL,
	"title" text NOT NULL,
	"url" text
);
--> statement-breakpoint
CREATE TABLE "topic_pref" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"subtopic" text DEFAULT '' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"weight" real DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_message" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_id" integer,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"day" date NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" integer PRIMARY KEY NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"daily_goal" integer DEFAULT 5 NOT NULL,
	"nudge_time" text,
	"lock_minutes" integer DEFAULT 15 NOT NULL,
	"voice" boolean DEFAULT true NOT NULL,
	"watchlist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"onboarded" boolean DEFAULT false NOT NULL,
	"onboarding_step" integer DEFAULT 0 NOT NULL,
	"onboarding_draft" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "topic_pref_unique" ON "topic_pref" USING btree ("topic","subtopic");