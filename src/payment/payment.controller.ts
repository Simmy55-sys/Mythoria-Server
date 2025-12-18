import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { CreateCoinPurchaseDto } from "./dto/create-coin-purchase.dto";
import { RegisterWebhookDto } from "./dto/register-webhook.dto";
import { Request } from "express";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";
import { ConfigService } from "@nestjs/config";
import { CLIENT_BASE_URL } from "src/config/env";
import { PayPalProvider } from "./providers/paypal.provider";

@Controller("payment")
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
    private readonly paypalProvider: PayPalProvider,
  ) {}

  @Post("coins/create-order")
  @UseGuards(IsAuthenticated)
  async createCoinPurchaseOrder(
    @Req() request: Request,
    @Body() body: CreateCoinPurchaseDto,
  ) {
    const { user } = request;

    // Build return URLs
    const baseUrl =
      this.configService.get<string>(CLIENT_BASE_URL) ||
      "http://localhost:3001";
    const returnUrl = `${baseUrl}/purchase/success`;
    const cancelUrl = `${baseUrl}/purchase/cancel`;

    const result = await this.paymentService.createCoinPurchaseOrder(
      user?.id ?? "",
      body.coinAmount,
      body.amountPaid,
      returnUrl,
      cancelUrl,
    );

    return result;
  }

  @Post("coins/verify")
  @UseGuards(IsAuthenticated)
  async verifyPayment(
    @Req() request: Request,
    @Body() body: { orderId: string },
  ) {
    const orderId = body.orderId;
    const { user } = request;

    if (!orderId) throw new BadRequestException("Order ID is required");

    const result = await this.paymentService.verifyAndCompletePayment(
      orderId,
      user?.id ?? "",
    );

    return result;
  }

  @Get("coins/purchases")
  @UseGuards(IsAuthenticated)
  async getUserCoinPurchases(@Req() request: Request) {
    const { user } = request;
    const purchases = await this.paymentService.getUserCoinPurchases(
      user?.id ?? "",
    );

    return purchases;
  }

  @Get("coins/purchase/:purchaseId")
  @UseGuards(IsAuthenticated)
  async getCoinPurchase(
    @Req() request: Request,
    @Param("purchaseId") purchaseId: string,
  ) {
    const { user } = request;
    const purchase = await this.paymentService.getCoinPurchaseById(
      purchaseId,
      user?.id ?? "",
    );

    return purchase;
  }

  /**
   * Register a webhook with PayPal
   * This endpoint allows you to programmatically register webhooks
   */
  @Post("webhook/register")
  // @UseGuards()
  async registerWebhook(@Body() body: RegisterWebhookDto) {
    try {
      const result = await this.paypalProvider.createWebhook(
        body.url,
        body.eventTypes,
      );

      this.logger.log(
        `Webhook registered successfully: ${result.id} for URL: ${body.url}`,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to register webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * List all registered webhooks
   */
  @Get("webhook/list")
  @UseGuards(IsAuthenticated)
  async listWebhooks() {
    try {
      const result = await this.paypalProvider.listWebhooks();
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to list webhooks: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get webhook details by ID
   */
  @Get("webhook/:webhookId")
  @UseGuards(IsAuthenticated)
  async getWebhook(@Param("webhookId") webhookId: string) {
    try {
      const result = await this.paypalProvider.getWebhook(webhookId);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a webhook
   */
  @Post("webhook/:webhookId/update")
  @UseGuards(IsAuthenticated)
  async updateWebhook(
    @Param("webhookId") webhookId: string,
    @Body() body: RegisterWebhookDto,
  ) {
    try {
      const result = await this.paypalProvider.updateWebhook(
        webhookId,
        body.url,
        body.eventTypes,
      );

      this.logger.log(`Webhook updated successfully: ${webhookId}`);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to update webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a webhook
   */
  @Post("webhook/:webhookId/delete")
  @UseGuards(IsAuthenticated)
  @HttpCode(HttpStatus.OK)
  async deleteWebhook(@Param("webhookId") webhookId: string) {
    try {
      await this.paypalProvider.deleteWebhook(webhookId);

      this.logger.log(`Webhook deleted successfully: ${webhookId}`);

      return {
        success: true,
        message: "Webhook deleted successfully",
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to delete webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * PayPal webhook endpoint
   * This endpoint receives webhook events from PayPal when payments are completed
   * No authentication required as PayPal will call this endpoint directly
   */
  @Post("webhook/paypal")
  @HttpCode(HttpStatus.OK)
  async handlePayPalWebhook(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Req() request: Request,
  ) {
    try {
      this.logger.log(
        `Received PayPal webhook event: ${body.event_type || "unknown"}`,
      );

      // Verify webhook signature
      const isValid = await this.paypalProvider.verifyWebhookSignature(
        headers,
        body,
      );

      if (!isValid) {
        this.logger.warn(
          "Invalid webhook signature, attempting alternative verification",
        );

        // Alternative: Verify by fetching the event from PayPal
        if (body.id) {
          try {
            const event = await this.paypalProvider.getWebhookEvent(body.id);
            if (!event || event.id !== body.id) {
              this.logger.error("Webhook event verification failed");
              throw new BadRequestException("Invalid webhook signature");
            }
          } catch (verifyError: any) {
            this.logger.error(
              `Webhook verification failed: ${verifyError.message}`,
            );
            throw new BadRequestException("Invalid webhook signature");
          }
        } else {
          this.logger.error("Missing webhook event ID for verification");
          throw new BadRequestException("Invalid webhook signature");
        }
      }

      // Process the webhook event
      await this.paymentService.handleWebhookEvent(body);

      this.logger.log(
        `Successfully processed PayPal webhook event: ${body.event_type}`,
      );

      // Return 200 OK to PayPal
      return { status: "success" };
    } catch (error: any) {
      this.logger.error(
        `Error processing PayPal webhook: ${error.message}`,
        error.stack,
      );

      // Return 200 OK to PayPal even on error to prevent infinite retries
      // PayPal will retry failed webhooks, but we log the error for investigation
      return { status: "error", message: error.message };
    }
  }
}
