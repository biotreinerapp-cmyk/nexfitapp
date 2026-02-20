// Universal PIX Payment Tracking System
// Centralized service for all PIX payments in the app
// Integrated with InfinitePay for automatic payment processing

import { supabase } from "@/integrations/supabase/client";
import { createInfinitePayPayment } from "./infinitePayService";
import { buildPixPayload } from "./pix";
import QRCode from "qrcode";

export type PixPaymentType =
    | "lp_unlock"           // Professional LP unlock (R$ 89,90)
    | "subscription"        // User subscription plans
    | "marketplace_order"   // Marketplace product orders
    | "store_plan"          // Store owner plan payments
    | "professional_service"; // Hiring professional services

export interface CreatePixPaymentParams {
    userId: string;
    amount: number;
    paymentType: PixPaymentType;
    referenceId?: string; // ID of related entity (professional_id, order_id, etc.)
    description?: string;
    expiresInHours?: number; // Default: 24 hours
    desiredPlan?: string; // For subscription payments
    paymentMethod?: "pix" | "card"; // Optional override
    userEmail?: string; // Email for the payer
    userName?: string; // Full name for the payer
    pixKey?: string; // Optional PIX key for manual generation
    receiverName?: string; // Optional receiver name for manual generation
}

export interface PixPaymentResult {
    paymentId: string;
    pixPayload: string;
    pixQrCode: string; // Base64 or URL
    expiresAt: Date;
    paymentUrl?: string; // Redirect URL for cards or ticket
}

/**
 * Creates a new PIX/Card payment using InfinitePay
 */
export async function createPixPayment(
    params: CreatePixPaymentParams
): Promise<PixPaymentResult> {
    const {
        userId,
        amount,
        paymentType,
        referenceId,
        description,
        paymentMethod = "pix",
    } = params;

    console.log("[PixTracking] Creating payment:", { paymentType, amount });

    // Use InfinitePay for automated payments
    try {
        // Create payment via InfinitePay Service
        const result = await createInfinitePayPayment({
            amount,
            description: description || `Pagamento Nexfit - ${paymentType}`,
            paymentType,
            referenceId: referenceId || "",
            userId: userId,
            paymentMethods: paymentMethod === "pix" ? ["pix"] : ["credit_card"],
        });

        return {
            paymentId: result.paymentId,
            pixPayload: result.pixCode || "",
            pixQrCode: result.qrCode || "",
            expiresAt: new Date(result.expiresAt),
            paymentUrl: result.paymentUrl,
        };
    } catch (error: any) {
        console.error("[PixTracking] Error creating automated payment:", error);
        throw new Error(error.message || "Falha ao criar pagamento automático. Tente novamente.");
    }
}



/**
 * Checks if a PIX payment has been completed
 */
export async function checkPixPaymentStatus(
    paymentId: string
): Promise<"pending" | "paid" | "expired" | "cancelled"> {
    const { data, error } = await supabase
        .from("pix_payments")
        .select("status, expires_at")
        .eq("id", paymentId)
        .single();

    if (error) throw error;

    // Check if expired
    if (data.status === "pending" && new Date(data.expires_at) < new Date()) {
        // Auto-expire
        await supabase
            .from("pix_payments")
            .update({ status: "expired" })
            .eq("id", paymentId);
        return "expired";
    }

    return data.status as any;
}

/**
 * Marks a PIX payment as paid (manual confirmation or webhook)
 */
