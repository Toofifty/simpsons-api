import { Response, Router } from 'express';
import { unflatten } from 'flat';
import { MAX_SUBTITLE_MATCH_LIMIT, CLIP_FILE_TYPES } from './consts';
import {
  episodeService,
  logService,
  quoteService,
  clipService,
  statsService,
} from './services';
import { getDataPath, removeEmpty, url } from './utils';
import validators from './validators';

export const router = Router();

const json = (res: Response, data: Record<string, any>) => {
  const responseTime = Date.now() - (res.req as any).start;
  try {
    logService.logRequest(res, 200, responseTime, data['render_time']);
  } catch {
    // may fail due to long request url
  }

  return res.send({
    status: 200,
    response_time: responseTime,
    data,
  });
};

const error = (res: Response, message: string | object, status = 500) => {
  const responseTime = Date.now() - (res.req as any).start;
  logService.logRequest(res, status, responseTime);

  return res.status(status).send({
    status,
    response_time: responseTime,
    error: message,
  });
};

router.get('/', async (_, res) => {
  return json(res, await statsService.getAll());
});

router.get('/logs', async (req, res) => {
  const result = validators.logs.findAll.safeParse(unflatten(req.query));

  if (!result.success) {
    return error(res, result.error.flatten(), 422);
  }

  const [logs, total] = await logService.viewAll({
    filter: req.query['filter']?.toString(),
    offset: Number(req.query['offset']),
    limit: Number(req.query['limit']),
  });
  return json(res, { total, logs });
});

router.get('/episode', async (_, res) => {
  return json(res, await episodeService.findAll());
});

router.post('/episode/correction', async (req, res) => {
  try {
    if (!req.body) {
      throw 'No body';
    }

    if (req.body['passcode'] !== process.env['PASSCODE']) {
      throw 'Invalid passcode';
    }

    await episodeService.makeCorrection(req.body['id'], req.body['correction']);
    await episodeService.purgeSnippets(req.body['id']);
  } catch (e) {
    if (typeof e === 'string') return error(res, e, 400);
    throw e;
  }

  return json(res, {
    message: 'Correction applied, and existing episode clips have been purged',
  });
});

router.get('/quote', async (req, res) => {
  if (!req.query['term']) {
    return error(res, '`term` field is required', 422);
  }

  return json(
    res,
    await quoteService.find(
      removeEmpty({
        term: req.query['term'].toString(),
        season: Number(req.query['season']),
        episode: Number(req.query['episode']),
        seasonEpisode: Number(req.query['season_episode']),
        padding: Number(req.query['padding']),
        match: Number(req.query['match']),
        snap: !!req.query['snap'] || undefined,
        snapFiletype: req.query['snap_filetype'] as any,
      })
    )
  );
});

router.get('/context', async (req, res) => {
  if (!req.query['begin']) {
    return error(res, 'either `term` or `begin` field is required', 422);
  }

  if (!req.query['end']) {
    return error(res, 'either `term` or `end` field is required', 422);
  }

  return json(
    res,
    await quoteService.findContext(
      removeEmpty({
        begin: Number(req.query['begin']),
        end: Number(req.query['end']),
        padding: Number(req.query['padding']),
      })
    )
  );
});

router.get('/search', async (req, res) => {
  if (!req.query['term']) {
    return error(res, '`term` field is required', 422);
  }

  const offset = req.query['offset'] ? Number(req.query['offset']) : undefined;
  const limit = req.query['limit'] ? Number(req.query['limit']) : undefined;

  if (limit !== undefined) {
    if (limit <= 0) {
      return error(res, '`limit` must be greater than one', 422);
    }
    if (limit > MAX_SUBTITLE_MATCH_LIMIT) {
      return error(
        res,
        `\`limit\` must be less than or equal to ${MAX_SUBTITLE_MATCH_LIMIT}`,
        422
      );
    }
  }

  if (offset !== undefined) {
    if (offset < 0) {
      return error(res, '`offset` must be greater than or equal to zero', 422);
    }
  }

  try {
    return json(
      res,
      await quoteService.search(
        removeEmpty({
          term: req.query['term'].toString(),
          offset,
          limit,
        })
      )
    );
  } catch (e) {
    if (typeof e === 'string') return error(res, e, 400);
    throw e;
  }
});

router.get('/snippets', async (req, res) => {
  const result = validators.snippets.findAll.safeParse(unflatten(req.query));

  if (!result.success) {
    return error(res, result.error.flatten(), 422);
  }

  const data = await clipService.findAll(result.data);

  return json(res, data);
});

