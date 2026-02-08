import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventService } from "./event.service";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { SeriesCreatedSubscriber } from "./subscribers/series/created";
import { ChapterCreatedSubscriber } from "./subscribers/chapter/created";
import { ChapterBulkCreatedSubscriber } from "./subscribers/chapter/created-bulk";
import { ChapterMadeFreeSubscriber } from "./subscribers/chapter/made-free";
import { Series } from "src/model/series.entity";
import { BotModule } from "src/bot/bot.module";

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: ".",
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    TypeOrmModule.forFeature([Series]),
    BotModule,
  ],
  providers: [
    EventService,
    SeriesCreatedSubscriber,
    ChapterCreatedSubscriber,
    ChapterBulkCreatedSubscriber,
    ChapterMadeFreeSubscriber,
  ],
  exports: [EventService, EventEmitterModule],
})
export class EventModule {}
