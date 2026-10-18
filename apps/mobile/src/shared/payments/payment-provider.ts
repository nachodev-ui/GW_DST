// Contract only: no payment processing or external provider is implemented.
export type PaymentMethod = 'cash_on_delivery' | 'mercado_pago' | 'webpay';

export interface PaymentRequest {
  readonly orderId: string;
  readonly amountClp: number; // Integer pesos, validated on the trusted server.
  readonly currency: 'CLP';
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  prepare(
    request: PaymentRequest,
  ): Promise<{ readonly reference: string; readonly status: 'pending' }>;
}
