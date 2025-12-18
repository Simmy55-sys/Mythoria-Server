import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCoinPurchaseTable1765836204079 implements MigrationInterface {
    name = 'CreateCoinPurchaseTable1765836204079'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."coin_purchases_payment_provider_enum" AS ENUM('PAYPAL', 'STRIPE')`);
        await queryRunner.query(`CREATE TYPE "public"."coin_purchases_status_enum" AS ENUM('pending', 'completed', 'failed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "coin_purchases" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "coin_amount" integer NOT NULL, "amount_paid" numeric(10,2) NOT NULL, "payment_provider" "public"."coin_purchases_payment_provider_enum" NOT NULL, "payment_id" character varying, "order_id" character varying, "status" "public"."coin_purchases_status_enum" NOT NULL DEFAULT 'pending', "purchase_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e8d81c46f4b17901a59528af4f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_coin_purchases_paymentId" ON "coin_purchases" ("payment_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_coin_purchases_userId" ON "coin_purchases" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '"2025-12-15T22:03:24.545Z"'`);
        await queryRunner.query(`ALTER TABLE "coin_purchases" ADD CONSTRAINT "FK_c44eab0c157ec5a4cd70ea51494" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "coin_purchases" DROP CONSTRAINT "FK_c44eab0c157ec5a4cd70ea51494"`);
        await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "publish_date" SET DEFAULT '2025-12-12 03:31:47.028+01'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_coin_purchases_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_coin_purchases_paymentId"`);
        await queryRunner.query(`DROP TABLE "coin_purchases"`);
        await queryRunner.query(`DROP TYPE "public"."coin_purchases_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."coin_purchases_payment_provider_enum"`);
    }

}
