import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateChapterWithPurchaseTable1764964620458 implements MigrationInterface {
  name = "UpdateChapterWithPurchaseTable1764964620458";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP CONSTRAINT "FK_438a78bc8d9ae81a66c398c5990"`,
    );
    await queryRunner.query(
      `CREATE TABLE "purchased_chapters" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "chapter_id" character varying NOT NULL, "user_id" character varying NOT NULL, "purchase_date" date NOT NULL, CONSTRAINT "PK_67b821c88f3a6837e5c354686f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "isPremium"`);
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP COLUMN "priceInCoins"`,
    );
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "seriesId"`);
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "series_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "is_premium" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "publish_date" date NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "language" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "price_in_coins" integer DEFAULT '20'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "chapter_number" integer NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "chapters" ADD "notes" text`);
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP CONSTRAINT "PK_a2bbdbb4bdc786fe0cb0fcfc4a0"`,
    );
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "PK_a2bbdbb4bdc786fe0cb0fcfc4a0" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "FK_cd48b45824c794d87090ad1fbac" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchased_chapters" ADD CONSTRAINT "FK_cc0cd6b3d5a0517c00025fb88d9" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchased_chapters" ADD CONSTRAINT "FK_9a462eac8f7836252399be01254" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchased_chapters" DROP CONSTRAINT "FK_9a462eac8f7836252399be01254"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchased_chapters" DROP CONSTRAINT "FK_cc0cd6b3d5a0517c00025fb88d9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP CONSTRAINT "FK_cd48b45824c794d87090ad1fbac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP CONSTRAINT "PK_a2bbdbb4bdc786fe0cb0fcfc4a0"`,
    );
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "PK_a2bbdbb4bdc786fe0cb0fcfc4a0" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "notes"`);
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP COLUMN "chapter_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP COLUMN "price_in_coins"`,
    );
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "language"`);
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP COLUMN "publish_date"`,
    );
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "is_premium"`);
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "series_id"`);
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "seriesId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "priceInCoins" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "isPremium" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`DROP TABLE "purchased_chapters"`);
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "FK_438a78bc8d9ae81a66c398c5990" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
