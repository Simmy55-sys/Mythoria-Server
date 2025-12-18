import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedSeriesAssignmentTable1764876078336 implements MigrationInterface {
    name = 'UpdatedSeriesAssignmentTable1764876078336'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "translator_assignments" ADD "is_series_created" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "translator_assignments" DROP COLUMN "is_series_created"`);
    }

}
