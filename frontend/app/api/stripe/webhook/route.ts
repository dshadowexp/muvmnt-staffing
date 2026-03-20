
import { getStripeServer } from "@/services/stripe/server"
import { createAdminClient } from "@/services/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = getStripeServer().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error("Webhook signature verification failed: ", error)
    return NextResponse.json({ error: "Invalid Signature" }, { status: 400 })
  }

  const supabase = await createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const priceId = session.metadata?.priceId

        if (userId && priceId) {
          const { data: userBillingAccount } = await supabase.from("billing_accounts").select("*").eq("user_id", userId).single();

          if (userBillingAccount) {
          await supabase.from("billing_accounts").update({
            stripe_current_period_end: new Date().toISOString(),
              stripe_price_id: priceId,
            }).eq("id", userBillingAccount.id);
          }
        }
        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: userBillingAccount } = await supabase.from("billing_accounts").select("*").eq("stripe_customer_id", customerId).single();

        if (userBillingAccount) {
          await supabase.from("billing_accounts").update({
            stripe_current_period_end: new Date().toISOString(),
          }).eq("id", userBillingAccount.id);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string;
        const { data: userBillingAccount } = await supabase.from("billing_accounts").select("*").eq("stripe_customer_id", customerId).single();
        if (userBillingAccount) {
          await supabase.from("billing_accounts").update({
            stripe_current_period_end: null,
          }).eq("stripe_customer_id", customerId);
        }
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error("Error processing webhook: ", error)
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    )
  }
}