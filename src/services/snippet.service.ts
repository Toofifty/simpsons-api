import { existsSync, writeFileSync } from 'fs';

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

    const subtitleRepository = orm.em.getRepository(Subtitle);
    const filename = this.getName(beginSubtitleId, endSubtitleId, options);
    const filepath = join(options.filetype, filename);
    const abspath = getDataPath(filepath);

    if (config('USE_CACHE') && existsSync(abspath)) {
      return { filepath, renderTime: 0 };
    }

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

    const episode = (await subtitles[0]?.episode.load())!;
    const source = episode.source;

    if (!source) {
      throw 'Episode not available';
    }

    const [first, last] = ends(subtitles);

    const vtt = await this.createVTT(subtitles, -tsToSeconds(first.timeBegin));

    const subtitlePath = getDataPath(
      'vtt',
      `b${beginSubtitleId}e${endSubtitleId}.vtt`
    );

    writeFileSync(subtitlePath, vtt);

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
      subtitlePath: options.subtitles ? subtitlePath : undefined,
      output: abspath,
    });

    return { filepath, renderTime };
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
    return `b${beginSubtitleId}e${endSubtitleId}${
      options.subtitles ? 's' : 'ns'
    }${options.offset ? `~${options.offset}` : ''}${
      options.extend ? `+${options.extend}` : ''
    }.${options.filetype}`;
  },
};
