import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { UserModule } from "src/user/user.module";
import { EmailModule } from "src/email/email.module";
import { TranslatorAssignment } from "src/model/series-translator-assignment.entity";
import { AccountModule } from "src/account/account.module";
import { CategoryModule } from "src/category/category.module";
import { Series } from "src/model/series.entity";
import { Chapter } from "src/model/chapter.entity";

@Module({
  imports: [
    UserModule,
    EmailModule,
    TypeOrmModule.forFeature([TranslatorAssignment, Series, Chapter]),
    AccountModule,
    CategoryModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
