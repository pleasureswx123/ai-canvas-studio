from __future__ import annotations

import os

from providers.ark_video_provider import ArkVideoProvider
from providers.dashscope_video_provider import DashScopeVideoProvider
from providers.mock_provider import MockProvider
from providers.openai_image_provider import OpenAIImageProvider
from providers.vectorengine_image_provider import VectorEngineImageProvider
from providers.xunke_video_provider import XunkeVideoProvider


def _provider_names(raw: str) -> list[str]:
    names = [part.strip().lower() for part in raw.split(",") if part.strip()]
    return names or ["mock"]


def build_providers() -> dict[str, object]:
    names = _provider_names(os.environ.get("MEDIA_PROVIDER", "mock"))
    providers: dict[str, object] = {}
    for name in names:
        if name == "mock":
            providers["mock"] = MockProvider()
        elif name in {"openai_image", "openai-images", "openai"}:
            providers["openai_image"] = OpenAIImageProvider()
        elif name in {"vectorengine_image", "vectorengine", "gemini"}:
            providers["vectorengine_image"] = VectorEngineImageProvider()
        elif name in {"ark_video", "ark-video", "ark"}:
            providers["ark_video"] = ArkVideoProvider()
        elif name in {"dashscope_video", "dashscope", "dashscope-video"}:
            providers["dashscope_video"] = DashScopeVideoProvider()
        elif name in {"xunke_video", "xunke", "xunke_seedance", "kkai"}:
            providers["xunke_video"] = XunkeVideoProvider()
    if not providers:
        providers["mock"] = MockProvider()
    return providers


class ProviderRegistry:
    def __init__(self) -> None:
        self.providers = build_providers()
        self.default = next(iter(self.providers.values()))

    def health(self) -> dict:
        return {
            "active": list(self.providers.keys()),
            "providers": {name: provider.health() for name, provider in self.providers.items()},
        }

    def image_provider(self, preferred: str = ""):
        key = preferred.strip().lower()
        if key and key in self.providers:
            return self.providers[key]
        if "openai_image" in self.providers:
            return self.providers["openai_image"]
        if "vectorengine_image" in self.providers:
            return self.providers["vectorengine_image"]
        return self.default

    def video_provider(self, preferred: str = ""):
        key = preferred.strip().lower()
        if key and key in self.providers:
            return self.providers[key]
        if "ark_video" in self.providers:
            return self.providers["ark_video"]
        if "dashscope_video" in self.providers:
            return self.providers["dashscope_video"]
        if "xunke_video" in self.providers:
            return self.providers["xunke_video"]
        return self.default
