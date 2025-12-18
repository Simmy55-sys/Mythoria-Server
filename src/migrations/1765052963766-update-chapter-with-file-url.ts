import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateChapterWithFileUrl1765052963766 implements MigrationInterface {
    name = 'UpdateChapterWithFileUrl1765052963766'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chapters" ADD "file_url" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "file_url"`);
    }

}
