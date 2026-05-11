// api/scout/signal.ts
// Vercel serverless function — POST /api/scout/signal
// Thin HTTP wrapper over SignalIntakeAdapter core logic.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processIncomingSignal } from '../../src/api/SignalIntakeAdapter';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed', allowed: ['POST'] });
    return;
  }

  const result = processIncomingSignal(req.body);

  if (!result.success) {
    res.status(422).json({
      error: 'Signal validation failed',
      reason: result.reason,
      validationErrors: result.validationErrors,
      errorMessages: result.errorMessages,
    });
    return;
  }

  res.status(201).json({
    signalId: result.signalId,
    signal: result.signal,
    message: 'Signal ingested successfully',
  });
}
