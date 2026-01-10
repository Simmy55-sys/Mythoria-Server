import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePurchasedChapters1768051076010 implements MigrationInterface {
    name = 'UpdatePurchasedChapters1768051076010'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchased_chapters" DROP COLUMN "purchase_date"`);
        await queryRunner.query(`ALTER TABLE "purchased_chapters" ADD "purchase_date" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchased_chapters" DROP COLUMN "purchase_date"`);
        await queryRunner.query(`ALTER TABLE "purchased_chapters" ADD "purchase_date" date NOT NULL`);
    }

}
