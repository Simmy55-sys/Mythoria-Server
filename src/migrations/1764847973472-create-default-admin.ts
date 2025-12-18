import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcrypt";
import { Role } from "src/global/enum";
import generateEntityId from "src/utils/generate-entity-id";

const email = "admin@system.com";
const password = "Admin@123"; // change as needed

export class CreateDefaultAdmin1720000000000 implements MigrationInterface {
  name = "CreateDefaultAdmin1764847973472";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Check if admin already exists
    const existing = await queryRunner.query(
      `SELECT * FROM "user" WHERE email = $1`,
      [email],
    );

    if (existing.length === 0) {
      await queryRunner.query(
        `
        INSERT INTO "user" (id, username, email, password, role, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        `,
        [
          generateEntityId("usr"),
          "Administrator",
          email,
          hashedPassword,
          Role.ADMIN,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "user" WHERE email = $1`, [email]);
  }
}
