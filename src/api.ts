import { Response, Router } from 'express';
import { unflatten } from 'flat';
import { SNIPPET_FILE_TYPES } from './consts';
import {
  episodeService,
  logService,
  quoteService,
  snippetService,
  statsService,
} from './services';
import { getDataPath, removeEmpty, url } from './utils';
import validators from './validators';

export const router = Router();

const json = (res: Response, data: Record<string, any>) => {
  const responseTime = Date.now() - (res.req as any).start;
  logService.logRequest(res, 200, responseTime, data['render_time']);

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
  const [logs, total] = await logService.viewAll({
    filter: req.query['filter']?.toString(),
    page: Number(req.query['page']),
    perpage: Number(req.query['perpage']),
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
    message:
      'Correction applied, and existing episode snippets have been purged',
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
  try {
    return json(
      res,
      await quoteService.search(
        removeEmpty({
          term: req.query['term'].toString(),
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

  const data = await snippetService.findAll(result.data);

  return json(res, data);
});

router.post('/snippets/publish', async (req, res) => {
  if (!req.body['uuid']) {
    return error(res, '`uuid` field is required', 422);
  }

  try {
    await snippetService.publish(req.body['uuid']);
  } catch (e) {
    if (typeof e === 'string') return error(res, e, 400);
    throw e;
  }

  return json(res, { message: 'Snippet published!' });
});

SNIPPET_FILE_TYPES.forEach((filetype) => {
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
      const { snippet, renderTime, subtitleCorrection } =
        await snippetService.generate(
          Number(req.query['begin']),
          Number(req.query['end']),
          removeEmpty({
            offset: Number(req.query['offset']),
            extend: Number(req.query['extend']),
            // if subtitles value is set, always use it
            // otherwise default to showing subtitles only
            // for gifs
            subtitles: req.query['subtitles']
              ? Boolean(Number(req.query['subtitles']))
              : filetype === 'gif',
            filetype,
            resolution: Number(req.query['resolution']),
          })
        );

      if (req.query['render']) {
        return res.sendFile(getDataPath(snippet.filepath));
      }

      return json(res, {
        uuid: snippet.uuid,
        published: snippet.published,
        url: url(snippet.filepath),
        render_time: renderTime,
        subtitle_correction: subtitleCorrection,
        cached: !renderTime,
      });
    } catch (e) {
      if (typeof e === 'string') return error(res, e, 400);
      throw e;
    }
  });
});
