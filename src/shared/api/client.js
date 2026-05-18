const DEFAULT_TIMEOUT_MS = 30000;

function createTimeoutSignal(timeoutMs, upstreamSignal) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(new DOMException('Request timeout', 'TimeoutError')), timeoutMs);
  const abortFromUpstream = () => controller.abort(upstreamSignal.reason);
  if (upstreamSignal) {
    if (upstreamSignal.aborted) abortFromUpstream();
    else upstreamSignal.addEventListener('abort', abortFromUpstream, { once: true });
  }
  return {
    signal: controller.signal,
    dispose: () => {
      window.clearTimeout(timer);
      upstreamSignal?.removeEventListener?.('abort', abortFromUpstream);
    },
  };
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  let body = options.body;
  if (body && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const timeout = createTimeoutSignal(options.timeoutMs || DEFAULT_TIMEOUT_MS, options.signal);
  try {
    const response = await fetch(path, { ...options, headers, body, signal: timeout.signal });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error?.message || payload?.message || `Request failed: ${response.status}`);
    }
    return payload?.data ?? payload;
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('请求超时，请检查本地服务是否正常运行');
    }
    throw error;
  } finally {
    timeout.dispose();
  }
}

export async function uploadBinary(path, file, options = {}) {
  const timeout = createTimeoutSignal(options.timeoutMs || DEFAULT_TIMEOUT_MS, options.signal);
  try {
    const response = await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
      signal: timeout.signal,
    });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) {
      throw new Error(payload?.error?.message || `Upload failed: ${response.status}`);
    }
    return payload.data;
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('上传超时，请检查文件大小或本地服务状态');
    }
    throw error;
  } finally {
    timeout.dispose();
  }
}
