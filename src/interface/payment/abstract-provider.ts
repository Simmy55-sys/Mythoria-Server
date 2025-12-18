import { Injectable } from "@nestjs/common";
import { PaymentProviderProcessorType } from "./types";

@Injectable()
export abstract class AbstractPaymentProvider {
  protected abstract readonly providerId: PaymentProviderProcessorType;

  constructor() {}

  /**
   * Provider-specific implementation to get provider ID
   */
  public getProviderId() {
    return this.providerId;
  }

  async initiatePayment() {}
}
