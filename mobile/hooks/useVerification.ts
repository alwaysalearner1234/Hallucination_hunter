// hooks/useVerification.ts — Core verification state hook
import { useState, useRef, useCallback } from 'react';
import { api, verifyWithStream, getErrorMessage } from '../services/api';
import { storage } from '../services/storage';
import { VerificationResult, VerifyRequest, AnalysisProgress, AnalysisStage, ProgressEvent } from '../types';

interface UseVerificationReturn {
  result: VerificationResult | null;
  progress: AnalysisProgress;
  isLoading: boolean;
  error: string | null;
  verify: (request: VerifyRequest) => Promise<VerificationResult | null>;
  cancel: () => void;
  reset: () => void;
}

const initialProgress: AnalysisProgress = {
  stage: 'idle',
  label: '',
};

export function useVerification(): UseVerificationReturn {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress>(initialProgress);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const verify = useCallback(async (request: VerifyRequest): Promise<VerificationResult | null> => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress({ stage: 'extracting_claims', label: 'Reading response...' });

    abortController.current = new AbortController();

    try {
      let finalResult: VerificationResult | null = null;

      await verifyWithStream(
        request,
        (event: ProgressEvent) => {
          handleProgressEvent(event, setProgress, (r) => { finalResult = r; });
        },
        abortController.current.signal
      );

      if (finalResult) {
        setResult(finalResult);
        await storage.saveVerification(finalResult);
        return finalResult;
      }

      // Fallback to sync if streaming failed
      const syncResult = await api.verify(request);
      setResult(syncResult);
      await storage.saveVerification(syncResult);
      setProgress({ stage: 'complete', label: 'Complete', trustScore: syncResult.trust_score });
      return syncResult;

    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        setProgress(initialProgress);
        return null;
      }
      const msg = getErrorMessage(err);
      setError(msg);
      setProgress({ stage: 'error', label: msg });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortController.current?.abort();
    setIsLoading(false);
    setProgress(initialProgress);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setResult(null);
    setError(null);
    setProgress(initialProgress);
  }, [cancel]);

  return { result, progress, isLoading, error, verify, cancel, reset };
}

function handleProgressEvent(
  event: ProgressEvent,
  setProgress: (p: AnalysisProgress) => void,
  setResult: (r: VerificationResult) => void,
) {
  const { event: eventName, data } = event;

  switch (eventName) {
    case 'stage_update':
      setProgress({
        stage: (data.stage as AnalysisStage) || 'extracting_claims',
        label: (data.label as string) || '',
        currentClaimText: data.claim_text as string | undefined,
      });
      break;

    case 'claims_extracted':
      setProgress({
        stage: 'searching_evidence',
        label: `Found ${data.count} claims. Searching evidence...`,
        claimsFound: data.count as number,
        totalClaims: data.count as number,
        claimsVerified: 0,
      });
      break;

    case 'claim_verified':
      setProgress({
        stage: 'verifying_claim',
        label: `Verified ${(data.claim_index as number) + 1} of ${data.total as number} claims...`,
        claimsVerified: (data.claim_index as number) + 1,
        totalClaims: data.total as number,
      });
      break;

    case 'trust_score_updated':
      setProgress((prev: AnalysisProgress) => ({
        ...prev,
        stage: 'calculating_trust',
        label: 'Calculating Trust Score...',
        trustScore: data.trust_score as number,
      }));
      break;

    case 'complete':
      setProgress({
        stage: 'complete',
        label: 'Verification complete',
        trustScore: (data as Record<string, unknown>).trust_score as number,
      });
      setResult(data as unknown as VerificationResult);
      break;

    case 'error':
      setProgress({
        stage: 'error',
        label: (data.message as string) || 'Verification failed',
      });
      break;
  }
}
