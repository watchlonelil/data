import "dotenv/config";
import { writeFileSync } from "fs";
import { channels } from "./channels";
import { webcrypto } from "crypto";
import { ofetch } from "ofetch";
import { load } from "cheerio";

async function run() {
  const data = await fetch(process.env.SCHEDULE_API!, {
    headers: {
      Referer: process.env.SCHEDULE_API_REFERER!,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    },
  }).then((res) => res.json());

  const schedule: any = Object.values(data)[0];

  let results = Object.entries(schedule).map(([key, value]) => {
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
                  ? `tv/1/${(cha + 1).toString()}`
                  : `tv/other/${channel.channel_name}/${channel.channel_id}`,
              name: channel.channel_name,
            };
          }),
        };
      }),
    };
  });

  // Concerts - Eras Tour

  try {
    const erasTourPage = await ofetch("https://tstheerastour.taylorswift.com/");
    const $ = load(erasTourPage);
    const raw = JSON.parse($("script#__NEXT_DATA__").text());
    const shows = raw.props.pageProps.data.shows;
    results.push({
      name: "Taylor Swift: The Eras Tour",
      isScoresEnabled: false,
      events: shows
        .filter(
          (show: any) =>
            new Date(show.date).toDateString() === new Date().toDateString()
        )
        .map((show: any) => ({
          name: show.show,
          time: new Date(show.date),
          channels: [
            {
              id: "event/eras-tour",
              name: "Taylor Swift: The Eras Tour",
            },
          ],
        })),
    });
  } catch (err) {
    console.error("Eras Tour Error", err);
  }

  const dataBuffer = new TextEncoder().encode(JSON.stringify(results));

  const iv = webcrypto.getRandomValues(new Uint8Array(16));

  const key = await webcrypto.subtle.importKey(
    "raw",
    Buffer.from(process.env.PUBLIC_AES_KEY!, "base64"),
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
    "./schedule.json",
    JSON.stringify({
      iv: ivBase64,
      data: encryptedBase64,
    })
  );
}

run();
