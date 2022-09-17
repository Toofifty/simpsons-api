import express from 'express';
import http from 'http';
import cors from 'cors';
import { RequestContext } from '@mikro-orm/core';

import { error } from './error';
import { getDataPath, url, removeUndefined } from './utils';
import { gifService, quoteService, statsService } from './services';
import { orm } from './orm';

const app = express();
const server = http.createServer(app);

app.use((_, __, next) => {
  RequestContext.create(orm.em, next);
});

app.use(cors());

app.use('/snaps', express.static(getDataPath('snaps')));
app.use('/gifs', express.static(getDataPath('gifs')));

server.listen(process.env['PORT'] || 3312, () => {
  console.log(`Simpsons API ready at ${url()}`);
});

app.get('/', async (_, res) => {
  res.send({
    status: 200,
    data: await statsService.getAll(),
  });
});

app.get('/quote', async (req, res) => {
  if (!req.query['term']) {
    return res.status(422).send(error('`term` field is required', 422));
  }

  return res.send({
    status: 200,
    data: await quoteService.find(
      removeUndefined({
        term: req.query['term'].toString(),
        season: Number(req.query['season']),
        episode: Number(req.query['episode']),
        season_episode: Number(req.query['season_episode']),
        padding: Number(req.query['padding']),
        match: Number(req.query['match']),
        snap: !!req.query['snap'] || undefined,
      })
    ),
  });
});

app.get('/gif', async (req, res) => {
  if (req.query['term']) {
    const data = await quoteService.find({
      term: req.query['term'].toString(),
      ...(req.query['match'] && {
        match: Number(req.query['match']),
      }),
    });
    if (data.matches) {
      const first = data.matches.lines[0]!;
      const last = data.matches.lines[data.matches.lines.length - 1]!;
      req.query['begin'] = first.id.toString();
      req.query['end'] = last.id.toString();
    } else {
      return res.status(404).send(error('No matches', 404));
    }
  }

  if (!req.query['begin']) {
    return res.status(422).send(error('`begin` field is required', 422));
  }

  if (!req.query['end']) {
    return res.status(422).send(error('`end` field is required', 422));
  }

  try {
    const path = await gifService.generate(
      Number(req.query['begin']),
      Number(req.query['end']),
      {
        offset: req.query['offset'] ? Number(req.query['offset']) : undefined,
        extend: req.query['extend'] ? Number(req.query['extend']) : undefined,
      }
    );

    if (req.query['render']) {
      return res.sendFile(getDataPath('gifs', path));
    }

    return res.send({
      status: 200,
      data: {
        url: url(`gifs/${path}`),
      },
    });
  } catch (e) {
    if (typeof e === 'string') return res.send(error(e));
    throw e;
  }
});
