import { webcrypto } from "crypto";
import "dotenv/config";
import { writeFileSync } from "fs";
import { ofetch } from "ofetch";

async function run() {
  const accounts = await fetch(process.env.IPTV_LIST!).then((res) =>
    res.json()
  );

  const data = await Promise.all(
    accounts.user.map(async (item: any) => {
      try {
        const login = await ofetch(
          `${item.Website}/player_api.php?username=${item.Username}&password=${item.Password}&type=m3u_plus&output=ts`,
          {
            timeout: 3000,
          }
        );

        return {
          host: item.Website,
          username: item.Username,
          password: item.Password,
          created_at: login.created_at,
          exp_date: login.exp_date,
        };
      } catch (err) {}
      return null;
    })
  );

  const dataBuffer = new TextEncoder().encode(
    JSON.stringify(data.filter(Boolean))
  );

  const iv = webcrypto.getRandomValues(new Uint8Array(16));

  const key = await webcrypto.subtle.importKey(
    "raw",
    Buffer.from(process.env.PRIVATE_AES_KEY!, "base64"),
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

  writeFileSync(
    "./iptv.json",
    JSON.stringify({
      iv: ivBase64,
      data: encryptedBase64,
    })
  );
}

run();
