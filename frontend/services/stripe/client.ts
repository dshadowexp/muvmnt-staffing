import { Stripe, loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;
const getStripeClient = () => {
    if (!stripePromise) {
        stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
    }
    return stripePromise;
};


// ─── Stripe Elements appearance (matches app theme) ───────────────────────────

export const LIGHT_APPEARANCE = {
    theme: "flat" as const,
    variables: {
      fontFamily: "'DM Sans', sans-serif",
      fontSizeBase: "14.4px",
      colorPrimary: "#0d9488",
      colorBackground: "#ffffff",
      colorText: "#0f1a18",
      colorDanger: "#dc2626",
      borderRadius: "8px",
      colorTextPlaceholder: "#8fa8a4",
    },
    rules: {
      ".Input": {
        border: "1px solid rgba(13,148,136,0.15)",
        boxShadow: "none",
        padding: "11px 13px",
        transition: "border-color 0.15s",
      },
      ".Input:focus": { border: "1px solid #0d9488", boxShadow: "none", outline: "none" },
      ".Label": {
        fontSize: "0.78rem",
        fontWeight: "600",
        color: "#0f1a18",
        marginBottom: "5px",
        letterSpacing: "0.1px",
      },
      ".Tab": { border: "1px solid rgba(13,148,136,0.15)", boxShadow: "none", borderRadius: "8px" },
      ".Tab:focus": { boxShadow: "none" },
      ".Tab--selected": { borderColor: "#0d9488", color: "#0d9488" },
      ".Tab--selected:focus": { boxShadow: "none" },
      ".Error": { fontSize: "0.75rem", fontWeight: "300" },
    },
  };
  
export const DARK_APPEARANCE = {
    theme: "flat" as const,
    variables: {
      fontFamily: "'DM Sans', sans-serif",
      fontSizeBase: "14.4px",
      colorPrimary: "#2dd4bf",
      colorBackground: "#1a1a1a",
      colorText: "#e5e5e5",
      blockLogoColor: "dark" as const,
      colorDanger: "#dc2626",
      borderRadius: "8px",
      colorTextPlaceholder: "#737373",
    },
    rules: {
      ".Block": { backgroundColor: "#1a1a1a" },
      ".BlockAction": { backgroundColor: "#1a1a1a" },
      ".BlockDivider": { backgroundColor: "#1a1a1a" },
      ".AccordionItem": { backgroundColor: "#1a1a1a" },
      ".Input": {
        border: "1px solid rgba(45,212,191,0.2)",
        boxShadow: "none",
        padding: "11px 13px",
        transition: "border-color 0.15s",
      },
      ".Input:focus": { border: "1px solid #2dd4bf", boxShadow: "none", outline: "none" },
      ".Label": {
        fontSize: "0.78rem",
        fontWeight: "600",
        color: "#e5e5e5",
        marginBottom: "5px",
        letterSpacing: "0.1px",
      },
      ".Tab": { border: "1px solid rgba(45,212,191,0.2)", boxShadow: "none", borderRadius: "8px" },
      ".Tab:focus": { boxShadow: "none" },
      ".Tab--selected": { borderColor: "#2dd4bf", color: "#2dd4bf" },
      ".Tab--selected:focus": { boxShadow: "none" },
      ".Error": { fontSize: "0.75rem", fontWeight: "300" },
    },
  };
  

export default getStripeClient;

