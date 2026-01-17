import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserModel1768453440981 implements MigrationInterface {
  name = "UpdateUserModel1768453440981";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_auth_type_enum" AS ENUM('email', 'discord', 'google')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "auth_type" "public"."user_auth_type_enum" NOT NULL DEFAULT 'email'`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password"`);
    await queryRunner.query(`ALTER TABLE "user" ADD "password" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "auth_type"`);
    await queryRunner.query(`DROP TYPE "public"."user_auth_type_enum"`);
  }
}
