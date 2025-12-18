import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedSlugAndUniqueAssignmentSeries1764910582887 implements MigrationInterface {
    name = 'AddedSlugAndUniqueAssignmentSeries1764910582887'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "series" ADD "slug" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "series" ADD CONSTRAINT "UQ_aabf879e0e06d1b37922d5c9664" UNIQUE ("slug")`);
        await queryRunner.query(`ALTER TABLE "translator_assignments" ADD CONSTRAINT "UQ_7c91554e107ad3640903bb1e94b" UNIQUE ("assignment_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "translator_assignments" DROP CONSTRAINT "UQ_7c91554e107ad3640903bb1e94b"`);
        await queryRunner.query(`ALTER TABLE "series" DROP CONSTRAINT "UQ_aabf879e0e06d1b37922d5c9664"`);
        await queryRunner.query(`ALTER TABLE "series" DROP COLUMN "slug"`);
    }

}
