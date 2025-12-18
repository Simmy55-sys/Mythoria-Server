import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSetup1764847973372 implements MigrationInterface {
  name = "InitialSetup1764847973372";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "category" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, CONSTRAINT "UQ_23c05c292c439d77b0de816b500" UNIQUE ("name"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "chapters" ("id" character varying NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "isPremium" boolean NOT NULL DEFAULT false, "priceInCoins" integer, "seriesId" character varying, CONSTRAINT "PK_a2bbdbb4bdc786fe0cb0fcfc4a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "series" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "author" character varying NOT NULL, "translator_name" character varying NOT NULL, "description" text NOT NULL, "is_visible" boolean NOT NULL DEFAULT true, "status" character varying NOT NULL DEFAULT 'ongoing', "novel_type" character varying NOT NULL DEFAULT 'novel', "original_language" character varying NOT NULL, "featured_image" character varying, "assignment_id" character varying NOT NULL, "categories" text array NOT NULL DEFAULT '{}', CONSTRAINT "REL_ccce3f62f3ed50936f0533b5bf" UNIQUE ("assignment_id"), CONSTRAINT "PK_e725676647382eb54540d7128ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "translator_assignments" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "series_name" character varying NOT NULL, "assignment_id" character varying NOT NULL, "translator_id" character varying NOT NULL, "adminRating" integer NOT NULL DEFAULT '3', CONSTRAINT "PK_1c75643bf73a4dcdcbe2bf9fcb3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'translator', 'reader')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "username" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'reader', CONSTRAINT "UQ_ed00bef8184efd998af767e89b8" UNIQUE ("email", "role"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "email_role_unique" ON "user" ("email", "role") `,
    );
    await queryRunner.query(
      `CREATE TABLE "series_categories" ("seriesId" character varying NOT NULL, "categoryId" character varying NOT NULL, CONSTRAINT "PK_741c3ad26c161d2ccfdc42bdd2a" PRIMARY KEY ("seriesId", "categoryId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29ed2368505d00cde883f478b7" ON "series_categories" ("seriesId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b8734953096a1655798a6757d7" ON "series_categories" ("categoryId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "FK_438a78bc8d9ae81a66c398c5990" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "series" ADD CONSTRAINT "FK_ccce3f62f3ed50936f0533b5bf2" FOREIGN KEY ("assignment_id") REFERENCES "translator_assignments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "translator_assignments" ADD CONSTRAINT "FK_ab41492136da3a4e66f9effb25e" FOREIGN KEY ("translator_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "series_categories" ADD CONSTRAINT "FK_29ed2368505d00cde883f478b70" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "series_categories" ADD CONSTRAINT "FK_b8734953096a1655798a6757d78" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "series_categories" DROP CONSTRAINT "FK_b8734953096a1655798a6757d78"`,
    );
    await queryRunner.query(
      `ALTER TABLE "series_categories" DROP CONSTRAINT "FK_29ed2368505d00cde883f478b70"`,
    );
    await queryRunner.query(
      `ALTER TABLE "translator_assignments" DROP CONSTRAINT "FK_ab41492136da3a4e66f9effb25e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "series" DROP CONSTRAINT "FK_ccce3f62f3ed50936f0533b5bf2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP CONSTRAINT "FK_438a78bc8d9ae81a66c398c5990"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b8734953096a1655798a6757d7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29ed2368505d00cde883f478b7"`,
    );
    await queryRunner.query(`DROP TABLE "series_categories"`);
    await queryRunner.query(`DROP INDEX "public"."email_role_unique"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP TABLE "translator_assignments"`);
    await queryRunner.query(`DROP TABLE "series"`);
    await queryRunner.query(`DROP TABLE "chapters"`);
    await queryRunner.query(`DROP TABLE "category"`);
  }
}
