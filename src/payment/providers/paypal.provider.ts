import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AbstractPaymentProvider } from "src/interface/payment/abstract-provider";
import { PaymentProviderProcessorType } from "src/interface/payment/types";
import axios, { AxiosInstance } from "axios";
import * as crypto from "crypto";
import {
  PAYPAL_BASE_URL,
  PAYPAL_CLIENT_ID,
  PAYPAL_SECRET,
} from "src/config/env";

interface PayPalOrderRequest {
  intent: "CAPTURE";
  purchase_units: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
    description?: string;
  }>;
  application_context?: {
    return_url?: string;
    cancel_url?: string;
    brand_name?: string;
    shipping_preference?: string;
    user_action?: string;
  };
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

@Injectable()
export class PayPalProvider extends AbstractPaymentProvider {
  protected readonly providerId = PaymentProviderProcessorType.PPAL;
  private readonly logger = new Logger(PayPalProvider.name);
  private accessToken: string | null = null;
  private accessTokenExpiry: Date | null = null;
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    super();
    const baseUrl =
      this.configService.get<string>(PAYPAL_BASE_URL) ||
      "https://api-m.sandbox.paypal.com";
    this.httpClient = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * Get PayPal access token
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid access token
    if (
      this.accessToken &&
      this.accessTokenExpiry &&
      new Date() < this.accessTokenExpiry
    ) {
      return this.accessToken;
    }

    const clientId = this.configService.get<string>(PAYPAL_CLIENT_ID);
    const secret = this.configService.get<string>(PAYPAL_SECRET);

    if (!clientId || !secret) {
      throw new BadRequestException("PayPal credentials not configured");
    }

    try {
      const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
      const response = await axios.post<PayPalAccessTokenResponse>(
        `${this.httpClient.defaults.baseURL}/v1/oauth2/token`,
        "grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      this.accessToken = response.data.access_token;
      // Set expiry 5 minutes before actual expiry for safety
      const expiresIn = response.data.expires_in - 300;
      this.accessTokenExpiry = new Date(Date.now() + expiresIn * 1000);

      return this.accessToken;
    } catch (error: any) {
      this.logger.error(
        "Failed to get PayPal access token",
        error.response?.data || error.message,
      );
      throw new BadRequestException("Failed to authenticate with PayPal");
    }
  }

  /**
   * Create a PayPal order
   */
  async createOrder(
    amount: number,
    currency: string = "USD",
    description?: string,
    returnUrl?: string,
    cancelUrl?: string,
  ): Promise<{ orderId: string; approvalUrl: string }> {
    const accessToken = await this.getAccessToken();

    const orderRequest: PayPalOrderRequest = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
          description: description || "Coin Purchase",
        },
      ],
    };

    if (returnUrl || cancelUrl) {
      orderRequest.application_context = {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: "Mythoria.com",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      };
    }

    try {
      const response = await this.httpClient.post<PayPalOrderResponse>(
        "/v2/checkout/orders",
        orderRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const approvalLink = response.data.links.find(
        (link) => link.rel === "approve",
      );
      if (!approvalLink) {
        throw new BadRequestException("Failed to get PayPal approval URL");
      }

      return {
        orderId: response.data.id,
        approvalUrl: approvalLink.href,
      };
    } catch (error: any) {
      this.logger.error(
        "Failed to create PayPal order",
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || "Failed to create PayPal order",
      );
    }
  }

  /**
   * Capture a PayPal order
   */
  async captureOrder(orderId: string): Promise<PayPalCaptureResponse> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await this.httpClient.post<PayPalCaptureResponse>(
        `/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        "Failed to capture PayPal order",
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || "Failed to capture PayPal order",
      );
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await this.httpClient.get(
        `/v2/checkout/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        "Failed to get PayPal order",
        error.response?.data || error.message,
      );
      throw new BadRequestException("Failed to get PayPal order details");
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: any,
  ): Promise<boolean> {
    try {
      const authAlgo = headers["paypal-auth-algo"];
      const certUrl = headers["paypal-cert-url"];
      const transmissionId = headers["paypal-transmission-id"];
      const transmissionSig = headers["paypal-transmission-sig"];
      const transmissionTime = headers["paypal-transmission-time"];

      if (
        !authAlgo ||
        !certUrl ||
        !transmissionId ||
        !transmissionSig ||
        !transmissionTime
      ) {
        this.logger.warn("Missing PayPal webhook headers");
        return false;
      }

      // Get PayPal certificate
      const certResponse = await axios.get(certUrl);
      const cert = certResponse.data;

      // Create the verification string
      const verificationString = [
        transmissionId,
        transmissionTime,
        JSON.stringify(body),
      ].join("|");

      // Verify signature
      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(verificationString);
      const isValid = verifier.verify(cert, transmissionSig, "base64");

      if (!isValid) {
        this.logger.warn("Invalid PayPal webhook signature");
      }

      return isValid;
    } catch (error: any) {
      this.logger.error(
        "Error verifying PayPal webhook signature",
        error.message,
      );
      return false;
    }
  }

  /**
   * Get webhook event details from PayPal
   */
  async getWebhookEvent(eventId: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await this.httpClient.get(
        `/v1/notifications/webhooks-events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        "Failed to get PayPal webhook event",
        error.response?.data || error.message,
      );
      throw new BadRequestException("Failed to get webhook event details");
    }
  }

  /**
   * Create/Register a webhook with PayPal
   */
  async createWebhook(
    webhookUrl: string,
    eventTypes: string[],
  ): Promise<{ id: string; url: string; event_types: any[] }> {
    const accessToken = await this.getAccessToken();

    const webhookRequest = {
      url: webhookUrl,
      event_types: eventTypes.map((type) => ({ name: type })),
    };

    try {
      const response = await this.httpClient.post(
        "/v1/notifications/webhooks",
        webhookRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        "Failed to create PayPal webhook",
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || "Failed to create PayPal webhook",
      );
    }
  }

  /**
   * List all webhooks registered with PayPal
   */
  async listWebhooks(): Promise<any> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await this.httpClient.get("/v1/notifications/webhooks", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(
        "Failed to list PayPal webhooks",
        error.response?.data || error.message,
      );
      throw new BadRequestException("Failed to list PayPal webhooks");
    }
  }

  /**
   * Get webhook details by ID
   */
  async getWebhook(webhookId: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await this.httpClient.get(
        `/v1/notifications/webhooks/${webhookId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        "Failed to get PayPal webhook",
        error.response?.data || error.message,
      );
      throw new BadRequestException("Failed to get PayPal webhook details");
    }
  }

  /**
   * Update a webhook
   */
  async updateWebhook(
    webhookId: string,
    webhookUrl: string,
    eventTypes: string[],
  ): Promise<any> {
    const accessToken = await this.getAccessToken();

    const webhookRequest = [
      {
        op: "replace",
        path: "/url",
        value: webhookUrl,
      },
      {
        op: "replace",
        path: "/event_types",
        value: eventTypes.map((type) => ({ name: type })),
      },
    ];

    try {
      const response = await this.httpClient.patch(
        `/v1/notifications/webhooks/${webhookId}`,
        webhookRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        "Failed to update PayPal webhook",
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || "Failed to update PayPal webhook",
      );
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    try {
      await this.httpClient.delete(`/v1/notifications/webhooks/${webhookId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (error: any) {
      this.logger.error(
        "Failed to delete PayPal webhook",
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || "Failed to delete PayPal webhook",
      );
    }
  }

  async initiatePayment() {
    // This method is abstract but not used in our implementation
    throw new Error("Use createOrder instead");
  }
}
