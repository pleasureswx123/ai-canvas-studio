from __future__ import annotations

import base64
import json
import mimetypes
import re
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


class ProviderError(Exception):
    def __init__(self, code: str, message: str, status: int = 500) -> None:
        super().__init__(message)
        self.code = code
        self.status = status


@dataclass(frozen=True)
class MediaRequest:
    root: Path
    project_slug: str
    prompt: str
    body: dict[str, Any]


def safe_slug(value: str) -> str:
    raw = (value or "").strip()
    if raw and all(ch.isalnum() or ch in "_-" for ch in raw) and len(raw) <= 120:
        return raw
    return "unassigned"


def project_assets(root: Path, slug: str) -> Path:
    directory = root / "projects" / safe_slug(slug) / "assets"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def asset_url(slug: str, file_name: str) -> str:
    return f"/api/project/media/{safe_slug(slug)}/{file_name}"


def make_file_name(prefix: str, extension: str) -> str:
    ext = extension if extension.startswith(".") else f".{extension}"
    return f"{prefix}_{time.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}{ext}"


def save_bytes(root: Path, slug: str, raw: bytes, prefix: str, extension: str) -> dict[str, Any]:
    file_name = make_file_name(prefix, extension)
    (project_assets(root, slug) / file_name).write_bytes(raw)
    return {
        "savedFilename": file_name,
        "src": asset_url(slug, file_name),
    }


def save_text(root: Path, slug: str, text: str, prefix: str, extension: str) -> dict[str, Any]:
    file_name = make_file_name(prefix, extension)
    (project_assets(root, slug) / file_name).write_text(text, encoding="utf-8")
    return {
        "savedFilename": file_name,
        "src": asset_url(slug, file_name),
    }


def http_json(url: str, payload: dict[str, Any] | None = None, headers: dict[str, str] | None = None, timeout: int = 120) -> dict:
    raw_payload = None if payload is None else json.dumps(payload).encode("utf-8")
    request_headers = {"Content-Type": "application/json", **(headers or {})}
    request = Request(url, data=raw_payload, headers=request_headers, method="GET" if payload is None else "POST")
    try:
      with urlopen(request, timeout=timeout) as response:
          return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise ProviderError("provider_http_error", f"Provider HTTP {error.code}: {detail[:500]}", error.code) from error
    except URLError as error:
        raise ProviderError("provider_network_error", f"Provider network error: {error.reason}", 502) from error


def download_url(url: str, timeout: int = 180) -> tuple[bytes, str]:
    try:
        with urlopen(url, timeout=timeout) as response:
            content_type = response.headers.get("Content-Type") or "application/octet-stream"
            return response.read(), content_type
    except HTTPError as error:
        raise ProviderError("download_http_error", f"Download HTTP {error.code}", error.code) from error
    except URLError as error:
        raise ProviderError("download_network_error", f"Download network error: {error.reason}", 502) from error


def extension_from_content_type(content_type: str, fallback: str = ".bin") -> str:
    guessed = mimetypes.guess_extension((content_type or "").split(";")[0].strip())
    return guessed or fallback


def extract_image_bytes(response: dict[str, Any]) -> tuple[bytes, str]:
    data = response.get("data")
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict):
            if first.get("b64_json"):
                return base64.b64decode(first["b64_json"]), ".png"
            if first.get("url"):
                raw, content_type = download_url(first["url"])
                return raw, extension_from_content_type(content_type, ".png")
    raise ProviderError("provider_bad_response", "Image provider response did not include b64_json or url", 502)


def extract_image_ref_from_chat_response(response: dict[str, Any]) -> str:
    refs: list[str] = []

    def visit(value: Any) -> None:
        if isinstance(value, str):
            refs.extend(re.findall(r"data:image/[^;\\s)\"']+;base64,[A-Za-z0-9+/=]+", value))
            refs.extend(re.findall(r"https?://[^\\s)\"']+\\.(?:png|jpe?g|webp|gif)(?:\\?[^\\s)\"']*)?", value, flags=re.I))
            if value.startswith("http"):
                refs.append(value)
            return
        if isinstance(value, list):
            for item in value:
                visit(item)
            return
        if isinstance(value, dict):
            if isinstance(value.get("b64_json"), str):
                refs.append(f"data:image/png;base64,{value['b64_json']}")
            if isinstance(value.get("url"), str):
                refs.append(value["url"])
            image_url = value.get("image_url")
            if isinstance(image_url, dict) and isinstance(image_url.get("url"), str):
                refs.append(image_url["url"])
            for item in value.values():
                visit(item)

    visit(response)
    for ref in refs:
        if ref.startswith("data:image/") and "," in ref:
            return ref
        if ref.startswith("http"):
            return ref
    raise ProviderError("provider_bad_response", "Chat image provider response did not include an image reference", 502)


def decode_data_url(data_url: str) -> tuple[bytes, str]:
    if "," not in data_url:
        raise ProviderError("provider_bad_response", "Invalid image data URL", 502)
    header, payload = data_url.split(",", 1)
    mime_type = header.split(";")[0].replace("data:", "").strip() or "image/png"
    return base64.b64decode(payload), mimetypes.guess_extension(mime_type) or ".png"


class MediaProvider:
    name = "base"

    def health(self) -> dict[str, Any]:
        return {"provider": self.name, "status": "ok"}

    def generate_image(self, request: MediaRequest) -> dict[str, Any]:
        raise ProviderError("unsupported", f"{self.name} does not support image generation", 400)

    def submit_video_task(self, request: MediaRequest) -> dict[str, Any]:
        raise ProviderError("unsupported", f"{self.name} does not support video generation", 400)

    def query_video_task(self, task_id: str) -> dict[str, Any]:
        raise ProviderError("unsupported", f"{self.name} does not support video task polling", 400)
