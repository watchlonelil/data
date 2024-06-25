import { ofetch } from "ofetch";
import encrypt from "./encrypt";

try {
  const accounts = await ofetch(Bun.env.IPTV_LIST!);

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

  Bun.write(
    "./data/iptv.json",
    JSON.stringify(
      await encrypt(
        Bun.env.PRIVATE_AES_KEY!,
        JSON.stringify(data.filter(Boolean))
      )
    )
  );
} catch (error) {
  if (!Bun.env.CI) console.error(error);
  process.exit(1);
}
