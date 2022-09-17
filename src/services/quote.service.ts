import { normalizeTerm } from '../utils';
import { orm } from '../orm';
import { Episode } from '../entities/episode.entity';
import { Subtitle } from '../entities';
import { genSnap } from '../gen-snap';

interface FindQuoteOptions {
  term: string;
  match?: number;
  season?: number;
  episode?: number;
  seasonEpisode?: number;
  padding?: number;
  snap?: boolean;
}

const defaultOptions = {
  match: 0,
  padding: 5,
};

export const quoteService = {
  async find(rawOptions: FindQuoteOptions) {
    const episodeRepository = orm.em.getRepository(Episode);
    const subtitleRepository = orm.em.getRepository(Subtitle);

    const term = rawOptions.term.split('[...]').map(normalizeTerm).join('%');

    const options = {
      ...defaultOptions,
      ...rawOptions,
      term,
    };

    const [[episode], matches] = await episodeRepository.search(options);

    if (!episode) {
      return { matches };
    }

    const [beginIndex, endIndex] = this.findIndices(episode, term);

    const matchedSubtitles = await subtitleRepository.findMatchedSubtitles({
      episodeId: episode.id,
      beginIndex,
      endIndex,
    });

    const matchedIds = matchedSubtitles.map(({ id }) => id);

    const previousSubtitles = await subtitleRepository.findPrevious({
      limit: options.padding,
      maxId: Math.max(...matchedIds),
    });

    const nextSubtitles = await subtitleRepository.findNext({
      limit: options.padding,
      minId: Math.min(...matchedIds),
    });

    return {
      meta: {
        match_number: options.match,
        total_matches: matches,
        season_number: episode.season.id,
        season_title: episode.season.title,
        episode_title: episode.title,
        episode_number: episode.id,
        episode_in_season: episode.idInSeason,
      },
      links: {
        next: 'http://',
      },
      snap: options.snap
        ? await genSnap(
            episode.season.id,
            episode.idInSeason,
            matchedSubtitles[0]?.timeBegin!
          )
        : undefined,
      matches: {
        lines: matchedSubtitles.map((subtitle) => subtitle.normalize()),
        before: previousSubtitles.map((subtitle) => subtitle.normalize()),
        after: nextSubtitles.map((subtitle) => subtitle.normalize()),
      },
    };
  },

  findIndices(episode: Episode, term: string) {
    const parts = term.split('%');

    if (parts.length === 1) {
      const index = episode.subtitleIndex.indexOf(term);
      return [index, index + term.length] as const;
    }

    const first = parts[0]!;
    const last = parts[parts.length - 1]!;
    const index = episode.subtitleIndex.indexOf(first);
    return [
      index,
      index + episode.subtitleIndex.slice(index).indexOf(last) + last.length,
    ] as const;
  },
};
