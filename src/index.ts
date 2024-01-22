import "dotenv/config";
import { writeFileSync } from "fs";
import { channels } from "./channels";
import { webcrypto } from "crypto";

async function run() {
  const data = await fetch(process.env.SCHEDULE_API!, {
    headers: {
      Referer: process.env.SCHEDULE_API_REFERER!,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    },
  }).then((res) => res.json());

  const schedule: any = Object.values(data)[0];

  const results = Object.entries(schedule).map(([key, value]) => {
    return {
      name: key.replaceAll("Tv", "TV"),
      isScoresEnabled: !["tv shows"].includes(key.toLowerCase()),
      events: (value as any[]).map((event: any) => {
        const dateObj = new Date();
        const timeParts = event.time.split(":");
        dateObj.setUTCHours(timeParts[0], timeParts[1], 0, 0);

        return {
          name: event.event.replaceAll("amp;", ""),
          time: dateObj.getTime(),
          channels: event.channels.map((channel: any) => {
            const cha = channels.findIndex(
              (c: any) => c.id === channel.channel_id
            );
            return {
              id:
                cha !== -1
                  ? (cha + 1).toString()
                  : `other/${channel.channel_name}/${channel.channel_id}`,
              name: channel.channel_name,
            };
          }),
        };
      }),
    };
  });

  const dataBuffer = new TextEncoder().encode(JSON.stringify(results));

  const iv = webcrypto.getRandomValues(new Uint8Array(16));

  const key = await webcrypto.subtle.importKey(
    "raw",
    Buffer.from(process.env.AES_KEY!, "base64"),
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
    "./data.json",
    JSON.stringify({
      iv: ivBase64,
      data: encryptedBase64,
    })
  );
}

run();
