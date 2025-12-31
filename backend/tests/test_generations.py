import pytest
from unittest.mock import patch, AsyncMock


class TestGenerationAPI:
    """Tests for generation CRUD operations."""

    def test_list_generations_empty(self, client):
        """Test listing generations when none exist."""
        response = client.get("/api/generations")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_generations_filtered_by_portfolio(self, client):
        """Test listing generations filtered by portfolio."""
        # Create portfolio
        portfolio_response = client.post(
            "/api/portfolios",
            json={"name": "Test Portfolio"}
        )
        portfolio_id = portfolio_response.json()["id"]

        # Request generations for this portfolio
        response = client.get(f"/api/generations?portfolio_id={portfolio_id}")
        assert response.status_code == 200
        assert response.json() == []

    @patch("app.services.generation_service.job_queue")
    @patch("app.services.generation_service.event_bus")
    def test_create_generation(self, mock_event_bus, mock_job_queue, client):
        """Test creating a new generation."""
        # Mock the async methods
        mock_job_queue.enqueue = AsyncMock()
        mock_event_bus.publish = AsyncMock()

        # Create portfolio first
        portfolio_response = client.post(
            "/api/portfolios",
            json={"name": "Test Portfolio"}
        )
        portfolio_id = portfolio_response.json()["id"]

        # Create generation
        response = client.post(
            "/api/generations",
            json={
                "portfolio_id": portfolio_id,
                "prompt": "a beautiful sunset",
                "width": 512,
                "height": 512,
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["prompt"] == "a beautiful sunset"
        assert data["portfolio_id"] == portfolio_id
        assert data["status"] == "pending"
        assert data["width"] == 512
        assert data["height"] == 512
        assert data["seed"] is not None  # Random seed assigned

    def test_get_generation_not_found(self, client):
        """Test getting a non-existent generation."""
        response = client.get("/api/generations/non-existent-id")
        assert response.status_code == 404

    def test_delete_generation_not_found(self, client):
        """Test deleting a non-existent generation."""
        response = client.delete("/api/generations/non-existent-id")
        assert response.status_code == 404
