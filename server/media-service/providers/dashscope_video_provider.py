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


class DashScopeVideoProvider(MediaProvider):
    name = "dashscope_video"
    submit_endpoint = "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis"
    task_endpoint = "https://dashscope.aliyuncs.com/api/v1/tasks"

    def __init__(self) -> None:
        self.tasks: dict[str, dict[str, Any]] = {}

    def health(self) -> dict[str, Any]:
        return {
            "provider": self.name,
            "status": "configured" if self._api_key() else "missing_api_key",
            "model": self._model(),
        }

    def _api_key(self) -> str:
        return (os.environ.get("DASHSCOPE_API_KEY") or "").strip()

    def _model(self) -> str:
        return os.environ.get("DASHSCOPE_VIDEO_MODEL") or "wan2.7-i2v"

    def submit_video_task(self, request: MediaRequest) -> dict[str, Any]:
        key = self._api_key()
        if not key:
            raise ProviderError("missing_api_key", "DASHSCOPE_API_KEY is required for dashscope_video", 401)
        images = request.body.get("inputImages") or request.body.get("input_images") or []
        if not isinstance(images, list):
            images = []
        media = []
        for index, image_url in enumerate(images[:2]):
            if isinstance(image_url, str) and image_url.strip():
                media.append({"type": "first_frame" if index == 0 else "last_frame", "url": image_url.strip()})
        if not media:
            raise ProviderError("missing_reference_image", "DashScope wan2.7-i2v requires at least one input image", 400)
        payload = {
            "model": request.body.get("model") or self._model(),
            "input": {
                "prompt": request.prompt,
                "media": media,
            },
            "parameters": {
                "resolution": request.body.get("resolution") or "720P",
                "duration": int(request.body.get("duration") or 5),
                "prompt_extend": True,
                "watermark": False,
            },
        }
        response = http_json(
            self.submit_endpoint,
            payload,
            headers={"Authorization": f"Bearer {key}", "X-DashScope-Async": "enable"},
            timeout=60,
        )
        output = response.get("output") if isinstance(response.get("output"), dict) else {}
        raw_task_id = str(output.get("task_id") or response.get("task_id") or "")
        if not raw_task_id:
            raise ProviderError("provider_bad_response", "DashScope response did not include task_id", 502)
        status = str(output.get("task_status") or "PENDING").upper()
        task_id = f"ds:{raw_task_id}"
        self.tasks[task_id] = {
            "provider": self.name,
            "root": str(request.root),
            "projectSlug": request.project_slug,
            "status": status,
            "raw": response,
        }
        return {"taskId": task_id, "status": status, "provider": self.name}

    def query_video_task(self, task_id: str) -> dict[str, Any]:
        raw_id = task_id.removeprefix("ds:")
        stored = self.tasks.get(task_id) or self.tasks.get(raw_id) or {}
        key = self._api_key()
        if not key:
            raise ProviderError("missing_api_key", "DASHSCOPE_API_KEY is required for dashscope_video", 401)
        response = http_json(
            f"{self.task_endpoint}/{raw_id}",
            headers={"Authorization": f"Bearer {key}"},
            timeout=60,
        )
        output = response.get("output") if isinstance(response.get("output"), dict) else {}
        status = str(output.get("task_status") or response.get("task_status") or "PENDING").upper()
        mapped = "FAILED" if status in {"FAILED", "CANCELED", "UNKNOWN"} else status
        result: dict[str, Any] = {"taskId": task_id, "status": mapped, "provider": self.name, "raw": response}
        if mapped == "SUCCEEDED":
            video_url = str(output.get("video_url") or response.get("video_url") or "")
            if not video_url:
                raise ProviderError("provider_bad_response", "DashScope task succeeded but no video_url was returned", 502)
            raw, content_type = download_url(video_url)
            saved = save_bytes(
                Path(stored.get("root") or ".").resolve() if stored.get("root") else Path.cwd(),
                str(stored.get("projectSlug") or ""),
                raw,
                "dashscope_video",
                extension_from_content_type(content_type, ".mp4"),
            )
            result.update({"kind": "video", **saved})
        elif mapped == "FAILED":
            result["error"] = output.get("message") or f"Video generation failed: {status}"
        self.tasks[task_id] = {**stored, **result}
        return result
