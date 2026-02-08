import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeriesRoleId1770500000000 implements MigrationInterface {
  name = "AddSeriesRoleId1770500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "series" ADD "role_id" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "role_id"`);
  }
}
