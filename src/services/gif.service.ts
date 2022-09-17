import { existsSync, writeFileSync } from 'fs';

import { config } from '../utils';
import { Episode, Subtitle } from '../entities';
import { orm } from '../orm';
import { ends, getDataPath, tsToSeconds } from '../utils';
import { ffmpegService } from './ffmpeg.service';

interface GenGifOptions {
  subtitles?: boolean;
  offset?: number;
  extend?: number;
}

const defaultOptions: Partial<GenGifOptions> = {
  subtitles: true,
};

export const gifService = {
  async generate(
    beginSubtitleId: number,
    endSubtitleId: number,
    rawOptions: GenGifOptions = {}
  ) {
    const options = { ...defaultOptions, ...rawOptions };

    const subtitleRepository = orm.em.getRepository(Subtitle);
    const episodeRepository = orm.em.getRepository(Episode);
    const filename = this.getName(beginSubtitleId, endSubtitleId, options);

    if (config('USE_CACHE') && existsSync(getDataPath('gifs', filename))) {
      return { filename, renderTime: 0 };
    }

    const subtitles = await subtitleRepository.find({
      id: { $gte: beginSubtitleId, $lte: endSubtitleId },
    });

    if (subtitles.length === 0) {
      throw 'Could not find phrase';
    }

    if (subtitles.length > 50) {
      throw 'Gif would be too long';
    }

    if (
      subtitles[0]?.episode.id !== subtitles[subtitles.length - 1]?.episode.id
    ) {
      throw 'Cannot create gif from multiple episodes';
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

    const renderTime = await ffmpegService.saveGif({
      source,
      offset:
        tsToSeconds(first.timeBegin) +
        (options.offset ?? 0) +
        episode.subtitleCorrection / 1000,
      duration:
        (options.extend ?? 0) +
        tsToSeconds(last.timeEnd) -
        tsToSeconds(first.timeBegin),
      subtitlePath: options.subtitles ? subtitlePath : undefined,
      output: filename,
    });

    return { filename, renderTime };
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
    options: GenGifOptions
  ) {
    return `b${beginSubtitleId}e${endSubtitleId}${
      options.subtitles ? 's' : 'ns'
    }${options.offset ? `~${options.offset}` : ''}${
      options.extend ? `+${options.extend}` : ''
    }.gif`;
  },
};
