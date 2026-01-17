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
      fromName: "mythoria",
    };

    this.mailjet = (Mailjet as any).apiConnect(
      this.config.apiKey,
      this.config.secretKey,
    );
  }

  async sendEmail(options: EmailOptions) {
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

      if (options.textContent) {
        emailData.Messages[0].TextPart = options.textContent;
      }

      await this.mailjet.post("send", { version: "v3.1" }).request(emailData);
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    role: "reader" | "translator" = "reader",
  ) {
    const appName = role === "translator" ? "Translator Portal" : "Mythoria";
    const subject = `Reset Your ${appName} Password`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px; text-align: center;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 30px; text-align: center; background-color: #1a1a1a; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${appName}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">Reset Your Password</h2>
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                        We received a request to reset your password. Click the button below to create a new password:
                      </p>
                      <table role="presentation" style="width: 100%; margin: 30px 0;">
                        <tr>
                          <td style="text-align: center;">
                            <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.5;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="margin: 10px 0 0 0; color: #666666; font-size: 12px; word-break: break-all;">
                        ${resetUrl}
                      </p>
                      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                      <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                        This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 30px; text-align: center; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        © ${new Date().getFullYear()} ${appName}. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const textContent = `
Reset Your ${appName} Password

We received a request to reset your password. Please click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
    `.trim();

    await this.sendEmail({
      to: email,
      subject,
      htmlContent,
      textContent,
    });
  }

  async sendAccountCreatedByAdmin(credentials: {
    username: string;
    email: string;
    password: string;
  }) {
    // TODO: Implement account creation email
    // await this.sendEmail({
    //   htmlContent: userWelcomeMail(userName, currentYear),
    //   to: email,
    //   subject,
    // });
  }
}
