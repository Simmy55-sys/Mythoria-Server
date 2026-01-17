import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePurchasedChapters1768619711774 implements MigrationInterface {
    name = 'UpdatePurchasedChapters1768619711774'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchased_chapters" ADD "price" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchased_chapters" DROP COLUMN "price"`);
    }

}
