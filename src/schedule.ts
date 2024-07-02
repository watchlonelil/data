import { ofetch } from "ofetch";
import encrypt from "./encrypt";
import decrypt from "./decrypt";
import { load } from "cheerio";
import UserAgent from "user-agents";
import JSON5 from "json5";
import { capitalize } from "./utils";
import { channels } from "./channels";

const filePath = "./data/schedule-july-2024.json";
const file = Bun.file(filePath);

const valorant = ofetch.create({
  baseURL: process.env.CI
    ? "http://localhost:3001"
    : "https://vlrggapi.vercel.app",
});

type Channel = {
  id: string;
  name: string;
};

type Event = {
  name: string;
  time: number;
  channels: Channel[];
};

type Schedule = {
  name: string;
  isScoresEnabled: boolean;
  events: Event[];
};

try {
  let existing = null;
  if (await file.exists()) {
    existing = await decrypt(await file.text(), Bun.env.PUBLIC_AES_KEY!);
  }

  let results: Schedule[] = [];

  try {
    const data = await ofetch(Bun.env.SCHEDULE_API!, {
      headers: {
        Referer: Bun.env.SCHEDULE_API_REFERER!,
        "User-Agent": new UserAgent().toString(),
      },
    });
    const schedule: any = Object.values(data)[0];
    Object.entries(schedule).forEach(([key, value]) => {
      results.push({
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
      });
    });
  } catch (error) {
    if (!Bun.env.CI) console.error("tv1", error);
  }

  try {
    const page = await ofetch(Bun.env.SPORTS_API!, {
      headers: {
        "User-Agent": new UserAgent().toString(),
      },
    });
    const dataRegex = /const data = (\[.*?\]);/s;
    const match = page.match(dataRegex);
    const dataString = match[1];

    const data = JSON5.parse(dataString);
    const events = data[1].data.liveMatches;

    for (const event of events) {
      const category = capitalize(event.category);
      const existing = results.find((r) => r.name === category);

      const body = {
        name: event.title,
        time: event.date,
        channels: [{ id: `sport/${event.id}`, name: event.title }],
      };

      if (existing) {
        existing.events.push(body);
      } else {
        results.push({
          name: category,
          isScoresEnabled: true,
          events: [body],
        });
      }
    }
  } catch (error) {
    if (!Bun.env.CI) console.error("sports", error);
  }

  try {
    const matches = (
      await Promise.all([
        ...(
          await valorant("/match", {
            query: {
              q: "live_score",
            },
          })
        ).data.segments,
        ...(
          await valorant("/match", {
            query: {
              q: "upcoming",
            },
          })
        ).data.segments,
      ])
    ).sort((a, b) => {
      return (
        new Date(`${a.unix_timestamp} UTC`).getTime() -
        new Date(`${b.unix_timestamp} UTC`).getTime()
      );
    });

    results.push({
      name: "VALORANT",
      isScoresEnabled: false,
      events: await Promise.all(
        matches.map(async (match: any) => {
          const date = new Date(`${match.unix_timestamp} UTC`);
          const page = await ofetch(match.match_page);
          const $ = load(page);
          const streams = await Promise.all(
            $(".match-streams-container .wf-card")
              .filter(
                (_, element) =>
                  !!$(element).find(".match-streams-btn-embed span").text()
              )
              .map(async (_, element) => {
                let name = $(element)
                  .find(".match-streams-btn-embed span")
                  .text()
                  .trim();
                let id = $(element)
                  .find(".match-streams-btn-external")
                  .attr("href")!;

                if (name && !id) {
                  name = $(element)
                    .find(".match-streams-btn-embed span")
                    .text()
                    .trim();
                  id = $(element).attr("href")!;
                }

                return { name, id };
              })
              .get()
          );

          return {
            name: `${match.team1} vs ${match.team2} - ${match.match_event}`,
            time: date.getTime(),
            channels: streams,
          };
        })
      ),
    });
  } catch (error) {
    if (!Bun.env.CI) console.error("valorant", error);
  }

  if (Bun.hash(JSON.stringify(results)) === Bun.hash(existing!)) {
    console.log("No changes");
    process.exit(0);
  }

  Bun.write(
    filePath,
    JSON.stringify(
      await encrypt(Bun.env.PUBLIC_AES_KEY!, JSON.stringify(results))
    )
  );
} catch (error) {
  if (!Bun.env.CI) console.error(error);
  process.exit(1);
}
