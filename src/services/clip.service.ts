import { existsSync, promises } from 'fs';

import { url } from '../utils';
import { Clip, Generation, Subtitle } from '../entities';
import { orm } from '../orm';
import { ends, getDataPath, tsToSeconds } from '../utils';
import { ffmpegService } from './ffmpeg.service';
import { join } from 'path';
import {
  MAX_CLIP_DURATION,
  MAX_SUBTITLE_LENGTH,
  CLIP_FILE_TYPES,
} from '../consts';
import { Snippet } from '../entities/snippet.entity';
import type { ObjectQuery } from '@mikro-orm/core';
import { splitCSV } from '../utils/split-csv';

interface ClipOptions {
  begin: number;
  end: number;
  offset?: number;
  extend?: number;
}

interface GenerationOptions {
  renderSubtitles?: boolean;
  filetype?: typeof CLIP_FILE_TYPES[number];
  resolution?: number;
  /* csv of substitution lines */
  substitutions?: string;
}

interface FindAllSnippetsOptions {
  sort_by?: 'created_at' | 'views' | 'episode_id';
  order?: 'asc' | 'desc';
  filter_by?: ObjectQuery<Snippet>;
  limit?: number;
  offset?: number;
}

interface FindAllClipsOptions {
  filetype: 'gif' | 'mp4';
  sort_by?: 'created_at' | 'views' | 'episode_id';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface SearchClipsOptions {
  term: string;
  offset?: number;
  limit?: number;
}

const defaultOptions = {
  subtitles: true,
  filetype: 'gif',
  resolution: 480,
} as const;

export const clipService = {
  async generate(
    clipOptions: ClipOptions,
    rawGenOptions: GenerationOptions = {}
  ) {
    const genOptions = { ...defaultOptions, ...rawGenOptions };

    if (!CLIP_FILE_TYPES.includes(genOptions.filetype)) {
      throw `Clip file type not supported: ${genOptions.filetype}`;
    }

    if (genOptions.resolution < 0 || genOptions.resolution > 720) {
      throw `Invalid resolution: ${genOptions.resolution}`;
    }

    const clip = await this.findClip(clipOptions);
    const episode = await clip.episode.load();

    const generationRepository = orm.em.getRepository(Generation);

    let generation = await generationRepository.findOne({
      clip: { uuid: clip.uuid },
      filetype: genOptions.filetype,
      renderSubtitles: genOptions.renderSubtitles ?? false,
      resolution: genOptions.resolution,
      substitutions: genOptions.substitutions ?? null,
    });

    if (generation && existsSync(getDataPath(generation.getFilepath()))) {
      return {
        clip,
        generation,
        renderTime: 0,
        subtitleCorrection: episode.subtitleCorrection / 1000,
      };
    }

    const subtitleRepository = orm.em.getRepository(Subtitle);

    const subtitles = await subtitleRepository.find({
      id: { $gte: clipOptions.begin, $lte: clipOptions.end },
    });

    const [first, last] = ends(subtitles);

    const source = episode.source;
    if (!source) {
      throw 'Episode not available';
    }

    let snapRenderTime = 0;
    if (!generation) {
      // create generation record

      const episodeSnapPath = getDataPath('jpg', episode.identifier);

      if (!existsSync(episodeSnapPath)) {
        await promises.mkdir(episodeSnapPath, { recursive: true });
      }

      const filename = Generation.getFilename(clip, genOptions);

      const snapshot = join(
        'jpg',
        episode.identifier,
        filename.replace(/\.[^.]+$/, '.jpg')
      );

      snapRenderTime = await ffmpegService.saveSnap({
        source,
        offset:
          tsToSeconds(first.timeBegin) +
          (clipOptions.offset ?? 0) +
          episode.subtitleCorrection / 1000,
        output: getDataPath(snapshot),
      });

      generation = generationRepository.create({
        clip,
        snapshot,
        ...genOptions,
        renderSubtitles: genOptions.renderSubtitles ?? false,
        copies: 0,
        views: 0,
      });
      generationRepository.persistAndFlush(generation);
    }

    const episodePath = getDataPath(genOptions.filetype, episode.identifier);

    if (!existsSync(episodePath)) {
      await promises.mkdir(episodePath, { recursive: true });
    }

    const abspath = getDataPath(generation.getFilepath());
    const vtt = await this.createVTT(
      subtitles,
      -tsToSeconds(first.timeBegin),
      genOptions.substitutions
        ? splitCSV(genOptions.substitutions).map((s) =>
            s === '~' ? undefined : s
          )
        : undefined
    );

    const subtitlePath = getDataPath(
      'vtt',
      `b${clipOptions.begin}e${clipOptions.end}.vtt`
    );

    await promises.writeFile(subtitlePath, vtt);

    const duration =
      (clipOptions.extend ?? 0) +
      tsToSeconds(last.timeEnd) -
      tsToSeconds(first.timeBegin);

    if (duration * 1000 > MAX_CLIP_DURATION) {
      throw `Snippet duration cannot exceed ${
        MAX_CLIP_DURATION / 1000
      } seconds: ${Math.floor(duration)}s`;
    }

    const renderTime = await ffmpegService.saveSnippet({
      source,
      offset:
        tsToSeconds(first.timeBegin) +
        (clipOptions.offset ?? 0) +
        episode.subtitleCorrection / 1000,
      duration,
      resolution: genOptions.resolution,
      subtitlePath: genOptions.subtitles ? subtitlePath : undefined,
      output: abspath,
    });

    return {
      clip,
      generation,
      renderTime,
      snapRenderTime,
      subtitleCorrection: episode.subtitleCorrection / 1000,
    };
  },

  async findClip(options: ClipOptions) {
    const clipRepository = orm.em.getRepository(Clip);

    const existing = await clipRepository.findOne({
      subtitleBegin: options.begin,
      subtitleEnd: options.end,
      offset: options.offset ?? 0,
      extend: options.extend ?? 0,
    });

    if (existing) {
      return existing;
    }

    const subtitleRepository = orm.em.getRepository(Subtitle);

    const subtitles = await subtitleRepository.find({
      id: { $gte: options.begin, $lte: options.end },
    });

    if (subtitles.length === 0) {
      throw 'Could not find subtitles in range';
    }

    if (
      subtitles[0]?.episode.id !== subtitles[subtitles.length - 1]?.episode.id
    ) {
      throw 'Cannot create clip from multiple episodes';
    }

    if (subtitles.length > MAX_SUBTITLE_LENGTH) {
      throw `Exceeds maximum ${MAX_SUBTITLE_LENGTH} subtitles allowed: ${subtitles.length}`;
    }

    const subtitleIndex = subtitles
      .map((subtitle) => subtitle.text.replaceAll(/[^\w\d]/g, ''))
      .join('')
      .toLowerCase();

    const clip = clipRepository.create({
      episode: subtitles[0]!.episode.id,
      subtitleBegin: options.begin,
      subtitleEnd: options.end,
      subtitleIndex,
      offset: options.offset ?? 0,
      extend: options.extend ?? 0,
    });
    subtitleRepository.persistAndFlush(clip);

    return clip;
  },

  async generateDefaults(clipOptions: ClipOptions) {
    await this.generate(clipOptions, {
      filetype: 'gif',
      renderSubtitles: true,
      resolution: 480,
    });
    await this.generate(clipOptions, {
      filetype: 'mp4',
      renderSubtitles: true,
      resolution: 480,
    });
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

  decodePath(filepath: string): {
    clipOptions: ClipOptions;
    genOptions: GenerationOptions;
  } {
    if (filepath.includes('_')) {
      throw 'Cannot decode options from path with substitutions';
    }

    const [
      matches,
      resolution,
      renderSubtitles,
      begin,
      end,
      offset,
      extend,
      filetype,
    ] =
      filepath.match(
        /^x(\d+)(s|ns)b(\d+)e(\d+)(?:~(-?\d+(?:\.\d+)?))?(?:\+(-?\d+(?:\.\d+)?))?\.(\w+)$/
      ) ?? [];

    if (!matches) {
      throw 'Failed to decode options from path';
    }

    return {
      clipOptions: {
        begin: Number(begin),
        end: Number(end),
        extend: extend ? Number(extend) : undefined,
        offset: offset ? Number(offset) : undefined,
      },
      genOptions: {
        resolution: Number(resolution),
        filetype: filetype as any,
        renderSubtitles: renderSubtitles !== 'ns',
      },
    };
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

  async random() {
    const [allRecords, count] = await orm.em
      .getRepository(Snippet)
      .findAndCount({ published: true });

    if (allRecords.length < 1) {
      return undefined;
    }

    const record = allRecords[Math.floor(Math.random() * count)]!;
    await record.subtitles.init();

    const { filepath, snapshot, ...snippet } = record;

    return {
      result: {
        ...snippet,
        url: url(filepath),
        snapshot: url(snapshot),
        subtitles: snippet.subtitles.getItems().map((subtitle) => ({
          id: subtitle.id,
          text: subtitle.text,
        })),
      },
    };
  },

  async getDefaultGeneration(clip: Clip, filetype: 'gif' | 'mp4') {
    const result = await this.generate(clip.getOptions(), {
      resolution: 480,
      renderSubtitles: filetype === 'gif',
      filetype: filetype,
    });
    return result.generation;
  },

  async getSubtitles(clip: Clip) {
    const subtitleRepository = orm.em.getRepository(Subtitle);
    const subtitles = await subtitleRepository.find({
      id: { $gte: clip.subtitleBegin, $lte: clip.subtitleEnd },
    });

    return subtitles.map((subtitle) => ({
      id: subtitle.id,
      text: subtitle.text,
    }));
  },

  async findAllClips(options: FindAllClipsOptions) {
    const [rawResults, count] = await orm.em.getRepository(Clip).findAndCount(
      { copies: { $gt: 0 } },
      {
        orderBy: { [options.sort_by ?? 'views']: options.order ?? 'desc' },
        limit: options.limit && options.limit < 100 ? options.limit : 10,
        offset: options.offset ?? 0,
      }
    );

    const results = await Promise.all(
      rawResults.map(async (clip) => {
        const generation = await this.getDefaultGeneration(
          clip,
          options.filetype
        );
        return {
          clip_uuid: clip.uuid,
          generation_uuid: generation.uuid,
          options: clip.getOptions(),
          views: Number(clip.views),
          copies: Number(clip.copies),
          episode_id: clip.episode.id,
          snapshot: url(generation.snapshot),
          url: url(generation.getFilepath()),
          subtitles: await this.getSubtitles(clip),
        };
      })
    );

    return { results, count };
  },

  async randomClip(options: GenerationOptions) {
    const [allRecords, count] = await orm.em
      .getRepository(Clip)
      .findAndCount({ copies: { $gt: 0 } });

    if (allRecords.length < 1) {
      return undefined;
    }

    const clip = allRecords[Math.floor(Math.random() * count)]!;

    return this.generate(clip.getOptions(), options);
  },

  async searchClips(options: SearchClipsOptions) {
    const [clips, count] = await orm.em.getRepository(Clip).findAndCount(
      {
        subtitleIndex: { $like: `%${options.term}%` },
        copies: { $gt: 0 },
      },
      {
        limit: options.limit,
        offset: options.offset,
        populate: ['episode'],
      }
    );

    const subtitleRepository = orm.em.getRepository(Subtitle);

    return [
      await Promise.all(
        clips.map(async (clip) => {
          const episode = clip.episode.get();

          const matchedSubtitles = await subtitleRepository.find({
            id: { $gte: clip.subtitleBegin, $lte: clip.subtitleEnd },
          });

          return {
            clip: {
              uuid: clip.uuid,
              subtitleBegin: clip.subtitleBegin,
              subtitleEnd: clip.subtitleEnd,
              offset: clip.offset,
              extend: clip.extend,
              views: clip.views,
              copies: clip.copies,
            },
            meta: {
              season_number: episode.season.id,
              season_title: episode.season.title,
              episode_title: episode.title,
              episode_number: episode.id,
              episode_in_season: episode.idInSeason,
            },
            lines: matchedSubtitles.map((subtitle) => subtitle.normalize()),
            thumbnail: url(
              (
                await this.generate(clip.getOptions(), {
                  filetype: 'gif',
                  renderSubtitles: true,
                  resolution: 120,
                })
              ).generation.getFilepath()
            ),
          };
        })
      ),
      count,
    ] as const;
  },

  async trackView(generation: Generation) {
    const generationRepository = orm.em.getRepository(Generation);
    generation.views++;
    generationRepository.persistAndFlush(generation);
  },

  async trackViewFromPath(path: string) {
    const clipRepository = orm.em.getRepository(Clip);
    const generationRepository = orm.em.getRepository(Generation);

    try {
      const { clipOptions, genOptions } = this.decodePath(path);
      const clip = await clipRepository.findOne({
        subtitleBegin: clipOptions.begin,
        subtitleEnd: clipOptions.end,
        offset: clipOptions.offset ?? 0,
        extend: clipOptions.extend ?? 0,
      });
      if (!clip) return;

      const generation = await generationRepository.findOne({
        clip: { uuid: clip.uuid },
        ...genOptions,
      });

      if (generation) {
        this.trackView(generation);
      }
    } catch (e) {
      console.error(e);
      return;
    }
  },

  async generateFromUrl(path: string) {
    const { clipOptions, genOptions } = this.decodePath(
      path.replace('.jpg', '.gif')
    );

    await this.generate(clipOptions, genOptions);
  },

  async trackCopy(uuid: string) {
    const generationRepository = orm.em.getRepository(Generation);
    const generation = await generationRepository.findOneOrFail({ uuid });
    generation.copies++;
    generationRepository.persistAndFlush(generation);
  },
};
