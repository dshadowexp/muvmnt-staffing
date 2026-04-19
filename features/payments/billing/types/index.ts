
export interface PaymentMethodCardType {
    id: string;
    brand:           string;
    last4:           string;
    expMonth:        number;
    expYear:         number;
    isDefault:       boolean;
}
