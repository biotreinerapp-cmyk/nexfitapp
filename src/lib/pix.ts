import { createStaticPix } from 'pix-utils';

export type PixPayloadParams = {
  pixKey: string;
  receiverName: string;
  amount: number; // BRL, must be > 0
  description?: string;
  txid?: string;
  city?: string;
};

// Normalizes strings: remove accents, keep only A-Z 0-9 and SPACE, uppercase
const normalize = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/[^A-Za-z0-9 ]/g, "")  // keep only alphanumeric + space
    .toUpperCase()
    .trim();

export const buildPixPayload = ({
  pixKey,
  receiverName,
  amount,
  description,
  txid,
  city,
}: PixPayloadParams): string => {
  // --- Sanitize inputs ---
  const key = pixKey.trim().replace(/\s/g, "");
  const name = normalize(receiverName).slice(0, 25);
  const rawCity = city && city.trim() ? city : "BRASILIA";
  const merchantCity = normalize(rawCity).slice(0, 15);
  // It's recommended to leave txid empty for STATIC pix unless specified
  const tx = txid
    ? txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***"
    : "***";

  const pix = createStaticPix({
    merchantName: name,
    merchantCity: merchantCity,
    pixKey: key,
    infoAdicional: description ? normalize(description).slice(0, 50) : undefined,
    transactionAmount: amount > 0 ? amount : undefined,
    txid: tx,
  });

  if ('message' in pix || !pix) throw new Error("Falha ao gerar o código PIX");

  return pix.toBRCode();
};
