import ffmpeg from "fluent-ffmpeg";
import path from "path";
import * as fs from "fs";
import { dbcon } from "./db";
import { tsToSeconds, secondsToTS } from "./util";
import { env } from "./env";
import { Subtitle } from "./types";

const getGifName = (beginSubtitleId: number, endSubtitleId: number) =>
  `b${beginSubtitleId}e${endSubtitleId}.gif`;

const offsetSubtitles = (subtitles: Subtitle[], offset: number) =>
  subtitles.map((subtitle) => ({
    ...subtitle,
    time_begin: secondsToTS(tsToSeconds(subtitle.time_begin) + offset),
    time_end: secondsToTS(tsToSeconds(subtitle.time_end) + offset),
  }));

const createVTT = (subtitles: Subtitle[]) =>
  subtitles
    .map(
      ({ time_begin, time_end, text }) =>
        `${time_begin} --> ${time_end} line:90%,end\n${text}`
    )
    .join("\n\n");

export const genGif = async (
  beginSubtitleId: number,
  endSubtitleId: number
) => {
  const gifName = getGifName(beginSubtitleId, endSubtitleId);
  if (fs.existsSync(path.join(__dirname, env.DATA, "gifs", gifName))) {
    return gifName;
  }

  const db = await dbcon;

  const [subtitles] = await db.execute(`
    select * from subtitles
    where id >= ${beginSubtitleId}
    and id <= ${endSubtitleId}
    order by id asc
  `);

  if (subtitles.length === 0) {
    throw "Could not find phrase";
  }

  // TODO: pick better max
  if (subtitles.length > 10) {
    throw "Gif would be too long";
  }

  const episodeId = subtitles[0].episode_id;

  if (subtitles.some((subtitle: any) => subtitle.episode_id !== episodeId)) {
    throw "Cannot create gif from multiple episodes";
  }

  const [[episode]] = await db.execute(`
    select * from episodes
    where id = ${episodeId}
  `);

  const sources = fs.readdirSync(path.join(__dirname, env.DATA, "source"));
  const episodeRegex = new RegExp(
    `S0?${episode.season_id}E0?${episode.id_in_season}`
  );
  const source = sources.find((source) => episodeRegex.test(source));

  if (!source) {
    throw "That episode is not available";
  }

  const [first] = subtitles;
  const last = subtitles[subtitles.length - 1];

  const shiftedSubtitles = offsetSubtitles(
    subtitles,
    -tsToSeconds(first.time_begin)
  );
  const vtt = createVTT(shiftedSubtitles);

  const subtitlePath = (ext: string) =>
    path.join(
      __dirname,
      env.DATA,
      `b${beginSubtitleId}e${endSubtitleId}.${ext}`
    );

  fs.writeFileSync(subtitlePath("vtt"), vtt);

  await new Promise((res, rej) => {
    ffmpeg(subtitlePath("vtt"))
      .on("end", res)
      .on("error", rej)
      .save(subtitlePath("ass"));
  });

  await new Promise((res, rej) => {
    ffmpeg(path.join(__dirname, env.DATA, "source", source))
      .seekInput(first.time_begin)
      .duration(tsToSeconds(last.time_end) - tsToSeconds(first.time_begin))
      .videoFilters([
        "fps=15",
        "scale=320:-1:flags=lanczos",
        `ass=${subtitlePath("ass")}`,
      ])
      .on("end", res)
      .on("error", rej)
      .save(path.join(__dirname, env.DATA, "gifs", gifName));
  });

  return gifName;
};
