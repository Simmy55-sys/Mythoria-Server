import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChapterReads1765360488705 implements MigrationInterface {
    name = 'CreateChapterReads1765360488705'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "chapter_reads" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "chapter_id" character varying NOT NULL, "user_id" character varying, "session_id" character varying, "read_date" date NOT NULL, CONSTRAINT "PK_b1e4f68be4a46b8ed8874c41895" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_chapter_reads_readDate" ON "chapter_reads" ("read_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_chapter_reads_sessionId" ON "chapter_reads" ("session_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_chapter_reads_userId" ON "chapter_reads" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_chapter_reads_chapterId" ON "chapter_reads" ("chapter_id") `);
        await queryRunner.query(`ALTER TABLE "chapters" ADD "read_count" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "chapter_reads" ADD CONSTRAINT "FK_310b84206cd2edbae89d0f5dcef" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chapter_reads" ADD CONSTRAINT "FK_a943230c3d12b13ca8737728169" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chapter_reads" DROP CONSTRAINT "FK_a943230c3d12b13ca8737728169"`);
        await queryRunner.query(`ALTER TABLE "chapter_reads" DROP CONSTRAINT "FK_310b84206cd2edbae89d0f5dcef"`);
        await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "read_count"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chapter_reads_chapterId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chapter_reads_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chapter_reads_sessionId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chapter_reads_readDate"`);
        await queryRunner.query(`DROP TABLE "chapter_reads"`);
    }

}
