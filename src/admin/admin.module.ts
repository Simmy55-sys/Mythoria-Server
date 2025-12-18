import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { UserModule } from "src/user/user.module";
import { EmailModule } from "src/email/email.module";
import { TranslatorAssignment } from "src/model/series-translator-assignment.entity";
import { AccountModule } from "src/account/account.module";
import { CategoryModule } from "src/category/category.module";

@Module({
  imports: [
    UserModule,
    EmailModule,
    TypeOrmModule.forFeature([TranslatorAssignment]),
    AccountModule,
    CategoryModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
