from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from providers.base import (
    MediaProvider,
    MediaRequest,
    ProviderError,
    download_url,
    extension_from_content_type,
    http_json,
    save_bytes,
)


STATUS_MAP = {
    "created": "PENDING",
    "queued": "PENDING",
    "pending": "PENDING",
    "processing": "RUNNING",
    "running": "RUNNING",
    "in_progress": "RUNNING",
    "succeeded": "SUCCEEDED",
    "success": "SUCCEEDED",
    "completed": "SUCCEEDED",
    "complete": "SUCCEEDED",
    "failed": "FAILED",
    "failure": "FAILED",
    "error": "FAILED",
    "cancelled": "FAILED",
    "canceled": "FAILED",
}


def dig(data: Any, paths: list[list[Any]], default: Any = "") -> Any:
    for path in paths:
        cur = data
        ok = True
        for key in path:
            if isinstance(cur, dict) and key in cur:
                cur = cur[key]
            elif isinstance(cur, list) and isinstance(key, int) and 0 <= key < len(cur):
                cur = cur[key]
            else:
                ok = False
                break
        if ok and cur not in (None, ""):
            return cur
    return default


class XunkeVideoProvider(MediaProvider):
    name = "xunke_video"

    def __init__(self) -> None:
        self.tasks: dict[str, dict[str, Any]] = {}

    def health(self) -> dict[str, Any]:
        return {
            "provider": self.name,
            "status": "configured" if self._api_key() else "missing_api_key",
            "model": self._model("720p"),
        }

    def _api_key(self) -> str:
        return (os.environ.get("XUNKE_API_KEY") or os.environ.get("XUNKECLOUD_API_KEY") or "").strip()

    def _base_url(self) -> str:
        return (os.environ.get("XUNKE_BASE_URL") or "https://api.xunkecloud.cn").rstrip("/")

    def _model(self, resolution: str) -> str:
        resolution_key = resolution.strip().lower()
        env_key = f"XUNKE_VIDEO_MODEL_SEEDANCE_2_0_{resolution_key.upper()}"
        return (
            os.environ.get(env_key)
            or os.environ.get("XUNKE_VIDEO_MODEL_SEEDANCE_2_0")
            or f"seed-2-{resolution_key if resolution_key in {'480p', '720p', '1080p'} else '480p'}"
        ).strip()

    def _status(self, raw: Any) -> str:
        return STATUS_MAP.get(str(raw or "pending").strip().lower(), str(raw or "PENDING").upper())

    def submit_video_task(self, request: MediaRequest) -> dict[str, Any]:
        key = self._api_key()
        if not key:
            raise ProviderError("missing_api_key", "XUNKE_API_KEY is required for xunke_video", 401)
        resolution = str(request.body.get("resolution") or "720p").lower()
        duration = max(4, min(15, int(request.body.get("duration") or 5)))
        payload: dict[str, Any] = {
            "model": request.body.get("seedance_model") or request.body.get("model") or self._model(resolution),
            "prompt": request.prompt,
            "metadata": {
                "generate_audio": True,
                "ratio": request.body.get("ratio") or "16:9",
                "aspect_ratio": request.body.get("ratio") or "16:9",
                "duration": duration,
                "watermark": False,
                "resolution": resolution if resolution in {"480p", "720p", "1080p"} else "480p",
            },
        }
        images = request.body.get("inputImages") or request.body.get("input_images") or request.body.get("images") or []
        explicit_images = [
            request.body.get("firstFrameImage") or request.body.get("first_frame_image"),
            request.body.get("lastFrameImage") or request.body.get("last_frame_image"),
        ]
        if any(str(item or "").strip() for item in explicit_images):
            images = [str(item).strip() for item in explicit_images if str(item or "").strip()]
        if isinstance(images, list) and images:
            payload["images"] = [str(item).strip() for item in images if str(item).strip()][:9]
        response = http_json(
            f"{self._base_url()}/v1/videos",
            payload,
            headers={"Authorization": f"Bearer {key}", "Accept": "*/*", "User-Agent": "MyCanvasNext/0.1"},
            timeout=90,
        )
        raw_task_id = str(
            dig(response, [["id"], ["task_id"], ["data", "id"], ["data", "task_id"], ["data", "Id"]], "")
        )
        if not raw_task_id:
            raise ProviderError("provider_bad_response", "Xunke response did not include task id", 502)
        status = self._status(dig(response, [["status"], ["task_status"], ["data", "status"], ["data", "Status"]], "pending"))
        task_id = f"xk:{raw_task_id}"
        self.tasks[task_id] = {
            "provider": self.name,
            "root": str(request.root),
            "projectSlug": request.project_slug,
            "status": status,
            "raw": response,
        }
        return {"taskId": task_id, "status": status, "provider": self.name}

    def query_video_task(self, task_id: str) -> dict[str, Any]:
        raw_id = task_id.removeprefix("xk:")
        stored = self.tasks.get(task_id) or self.tasks.get(raw_id) or {}
        key = self._api_key()
        if not key:
            raise ProviderError("missing_api_key", "XUNKE_API_KEY is required for xunke_video", 401)
        response = http_json(
            f"{self._base_url()}/v1/videos/{raw_id}",
            headers={"Authorization": f"Bearer {key}", "Accept": "*/*", "User-Agent": "MyCanvasNext/0.1"},
            timeout=90,
        )
        status = self._status(dig(response, [["status"], ["task_status"], ["data", "status"], ["data", "Status"]], "pending"))
        result: dict[str, Any] = {"taskId": task_id, "status": status, "provider": self.name, "raw": response}
        if status == "SUCCEEDED":
            video_url = dig(
                response,
                [
                    ["video_url"],
                    ["url"],
                    ["output_url"],
                    ["result_url"],
                    ["content", "video_url"],
                    ["result", "video_url"],
                    ["data", "video_url"],
                    ["data", "url"],
                    ["data", "output_url"],
                    ["data", "result_url"],
                    ["data", "content", "video_url"],
                    ["data", "result", "video_url"],
                    ["data", "output", "video_url"],
                    ["data", "output", 0, "url"],
                    ["data", "outputs", 0, "url"],
                    ["output", 0, "url"],
                    ["outputs", 0, "url"],
                ],
                "",
            )
            if isinstance(video_url, dict):
                video_url = video_url.get("url") or video_url.get("video_url") or ""
            if isinstance(video_url, list) and video_url:
                video_url = video_url[0]
            if not str(video_url).startswith("http"):
                raise ProviderError("provider_bad_response", "Xunke task succeeded but no video URL was returned", 502)
            raw, content_type = download_url(str(video_url))
            saved = save_bytes(
                Path(stored.get("root") or ".").resolve() if stored.get("root") else Path.cwd(),
                str(stored.get("projectSlug") or ""),
                raw,
                "xunke_video",
                extension_from_content_type(content_type, ".mp4"),
            )
            result.update({"kind": "video", **saved})
        elif status == "FAILED":
            result["error"] = str(dig(response, [["error", "message"], ["message"], ["data", "message"]], "Video generation failed"))
        self.tasks[task_id] = {**stored, **result}
        return result
