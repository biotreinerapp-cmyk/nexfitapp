// Universal PIX Payment Tracking System
// Centralized service for all PIX payments in the app

import { supabase } from "@/integrations/supabase/client";
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
    pixKey: string;
    receiverName: string;
    description?: string;
    expiresInHours?: number; // Default: 24 hours
}

export interface PixPaymentResult {
    paymentId: string;
    pixPayload: string;
    pixQrCode: string; // Base64 data URL
    expiresAt: Date;
}

/**
 * Creates a new PIX payment and tracks it in the database
 */
export async function createPixPayment(
    params: CreatePixPaymentParams
): Promise<PixPaymentResult> {
    const {
        userId,
        amount,
        paymentType,
        referenceId,
        pixKey,
        receiverName,
        description,
        expiresInHours = 24,
    } = params;

    // Generate PIX payload
    const pixPayload = buildPixPayload({
        pixKey,
        receiverName,
        amount,
        description,
    });

    // Generate QR code
    const pixQrCode = await QRCode.toDataURL(pixPayload, { width: 256 });

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Insert payment record
    const { data, error } = await supabase
        .from("pix_payments")
        .insert({
            user_id: userId,
            amount,
            pix_payload: pixPayload,
            pix_qr_code: pixQrCode,
            payment_type: paymentType,
            reference_id: referenceId || null,
            status: "pending",
            expires_at: expiresAt.toISOString(),
        })
        .select("id")
        .single();

    if (error) throw error;

    return {
        paymentId: data.id,
        pixPayload,
        pixQrCode,
        expiresAt,
    };
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
            // TODO: Implement subscription activation
            break;

        case "marketplace_order":
            // Update order status
            if (payment.reference_id) {
                await supabase
                    .from("marketplace_orders")
                    .update({ payment_status: "paid" })
                    .eq("id", payment.reference_id);
            }
            break;

        case "store_plan":
            // Update store subscription
            // TODO: Implement store plan activation
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
