import { ofetch } from "ofetch";
import UserAgent from "user-agents";
import { load } from "cheerio";
import encrypt from "../../encrypt";
import decrypt from "../../decrypt";

const id = "345";
const filePath = `./data/tv1-domain.json`;
const file = Bun.file(filePath);

try {
  let existing = null;
  if (await file.exists()) {
    existing = await decrypt(await file.text(), Bun.env.PUBLIC_AES_KEY!);
  }

  const fetcher = ofetch.create({
    headers: {
      "User-Agent": new UserAgent().toString(),
    },
  });

  const page = await fetcher(
    `${Bun.env.SCHEDULE_API_REFERER}stream/stream-${id}.php`
  );
  const page$ = await load(page);

  const playerIframe = page$("iframe")
    //@ts-expect-error
    .filter((_index, element) => {
      const src = page$(element).attr("src");
      return src && src.includes(id);
    })
    .first();

  const playerUrl = playerIframe.attr("src");

  const player = await fetcher(playerUrl!, {
    headers: {
      Referer: Bun.env.SCHEDULE_API_REFERER!,
    },
  });

  const stream = player.match(/source:\s*'([^']+)'/)![1];
  const final = stream.replace(id, "__STREAM_ID__");

  const body = {
    url: final,
    player: new URL(playerUrl!).origin,
  };

  const bodyString = JSON.stringify(body);

  if (Bun.hash(bodyString) === Bun.hash(existing!)) {
    console.log("No changes");
    process.exit(0);
  }

  Bun.write(
    filePath,
    JSON.stringify(await encrypt(Bun.env.PUBLIC_AES_KEY!, bodyString))
  );
} catch (error) {
  if (!Bun.env.CI) console.error(error);
  process.exit(1);
}
