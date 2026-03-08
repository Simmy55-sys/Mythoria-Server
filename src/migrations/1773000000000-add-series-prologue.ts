import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeriesPrologue1773000000000 implements MigrationInterface {
  name = "AddSeriesPrologue1773000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "series" ADD "prologue" text`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "prologue"`);
  }
}
