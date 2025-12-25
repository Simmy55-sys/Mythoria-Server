import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUniquePairs1766694649903 implements MigrationInterface {
    name = 'UpdateUniquePairs1766694649903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."email_role_unique"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_ed00bef8184efd998af767e89b8"`);
        await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '"2025-12-25T20:30:51.108Z"'`);
        await queryRunner.query(`ALTER TABLE "series" DROP CONSTRAINT "UQ_aabf879e0e06d1b37922d5c9664"`);
        await queryRunner.query(`CREATE INDEX "slug_deleted_at_unique" ON "series" ("slug", "deleted_at") `);
        await queryRunner.query(`CREATE INDEX "email_role_deleted_at_unique" ON "user" ("email", "role", "deleted_at") `);
        await queryRunner.query(`ALTER TABLE "series" ADD CONSTRAINT "UQ_b3be479f17889aef1b06ff9af76" UNIQUE ("slug", "deleted_at")`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_2f46b519dde002da49e68dd7b5a" UNIQUE ("email", "role", "deleted_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_2f46b519dde002da49e68dd7b5a"`);
        await queryRunner.query(`ALTER TABLE "series" DROP CONSTRAINT "UQ_b3be479f17889aef1b06ff9af76"`);
        await queryRunner.query(`DROP INDEX "public"."email_role_deleted_at_unique"`);
        await queryRunner.query(`DROP INDEX "public"."slug_deleted_at_unique"`);
        await queryRunner.query(`ALTER TABLE "series" ADD CONSTRAINT "UQ_aabf879e0e06d1b37922d5c9664" UNIQUE ("slug")`);
        await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '2025-12-24 00:16:59.143+01'`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_ed00bef8184efd998af767e89b8" UNIQUE ("email", "role")`);
        await queryRunner.query(`CREATE INDEX "email_role_unique" ON "user" ("email", "role") `);
    }

}
