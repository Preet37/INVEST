CREATE TABLE "price" (
	"symbol" text NOT NULL,
	"day" date NOT NULL,
	"open" double precision NOT NULL,
	"high" double precision NOT NULL,
	"low" double precision NOT NULL,
	"close" double precision NOT NULL,
	"volume" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "price_symbol_day_pk" PRIMARY KEY("symbol","day")
);
--> statement-breakpoint
CREATE TABLE "push_sub" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_sub_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_nudge_day" date;