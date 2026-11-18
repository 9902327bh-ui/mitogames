import type { Express, Request, Response } from 'express';
import { SUMMARY_LENGTHS, type SummaryLength } from '../../src/verbatimBio/constants/bioEnums.ts';
import type { BioExperiment } from '../../src/verbatimBio/types.ts';
import {
  extractYouTubeVideoId,
  fetchYouTubeOEmbed,
  generateQuizForExperiment,
  readCachedAnalysis,
  streamYouTubeBiologyAnalysis,
  writeCachedAnalysis,
} from './geminiService.ts';
import { READY_MADE_EXPERIMENTS } from './readyMadeExperiments.ts';
import { sanitizeBioExperiment } from './validator.ts';

const readyMade = READY_MADE_EXPERIMENTS.map((meta) => ({
  ...meta,
  experiment: sanitizeBioExperiment(
    meta.experiment,
    Math.round((meta.minClass + meta.maxClass) / 2),
  ),
}));

export function registerBiologyRoutes(app: Express) {
  app.get('/api/biology/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'Verbatim Biology' });
  });

  app.get('/api/biology/experiments/ready-made', (req: Request, res: Response) => {
    const classLevel = Number(req.query.classLevel);
    const filtered = Number.isFinite(classLevel) && classLevel >= 4 && classLevel <= 12
      ? readyMade.filter((item) => classLevel >= item.minClass && classLevel <= item.maxClass)
      : readyMade;
    res.json({ classLevel: filtered === readyMade ? null : classLevel, experiments: filtered, allExperiments: readyMade });
  });

  app.post('/api/biology/summarize/stream', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { url?: string; classLevel?: number; summaryLength?: string };
    const videoId = extractYouTubeVideoId(typeof body.url === 'string' ? body.url.trim() : '');
    if (!videoId) {
      res.status(400).json({ error: 'Please enter a valid YouTube watch, youtu.be, Shorts, Live, or embed URL.' });
      return;
    }
    const classLevel = Number.isFinite(body.classLevel) && Number(body.classLevel) >= 4 && Number(body.classLevel) <= 12
      ? Math.round(Number(body.classLevel)) : 8;
    const summaryLength: SummaryLength = (SUMMARY_LENGTHS as readonly string[]).includes(String(body.summaryLength))
      ? body.summaryLength as SummaryLength : 'standard';

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const send = (event: string, data: unknown) => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      send('stage', { stage: 'Connecting to the biology video…' });
      const videoMeta = await fetchYouTubeOEmbed(videoId);
      send('meta', { videoMeta });
      const cached = readCachedAnalysis(videoId, summaryLength, classLevel);
      if (cached) {
        send('stage', { stage: 'Opening your saved biology lab…' });
        send('complete', { ...cached, fromCache: true });
        res.end();
        return;
      }
      const result = await streamYouTubeBiologyAnalysis({
        videoId,
        videoMeta,
        classLevel,
        summaryLength,
        onStage: (stage) => send('stage', { stage }),
        onSummaryChunk: (text) => send('summary_chunk', { text }),
      });
      const completed = {
        videoMeta,
        summary: result.summary,
        rawSummaryText: result.rawSummaryText,
        experiment: result.experiment,
      };
      writeCachedAnalysis({ videoId, classLevel, summaryLength, ...completed, cachedAt: new Date().toISOString() });
      send('complete', { ...completed, fromCache: false });
      res.end();
    } catch (error) {
      send('error', { error: error instanceof Error ? error.message : 'Could not analyze this Biology video.' });
      res.end();
    }
  });

  app.post('/api/biology/quiz', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { experiment?: BioExperiment; classLevel?: number; regenerate?: boolean };
      if (!body.experiment) {
        res.status(400).json({ error: 'An experiment is required to prepare its quiz.' });
        return;
      }
      const classLevel = Number.isFinite(body.classLevel) && Number(body.classLevel) >= 4 && Number(body.classLevel) <= 12
        ? Math.round(Number(body.classLevel)) : 8;
      const experiment = sanitizeBioExperiment(body.experiment, classLevel);
      const quiz = !body.regenerate && experiment.quiz.length >= 3
        ? experiment.quiz
        : await generateQuizForExperiment({ experiment, classLevel });
      res.json({ quiz });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Could not prepare the Biology quiz.' });
    }
  });
}
