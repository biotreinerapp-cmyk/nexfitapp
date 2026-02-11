// Helpers to generate Pix (EMVCo) payload ("copia e cola")
// References: BR Code (EMV) + Pix key inside Merchant Account Information (ID 26)

const pad2 = (n: number) => n.toString().padStart(2, "0");

const tlv = (id: string, value: string) => `${id}${pad2(value.length)}${value}`;

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
  const key = pixKey.trim();
  const name = receiverName.trim().slice(0, 25);
  const merchantCity = (city ?? "BRASIL").trim().slice(0, 15);
  const tx = (txid ?? "BIO" + Date.now().toString().slice(-6)).slice(0, 25);

  // Merchant Account Information (ID 26)
  // GUI: br.gov.bcb.pix
  // Key: 01
  // Description: 02 (optional)
  const mai =
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", key) +
    (description?.trim() ? tlv("02", description.trim().slice(0, 50)) : "");

  // Amount uses dot decimal separator with 2 decimals
  const amountStr = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";

  const payloadNoCrc =
    tlv("00", "01") + // payload format indicator
    tlv("26", mai) + // merchant account information
    tlv("52", "0000") + // merchant category code
    tlv("53", "986") + // currency BRL
    tlv("54", amountStr) + // transaction amount
    tlv("58", "BR") + // country
    tlv("59", name) + // merchant name
    tlv("60", merchantCity) + // merchant city
    tlv("62", tlv("05", tx)) + // additional data field template (txid)
    "6304"; // CRC placeholder

  const crc = crc16ccitt(payloadNoCrc);
  return payloadNoCrc + crc;
};
