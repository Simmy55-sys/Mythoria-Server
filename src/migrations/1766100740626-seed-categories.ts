import { MigrationInterface, QueryRunner } from "typeorm";
import { v4 as uuid } from "uuid";

const categories = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "School Life",
  "Sci-Fi",
  "Slice of Life",
  "Supernatural",
  "Thriller",
  "Wuxia",
  "Martial Arts",
];

export class SeedCategories1766100740626 implements MigrationInterface {
  name = "SeedCategories1766100740626";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '"2025-12-18T23:32:21.866Z"'`,
    );
    for (const name of categories) {
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
    for (const name of categories) {
      await queryRunner.query(`DELETE FROM "category" WHERE "name" = $1`, [
        name,
      ]);
    }
  }
}
