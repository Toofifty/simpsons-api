import { dbcon } from "./db";
import { genSnap } from "./gen-snap";

type FindQuoteOptions = {
  term: string;
  season?: number;
  episode?: number;
  seasonEpisode?: number;
  padding?: number;
  snap?: boolean;
};

const clean = (term: string) => term.replace(/\W+/g, "").toLowerCase();

const pruneResponseRecord = (record: any) => ({
  id: record.id,
  episode_id: record.episode_id,
  time_begin: record.time_begin,
  time_end: record.time_end,
  text: record.text,
});

export const findQuote = async (options: FindQuoteOptions) => {
  if (!options.padding) {
    options.padding = 5;
  }

  const term = clean(options.term);

  console.log("REQUEST", options);

  let extraClause = "";

  if (options.season) {
    extraClause = `and season_id = ${options.season}`;
    if (options.seasonEpisode) {
      extraClause += ` and id_in_season = ${options.seasonEpisode}`;
    }
  } else if (options.episode) {
    extraClause = `and id = ${options.episode}`;
  }

  // load db
  const db = await dbcon;

  // first step - search episode indices for term
  const [episodes] = await db.execute(`
    select episodes.*, seasons.title as season, seasons.id as season_id from episodes
    join seasons on episodes.season_id = seasons.id
    where subtitle_index like '%${term}%'
    ${extraClause}
  `);

  const matches: number = episodes.length;

  console.log("- matches:", matches);

  if (matches === 0) {
    return { matches };
  }

  // TODO: better way to determine best match?
  const [bestMatch] = episodes;

  console.log("- best:", bestMatch.title);

  // second step - use index values from first search
  // to locate subtitle records
  const beginIndex = bestMatch.subtitle_index.indexOf(term);
  const endIndex = beginIndex + term.length;

  const [matchedSubtitles] = await db.execute(`
    select * from subtitles
    where episode_id = ${bestMatch.id}
    and (
        -- start
        (index_begin <= ${beginIndex}
        and index_end > ${beginIndex})
        or
        -- middle
        (index_begin >= ${beginIndex}
        and index_end <= ${endIndex})
        or
        -- end
        (index_begin < ${endIndex}
        and index_end >= ${endIndex})
    )
    order by id asc
  `);

  console.log("- subtitle count:", matchedSubtitles.length);

  // third step - get `padding` subtitles from before and
  // after matched range
  const matchedIds = matchedSubtitles.map(({ id }: any) => id);
  const maxId = Math.max(...matchedIds);
  const minId = Math.min(...matchedIds);

  const [beforeSubtitles] = await db.execute(`
    select * from subtitles
    where id < ${minId}
    order by id desc
    limit ${options.padding}
  `);

  const [afterSubtitles] = await db.execute(`
    select * from subtitles
    where id > ${maxId}
    order by id asc
    limit ${options.padding}
  `);

  const response = {
    matches,
    best: {
      data: {
        season: bestMatch.season,
        episode: bestMatch.id,
        episode_in_season: bestMatch.id_in_season,
        episode_title: bestMatch.title,
      },
      lines: matchedSubtitles.map(pruneResponseRecord),
      before: beforeSubtitles.map(pruneResponseRecord).reverse(),
      after: afterSubtitles.map(pruneResponseRecord),
    },
  };

  if (options.snap) {
    (response.best.data as any).snap = await genSnap(
      bestMatch.season_id,
      bestMatch.id_in_season,
      matchedSubtitles[0].time_begin
    );
  }

  return response;
};
