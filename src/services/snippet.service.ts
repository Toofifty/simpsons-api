import { existsSync, promises } from 'fs';

import { config } from '../utils';
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

interface GenSnippetOptions {
  subtitles?: boolean;
  offset?: number;
  extend?: number;
  filetype?: typeof SNIPPET_FILE_TYPES[number];
  resolution?: number;
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
    const options = { ...defaultOptions, ...rawOptions };

    if (!SNIPPET_FILE_TYPES.includes(options.filetype)) {
      throw `Snippet file type not supported: ${options.filetype}`;
    }

    if (options.resolution < 0 || options.resolution > 720) {
      throw `Invalid resolution: ${options.resolution}`;
    }

    const subtitleRepository = orm.em.getRepository(Subtitle);
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

    if (config('USE_CACHE') && existsSync(abspath)) {
      return {
        filepath,
        renderTime: 0,
        subtitleCorrection: episode.subtitleCorrection / 1000,
      };
    }

    const [first, last] = ends(subtitles);

    const vtt = await this.createVTT(subtitles, -tsToSeconds(first.timeBegin));

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

    console.log(
      tsToSeconds(first.timeBegin),
      options.offset ?? 0,
      episode.subtitleCorrection / 1000
    );

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

    return {
      filepath,
      renderTime,
      subtitleCorrection: episode.subtitleCorrection / 1000,
    };
  },

  async createVTT(subtitles: Subtitle[], offset: number) {
    return (
      'WEBVTT\n\n' +
      subtitles
        .map(
          (subtitle) =>
            `${subtitle.getTimeBegin(offset)} --> ${subtitle.getTimeEnd(
              offset
            )}\n${subtitle.text}`
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
    }${options.extend ? `+${options.extend}` : ''}.${options.filetype}`;
  },
};
