from __future__ import annotations

import os
from typing import Any

from providers.base import MediaProvider, MediaRequest, ProviderError, extract_image_bytes, http_json, save_bytes


class OpenAIImageProvider(MediaProvider):
    name = "openai_image"

    def health(self) -> dict[str, Any]:
        return {
            "provider": self.name,
            "status": "configured" if self._api_key() else "missing_api_key",
            "model": self._model(),
        }

    def _api_key(self) -> str:
        return (
            os.environ.get("OPENAI_API_KEY")
            or os.environ.get("OPENAI_IMAGE_API_KEY")
            or os.environ.get("GPT_IMAGE_2_API_KEY")
            or os.environ.get("VECTORENGINE_API_KEY")
            or os.environ.get("ARK_API_KEY")
            or ""
        ).strip()

    def _base_url(self) -> str:
        return (
            os.environ.get("OPENAI_IMAGE_BASE_URL")
            or os.environ.get("GPT_IMAGE_2_BASE_URL")
            or os.environ.get("VECTORENGINE_BASE_URL")
            or os.environ.get("ARK_BASE_URL")
            or "https://api.openai.com/v1"
        ).rstrip("/")

    def _model(self) -> str:
        return (
            os.environ.get("OPENAI_IMAGE_MODEL")
            or os.environ.get("GPT_IMAGE_2_MODEL")
            or os.environ.get("ARK_IMAGE_MODEL")
            or "gpt-image-2"
        )

    def generate_image(self, request: MediaRequest) -> dict[str, Any]:
        key = self._api_key()
        if not key:
            raise ProviderError("missing_api_key", "OPENAI_API_KEY or GPT_IMAGE_2_API_KEY is required", 401)
        payload = {
            "model": request.body.get("model") or self._model(),
            "prompt": request.prompt,
            "n": 1,
            "size": request.body.get("size") or "1024x1024",
        }
        quality = str(request.body.get("quality") or "").strip()
        if quality and quality != "auto":
            payload["quality"] = quality
        response = http_json(
            f"{self._base_url()}/images/generations",
            payload,
            headers={"Authorization": f"Bearer {key}"},
            timeout=180,
        )
        raw, extension = extract_image_bytes(response)
        result = save_bytes(request.root, request.project_slug, raw, "openai_image", extension)
        return {"kind": "image", **result}
