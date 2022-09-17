import express, { Response } from 'express';
import http from 'http';
import cors from 'cors';
import { RequestContext } from '@mikro-orm/core';

import { getDataPath, url, removeEmpty } from './utils';
import { gifService, quoteService, statsService } from './services';
import { orm } from './orm';

const app = express();
const server = http.createServer(app);

app.use((_, __, next) => {
  RequestContext.create(orm.em, next);
});

app.use((req, _, next) => {
  (req as any).start = Date.now();
  next();
});

const json = (res: Response, data: Record<string, any>) =>
  res.send({
    status: 200,
    response_time: Date.now() - (res.req as any).start,
    data,
  });

const error = (res: Response, message: string, status = 500) =>
  res.status(status).send({
    status,
    response_time: Date.now() - (res.req as any).start,
    error: message,
  });

app.use(cors());

app.use('/snaps', express.static(getDataPath('snaps')));
app.use('/gifs', express.static(getDataPath('gifs')));

server.listen(process.env['PORT'] || 3312, () => {
  console.log(`Simpsons API ready at ${url()}`);
});

app.get('/', async (_, res) => {
  return json(res, await statsService.getAll());
});

app.get('/quote', async (req, res) => {
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
        season_episode: Number(req.query['season_episode']),
        padding: Number(req.query['padding']),
        match: Number(req.query['match']),
        snap: !!req.query['snap'] || undefined,
      })
    )
  );
});

app.get('/gif', async (req, res) => {
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
    const { filename, renderTime } = await gifService.generate(
      Number(req.query['begin']),
      Number(req.query['end']),
      removeEmpty({
        offset: Number(req.query['offset']),
        extend: Number(req.query['extend']),
      })
    );

    if (req.query['render']) {
      return res.sendFile(getDataPath('gifs', filename));
    }

    return json(res, {
      url: url(`gifs/${filename}`),
      render_time: renderTime,
      cached: !renderTime,
    });
  } catch (e) {
    if (typeof e === 'string') return error(res, e, 400);
    throw e;
  }
});
