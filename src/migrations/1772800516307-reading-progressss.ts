import { MigrationInterface, QueryRunner } from "typeorm";

export class ReadingProgressss1772800516307 implements MigrationInterface {
    name = 'ReadingProgressss1772800516307'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "reading_progress" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "series_id" character varying NOT NULL, "last_chapter_number" integer NOT NULL, CONSTRAINT "UQ_9b8f7a3fb4d51e3ff661742e2cd" UNIQUE ("user_id", "series_id"), CONSTRAINT "PK_2360621825d1001b80d94996cbb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_reading_progress_seriesId" ON "reading_progress" ("series_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_reading_progress_userId" ON "reading_progress" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "reading_progress" ADD CONSTRAINT "FK_8bf40a43a04f5f9831a82c1b30f" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reading_progress" ADD CONSTRAINT "FK_7c0c9ffeb225f8612bdad579b17" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reading_progress" DROP CONSTRAINT "FK_7c0c9ffeb225f8612bdad579b17"`);
        await queryRunner.query(`ALTER TABLE "reading_progress" DROP CONSTRAINT "FK_8bf40a43a04f5f9831a82c1b30f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_reading_progress_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_reading_progress_seriesId"`);
        await queryRunner.query(`DROP TABLE "reading_progress"`);
    }

}
