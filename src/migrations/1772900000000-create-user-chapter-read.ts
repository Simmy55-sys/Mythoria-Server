import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserChapterRead1772900000000 implements MigrationInterface {
  name = "CreateUserChapterRead1772900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_chapter_read" (
        "id" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "user_id" character varying NOT NULL,
        "series_id" character varying NOT NULL,
        "chapter_number" integer NOT NULL,
        CONSTRAINT "UQ_user_chapter_read_user_series_chapter" UNIQUE ("user_id", "series_id", "chapter_number"),
        CONSTRAINT "PK_user_chapter_read" PRIMARY KEY ("id")
      )`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_chapter_read_user_series" ON "user_chapter_read" ("user_id", "series_id")`
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" ADD CONSTRAINT "FK_user_chapter_read_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" ADD CONSTRAINT "FK_user_chapter_read_series" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" DROP CONSTRAINT "FK_user_chapter_read_series"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" DROP CONSTRAINT "FK_user_chapter_read_user"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_chapter_read_user_series"`
    );
    await queryRunner.query(`DROP TABLE "user_chapter_read"`);
  }
}
