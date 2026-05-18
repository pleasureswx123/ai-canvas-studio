import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA_SERVICE = ROOT / "server" / "media-service"
sys.path.insert(0, str(MEDIA_SERVICE))

from providers.base import MediaRequest, asset_url, safe_slug  # noqa: E402
from providers.mock_provider import MockProvider  # noqa: E402


class MockProviderTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="my-canvas-provider-test-"))
        self.provider = MockProvider()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def request(self, prompt="hello"):
        return MediaRequest(root=self.tmp, project_slug="proj_test", prompt=prompt, body={})

    def test_generate_image_writes_svg_asset(self):
        result = self.provider.generate_image(self.request("<unsafe>"))
        self.assertEqual(result["kind"], "image")
        self.assertTrue(result["savedFilename"].endswith(".svg"))
        self.assertEqual(result["src"], asset_url("proj_test", result["savedFilename"]))
        saved = self.tmp / "projects" / "proj_test" / "assets" / result["savedFilename"]
        self.assertTrue(saved.exists())
        self.assertIn("&lt;unsafe&gt;", saved.read_text(encoding="utf-8"))

    def test_submit_video_task_returns_succeeded_asset(self):
        result = self.provider.submit_video_task(self.request("video prompt"))
        self.assertEqual(result["status"], "SUCCEEDED")
        self.assertEqual(result["kind"], "video")
        self.assertTrue(result["taskId"].startswith("mock:"))
        saved = self.tmp / "projects" / "proj_test" / "assets" / result["savedFilename"]
        self.assertTrue(saved.exists())

    def test_safe_slug_rejects_unsafe_slug(self):
        self.assertEqual(safe_slug("../bad"), "unassigned")
        self.assertEqual(safe_slug("proj_ok-1"), "proj_ok-1")


if __name__ == "__main__":
    unittest.main()
