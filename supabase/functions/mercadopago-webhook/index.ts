import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const url = new URL(req.url)
        const topic = url.searchParams.get('topic') || url.searchParams.get('type')
        const id = url.searchParams.get('id') || url.searchParams.get('data.id')

        console.log(`[MP Webhook] Received notification - Topic: ${topic}, ID: ${id}`)

        // Mercado Pago webhooks often send just the ID. We need to fetch the full payment details.
        if (topic === 'payment') {
            const MP_ACCESS_TOKEN = await getConfig(supabaseClient, 'mercadopago_access_token') || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')

            const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch payment details from MP: ${response.statusText}`)
            }

            const payment = await response.json()
            const externalReference = payment.external_reference // This is our local payment ID
            const status = payment.status

            console.log(`[MP Webhook] Payment ${id} status: ${status}, Ref: ${externalReference}`)

            if (externalReference) {
                // Update local payment record
                const { data: localPayment, error: fetchError } = await supabaseClient
                    .from('pix_payments')
                    .select('*')
                    .eq('id', externalReference)
                    .single()

                if (fetchError) throw fetchError

                const isPaid = status === 'approved'

                await supabaseClient
                    .from('pix_payments')
                    .update({
                        mercadopago_status: status,
                        status: isPaid ? 'paid' : (status === 'rejected' || status === 'cancelled' ? 'failed' : 'pending'),
                        paid_at: isPaid ? new Date().toISOString() : null
                    })
                    .eq('id', externalReference)

                // If newly approved, handle post-payment logic
                if (isPaid && localPayment.status !== 'paid') {
                    // Update: Track revenue in financial_transactions
                    await supabaseClient.from('financial_transactions').insert({
                        type: 'income',
                        amount_cents: Math.round((payment.transaction_amount || 0) * 100),
                        description: `Pagamento MP #${id}: ${localPayment.payment_type}`,
                        category: 'Mercado Pago',
                        reference_id: externalReference,
                        date: new Date().toISOString().split('T')[0]
                    })

                    await handlePostPaymentActions(supabaseClient, localPayment)
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error("[MP Webhook] Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

async function getConfig(supabase: any, key: string) {
    const { data } = await supabase
        .from('integration_configs')
        .select('value')
        .eq('key', key)
        .maybeSingle()
    return data?.value
}

async function handlePostPaymentActions(supabase: any, payment: any) {
    console.log(`[MP Webhook] Handling post-payment for type: ${payment.payment_type}`)

    switch (payment.payment_type) {
        case 'marketplace_order':
            if (payment.reference_id) {
                await supabase
                    .from('marketplace_orders')
                    .update({ status: 'paid' })
                    .eq('id', payment.reference_id)
            }
            break;

        case 'subscription':
            if (payment.user_id) {
                const expiresAt = new Date()
                expiresAt.setMonth(expiresAt.getMonth() + 1)
                await supabase
                    .from('profiles')
                    .update({
                        subscription_plan: payment.desired_plan || 'ADVANCE',
                        plan_expires_at: expiresAt.toISOString()
                    })
                    .eq('id', payment.user_id)
            }
            break;

        case 'store_plan':
            if (payment.reference_id) {
                const now = new Date()
                const expiresAt = new Date(now)
                expiresAt.setDate(now.getDate() + 30)

                const { data: plan } = await supabase
                    .from('app_access_plans')
                    .select('name')
                    .eq('user_type', 'LOJISTA')
                    .eq('is_active', true)
                    .order('price_cents', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                const planName = plan?.name || 'PRO'
                console.log(`[MP Webhook] Activating store plan '${planName}' for store: ${payment.reference_id}`)

                await supabase
                    .from('marketplace_stores')
                    .update({
                        subscription_plan: planName,
                        plan_expires_at: expiresAt.toISOString(),
                    })
                    .eq('id', payment.reference_id)
            }
            break;

        case 'lp_unlock':
            if (payment.reference_id && payment.user_id) {
                const { data: prof } = await supabase
                    .from('professionals')
                    .select('id')
                    .eq('id', payment.reference_id)
                    .maybeSingle()

                if (prof) {
                    await supabase
                        .from('professionals')
                        .update({
                            lp_unlocked: true,
                            lp_payment_id: payment.id,
                            lp_unlocked_at: new Date().toISOString(),
                        })
                        .eq('id', payment.reference_id)
                } else {
                    await supabase
                        .from('marketplace_stores')
                        .update({
                            lp_unlocked: true,
                        })
                        .eq('id', payment.reference_id)
                }
            }
            break;

        case 'professional_service':
            if (payment.reference_id) {
                const { data: hire } = await supabase
                    .from('professional_hires')
                    .select('professional_id, paid_amount')
                    .eq('id', payment.reference_id)
                    .single()

                if (hire) {
                    const amount = Number(hire.paid_amount || 0)
                    const platformFee = amount * 0.15
                    const professionalNet = amount - platformFee

                    await supabase
                        .from('professional_hires')
                        .update({
                            is_paid: true,
                            payment_status: 'paid',
                            platform_fee: platformFee
                        })
                        .eq('id', payment.reference_id)

                    const { data: prof } = await supabase
                        .from('professionals')
                        .select('balance')
                        .eq('id', hire.professional_id)
                        .single()

                    await supabase
                        .from('professionals')
                        .update({
                            balance: (Number(prof?.balance || 0)) + professionalNet
                        })
                        .eq('id', hire.professional_id)

                    const { data: existingRoom } = await supabase
                        .from('professional_chat_rooms')
                        .select('id')
                        .eq('professional_id', hire.professional_id)
                        .eq('student_id', payment.user_id)
                        .maybeSingle()

                    if (!existingRoom) {
                        await supabase
                            .from('professional_chat_rooms')
                            .insert({
                                professional_id: hire.professional_id,
                                student_id: payment.user_id,
                                last_message_at: new Date().toISOString()
                            })
                    }
                }
            }
            break;
    }
}
