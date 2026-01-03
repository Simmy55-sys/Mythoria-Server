import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLikeTable1767406818327 implements MigrationInterface {
    name = 'CreateLikeTable1767406818327'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "likes" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "series_id" character varying NOT NULL, "liked_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ed9904f6ec69983d5f5fd6f9054" UNIQUE ("user_id", "series_id"), CONSTRAINT "PK_a9323de3f8bced7539a794b4a37" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_likes_seriesId" ON "likes" ("series_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_likes_userId" ON "likes" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "publish_date" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "likes" ADD CONSTRAINT "FK_3f519ed95f775c781a254089171" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "likes" ADD CONSTRAINT "FK_0380032f6c664643a7182ee363f" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "likes" DROP CONSTRAINT "FK_0380032f6c664643a7182ee363f"`);
        await queryRunner.query(`ALTER TABLE "likes" DROP CONSTRAINT "FK_3f519ed95f775c781a254089171"`);
        await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '2025-12-25 21:30:51.108+01'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_likes_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_likes_seriesId"`);
        await queryRunner.query(`DROP TABLE "likes"`);
    }

}
