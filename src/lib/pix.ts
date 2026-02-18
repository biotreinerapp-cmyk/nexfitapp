// Helpers to generate Pix (EMVCo / BR Code) payload ("copia e cola")
// References:
//   - BACEN Manual de Padrões para Iniciação do Pix (BR Code)
//   - EMVCo Merchant Presented QR Code Specification
//
// Key rules for bank compatibility (especially digital banks like Nubank, Inter):
//   - Point of Initiation Method MUST be "11" (dynamic, single-use) when amount is present
//   - Point of Initiation Method is "12" (static, reusable) only when NO amount is set
//   - Merchant Name: max 25 chars, only A-Z 0-9 and SPACE (no accents, no special chars)
//   - Merchant City: max 15 chars, same restrictions
//   - TXID (tag 62.05): alphanumeric only, max 25 chars; use "***" for static PIX
//   - CRC16/CCITT-FALSE over the entire payload including "6304" suffix

const pad2 = (n: number) => n.toString().padStart(2, "0");

// TLV: ID (2 chars) + Length (2 chars, decimal) + Value
const tlv = (id: string, value: string) => `${id}${pad2(value.length)}${value}`;

// Normalizes strings: remove accents, keep only A-Z 0-9 and SPACE, uppercase
const normalize = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/[^A-Za-z0-9 ]/g, "")  // keep only alphanumeric + space
    .toUpperCase()
    .trim();

// CRC16/CCITT-FALSE — poly 0x1021, init 0xFFFF
export const crc16ccitt = (input: string): string => {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};

export type PixPayloadParams = {
  pixKey: string;
  receiverName: string;
  amount: number; // BRL, must be > 0
  description?: string;
  txid?: string;
  city?: string;
};

export const buildPixPayload = ({
  pixKey,
  receiverName,
  amount,
  description,
  txid,
  city,
}: PixPayloadParams): string => {
  // --- Sanitize inputs ---

  // PIX key: strip whitespace only (preserve dots/hyphens for CPF/CNPJ/email/phone)
  const key = pixKey.trim().replace(/\s/g, "");

  // Merchant name: max 25 chars, A-Z 0-9 SPACE only
  const name = normalize(receiverName).slice(0, 25);

  // Merchant city: max 15 chars; default to "BRASILIA" (safe, widely accepted)
  const rawCity = city && city.trim() ? city : "BRASILIA";
  const merchantCity = normalize(rawCity).slice(0, 15);

  // TXID (tag 62.05): alphanumeric only, max 25 chars; "***" for static/reusable
  const tx = txid
    ? txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***"
    : "***";

  // Amount: must be formatted as "0.00" with dot separator
  const amountStr =
    Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : "";

  // --- Merchant Account Information (tag 26) ---
  // Sub-fields: 00 = GUI, 01 = PIX key, 02 = description (optional)
  let mai = tlv("00", "br.gov.bcb.pix") + tlv("01", key);
  if (description) {
    const desc = normalize(description).slice(0, 72); // BACEN limit
    if (desc) mai += tlv("02", desc);
  }

  // --- Point of Initiation Method ---
  // "11" = dynamic (single-use, has fixed amount) — required by most digital banks when amount is set
  // "12" = static (reusable, no fixed amount)
  const pointOfInitiation = amountStr ? "11" : "12";

  // --- Additional Data Field (tag 62) ---
  // Sub-field 05 = TXID (required)
  const additionalData = tlv("05", tx);

  // --- Assemble payload ---
  const parts: string[] = [
    tlv("00", "01"),                    // Payload Format Indicator
    tlv("01", pointOfInitiation),       // Point of Initiation Method
    tlv("26", mai),                     // Merchant Account Information
    tlv("52", "0000"),                  // Merchant Category Code (generic)
    tlv("53", "986"),                   // Transaction Currency (BRL = 986)
  ];

  if (amountStr) {
    parts.push(tlv("54", amountStr));   // Transaction Amount
  }

  parts.push(tlv("58", "BR"));          // Country Code
  parts.push(tlv("59", name));          // Merchant Name
  parts.push(tlv("60", merchantCity));  // Merchant City
  parts.push(tlv("62", additionalData)); // Additional Data Field

  // CRC16 over everything including the "6304" suffix tag+length
  const payloadNoCrc = parts.join("") + "6304";
  const crc = crc16ccitt(payloadNoCrc);

  return payloadNoCrc + crc;
};
