import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import path from "path";
import { hostname } from "./util";
import { env } from "./env";

const getSnapName = (seasonId: number, episodeInSeason: number, time: string) =>
  `s${seasonId}e${episodeInSeason}t${time.replace(/\W/g, "_")}.jpg`;

export const genSnap = async (
  seasonId: number,
  episodeInSeason: number,
  time: string
) => {
  const snapName = getSnapName(seasonId, episodeInSeason, time);
  if (fs.existsSync(path.join(__dirname, env.DATA, "snaps", snapName))) {
    return `${hostname}/snaps/${snapName}`;
  }

  const sources = fs.readdirSync(path.join(__dirname, env.DATA, "source"));
  const episodeRegex = new RegExp(`S0?${seasonId}E0?${episodeInSeason}`);
  const source = sources.find((source) => episodeRegex.test(source));

  console.log(`- snap file: ${source}`);

  if (!source) {
    return "unavailable";
  }

  await new Promise((res, rej) => {
    ffmpeg(path.join(__dirname, env.DATA, "source", source))
      .seekInput(time)
      .takeFrames(1)
      .on("end", res)
      .on("error", rej)
      .save(path.join(__dirname, env.DATA, "snaps", snapName));
  });

  return `${hostname}/snaps/${snapName}`;
};
