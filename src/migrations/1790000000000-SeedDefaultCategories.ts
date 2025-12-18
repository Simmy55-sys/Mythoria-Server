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

export class SeedDefaultCategories1720000000000 implements MigrationInterface {
  name = "SeedDefaultCategories1720000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const name of categories) {
      await queryRunner.query(
        `INSERT INTO "category" ("id", "name") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [uuid(), name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const name of categories) {
      await queryRunner.query(`DELETE FROM "category" WHERE "name" = $1`, [
        name,
      ]);
    }
  }
}
