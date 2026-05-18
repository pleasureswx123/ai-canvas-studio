from __future__ import annotations

import os
from typing import Any

from providers.base import (
    MediaProvider,
    MediaRequest,
    ProviderError,
    decode_data_url,
    download_url,
    extension_from_content_type,
    extract_image_ref_from_chat_response,
    http_json,
    save_bytes,
)


class VectorEngineImageProvider(MediaProvider):
    name = "vectorengine_image"

    def health(self) -> dict[str, Any]:
        return {
            "provider": self.name,
            "status": "configured" if self._api_key() else "missing_api_key",
            "model": self._model(),
        }

    def _api_key(self) -> str:
        return (os.environ.get("VECTORENGINE_API_KEY") or "").strip()

    def _base_url(self) -> str:
        return (os.environ.get("VECTORENGINE_BASE_URL") or "https://api.vectorengine.ai/v1").rstrip("/")

    def _model(self) -> str:
        return (
            os.environ.get("VECTORENGINE_IMAGE_MODEL")
            or os.environ.get("VECTORENGINE_MODEL_NANO_BANANA_PRO")
            or "gemini-3-pro-image-preview"
        )

    def generate_image(self, request: MediaRequest) -> dict[str, Any]:
        key = self._api_key()
        if not key:
            raise ProviderError("missing_api_key", "VECTORENGINE_API_KEY is required for vectorengine_image", 401)
        payload = {
            "model": request.body.get("model") or self._model(),
            "messages": [
                {
                    "role": "user",
                    "content": request.prompt,
                }
            ],
        }
        response = http_json(
            f"{self._base_url()}/chat/completions",
            payload,
            headers={"Authorization": f"Bearer {key}"},
            timeout=240,
        )
        image_ref = extract_image_ref_from_chat_response(response)
        if image_ref.startswith("data:image/"):
            raw, extension = decode_data_url(image_ref)
        else:
            raw, content_type = download_url(image_ref)
            extension = extension_from_content_type(content_type, ".png")
        result = save_bytes(request.root, request.project_slug, raw, "vectorengine_image", extension)
        return {"kind": "image", **result}
