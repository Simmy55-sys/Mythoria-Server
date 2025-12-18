import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCoinBalanceToUser1765506706581 implements MigrationInterface {
    name = 'AddCoinBalanceToUser1765506706581'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "coin_balance" integer NOT NULL DEFAULT '50'`);
        await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '"2025-12-12T02:31:47.028Z"'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '2025-12-12 00:35:05.05+01'`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "coin_balance"`);
    }

}
