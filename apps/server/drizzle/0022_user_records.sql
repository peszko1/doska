CREATE TABLE "user_records" (
	"user_id" text NOT NULL,
	"store" text NOT NULL,
	"id" text NOT NULL,
	"record" jsonb NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint,
	"seq" integer NOT NULL,
	CONSTRAINT "user_records_user_id_store_id_pk" PRIMARY KEY("user_id","store","id")
);
--> statement-breakpoint
CREATE INDEX "user_records_user_seq" ON "user_records" USING btree ("user_id","seq");