export async function confirmPixPayment(paymentId: string): Promise<void> {
    const { error } = await supabase
        .from("pix_payments")
        .update({
            status: "paid",
            paid_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

    if (error) throw error;

    // Trigger post-payment actions based on payment type
    await handlePostPaymentActions(paymentId);
}

/**
 * Handles actions after payment confirmation
 */
async function handlePostPaymentActions(paymentId: string): Promise<void> {
    const { data: payment } = await supabase
        .from("pix_payments")
        .select("payment_type, reference_id, user_id")
        .eq("id", paymentId)
        .single();

    if (!payment) return;

    switch (payment.payment_type) {
        case "lp_unlock":
            // Unlock professional LP
            if (payment.reference_id) {
                await supabase
                    .from("professionals")
                    .update({
                        lp_unlocked: true,
                        lp_payment_id: paymentId,
                        lp_unlocked_at: new Date().toISOString(),
                    })
                    .eq("id", payment.reference_id);
            }
            break;

        case "subscription":
            // Update user subscription status
            if (payment.user_id) {
                const plan = (payment as any).desired_plan || "ADVANCE";
                await supabase
                    .from("profiles")
                    .update({
                        subscription_plan: plan,
                        // Add other plan-related fields if they exist in the schema
                    })
                    .eq("id", payment.user_id);
            }
            break;

        case "store_plan":
            // Update store subscription
            if (payment.reference_id) {
                const now = new Date();
                const expiresAt = new Date(now);
                expiresAt.setDate(now.getDate() + 30); // 30 days subscription

                await supabase
                    .from("marketplace_stores")
                    .update({
                        subscription_plan: "PRO",
                        plan_expires_at: expiresAt.toISOString(),
                    })
                    .eq("id", payment.reference_id);
            }
            break;

        case "marketplace_order":
            // Update marketplace order status
            if (payment.reference_id) {
                await supabase
                    .from("marketplace_orders")
                    .update({ status: "paid" })
                    .eq("id", payment.reference_id);
                console.log("[PixTracking] Marketplace order updated to paid:", payment.reference_id);
            }
            break;

        case "professional_service":
            // Update hire status and professional balance
            if (payment.reference_id) {
                // 1. Get hire details
                const { data: hire } = await supabase
                    .from("professional_hires")
                    .select("professional_id, paid_amount")
                    .eq("id", payment.reference_id)
                    .single();

                if (hire) {
                    const amount = Number(hire.paid_amount || 0);
                    const platformFee = amount * 0.15;
                    const professionalNet = amount - platformFee;

                    // 2. Update hire record
                    await supabase
                        .from("professional_hires")
                        .update({
                            is_paid: true,
                            payment_status: "paid",
                            platform_fee: platformFee
                        })
                        .eq("id", payment.reference_id);

                    // 3. Update professional balance
                    const { data: prof } = await supabase
                        .from("professionals")
                        .select("balance")
                        .eq("id", hire.professional_id)
                        .single();

                    await supabase
                        .from("professionals")
                        .update({
                            balance: (Number(prof?.balance || 0)) + professionalNet
                        })
                        .eq("id", hire.professional_id);

                    // 4. Create chat room if not exists
                    const { data: existingRoom } = await supabase
                        .from("professional_chat_rooms")
                        .select("id")
                        .eq("professional_id", hire.professional_id)
                        .eq("student_id", payment.user_id)
                        .maybeSingle();

                    if (!existingRoom) {
                        await supabase
                            .from("professional_chat_rooms")
                            .insert({
                                professional_id: hire.professional_id,
                                student_id: payment.user_id,
                                last_message_at: new Date().toISOString()
                            });
                    }
                }
            }
            break;
    }
}

/**
 * Gets all payments for a user
 */
export async function getUserPixPayments(
    userId: string,
    paymentType?: PixPaymentType
) {
    let query = supabase
        .from("pix_payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (paymentType) {
        query = query.eq("payment_type", paymentType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * Cancels a pending payment
 */
export async function cancelPixPayment(paymentId: string): Promise<void> {
    const { error } = await supabase
        .from("pix_payments")
        .update({ status: "cancelled" })
        .eq("id", paymentId)
        .eq("status", "pending"); // Only cancel if still pending

    if (error) throw error;
}

/**
 * Gets payment by reference (e.g., professional_id for LP unlock)
 */
export async function getPaymentByReference(
    referenceId: string,
    paymentType: PixPaymentType
) {
    const { data, error } = await supabase
        .from("pix_payments")
        .select("*")
        .eq("reference_id", referenceId)
        .eq("payment_type", paymentType)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}
