import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedRemoveCategoriesFromSeries1764908209041 implements MigrationInterface {
    name = 'UpdatedRemoveCategoriesFromSeries1764908209041'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "categories"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "series" ADD "categories" text array NOT NULL DEFAULT '{}'`);
    }

}
