import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnnouncement1767998997379 implements MigrationInterface {
    name = 'CreateAnnouncement1767998997379'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."announcements_type_enum" AS ENUM('info', 'warning', 'success', 'error')`);
        await queryRunner.query(`CREATE TABLE "announcements" ("id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "content" text NOT NULL, "type" "public"."announcements_type_enum" NOT NULL DEFAULT 'info', "is_active" boolean NOT NULL DEFAULT true, "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "announcements"`);
        await queryRunner.query(`DROP TYPE "public"."announcements_type_enum"`);
    }

}
