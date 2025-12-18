import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Mailjet from "node-mailjet";
import {
  MAILJET_API_KEY,
  MAILJET_NOREPLY_ADDRESS,
  MAILJET_SECRET_KEY,
} from "src/config/env";

export interface EmailConfig {
  apiKey: string;
  secretKey: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  textContent?: string;
  htmlContent?: string;
  templateId?: number;
  variables?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private mailjet: any;
  private config: EmailConfig;

  constructor(private configService: ConfigService) {
    const apiKey = configService.getOrThrow<string>(MAILJET_API_KEY);
    const secretKey = configService.getOrThrow<string>(MAILJET_SECRET_KEY);
    const noReplyAddress = configService.getOrThrow<string>(
      MAILJET_NOREPLY_ADDRESS,
    );

    this.config = {
      apiKey: apiKey,
      secretKey: secretKey,
      fromEmail: noReplyAddress,
      fromName: "HustlePay",
    };

    this.mailjet = (Mailjet as any).apiConnect(
      this.config.apiKey,
      this.config.secretKey,
    );
  }

  private async sendTemplateEmail(options: EmailOptions) {
    try {
      const recipients = Array.isArray(options.to)
        ? options.to.map((email) => ({ Email: email }))
        : [{ Email: options.to }];

      const emailData: any = {
        Messages: [
          {
            From: {
              Email: this.config.fromEmail,
              Name: this.config.fromName,
            },
            To: recipients,
            Subject: options.subject,
          },
        ],
      };

      if (options.htmlContent) {
        emailData.Messages[0].HTMLPart = options.htmlContent;
      }

      await this.mailjet.post("send", { version: "v3.1" }).request(emailData);
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  async sendAccountCreatedByAdmin(credentials: {
    username: string;
    email: string;
    password: string;
  }) {
    // await this.sendTemplateEmail({
    //     htmlContent: userWelcomeMail(userName, currentYear),
    //     to: email,
    //     subject,
    //   });
  }
}
