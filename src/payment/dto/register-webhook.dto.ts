import { IsString, IsArray, IsUrl, ArrayMinSize } from "class-validator";

export class RegisterWebhookDto {
  @IsUrl({}, { message: "Webhook URL must be a valid URL" })
  url: string;

  @IsArray()
  @ArrayMinSize(1, { message: "At least one event type is required" })
  @IsString({ each: true })
  eventTypes: string[];
}

