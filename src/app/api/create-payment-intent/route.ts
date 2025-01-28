// pages/api/create-payment-intent.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-01-27.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const { amount, transactionDocId } = await request.json();
    console.log("Creating PaymentIntent with amount:", amount, "transactionDocId:", transactionDocId);
    // Validate input
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { message: `{Invalid amount. ${amount}}` },
        { status: 400 }
      );
    }

    if (!transactionDocId) {
      return NextResponse.json(
        { message: "transactionDocId is required." },
        { status: 400 }
      );
    }

    // Create PaymentIntent with metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      metadata: {
        transactionDocId: transactionDocId,
      },
      automatic_payment_methods: { enabled: true },
    });

    console.log("PaymentIntent created:", paymentIntent.id);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("Internal Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
