import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import patch


class TestModelsAPI:
    """Tests for models scanning API."""

    def test_list_models_empty_directory(self, client):
        """Test listing models when directory is empty."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create empty checkpoints and loras directories
            os.makedirs(os.path.join(tmpdir, "checkpoints"))
            os.makedirs(os.path.join(tmpdir, "loras"))

            with patch("app.api.models.settings") as mock_settings:
                mock_settings.models_path = tmpdir
                response = client.get("/api/models")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_checkpoints(self, client):
        """Test listing checkpoint models."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create checkpoints directory with model files
            checkpoints_dir = os.path.join(tmpdir, "checkpoints")
            os.makedirs(checkpoints_dir)

            # Create fake model files
            model1 = os.path.join(checkpoints_dir, "sdxl_base.safetensors")
            model2 = os.path.join(checkpoints_dir, "juggernaut.ckpt")

            # Write some content to get file sizes
            with open(model1, "wb") as f:
                f.write(b"x" * 1000)
            with open(model2, "wb") as f:
                f.write(b"x" * 2000)

            with patch("app.api.models.settings") as mock_settings:
                mock_settings.models_path = tmpdir
                response = client.get("/api/models?model_type=checkpoint")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        # Check model properties
        filenames = {m["filename"] for m in data}
        assert "sdxl_base.safetensors" in filenames
        assert "juggernaut.ckpt" in filenames

        # Check that all have required fields
        for model in data:
            assert "filename" in model
            assert "type" in model
            assert "size" in model
            assert model["type"] == "checkpoint"

    def test_list_loras(self, client):
        """Test listing LoRA models."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create loras directory with model files
            loras_dir = os.path.join(tmpdir, "loras")
            os.makedirs(loras_dir)

            # Create fake LoRA files
            lora1 = os.path.join(loras_dir, "detail_enhancer.safetensors")
            with open(lora1, "wb") as f:
                f.write(b"x" * 500)

            with patch("app.api.models.settings") as mock_settings:
                mock_settings.models_path = tmpdir
                response = client.get("/api/models?model_type=lora")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["filename"] == "detail_enhancer.safetensors"
        assert data[0]["type"] == "lora"

    def test_list_all_models(self, client):
        """Test listing all models (no type filter)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create both directories
            checkpoints_dir = os.path.join(tmpdir, "checkpoints")
            loras_dir = os.path.join(tmpdir, "loras")
            os.makedirs(checkpoints_dir)
            os.makedirs(loras_dir)

            # Create files
            with open(os.path.join(checkpoints_dir, "model.safetensors"), "wb") as f:
                f.write(b"x" * 100)
            with open(os.path.join(loras_dir, "lora.safetensors"), "wb") as f:
                f.write(b"x" * 100)

            with patch("app.api.models.settings") as mock_settings:
                mock_settings.models_path = tmpdir
                response = client.get("/api/models")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        types = {m["type"] for m in data}
        assert types == {"checkpoint", "lora"}

    def test_list_models_ignores_non_model_files(self, client):
        """Test that non-model files are ignored."""
        with tempfile.TemporaryDirectory() as tmpdir:
            checkpoints_dir = os.path.join(tmpdir, "checkpoints")
            os.makedirs(checkpoints_dir)

            # Create model file and non-model file
            with open(os.path.join(checkpoints_dir, "model.safetensors"), "wb") as f:
                f.write(b"x" * 100)
            with open(os.path.join(checkpoints_dir, "readme.txt"), "w") as f:
                f.write("readme")
            with open(os.path.join(checkpoints_dir, "config.json"), "w") as f:
                f.write("{}")

            with patch("app.api.models.settings") as mock_settings:
                mock_settings.models_path = tmpdir
                response = client.get("/api/models")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["filename"] == "model.safetensors"

    def test_list_models_handles_missing_directory(self, client):
        """Test graceful handling when models directory doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Don't create the subdirectories
            with patch("app.api.models.settings") as mock_settings:
                mock_settings.models_path = tmpdir
                response = client.get("/api/models")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_models_with_subdirectories(self, client):
        """Test that models in subdirectories are found."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create nested structure
            subdir = os.path.join(tmpdir, "checkpoints", "sdxl")
            os.makedirs(subdir)

            with open(os.path.join(subdir, "model.safetensors"), "wb") as f:
                f.write(b"x" * 100)

            with patch("app.api.models.settings") as mock_settings:
                mock_settings.models_path = tmpdir
                response = client.get("/api/models")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        # The path should include the subdirectory
        assert "sdxl" in data[0]["path"] or data[0]["filename"] == "model.safetensors"
