import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';

import { error } from './error';
import { findQuote } from './find-quote';
import { findStats } from './stats';
import { genGif } from './gen-gif';
import { hostname } from './utils';
import { config } from './config';

const app = express();
const server = http.createServer(app);

app.use(cors());

app.use(
  '/snaps',
  express.static(path.join(__dirname, config('DATA_DIR'), 'snaps'))
);
app.use(
  '/gifs',
  express.static(path.join(__dirname, config('DATA_DIR'), 'gifs'))
);

server.listen(process.env.PORT || 3312, () => {
  console.log(`Simpsons API ready at ${hostname}`);
});

app.get('/', async (req, res) => {
  res.send({
    status: 200,
    data: await findStats(),
  });
});

app.get('/quote', async (req, res) => {
  if (!req.query.term) {
    return res.send(error('`term` field is required'));
  }
  return res.send({
    status: 200,
    data: await findQuote({
      term: req.query.term.toString(),
      season: req.query.season
        ? Number(req.query.season.toString())
        : undefined,
      episode: req.query.episode
        ? Number(req.query.episode.toString())
        : undefined,
      seasonEpisode: req.query.season_episode
        ? Number(req.query.season_episode.toString())
        : undefined,
      padding: req.query.padding
        ? Number(req.query.padding.toString())
        : undefined,
      snap: !!req.query.snap,
    }),
  });
});

app.get('/gif', async (req, res) => {
  if (req.query.term) {
    const data: any = await findQuote({ term: req.query.term.toString() });
    if (data.matches > 0) {
      const [first] = data.best.lines;
      const last = data.best.lines[data.best.lines.length - 1];
      req.query.begin = first.id;
      req.query.end = last.id;
    } else {
      return res.send(error('No matches', 404));
    }
  }

  if (!req.query.begin) {
    return res.send(error('`begin` field is required'));
  }
  if (!req.query.end) {
    return res.send(error('`end` field is required'));
  }
  let gifPath = '';
  try {
    gifPath = await genGif(Number(req.query.begin), Number(req.query.end), {
      offset: req.query.offset ? Number(req.query.offset) : undefined,
      extend: req.query.extend ? Number(req.query.extend) : undefined,
    });
  } catch (e) {
    if (typeof e === 'string') return res.send(error(e));
    throw e;
  }

  if (req.query.render) {
    return res.sendFile(
      path.join(__dirname, config('DATA_DIR'), 'gifs', gifPath)
    );
  }

  return res.send({
    status: 200,
    data: {
      url: `${hostname}/gifs/${gifPath}`,
    },
  });
});
