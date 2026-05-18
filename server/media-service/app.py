from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from env_loader import load_project_env
from providers.base import MediaRequest, ProviderError
from providers.registry import ProviderRegistry

ROOT = Path(__file__).resolve().parents[2]
load_project_env(ROOT)
PORT = int(os.environ.get("MEDIA_SERVICE_PORT", "8790"))
TASKS: dict[str, dict] = {}
REGISTRY = ProviderRegistry()


def _send_json(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    raw = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, X-Project-Slug")
    handler.send_header("Content-Length", str(len(raw)))
    handler.end_headers()
    handler.wfile.write(raw)


def _ok(handler: BaseHTTPRequestHandler, data: dict) -> None:
    _send_json(handler, 200, {"ok": True, "data": data})


def _error(handler: BaseHTTPRequestHandler, status: int, message: str, code: str = "media_error") -> None:
    _send_json(handler, status, {"ok": False, "error": {"code": code, "message": message}})


def _read_body(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length") or "0")
    if length <= 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8")
    return json.loads(raw) if raw else {}


class MediaHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Project-Slug")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/media-health":
            _ok(self, {"service": "media-service", "status": "ok", **REGISTRY.health()})
            return
        if parsed.path.startswith("/api/video-task/"):
            task_id = unquote(parsed.path[len("/api/video-task/") :])
            task = TASKS.get(task_id)
            if task and task.get("status") in {"SUCCEEDED", "FAILED"} and task.get("src"):
                _ok(self, task)
                return
            provider_name = task.get("provider") if task else task_id.split(":", 1)[0]
            provider = REGISTRY.video_provider(provider_name)
            latest = provider.query_video_task(task_id)
            if task:
                latest = {**task, **latest}
            TASKS[task_id] = latest
            _ok(self, latest)
            return
        _error(self, 404, "Not found")

    def do_POST(self) -> None:
        try:
            parsed = urlparse(self.path)
            body = _read_body(self)
            project_slug = body.get("projectSlug") or self.headers.get("X-Project-Slug") or ""
            prompt = body.get("prompt") or ""
            context_text = str(body.get("contextText") or "").strip()
            if context_text:
                prompt = f"{context_text}\n\n{prompt}".strip()
            request = MediaRequest(root=ROOT, project_slug=project_slug, prompt=prompt, body=body)
            if parsed.path == "/api/generate-image":
                result = REGISTRY.image_provider(str(body.get("provider") or "")).generate_image(request)
                _ok(self, result)
                return
            if parsed.path == "/api/generate-video":
                result = REGISTRY.video_provider(str(body.get("provider") or "")).submit_video_task(request)
                TASKS[result["taskId"]] = result
                _ok(self, {"taskId": result["taskId"], "status": result["status"]})
                return
            _error(self, 404, "Not found")
        except ProviderError as error:
            _error(self, error.status, str(error), error.code)
        except Exception as error:
            _error(self, 500, str(error))

    def log_message(self, format: str, *args) -> None:
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), MediaHandler)
    print(f"Media service running at http://127.0.0.1:{PORT}")
    server.serve_forever()
