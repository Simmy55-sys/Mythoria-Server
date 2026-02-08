import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSeries1770477245114 implements MigrationInterface {
    name = 'UpdateSeries1770477245114'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "series" ADD "channelId" character varying`);
        await queryRunner.query(`ALTER TABLE "series" ADD "channelColor" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "channelColor"`);
        await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "channelId"`);
    }

}
