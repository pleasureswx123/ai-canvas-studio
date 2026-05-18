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


class ArkVideoProvider(MediaProvider):
    name = "ark_video"

    def __init__(self) -> None:
        self.tasks: dict[str, dict[str, Any]] = {}

    def health(self) -> dict[str, Any]:
        return {
            "provider": self.name,
            "status": "configured" if self._api_key() else "missing_api_key",
            "model": self._model(),
        }

    def _api_key(self) -> str:
        return (os.environ.get("ARK_API_KEY") or os.environ.get("VOLCENGINE_ARK_API_KEY") or "").strip()

    def _base_url(self) -> str:
        return (os.environ.get("ARK_BASE_URL") or "https://ark.cn-beijing.volces.com/api/v3").rstrip("/")

    def _model(self) -> str:
        return os.environ.get("ARK_VIDEO_MODEL") or os.environ.get("ARK_VIDEO_MODEL_SEEDANCE_2_0") or "doubao-seedance-2-0-260128"

    def submit_video_task(self, request: MediaRequest) -> dict[str, Any]:
        key = self._api_key()
        if not key:
            raise ProviderError("missing_api_key", "ARK_API_KEY is required for ark_video", 401)
        payload = {
            "model": request.body.get("model") or self._model(),
            "content": [
                {
                    "type": "text",
                    "text": request.prompt,
                }
            ],
        }
        response = http_json(
            f"{self._base_url()}/contents/generations/tasks",
            payload,
            headers={"Authorization": f"Bearer {key}"},
            timeout=120,
        )
        task_id = str(
            response.get("id")
            or response.get("task_id")
            or response.get("data", {}).get("id")
            or response.get("data", {}).get("task_id")
            or ""
        )
        if not task_id:
            raise ProviderError("provider_bad_response", "Ark video response did not include task id", 502)
        self.tasks[task_id] = {
            "provider": self.name,
            "root": str(request.root),
            "projectSlug": request.project_slug,
            "status": "PENDING",
            "raw": response,
        }
        return {"taskId": f"ark:{task_id}", "status": "PENDING", "provider": self.name}

    def query_video_task(self, task_id: str) -> dict[str, Any]:
        raw_id = task_id.removeprefix("ark:")
        stored = self.tasks.get(raw_id) or self.tasks.get(task_id) or {}
        key = self._api_key()
        if not key:
            raise ProviderError("missing_api_key", "ARK_API_KEY is required for ark_video", 401)
        response = http_json(
            f"{self._base_url()}/contents/generations/tasks/{raw_id}",
            headers={"Authorization": f"Bearer {key}"},
            timeout=120,
        )
        status = str(response.get("status") or response.get("data", {}).get("status") or "PENDING").lower()
        mapped = {
            "queued": "PENDING",
            "pending": "PENDING",
            "running": "RUNNING",
            "processing": "RUNNING",
            "succeeded": "SUCCEEDED",
            "success": "SUCCEEDED",
            "failed": "FAILED",
            "cancelled": "FAILED",
            "canceled": "FAILED",
        }.get(status, "PENDING")
        result = {
            "taskId": task_id,
            "status": mapped,
            "provider": self.name,
            "raw": response,
        }
        if mapped == "SUCCEEDED":
            video_url = self._extract_video_url(response)
            if video_url:
                raw, content_type = download_url(video_url)
                saved = save_bytes(
                    Path(stored.get("root") or ".").resolve() if stored.get("root") else Path.cwd(),
                    str(stored.get("projectSlug") or ""),
                    raw,
                    "ark_video",
                    extension_from_content_type(content_type, ".mp4"),
                )
                result.update({"kind": "video", **saved})
        return result

    def _extract_video_url(self, response: dict[str, Any]) -> str:
        candidates = [
            response.get("video_url"),
            response.get("url"),
            response.get("data", {}).get("video_url") if isinstance(response.get("data"), dict) else None,
            response.get("data", {}).get("url") if isinstance(response.get("data"), dict) else None,
            response.get("content", {}).get("video_url") if isinstance(response.get("content"), dict) else None,
            response.get("content", {}).get("url") if isinstance(response.get("content"), dict) else None,
        ]
        for candidate in candidates:
            if isinstance(candidate, str) and candidate.startswith("http"):
                return candidate
        data = response.get("data")
        if isinstance(data, dict):
            output = data.get("output")
            if isinstance(output, list):
                for item in output:
                    if isinstance(item, dict):
                        value = item.get("url") or item.get("video_url")
                        if isinstance(value, str) and value.startswith("http"):
                            return value
        return ""
