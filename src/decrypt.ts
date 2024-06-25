import { webcrypto } from "crypto";

export default async function decrypt(text: string, privateKey: string) {
  const data = JSON.parse(text);
  const key = await webcrypto.subtle.importKey(
    "raw",
    Buffer.from(privateKey, "base64"),
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );

  const encrypted = Buffer.from(data.data, "base64");
  const iv = Buffer.from(data.iv, "base64");

  const decrypted = await webcrypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}
