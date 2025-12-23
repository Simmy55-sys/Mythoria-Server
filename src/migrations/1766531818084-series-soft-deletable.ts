import { MigrationInterface, QueryRunner } from "typeorm";
import { v4 as uuid } from "uuid";

const extraCategories = [
  "Adult",
  "Ecchi",
  "Gender Bender",
  "Harem",
  "Historical",
  "Josei",
  "Mature",
  "Mecha",
  "Psychological",
  "Seinen",
  "Shoujo",
  "Shoujo Ai",
  "Shounen",
  "Shounen Ai",
  "Smut",
  "Sports",
  "Tragedy",
  "Xianxia",
  "Xuanhuan",
  "Yaoi",
  "Yuri",
];

export class SeriesSoftDeletable1766531818084 implements MigrationInterface {
  name = "SeriesSoftDeletable1766531818084";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "series" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '"2025-12-23T23:16:59.143Z"'`,
    );
    for (const name of extraCategories) {
      await queryRunner.query(
        `INSERT INTO "category" ("id", "name") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [uuid(), name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '2025-12-15 23:03:24.545+01'`,
    );
    await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "deleted_at"`);
    for (const name of extraCategories) {
      await queryRunner.query(`DELETE FROM "category" WHERE "name" = $1`, [
        name,
      ]);
    }
  }
}
