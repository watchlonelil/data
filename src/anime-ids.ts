import { ofetch } from "ofetch";

const data = await ofetch(
  "https://cdn.jsdelivr.net/gh/Fribb/anime-lists@latest/anime-list-mini.json"
);

const filtered = data.filter((anime: any) => anime.anilist_id);
const tmdb_filtered = data.filter((anime: any) => anime.themoviedb_id);

for (const anime of filtered) {
  await Bun.write(
    `./data/anime-ids/${anime.anilist_id}.json`,
    JSON.stringify(anime)
  );
}

for (const anime of tmdb_filtered) {
  await Bun.write(
    `./data/tmdb-anime-ids/${anime.themoviedb_id}.json`,
    JSON.stringify(anime)
  );
}
