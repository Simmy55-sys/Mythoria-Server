import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSeriesStatus1772900000001 implements MigrationInterface {
  name = "UpdateSeriesStatus1772900000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" DROP CONSTRAINT "FK_user_chapter_read_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" DROP CONSTRAINT "FK_user_chapter_read_series"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" DROP CONSTRAINT "UQ_user_chapter_read_user_series_chapter"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" ADD CONSTRAINT "UQ_d4cbad1ee6365cad380596a114a" UNIQUE ("user_id", "series_id", "chapter_number")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" ADD CONSTRAINT "FK_d630e1139845eaf46e283dab1cb" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" ADD CONSTRAINT "FK_c2de43178563631f964a727b9af" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" DROP CONSTRAINT "FK_c2de43178563631f964a727b9af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" DROP CONSTRAINT "FK_d630e1139845eaf46e283dab1cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" DROP CONSTRAINT "UQ_d4cbad1ee6365cad380596a114a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" ADD CONSTRAINT "UQ_user_chapter_read_user_series_chapter" UNIQUE ("chapter_number", "series_id", "user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" ADD CONSTRAINT "FK_user_chapter_read_series" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_chapter_read" ADD CONSTRAINT "FK_user_chapter_read_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
