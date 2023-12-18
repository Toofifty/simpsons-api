import { URL } from 'url';

import { url, normalizeTerm, tsToSeconds } from '../utils';
import { orm } from '../orm';
import { Episode } from '../entities/episode.entity';
import { Subtitle } from '../entities';
import { snapService } from './snap.service';
import {
  DEFAULT_SUBTITLE_MATCH_LIMIT,
  MIN_TERM_LENGTH,
  SNAP_FILE_TYPES,
} from '../consts';
import { Loaded } from '@mikro-orm/core';

interface FindQuoteOptions {
  term: string;
  match?: number;
  season?: number;
  episode?: number;
  seasonEpisode?: number;
  padding?: number;
  snap?: boolean;
  snapFiletype?: typeof SNAP_FILE_TYPES[number];
}

interface QuoteInfoOptions {
  begin: number;
  end: number;
  padding?: number;
}

interface SearchQuoteOptions {
  term: string;
  offset?: number;
  limit?: number;
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
      return { meta: { total_matches: matches } };
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
      maxId: Math.min(...matchedIds),
    });

    const nextSubtitles = await subtitleRepository.findNext({
      limit: options.padding,
      minId: Math.max(...matchedIds),
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
        subtitle_correction: episode.subtitleCorrection,
      },
      links: {
        ...(options.match > 0 && {
          previous_match: this.getUrl({
            ...rawOptions,
            match: options.match - 1,
          }),
        }),
        ...(options.match < matches - 1 && {
          next_match: this.getUrl({ ...rawOptions, match: options.match + 1 }),
        }),
      },
      snap: options.snap
        ? await snapService.generate({
            seasonId: episode.season.id,
            episodeInSeason: episode.idInSeason,
            time: tsToSeconds(matchedSubtitles[0]?.timeBegin!),
            filetype: options.snapFiletype,
          })
        : undefined,
      matches: {
        before: previousSubtitles.map((subtitle) => subtitle.normalize()),
        lines: matchedSubtitles.map((subtitle) => subtitle.normalize()),
        after: nextSubtitles.map((subtitle) => subtitle.normalize()),
      },
    };
  },

  async findContext({ begin, end, padding = 5 }: QuoteInfoOptions) {
    const subtitleRepository = orm.em.getRepository(Subtitle);

    const subtitles = await subtitleRepository.find({
      id: { $gte: begin, $lte: end },
    });

    if (subtitles.length === 0) {
      throw `No subtitles found for range ${begin} - ${end}`;
    }

    const episode = await subtitles[0]!.episode.load();

    const previousSubtitles = await subtitleRepository.findPrevious({
      limit: padding,
      maxId: begin,
    });

    const nextSubtitles = await subtitleRepository.findNext({
      limit: padding,
      minId: end,
    });

    return {
      meta: {
        season_number: episode.season.id,
        season_title: episode.season.title,
        episode_title: episode.title,
        episode_number: episode.id,
        episode_in_season: episode.idInSeason,
        subtitle_correction: episode.subtitleCorrection,
      },
      matches: {
        before: previousSubtitles.map((subtitle) => subtitle.normalize()),
        lines: subtitles.map((subtitle) => subtitle.normalize()),
        after: nextSubtitles.map((subtitle) => subtitle.normalize()),
      },
    };
  },

  async search(options: SearchQuoteOptions) {
    const episodeRepository = orm.em.getRepository(Episode);
    const subtitleRepository = orm.em.getRepository(Subtitle);

    const offset = options.offset ?? 0;
    const limit = options.limit ?? DEFAULT_SUBTITLE_MATCH_LIMIT;

    const term = options.term.split('[...]').map(normalizeTerm).join('%');

    if (term.length < MIN_TERM_LENGTH) {
      throw `Minimum search length is ${MIN_TERM_LENGTH} characters`;
    }

    // contains all episodes with one or more of the term appearing
    // in it's transcript
    const [episodes, episodesMatched] = await episodeRepository.search({
      term,
      offset,
    });

    if (episodesMatched === 0) {
      return { total_results: 0, matches: [] };
    }

    // find all subtitle matches first
    const allSubtitleMatches = episodes.flatMap((episode) => {
      const episodeMatches: {
        episode: Loaded<Episode, 'season'>;
        beginIndex: number;
        endIndex: number;
      }[] = [];
      let [beginIndex, endIndex] = this.findIndices(episode, term);
      while (beginIndex > -1 && endIndex > -1) {
        episodeMatches.push({
          episode,
          beginIndex,
          endIndex,
        });

        [beginIndex, endIndex] = this.findIndices(episode, term, endIndex);
      }

      return episodeMatches;
    });

    const subtitleMatches = allSubtitleMatches.slice(offset, offset + limit);

    const matches = await Promise.all(
      subtitleMatches.map(async ({ episode, beginIndex, endIndex }) => {
        const matchedSubtitles = await subtitleRepository.findMatchedSubtitles({
          episodeId: episode.id,
          beginIndex,
          endIndex,
        });

        const matchedIds = matchedSubtitles.map(({ id }) => id);

        const previousSubtitles = await subtitleRepository.findPrevious({
          limit: 1,
          maxId: Math.min(...matchedIds),
        });

        const nextSubtitles = await subtitleRepository.findNext({
          limit: 1,
          minId: Math.max(...matchedIds),
        });

        return {
          meta: {
            season_number: episode.season.id,
            season_title: episode.season.title,
            episode_title: episode.title,
            episode_number: episode.id,
            episode_in_season: episode.idInSeason,
          },
          before: previousSubtitles.map((subtitle) => subtitle.normalize()),
          lines: matchedSubtitles.map((subtitle) => subtitle.normalize()),
          after: nextSubtitles.map((subtitle) => subtitle.normalize()),
          thumbnail: await snapService.generateThumbnail({
            seasonId: episode.season.id,
            episodeInSeason: episode.idInSeason,
            time: tsToSeconds(matchedSubtitles[0].timeBegin),
          }),
        };
      })
    );

    matches.sort((a, b) => a.lines[0]!.id - b.lines[0]!.id);

    return {
      total_results: allSubtitleMatches.length,
      offset,
      limit,
      remaining: allSubtitleMatches.length - (offset + limit),
      matches,
    };
  },

  findIndices(episode: Episode, term: string, after: number = 0) {
    const parts = term.split('%');
    const subtitleIndex = episode.subtitleIndex.slice(after);

    if (parts.length === 1) {
      const index = subtitleIndex.indexOf(term);
      if (index === -1) {
        return [-1, -1];
      }
      return [after + index, after + index + term.length] as const;
    }

    const first = parts[0]!;
    const last = parts[parts.length - 1]!;
    const index = subtitleIndex.indexOf(first);
    const endIndex = subtitleIndex.slice(index).indexOf(last);
    if (index === -1 || endIndex === -1) {
      return [-1, -1];
    }
    return [after + index, after + index + endIndex + last.length] as const;
  },

  getUrl(options: FindQuoteOptions) {
    const uri = new URL(url('quote'));
    Object.entries(options).forEach(([key, value]) => {
      uri.searchParams.set(key, value.toString());
    });
    return uri.toString();
  },
};
