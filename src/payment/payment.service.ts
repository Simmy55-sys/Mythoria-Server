import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CoinPurchase } from "src/model/coin-purchase.entity";
import { User } from "src/model/user.entity";
import { Repository, EntityManager } from "typeorm";
import { PayPalProvider } from "./providers/paypal.provider";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(CoinPurchase)
    private readonly coinPurchaseRepo: Repository<CoinPurchase>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly paypalProvider: PayPalProvider,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a coin purchase order
   */
  async createCoinPurchaseOrder(
    userId: string,
    coinAmount: number,
    amountPaid: number,
    returnUrl?: string,
    cancelUrl?: string,
  ) {
    // Verify user exists
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Validate coin amount
    if (coinAmount <= 0) {
      throw new BadRequestException("Coin amount must be greater than 0");
    }

    // Validate amount paid
    if (amountPaid <= 0) {
      throw new BadRequestException("Amount paid must be greater than 0");
    }

    // Create PayPal order
    const description = `Purchase ${coinAmount.toLocaleString()} coins`;
    const { orderId, approvalUrl } = await this.paypalProvider.createOrder(
      amountPaid,
      "USD",
      description,
      returnUrl,
      cancelUrl,
    );

    // Create coin purchase record
    const coinPurchase = this.coinPurchaseRepo.create({
      userId,
      coinAmount,
      amountPaid,
      paymentProvider: this.paypalProvider.getProviderId(),
      orderId,
      status: "pending",
    });

    const savedPurchase = await this.coinPurchaseRepo.save(coinPurchase);

    console.log(approvalUrl);

    return {
      purchaseId: savedPurchase.id,
      orderId,
      approvalUrl,
    };
  }

  /**
   * Verify and complete a payment
   */
  async verifyAndCompletePayment(orderId: string, userId: string) {
    // Find the coin purchase record
    const coinPurchase = await this.coinPurchaseRepo.findOne({
      where: { orderId, userId },
    });

    if (!coinPurchase) {
      throw new NotFoundException("Coin purchase not found");
    }

    // Check if already completed
    if (coinPurchase.status === "completed") {
      return {
        success: true,
        message: "Payment already completed",
        coinPurchase,
      };
    }

    // Capture the PayPal order
    const captureResponse = await this.paypalProvider.captureOrder(orderId);

    // Check if capture was successful
    const capture = captureResponse.purchase_units[0]?.payments?.captures?.[0];
    if (!capture || capture.status !== "COMPLETED") {
      coinPurchase.status = "failed";
      await this.coinPurchaseRepo.save(coinPurchase);
      throw new BadRequestException("Payment capture failed");
    }

    // Update coin purchase record and add coins to user balance in a transaction
    return this.coinPurchaseRepo.manager.transaction(
      async (transactionalEntity: EntityManager) => {
        // Lock user row for update
        const user = await transactionalEntity.findOne(User, {
          where: { id: userId },
          lock: { mode: "pessimistic_write" },
        });

        if (!user) {
          throw new NotFoundException("User not found");
        }

        // Update coin purchase status
        coinPurchase.status = "completed";
        coinPurchase.paymentId = capture.id;
        await transactionalEntity.save(CoinPurchase, coinPurchase);

        // Add coins to user balance
        user.coinBalance += coinPurchase.coinAmount;
        await transactionalEntity.save(User, user);

        return {
          success: true,
          message: "Payment completed successfully",
          coinPurchase,
          newBalance: user.coinBalance,
        };
      },
    );
  }

  /**
   * Get coin purchase by ID
   */
  async getCoinPurchaseById(purchaseId: string, userId: string) {
    const coinPurchase = await this.coinPurchaseRepo.findOne({
      where: { id: purchaseId, userId },
    });

    if (!coinPurchase) {
      throw new NotFoundException("Coin purchase not found");
    }

    return coinPurchase;
  }

  /**
   * Get user's coin purchase history
   */
  async getUserCoinPurchases(userId: string) {
    return this.coinPurchaseRepo.find({
      where: { userId },
      order: { purchaseDate: "DESC" },
    });
  }

  /**
   * Handle PayPal webhook event
   * This method processes webhook events and allocates coins with idempotency checks
   */
  async handleWebhookEvent(webhookEvent: any): Promise<void> {
    try {
      // Extract event type and resource
      const eventType = webhookEvent.event_type;
      const resource = webhookEvent.resource;

      // Only process payment capture completed events
      if (eventType !== "PAYMENT.CAPTURE.COMPLETED") {
        this.logger.log(`Ignoring webhook event type: ${eventType}`);
        return;
      }

      // Extract order ID and capture ID from the resource
      // PayPal webhook structure: resource.supplementary_data.related_ids.order_id
      let orderId = resource?.supplementary_data?.related_ids?.order_id;
      const captureId = resource?.id;

      // Try alternative path if order_id not found in supplementary_data
      if (!orderId) {
        orderId = resource?.order_id || webhookEvent.resource?.order_id;
        if (orderId) {
          this.logger.log(`Using alternative order ID path: ${orderId}`);
        }
      }

      if (!orderId) {
        this.logger.warn(
          "Missing order ID in webhook event",
          JSON.stringify({ resource, webhookEvent }),
        );
        throw new BadRequestException("Missing order ID in webhook event");
      }

      if (!captureId) {
        this.logger.warn(
          "Missing capture ID in webhook event",
          JSON.stringify(resource),
        );
        throw new BadRequestException("Missing capture ID in webhook event");
      }

      // Find the coin purchase record by order ID
      const coinPurchase = await this.coinPurchaseRepo.findOne({
        where: { orderId },
      });

      if (!coinPurchase) {
        this.logger.warn(`Coin purchase not found for order ID: ${orderId}`);
        throw new NotFoundException("Coin purchase not found");
      }

      // IDEMPOTENCY CHECK: Check if transaction has already been processed
      if (coinPurchase.status === "completed") {
        this.logger.log(
          `Payment already processed for order ID: ${orderId}, capture ID: ${captureId}`,
        );
        return; // Already processed, return silently
      }

      // Verify the capture ID matches (additional security check)
      if (coinPurchase.paymentId && coinPurchase.paymentId !== captureId) {
        this.logger.warn(
          `Capture ID mismatch for order ID: ${orderId}. Expected: ${coinPurchase.paymentId}, Received: ${captureId}`,
        );
        throw new BadRequestException("Capture ID mismatch");
      }

      // Process the payment and allocate coins in a transaction
      await this.coinPurchaseRepo.manager.transaction(
        async (transactionalEntity: EntityManager) => {
          // Double-check status within transaction (prevent race conditions)
          const existingPurchase = await transactionalEntity.findOne(
            CoinPurchase,
            {
              where: { id: coinPurchase.id },
              lock: { mode: "pessimistic_write" },
            },
          );

          if (!existingPurchase) {
            throw new NotFoundException("Coin purchase not found");
          }

          // Check again if already completed (idempotency)
          if (existingPurchase.status === "completed") {
            this.logger.log(
              `Payment already processed (double-check) for order ID: ${orderId}`,
            );
            return;
          }

          // Lock user row for update
          const user = await transactionalEntity.findOne(User, {
            where: { id: coinPurchase.userId },
            lock: { mode: "pessimistic_write" },
          });

          if (!user) {
            throw new NotFoundException("User not found");
          }

          // Update coin purchase status
          existingPurchase.status = "completed";
          existingPurchase.paymentId = captureId;
          await transactionalEntity.save(CoinPurchase, existingPurchase);

          // Add coins to user balance
          user.coinBalance += existingPurchase.coinAmount;
          await transactionalEntity.save(User, user);

          this.logger.log(
            `Successfully processed payment for order ID: ${orderId}, user: ${user.id}, coins added: ${existingPurchase.coinAmount}`,
          );
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Error processing webhook event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
