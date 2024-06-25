import { webcrypto } from "crypto";

export default async function encrypt(privatekey: string, data: string) {
  const dataBuffer = new TextEncoder().encode(data);

  const iv = webcrypto.getRandomValues(new Uint8Array(16));

  const key = await webcrypto.subtle.importKey(
    "raw",
    Buffer.from(privatekey, "base64"),
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );

  const encrypted = await webcrypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    dataBuffer
  );

  const encryptedBase64 = Buffer.from(encrypted).toString("base64");
  const ivBase64 = Buffer.from(iv).toString("base64");

  return {
    iv: ivBase64,
    data: encryptedBase64,
  };
}
