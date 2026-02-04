import { MiddlewareConsumer, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import databaseConfig from "./config/database.config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LoggerMiddleware } from "./middleware/request-logger.middleware";
import { AdminModule } from "./admin/admin.module";
import { UserModule } from "./user/user.module";
import { PasswordModule } from "./password/password.module";
import { EmailModule } from "./email/email.module";
import { AccountModule } from "./account/account.module";
import { TranslatorModule } from "./translator/translator.module";
import { CategoryModule } from "./category/category.module";
import { ChapterModule } from "./chapter/chapter.module";
import { CloudinaryModule } from "./cloudinary/cloudinary.module";
import { FileReaderModule } from "./file-reader/file-reader.module";
import { CommentModule } from "./comment/comment.module";
import { SeriesModule } from "./series/series.module";
import { BookmarkModule } from "./bookmark/bookmark.module";
import { LikeModule } from "./like/like.module";
import { PaymentModule } from "./payment/payment.module";
import { AnnouncementModule } from "./announcement/announcement.module";
import { BotModule } from './bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),
    AdminModule,
    UserModule,
    PasswordModule,
    EmailModule,
    AccountModule,
    TranslatorModule,
    CategoryModule,
    ChapterModule,
    CloudinaryModule,
    FileReaderModule,
    CommentModule,
    SeriesModule,
    BookmarkModule,
    LikeModule,
    PaymentModule,
    AnnouncementModule,
    BotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
