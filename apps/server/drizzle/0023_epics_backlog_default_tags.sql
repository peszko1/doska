ALTER TABLE "cards" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "columns" ADD COLUMN "backlog" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboards" ADD COLUMN "default_tags" jsonb DEFAULT '[]'::jsonb NOT NULL;