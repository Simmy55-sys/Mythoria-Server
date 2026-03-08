import { MigrationInterface, QueryRunner } from "typeorm";
import generateEntityId from "src/utils/generate-entity-id";

const BATCH_SIZE = 500;
const ONGOING_MIN_CHAPTERS = 3; // At least 3 records per (user_id, series_id) qualify as ongoing
const UCR_CONSTRAINT = "UQ_d4cbad1ee6365cad380596a114a";
const RP_CONSTRAINT = "UQ_9b8f7a3fb4d51e3ff661742e2cd";

interface DistinctChapterReadRow {
  user_id: string;
  series_id: string;
  chapter_number: number;
}

interface ProgressRow {
  user_id: string;
  series_id: string;
  last_chapter_number: number;
}

export class BackfillReadingProgressFromChapterReads1773100000000 implements MigrationInterface {
  name = "BackfillReadingProgressFromChapterReads1773100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString();

    // 1. Backfill user_chapter_read: at most ONGOING_MIN_CHAPTERS rows per (user_id, series_id)
    // (enough to qualify as ongoing; use the 3 highest chapter numbers read per user/series)
    const distinctRows: DistinctChapterReadRow[] = await queryRunner.query(
      `SELECT user_id, series_id, chapter_number FROM (
         SELECT user_id, series_id, chapter_number,
                ROW_NUMBER() OVER (PARTITION BY user_id, series_id ORDER BY chapter_number DESC) AS rn
         FROM (
           SELECT DISTINCT cr.user_id AS user_id, c.series_id AS series_id, c.chapter_number AS chapter_number
           FROM chapter_reads cr
           INNER JOIN chapters c ON cr.chapter_id = c.id
           WHERE cr.user_id IS NOT NULL AND c.deleted_at IS NULL
         ) dist
       ) sub
       WHERE rn <= $1`,
      [ONGOING_MIN_CHAPTERS],
    );

    for (let i = 0; i < distinctRows.length; i += BATCH_SIZE) {
      const batch = distinctRows.slice(i, i + BATCH_SIZE);
      if (batch.length === 0) break;

      const values: string[] = [];
      const params: (string | number)[] = [];
      let paramIndex = 1;
      for (const row of batch) {
        const id = generateEntityId("", "ucr");
        values.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
        );
        params.push(
          id,
          row.user_id,
          row.series_id,
          row.chapter_number,
          now,
          now,
        );
      }

      await queryRunner.query(
        `INSERT INTO user_chapter_read (id, user_id, series_id, chapter_number, created_at, updated_at)
         VALUES ${values.join(", ")}
         ON CONFLICT ON CONSTRAINT "${UCR_CONSTRAINT}" DO NOTHING`,
        params,
      );
    }

    // 2. Backfill reading_progress: (user_id, series_id, max(chapter_number)) and upsert
    const progressRows: ProgressRow[] = await queryRunner.query(
      `SELECT cr.user_id AS user_id, c.series_id AS series_id, MAX(c.chapter_number)::int AS last_chapter_number
       FROM chapter_reads cr
       INNER JOIN chapters c ON cr.chapter_id = c.id
       WHERE cr.user_id IS NOT NULL AND c.deleted_at IS NULL
       GROUP BY cr.user_id, c.series_id`,
    );

    for (let i = 0; i < progressRows.length; i += BATCH_SIZE) {
      const batch = progressRows.slice(i, i + BATCH_SIZE);
      if (batch.length === 0) break;

      const values: string[] = [];
      const params: (string | number)[] = [];
      let paramIndex = 1;
      for (const row of batch) {
        const id = generateEntityId("", "rdp");
        values.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
        );
        params.push(
          id,
          row.user_id,
          row.series_id,
          row.last_chapter_number,
          now,
          now,
        );
      }

      await queryRunner.query(
        `INSERT INTO reading_progress (id, user_id, series_id, last_chapter_number, created_at, updated_at)
         VALUES ${values.join(", ")}
         ON CONFLICT ON CONSTRAINT "${RP_CONSTRAINT}"
         DO UPDATE SET
           last_chapter_number = GREATEST(reading_progress.last_chapter_number, EXCLUDED.last_chapter_number),
           updated_at = now()`,
        params,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data migration: rollback is not supported. Backfilled rows cannot be
    // reliably identified without storing migration metadata.
  }
}
