import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import { hostname } from "./util";

const getSnapName = (seasonId: number, episodeInSeason: number, time: string) =>
  `s${seasonId}e${episodeInSeason}t${time.replace(/\W/g, "_")}.jpg`;

export const genSnap = async (
  seasonId: number,
  episodeInSeason: number,
  time: string
) => {
  const snapName = getSnapName(seasonId, episodeInSeason, time);
  if (fs.existsSync(`data/snaps/${snapName}`)) {
    return `${hostname}/snaps/${snapName}`;
  }

  const sources = fs.readdirSync("data/source");
  const episodeRegex = new RegExp(`S0?${seasonId}E0?${episodeInSeason}`);
  const source = sources.find((source) => episodeRegex.test(source));

  console.log(`- snap file: ${source}`);

  if (!source) {
    return "unavailable";
  }

  await new Promise((res, rej) => {
    ffmpeg(`data/source/${source}`)
      .seekInput(time)
      .takeFrames(1)
      .on("end", res)
      .on("error", rej)
      .save(`data/snaps/${snapName}`);
  });

  return `${hostname}/snaps/${snapName}`;
};
