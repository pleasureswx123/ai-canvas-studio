from __future__ import annotations

import html
import uuid
from typing import Any

from providers.base import MediaProvider, MediaRequest, asset_url, save_text


class MockProvider(MediaProvider):
    name = "mock"

    def generate_image(self, request: MediaRequest) -> dict[str, Any]:
        safe_prompt = html.escape((request.prompt or "Mock image").strip()[:160])
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 576">
  <rect width="1024" height="576" fill="#151515"/>
  <rect x="28" y="28" width="968" height="520" rx="24" fill="#242424" stroke="#3f3f46"/>
  <text x="64" y="108" fill="#fafafa" font-family="Arial, sans-serif" font-size="42">Mock Image</text>
  <text x="64" y="178" fill="#a1a1aa" font-family="Arial, sans-serif" font-size="26">{safe_prompt}</text>
  <circle cx="824" cy="170" r="72" fill="#22c55e" opacity="0.8"/>
  <rect x="64" y="328" width="360" height="128" rx="18" fill="#0ea5e9" opacity="0.82"/>
</svg>"""
        result = save_text(request.root, request.project_slug, svg, "mock_image", ".svg")
        return {"kind": "image", **result}


    def submit_video_task(self, request: MediaRequest) -> dict[str, Any]:
        task_id = f"mock:{uuid.uuid4().hex[:12]}"
        safe_prompt = html.escape((request.prompt or "Mock video").strip()[:160])
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 576">
  <rect width="1024" height="576" fill="#111827"/>
  <rect x="36" y="36" width="952" height="504" rx="28" fill="#1f2937" stroke="#475569"/>
  <polygon points="442,228 442,348 560,288" fill="#f97316"/>
  <text x="64" y="108" fill="#fafafa" font-family="Arial, sans-serif" font-size="42">Mock Video Task</text>
  <text x="64" y="478" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="26">{safe_prompt}</text>
</svg>"""
        result = save_text(request.root, request.project_slug, svg, "mock_video", ".svg")
        return {"taskId": task_id, "status": "SUCCEEDED", "kind": "video", **result}

    def query_video_task(self, task_id: str) -> dict[str, Any]:
        if not task_id.startswith("mock:"):
            return {"taskId": task_id, "status": "FAILED", "error": "Unknown mock task"}
        return {
            "taskId": task_id,
            "status": "SUCCEEDED",
            "kind": "video",
            "savedFilename": "",
            "src": asset_url("unassigned", ""),
        }
