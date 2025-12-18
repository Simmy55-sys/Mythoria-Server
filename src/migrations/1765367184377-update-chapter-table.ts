import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateChapterTable1765367184377 implements MigrationInterface {
    name = 'UpdateChapterTable1765367184377'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "publish_date"`);
        await queryRunner.query(`ALTER TABLE "chapters" ADD "publish_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT '"2025-12-10T11:46:25.473Z"'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "publish_date"`);
        await queryRunner.query(`ALTER TABLE "chapters" ADD "publish_date" date NOT NULL`);
    }

}
