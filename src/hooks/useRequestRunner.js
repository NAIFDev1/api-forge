import { useCallback } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { sendRequest as run, HttpError } from '../services/http'
import { resolveRequest } from '../utils/variables'
import { copyText } from '../utils/format'

/** Owns the send/cancel lifecycle and records results into history. */
export function useRequestRunner() {
  const ws = useWorkspace()

  const send = useCallback(async () => {
    if (ws.status === 'loading') return

    const { request } = resolveRequest(ws.request, ws.activeEnvironment)

    const controller = new AbortController()
    ws.abortRef.current = controller

    ws.setStatus('loading')
    ws.setError(null)

    try {
      const result = await run(request, { signal: controller.signal, timeoutMs: ws.timeoutMs })
      ws.setResponse(result)
      ws.setStatus('success')
      ws.pushHistory({
        method: request.method,
        url: result.finalUrl || request.url,
        requestUrl: request.url,
        status: result.status,
        timeMs: result.timeMs,
        size: result.size,
        at: Date.now(),
        request,
      })
      return result
    } catch (err) {
      const httpError = err instanceof HttpError ? err : new HttpError('Something went wrong.', 'unknown', err?.message)
      if (httpError.kind === 'cancelled') {
        ws.setStatus('idle')
        ws.abortRef.current = null
        return null
      }
      ws.setError(httpError)
      ws.setStatus('error')
      ws.setResponse(null)
      ws.pushHistory({
        method: request.method,
        url: request.url,
        requestUrl: request.url,
        status: null,
        timeMs: null,
        size: null,
        at: Date.now(),
        request,
        error: httpError.message,
      })
      return null
    } finally {
      ws.abortRef.current = null
    }
  }, [ws])

  const copyResponse = useCallback(async () => {
    const body = ws.response?.body ?? ''
    await copyText(body)
    ws.toast('Response copied', { tone: 'success' })
  }, [ws])

  return { send, copyResponse }
}