router.get('/snippets/random', async (_, res) => {
  const snippet = await clipService.random();

  if (!snippet) {
    return error(res, 'No snippets found', 404);
  }

  return json(res, snippet);
});

router.post('/snippets/publish', async (req, res) => {
  if (!req.body['uuid']) {
    return error(res, '`uuid` field is required', 422);
  }

  try {
    await clipService.publish(req.body['uuid']);
  } catch (e) {
    if (typeof e === 'string') return error(res, e, 400);
    throw e;
  }

  return json(res, { message: 'Snippet published!' });
});

router.get('/clips', async (req, res) => {
  const result = validators.clips.findAll.safeParse(unflatten(req.query));

  if (!result.success) {
    return error(res, result.error.flatten(), 422);
  }

  const data = await clipService.findAllClips(result.data);

  return json(res, data);
});

router.get('/clips/random', async (req, res) => {
  const result = await clipService.randomClip(
    removeEmpty({
      renderSubtitles: !!req.query['subtitles'],
      filetype: req.query['filetype']?.toString() ?? ('gif' as any),
      resolution: Number(req.query['resolution'] ?? '240'),
    })
  );

  if (!result) {
    return error(res, 'No clips found', 404);
  }

  const { clip, generation, renderTime, subtitleCorrection } = result;

  return json(res, {
    clip_uuid: clip.uuid,
    generation_uuid: generation.uuid,
    url: url(generation.getFilepath()),
    render_time: renderTime,
    subtitle_correction: subtitleCorrection,
    cached: !renderTime,
    clip_views: Number(clip.views),
    clip_copies: Number(clip.copies),
    generation_views: generation.views,
    generation_copies: generation.copies,
    subtitles: await clipService.getSubtitles(clip),
  });
});

router.get('/generations/track-copy', async (req, res) => {
  if (!req.query['uuid']) {
    return;
  }

  await clipService.trackCopy(req.query['uuid'].toString());

  return json(res, { message: 'Copy tracked' });
});

CLIP_FILE_TYPES.forEach((filetype) => {
  router.get(`/${filetype}`, async (req, res) => {
    if (req.query['term']) {
      const data = await quoteService.find(
        removeEmpty({
          term: req.query['term'].toString(),
          match: Number(req.query['match']),
        })
      );

      if (data.matches) {
        const first = data.matches.lines[0]!;
        const last = data.matches.lines[data.matches.lines.length - 1]!;
        req.query['begin'] = first.id.toString();
        req.query['end'] = last.id.toString();
      } else {
        return error(res, 'No matches found', 404);
      }
    }

    if (!req.query['begin']) {
      return error(res, '`begin` field is required', 422);
    }

    if (!req.query['end']) {
      return error(res, '`end` field is required', 422);
    }

    try {
      const { clip, generation, renderTime, subtitleCorrection } =
        await clipService.generate(
          removeEmpty({
            begin: Number(req.query['begin']),
            end: Number(req.query['end']),
            offset: Number(req.query['offset']),
            extend: Number(req.query['extend']),
          }),
          removeEmpty({
            // if subtitles value is set, always use it
            // otherwise default to showing subtitles only
            // for gifs
            renderSubtitles: req.query['subtitles']
              ? Boolean(Number(req.query['subtitles']))
              : filetype === 'gif',
            filetype,
            resolution: Number(req.query['resolution']),
            substitutions:
              typeof req.query['substitutions'] === 'string'
                ? req.query['substitutions']
                : undefined,
          })
        );

      if (renderTime > 0) {
        await clipService.trackView(generation);
      }

      clipService.generateDefaults(
        removeEmpty({
          begin: Number(req.query['begin']),
          end: Number(req.query['end']),
          offset: Number(req.query['offset']),
          extend: Number(req.query['extend']),
        })
      );

      if (req.query['render']) {
        return res.sendFile(getDataPath(generation.getFilepath()));
      }

      return json(res, {
        clip_uuid: clip.uuid,
        generation_uuid: generation.uuid,
        url: url(generation.getFilepath()),
        render_time: renderTime,
        subtitle_correction: subtitleCorrection,
        cached: !renderTime,
        clip_views: Number(clip.views),
        clip_copies: Number(clip.copies),
        generation_views: generation.views,
        generation_copies: generation.copies,
      });
    } catch (e) {
      if (typeof e === 'string') return error(res, e, 400);
      throw e;
    }
  });
});
