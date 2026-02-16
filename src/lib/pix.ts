// Helpers to generate Pix (EMVCo) payload ("copia e cola")
// References: BR Code (EMV) + Pix key inside Merchant Account Information (ID 26)

const pad2 = (n: number) => n.toString().padStart(2, "0");

const tlv = (id: string, value: string) => `${id}${pad2(value.length)}${value}`;

// Normalizes strings to remove accents and keep only allowed characters for PIX
const normalize = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^A-Za-z0-9 ]/g, "") // Keep only alphanumeric and space
    .toUpperCase();
};

// CRC16/CCITT-FALSE
// poly 0x1021, init 0xFFFF, xorout 0x0000
export const crc16ccitt = (input: string) => {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};

export type PixPayloadParams = {
  pixKey: string;
  receiverName: string;
  amount: number; // BRL
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
}: PixPayloadParams) => {
  // Clean key: remove spaces
  const key = pixKey.trim().replace(/\s/g, "");

  // Normalize name and city (No accents, upper case, strictly Alpha-numeric for safety)
  const name = normalize(receiverName).slice(0, 25);
  // Avoid generic "BRASIL" as some apps reject it; use SAO PAULO as a safe default
  const merchantCity = normalize(city && city !== "BRASIL" ? city : "SAO PAULO").slice(0, 15);

  // TXID: For static PIX, '***' is the standard fallback
  const tx = txid ? normalize(txid).replace(/\s/g, "").slice(0, 25) : "***";

  // Merchant Account Information (ID 26)
  const mai =
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", key);

  // Amount formatting: dot decimal
  const amountStr = Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : "";

  // EMV Data Groups
  const parts = [
    tlv("00", "01"),           // Payload Format Indicator
    tlv("01", "12"),           // Point of Initiation Method: 12 (Static, multiple use)
    tlv("26", mai),            // Merchant Account Information
    tlv("52", "0000"),         // Merchant Category Code
    tlv("53", "986"),          // Transaction Currency (BRL)
  ];

  if (amountStr) {
    parts.push(tlv("54", amountStr)); // Transaction Amount
  }

  parts.push(tlv("58", "BR"));         // Country Code
  parts.push(tlv("59", name));       // Merchant Name
  parts.push(tlv("60", merchantCity)); // Merchant City

  // Tag 62: Additional Data Field
  parts.push(tlv("62", tlv("05", tx)));

  const payloadNoCrc = parts.join("") + "6304";
  const crc = crc16ccitt(payloadNoCrc);

  return payloadNoCrc + crc;
};
