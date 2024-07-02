import { ofetch } from "ofetch";

const data = await ofetch(
  "https://cdn.jsdelivr.net/gh/Fribb/anime-lists@latest/anime-list-mini.json"
);

const filtered = data.filter((anime: any) => anime.anilist_id);

for (const anime of filtered) {
  await Bun.write(
    `./data/anime-ids/${anime.anilist_id}.json`,
    JSON.stringify(anime)
  );
}
