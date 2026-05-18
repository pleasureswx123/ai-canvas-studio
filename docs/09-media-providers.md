# Media Providers

The media service exposes stable frontend routes and chooses provider adapters internally.

## Routes

- `POST /api/generate-image`
- `POST /api/generate-video`
- `POST /api/seedance-face-review`
- `GET /api/video-task/:taskId`
- `GET /api/media-health`

## Provider Selection

Set `MEDIA_PROVIDER` as a comma-separated list:

```env
MEDIA_PROVIDER=mock
MEDIA_PROVIDER=openai_image,ark_video
MEDIA_PROVIDER=mock,openai_image,vectorengine_image,ark_video,dashscope_video,xunke_video
```

The frontend may also pass `provider` in the request body. If omitted, the registry chooses the first suitable configured provider, falling back to mock.

## Supported Providers

| Provider | Capability | Status |
| --- | --- | --- |
| `mock` | image + video | default, no credentials |
| `openai_image` | image | OpenAI-compatible `/images/generations` |
| `vectorengine_image` | image | OpenAI-compatible `/chat/completions` image relay |
| `ark_video` | video task submit/query | Ark task API, downloads successful result into project assets when a URL is returned |
| `dashscope_video` | video task submit/query | DashScope `wan2.7-i2v`, requires at least one input image |
| `xunke_video` | video task submit/query | Xunke/KKAI Seedance-compatible video API |

## Environment

```env
MEDIA_PROVIDER=mock

OPENAI_IMAGE_API_KEY=
OPENAI_IMAGE_BASE_URL=https://api.openai.com/v1
OPENAI_IMAGE_MODEL=gpt-image-2

ARK_API_KEY=
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_IMAGE_MODEL=doubao-seedream-5-0-260128
ARK_VIDEO_MODEL=doubao-seedance-2-0-260128

VECTORENGINE_API_KEY=
VECTORENGINE_BASE_URL=https://api.vectorengine.ai/v1
VECTORENGINE_IMAGE_MODEL=gemini-3-pro-image-preview

DASHSCOPE_API_KEY=
DASHSCOPE_VIDEO_MODEL=wan2.7-i2v

XUNKE_API_KEY=
XUNKE_BASE_URL=https://api.xunkecloud.cn
XUNKE_VIDEO_MODEL_SEEDANCE_2_0=seed-2-480p
XUNKE_VIDEO_MODEL_SEEDANCE_2_0_720P=seed-2-720p

SEEDANCE_REVIEW_MODE=
```

`openai_image` also accepts `OPENAI_API_KEY`, `GPT_IMAGE_2_API_KEY`, `VECTORENGINE_API_KEY`, or `ARK_API_KEY` as fallback keys. This keeps migration flexible while the team decides the final vendor matrix.

`dashscope_video` is image-to-video only in this phase. The request body must include `inputImages` or `input_images` with at least one public image URL.

## Seedance Material Review

Material review is exposed through `POST /api/material-library/seedance-review/:id`.
The Node API stores the normalized result in `MaterialItem.seedanceFaceReview`.

Current supported paths:

- Manual: provide an approved `assetRef` such as `asset://asset-xxx`; the material is marked `approved`.
- Local test: set `SEEDANCE_REVIEW_MODE=mock`, then the media service returns a mock approved review.
- Real provider: keep the API contract and replace `/api/seedance-face-review` with a configured provider adapter.

## Error Contract

Provider failures return:

```json
{
  "ok": false,
  "error": {
    "code": "missing_api_key",
    "message": "Readable message"
  }
}
```

Common codes:

- `missing_api_key`
- `provider_http_error`
- `provider_network_error`
- `provider_bad_response`
- `download_http_error`
- `download_network_error`

## Storage Rule

All generated files must be saved under:

```text
projects/<slug>/assets/
```

The media service returns `/api/project/media/<slug>/<filename>` URLs so the Node API remains the only media-serving boundary.

## Validation Notes

- `vectorengine_image` has been validated with the migrated legacy `VECTORENGINE_API_KEY`.
- `xunke_video` has been validated with the migrated legacy `XUNKE_API_KEY`; a real task reached `SUCCEEDED` and saved an `.mp4` under the temporary project assets before cleanup.
- `dashscope_video` reached the provider but returned `AllocationQuota.FreeTierOnly`, so the adapter is wired but quota requires console-side adjustment.
- `ark_video` reached configuration but returned provider-side 404 for the current endpoint/model combination; keep it available while confirming the exact account endpoint.
