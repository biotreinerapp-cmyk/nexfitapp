import { createStaticPix } from 'pix-utils';
import { SubscriptionPlan } from './subscriptionPlans';

export type PixPayloadParams = {
  pixKey: string;
  receiverName: string;
  amount: number; // BRL, must be > 0
  description?: string;
  txid?: string;
  city?: string;
};

// Normalizes strings: remove accents, keep only A-Z 0-9 and SPACE, uppercase
const normalize = (str: string): string =>
  (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^A-Za-z0-9 ]/g, "")  // Keep alphanumeric + space
    .toUpperCase()
    .trim();

/**
 * Aplica regra de negócio: 20% de desconto para Elite Black
 * Garante retorno de número com 2 casas decimais usando multiplicador 0.8.
 */
export const calculateFinalPrice = (basePrice: number | null, plan: SubscriptionPlan | null): number => {
  if (!basePrice || basePrice <= 0) return 0;

  // Regra de negócio: plano ELITE ganha 20% de desconto
  const multiplier = plan === "ELITE" ? 0.8 : 1.0;
  const finalPrice = basePrice * multiplier;

  // Arredonda para 2 casas decimais e retorna como número
  // Importante: toFixed(2) garante que o valor seja ex: 80.00
  return Number(finalPrice.toFixed(2));
};

export const buildPixPayload = ({
  pixKey,
  receiverName,
  amount,
  description,
  txid,
  city = "BRASILIA",
}: PixPayloadParams): string => {
  // --- Sanitize e Normalização ---
  let key = (pixKey || "").trim().replace(/\s/g, "");

  // Nota: A sanitização pesada (+55, etc) agora é feita no momento de salvar (ProfessionalProfilePage/Onboarding)
  // via sanitizePixKey para garantir que o dado no banco já esteja no padrão ouro.
  // Mantemos o trim básico aqui por segurança.

  const name = normalize(receiverName).slice(0, 25);
  const merchantCity = normalize(city || "BRASILIA").slice(0, 15);

  // ID Alfanumérico Único: NEXFIT + timestamp reduzido
  // Evita '***' que causa erros de "indisponibilidade" em alguns bancos.
  const timestamp = Date.now().toString().slice(-8);
  const uniqueId = `NEXFIT${timestamp}`;

  const finalTxId = txid && txid.trim() !== "***"
    ? txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25)
    : uniqueId;

  // Montagem do Payload Estático
  // IMPORTANTE: Removemos 'infoAdicional' (Tag 02 dentro da 26) para QR Estático, 
  // pois alguns bancos (Itaú, BB) rejeitam o código se houver descrição excedendo limites 
  // ou simplesmente não suportam o campo 02 para chaves diretas.
  const pix = createStaticPix({
    merchantName: name,
    merchantCity: merchantCity,
    pixKey: key,
    // infoAdicional: description ? normalize(description).slice(0, 50) : undefined, // Removido para compatibilidade
    transactionAmount: amount > 0 ? Number(amount.toFixed(2)) : undefined,
    txid: finalTxId,
  });

  if ('message' in pix || !pix) throw new Error("Falha ao gerar o código PIX");

  return pix.toBRCode();
};
