import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovedDefaultCoinBalance1768748864399 implements MigrationInterface {
    name = 'RemovedDefaultCoinBalance1768748864399'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "coin_balance" SET DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "coin_balance" SET DEFAULT '50'`);
    }

}
