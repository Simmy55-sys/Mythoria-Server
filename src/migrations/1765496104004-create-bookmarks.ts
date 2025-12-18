import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBookmarks1765496104004 implements MigrationInterface {
    name = 'CreateBookmarks1765496104004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "bookmarks" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "series_id" character varying NOT NULL, "bookmarked_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_edb0cee84723a55c5740edae7ff" UNIQUE ("user_id", "series_id"), CONSTRAINT "PK_7f976ef6cecd37a53bd11685f32" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bookmarks_seriesId" ON "bookmarks" ("series_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_bookmarks_userId" ON "bookmarks" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '"2025-12-11T23:35:05.050Z"'`);
        await queryRunner.query(`ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_58a0fbaee65cd8959a870ee678c" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_a93c83f54b887e58fc2190aa4ba" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_a93c83f54b887e58fc2190aa4ba"`);
        await queryRunner.query(`ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_58a0fbaee65cd8959a870ee678c"`);
        await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '2025-12-10 12:46:25.473+01'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bookmarks_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bookmarks_seriesId"`);
        await queryRunner.query(`DROP TABLE "bookmarks"`);
    }

}
