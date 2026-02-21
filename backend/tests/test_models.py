from unittest.mock import AsyncMock, patch

from app.api.models import _extract_model_names


# Sample ComfyUI object_info response (subset)
MOCK_OBJECT_INFO = {
    "CheckpointLoaderSimple": {
        "input": {
            "required": {
                "ckpt_name": [["sdxl_base.safetensors", "juggernaut.ckpt"]],
            }
        }
    },
    "LoraLoader": {
        "input": {
            "required": {
                "lora_name": [["detail_enhancer.safetensors", "style_lora.safetensors"]],
            }
        }
    },
}


class TestExtractModelNames:
    """Tests for _extract_model_names helper."""

    def test_extract_checkpoints(self):
        names = _extract_model_names(MOCK_OBJECT_INFO, "CheckpointLoaderSimple", "ckpt_name")
        assert names == ["sdxl_base.safetensors", "juggernaut.ckpt"]

    def test_extract_loras(self):
        names = _extract_model_names(MOCK_OBJECT_INFO, "LoraLoader", "lora_name")
        assert names == ["detail_enhancer.safetensors", "style_lora.safetensors"]

    def test_missing_node_returns_empty(self):
        names = _extract_model_names(MOCK_OBJECT_INFO, "NonExistentNode", "ckpt_name")
        assert names == []

    def test_missing_input_returns_empty(self):
        names = _extract_model_names(MOCK_OBJECT_INFO, "CheckpointLoaderSimple", "nonexistent")
        assert names == []

    def test_empty_object_info(self):
        names = _extract_model_names({}, "CheckpointLoaderSimple", "ckpt_name")
        assert names == []


class TestModelsAPI:
    """Tests for models API endpoint."""

    def test_list_all_models(self, client):
        """Test listing all models from remote ComfyUI."""
        mock_get_object_info = AsyncMock(return_value=MOCK_OBJECT_INFO)
        with patch("app.api.models.comfyui_client.get_object_info", mock_get_object_info):
            response = client.get("/api/models")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        types = {m["type"] for m in data}
        assert types == {"checkpoint", "lora"}

    def test_list_checkpoints_only(self, client):
        """Test filtering by checkpoint type."""
        mock_get_object_info = AsyncMock(return_value=MOCK_OBJECT_INFO)
        with patch("app.api.models.comfyui_client.get_object_info", mock_get_object_info):
            response = client.get("/api/models?model_type=checkpoint")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(m["type"] == "checkpoint" for m in data)

    def test_list_loras_only(self, client):
        """Test filtering by lora type."""
        mock_get_object_info = AsyncMock(return_value=MOCK_OBJECT_INFO)
        with patch("app.api.models.comfyui_client.get_object_info", mock_get_object_info):
            response = client.get("/api/models?model_type=lora")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(m["type"] == "lora" for m in data)

    def test_comfyui_unreachable_returns_empty(self, client):
        """Test graceful handling when ComfyUI is unreachable."""
        mock_get_object_info = AsyncMock(side_effect=Exception("Connection refused"))
        with patch("app.api.models.comfyui_client.get_object_info", mock_get_object_info):
            response = client.get("/api/models")

        assert response.status_code == 200
        assert response.json() == []

    def test_models_sorted_by_filename(self, client):
        """Test that models are sorted alphabetically."""
        mock_get_object_info = AsyncMock(return_value=MOCK_OBJECT_INFO)
        with patch("app.api.models.comfyui_client.get_object_info", mock_get_object_info):
            response = client.get("/api/models")

        data = response.json()
        filenames = [m["filename"] for m in data]
        assert filenames == sorted(filenames, key=str.lower)
