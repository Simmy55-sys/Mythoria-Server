import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { CORS_WHITELIST_URLS, PORT } from "./config/env";
import { ResponseTransformerInterceptor } from "./interceptors/response.interceptor";
import { ExceptionFilter } from "./interceptors/exception-filter.interceptor";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable cookie parser for session tracking
  app.use(cookieParser());

  // Enabling validation globally with dto files
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Enable CORS with configuration
  app.enableCors({
    origin: configService.getOrThrow<string>(CORS_WHITELIST_URLS).split(","),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allow cookies to be sent
    domain:
      process.env.NODE_ENV === "production"
        ? ".mythoriatales.com"
        : "localhost",
  });

  //* Register the response interceptor
  app.useGlobalInterceptors(new ResponseTransformerInterceptor());

  //* Handle Exceptions
  app.useGlobalFilters(new ExceptionFilter());

  await app.listen(configService.getOrThrow<number>(PORT));
}
bootstrap();
