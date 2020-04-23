import { dbcon } from "db";

export const findStats = async () => {
  const db = await dbcon;

  const [[episodeStats]] = await db.execute(`
    select count(id) as episodes_indexed
    from episodes
  `);

  const [[subtitlesStats]] = await db.execute(`
    select count(id) as subtitles_indexed
    from subtitles
  `);

  return { ...episodeStats, ...subtitlesStats };
};
