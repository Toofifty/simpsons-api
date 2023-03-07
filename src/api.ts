import { Response, Router } from 'express';
import { SNIPPET_FILE_TYPES } from './consts';
import {
  logService,
  quoteService,
  snippetService,
  statsService,
} from './services';
import { episodeService } from './services/episode.service';
import { getDataPath, removeEmpty, url } from './utils';

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

const error = (res: Response, message: string, status = 500) => {
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
  return json(res, await episodeService.viewAll());
});

router.post('/episode/correction', async (req, res) => {
  try {
    if (!req.body) {
      throw 'No body';
    }

    await episodeService.makeCorrection(req.body['id'], req.body['correction']);
  } catch (e) {
    if (typeof e === 'string') return error(res, e, 400);
    throw e;
  }

  return json(res, {
    message: 'Thank you for your correction! This event has been logged :)',
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
      const { filepath, renderTime } = await snippetService.generate(
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
        return res.sendFile(getDataPath(filepath));
      }

      return json(res, {
        url: url(filepath),
        render_time: renderTime,
        cached: !renderTime,
      });
    } catch (e) {
      if (typeof e === 'string') return error(res, e, 400);
      throw e;
    }
  });
});
