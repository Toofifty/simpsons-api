import { existsSync, promises } from 'fs';

import { config, url } from '../utils';
import { Subtitle } from '../entities';
import { orm } from '../orm';
import { ends, getDataPath, tsToSeconds } from '../utils';
import { ffmpegService } from './ffmpeg.service';
import { join } from 'path';
import {
  MAX_SNIPPET_DURATION,
  MAX_SUBTITLE_LENGTH,
  SNIPPET_FILE_TYPES,
} from '../consts';
import { Snippet } from '../entities/snippet.entity';
import type { ObjectQuery } from '@mikro-orm/core';
import { hash } from '../utils/hash';

interface GenSnippetOptions {
  subtitles?: boolean;
  offset?: number;
  extend?: number;
  filetype?: typeof SNIPPET_FILE_TYPES[number];
  resolution?: number;
  substitutions?: (string | undefined)[];
}

interface FindAllSnippetsOptions {
  sort_by?: 'created_at' | 'views' | 'episode_id';
  order?: 'asc' | 'desc';
  filter_by?: ObjectQuery<Snippet>;
  limit?: number;
  offset?: number;
}

const defaultOptions = {
  subtitles: true,
  filetype: 'gif',
  resolution: 240,
} as const;

export const snippetService = {
  async generate(
    beginSubtitleId: number,
    endSubtitleId: number,
    rawOptions: GenSnippetOptions = {}
  ) {
    const subtitleRepository = orm.em.getRepository(Subtitle);
    const snippetRepository = orm.em.getRepository(Snippet);

    const options = { ...defaultOptions, ...rawOptions };

    if (!SNIPPET_FILE_TYPES.includes(options.filetype)) {
      throw `Snippet file type not supported: ${options.filetype}`;
    }

    if (options.resolution < 0 || options.resolution > 720) {
      throw `Invalid resolution: ${options.resolution}`;
    }

    const filename = this.getName(beginSubtitleId, endSubtitleId, options);

    const subtitles = await subtitleRepository.find({
      id: { $gte: beginSubtitleId, $lte: endSubtitleId },
    });

    if (subtitles.length === 0) {
      throw 'Could not find phrase';
    }

    if (subtitles.length > MAX_SUBTITLE_LENGTH) {
      throw `Exceeds maximum ${MAX_SUBTITLE_LENGTH} subtitles allowed: ${subtitles.length}`;
    }

    if (
      subtitles[0]?.episode.id !== subtitles[subtitles.length - 1]?.episode.id
    ) {
      throw `Cannot create ${options.filetype} from multiple episodes`;
    }

    const episode = (await subtitles[0]!.episode.load())!;

    const source = episode.source;
    if (!source) {
      throw 'Episode not available';
    }

    const episodePath = getDataPath(options.filetype, episode.identifier);
    const filepath = join(options.filetype, episode.identifier, filename);

    if (!existsSync(episodePath)) {
      await promises.mkdir(episodePath, { recursive: true });
    }

    const abspath = getDataPath(filepath);
    const existingSnippet = await snippetRepository.findOne({ filepath });

    if (config('USE_CACHE') && existsSync(abspath) && existingSnippet) {
      existingSnippet.views++;
      await snippetRepository.persistAndFlush(existingSnippet);

      return {
        snippet: existingSnippet,
        renderTime: 0,
        subtitleCorrection: episode.subtitleCorrection / 1000,
      };
    }

    const [first, last] = ends(subtitles);

    const vtt = await this.createVTT(
      subtitles,
      -tsToSeconds(first.timeBegin),
      options.substitutions
    );

    const subtitlePath = getDataPath(
      'vtt',
      `b${beginSubtitleId}e${endSubtitleId}.vtt`
    );

    await promises.writeFile(subtitlePath, vtt);

    const duration =
      (options.extend ?? 0) +
      tsToSeconds(last.timeEnd) -
      tsToSeconds(first.timeBegin);

    if (duration * 1000 > MAX_SNIPPET_DURATION) {
      throw `Snippet duration cannot exceed ${
        MAX_SNIPPET_DURATION / 1000
      } seconds: ${Math.floor(duration)}s`;
    }

    const renderTime = await ffmpegService.saveSnippet({
      source,
      offset:
        tsToSeconds(first.timeBegin) +
        (options.offset ?? 0) +
        episode.subtitleCorrection / 1000,
      duration,
      resolution: options.resolution,
      subtitlePath: options.subtitles ? subtitlePath : undefined,
      output: abspath,
    });

    const episodeSnapPath = getDataPath('jpg', episode.identifier);

    if (!existsSync(episodeSnapPath)) {
      await promises.mkdir(episodeSnapPath, { recursive: true });
    }

    const snapshot = join(
      'jpg',
      episode.identifier,
      filename.replace(/\.[^.]+$/, '.jpg')
    );

    const snapTime = await ffmpegService.saveSnap({
      source,
      offset:
        tsToSeconds(first.timeBegin) +
        (options.offset ?? 0) +
        episode.subtitleCorrection / 1000,
      output: getDataPath(snapshot),
    });

    const snippet = await snippetRepository.upsert(
      { filepath },
      {
        episode,
        filepath,
        snapshot,
        options,
        subtitles,
        views: (existingSnippet?.views ?? 0) + 1,
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    return {
      snippet,
      renderTime,
      snapRenderTime: snapTime,
      subtitleCorrection: episode.subtitleCorrection / 1000,
    };
  },

  async createVTT(
    subtitles: Subtitle[],
    offset: number,
    substitutions?: (string | undefined)[]
  ) {
    return (
      'WEBVTT\n\n' +
      subtitles
        .map(
          (subtitle, i) =>
            `${subtitle.getTimeBegin(offset)} --> ${subtitle.getTimeEnd(
              offset
            )}\n${substitutions?.[i] ?? subtitle.text}`
        )
        .join('\n\n') +
      '\n'
    );
  },

  getName(
    beginSubtitleId: number,
    endSubtitleId: number,
    options: GenSnippetOptions
  ) {
    return `x${options.resolution}${
      options.subtitles ? 's' : 'ns'
    }b${beginSubtitleId}e${endSubtitleId}${
      options.offset ? `~${options.offset}` : ''
    }${options.extend ? `+${options.extend}` : ''}${
      options.substitutions && options.substitutions.length > 0
        ? '_' + hash(options.substitutions.join(','))
        : ''
    }.${options.filetype}`;
  },

  async publish(uuid: string) {
    const snippetRepository = orm.em.getRepository(Snippet);
    const snippet = await snippetRepository.findOne(uuid);

    if (!snippet) {
      throw 'Snippet not found';
    }

    if (snippet.filepath.includes('_')) {
      throw 'Snippets with substitutions cannot be published';
    }

    snippet.published = true;
    await snippetRepository.persistAndFlush(snippet);
  },

  async findAll(options: FindAllSnippetsOptions) {
    const [rawResults, count] = await orm.em
      .getRepository(Snippet)
      .findAndCount(
        { ...(options.filter_by ?? {}), published: true },
        {
          orderBy: { [options.sort_by ?? 'views']: options.order ?? 'desc' },
          populate: ['subtitles'],
          limit: options.limit && options.limit < 100 ? options.limit : 10,
          offset: options.offset ?? 0,
        }
      );

    const results = rawResults.map(({ filepath, snapshot, ...snippet }) => ({
      ...snippet,
      url: url(filepath),
      snapshot: url(snapshot),
      subtitles: snippet.subtitles.getItems().map((subtitle) => ({
        id: subtitle.id,
        text: subtitle.text,
      })),
    }));

    return { results, count };
  },
};
