interface StripeError {
    type?: string;
    code?: string;
    decline_code?: string;
    message?: string;
  }
  
  interface UserFacingError {
    title: string;
    message: string;
    recoverable: boolean;
  }
  
  export function getStripeErrorMessage(error: StripeError): UserFacingError {
    // 1. Handle Payment Element decline codes first
    const declineMessages: Record<string, UserFacingError> = {
      card_declined: {
        title: "Card Declined",
        message: "Your card was declined. Please try a different payment method or contact your bank.",
        recoverable: true,
      },
      card_velocity_exceeded: {
        title: "Too Many Attempts",
        message: "You've reached the limit of attempts on this card. Please wait a while or use a different card.",
        recoverable: true,
      },
      expired_card: {
        title: "Card Expired",
        message: "Your card has expired. Please use a different card or update your payment details.",
        recoverable: true,
      },
      fraudulent: {
        title: "Card Declined",
        message: "Your card was declined. Please contact your bank or try a different payment method.",
        recoverable: true,
      },
      generic_decline: {
        title: "Card Declined",
        message: "Your card was declined. Please contact your bank for more information or try a different card.",
        recoverable: true,
      },
      incorrect_cvc: {
        title: "Incorrect Security Code",
        message: "The security code (CVC/CVV) you entered is incorrect. Please double-check and try again.",
        recoverable: true,
      },
      incorrect_number: {
        title: "Invalid Card Number",
        message: "The card number you entered is incorrect. Please check and try again.",
        recoverable: true,
      },
      incorrect_zip: {
        title: "Incorrect ZIP Code",
        message: "The billing ZIP code doesn't match your card. Please check and try again.",
        recoverable: true,
      },
      insufficient_funds: {
        title: "Insufficient Funds",
        message: "Your card has insufficient funds. Please use a different card or try again later.",
        recoverable: true,
      },
      invalid_cvc: {
        title: "Invalid Security Code",
        message: "The security code (CVC/CVV) you entered is invalid. Please check and try again.",
        recoverable: true,
      },
      invalid_expiry_month: {
        title: "Invalid Expiry Date",
        message: "The expiry month on your card is invalid. Please check your card details.",
        recoverable: true,
      },
      invalid_expiry_year: {
        title: "Invalid Expiry Date",
        message: "The expiry year on your card is invalid. Please check your card details.",
        recoverable: true,
      },
      live_mode_test_card: {
        title: "Test Card Not Accepted",
        message: "Test cards cannot be used for real payments. Please use a real card.",
        recoverable: true,
      },
      lost_card: {
        title: "Card Declined",
        message: "Your card was declined. Please contact your bank or use a different payment method.",
        recoverable: true,
      },
      processing_error: {
        title: "Processing Error",
        message: "An error occurred while processing your card. Please try again in a moment.",
        recoverable: true,
      },
      stolen_card: {
        title: "Card Declined",
        message: "Your card was declined. Please contact your bank or use a different payment method.",
        recoverable: true,
      },
      test_mode_live_card: {
        title: "Live Card Not Accepted",
        message: "Real cards cannot be used in test mode. Please use a test card.",
        recoverable: true,
      },
    };
  
    if (error.decline_code && declineMessages[error.decline_code]) {
      return declineMessages[error.decline_code];
    }
  
    // 2. Handle broader Stripe error types
    switch (error.type) {
      case "card_error":
        return {
          title: "Card Error",
          message: "There was a problem with your card. Please check your details and try again.",
          recoverable: true,
        };
  
      case "validation_error":
        return {
          title: "Invalid Payment Details",
          message: "Some of your payment details appear to be invalid. Please review and try again.",
          recoverable: true,
        };
  
      case "invalid_request_error":
        return {
          title: "Invalid Request",
          message: "Something went wrong with your request. Please refresh the page and try again.",
          recoverable: false,
        };
  
      case "api_error":
        return {
          title: "Service Unavailable",
          message: "Our payment service is temporarily unavailable. Please try again in a few minutes.",
          recoverable: true,
        };
  
      case "authentication_error":
        return {
          title: "Authentication Error",
          message: "We couldn't verify your payment. Please refresh the page and try again.",
          recoverable: false,
        };
  
      case "rate_limit_error":
        return {
          title: "Too Many Requests",
          message: "We're experiencing high demand. Please wait a moment and try again.",
          recoverable: true,
        };
  
      case "idempotency_error":
        return {
          title: "Duplicate Request",
          message: "It looks like this request was already submitted. Please refresh and check your order status.",
          recoverable: false,
        };
  
      default:
        return {
          title: "Payment Failed",
          message: "Something went wrong processing your payment. Please try again or contact support.",
          recoverable: true,
        };
    }
  }