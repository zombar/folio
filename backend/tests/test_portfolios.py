

class TestPortfolioAPI:
    """Tests for portfolio CRUD operations."""

    def test_create_portfolio(self, client):
        """Test creating a new portfolio."""
        response = client.post(
            "/api/portfolios",
            json={"name": "Test Portfolio", "description": "A test portfolio"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Portfolio"
        assert data["description"] == "A test portfolio"
        assert "id" in data

    def test_list_portfolios_empty(self, client):
        """Test listing portfolios when none exist."""
        response = client.get("/api/portfolios")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_portfolios(self, client):
        """Test listing portfolios."""
        # Create two portfolios
        client.post("/api/portfolios", json={"name": "Portfolio 1"})
        client.post("/api/portfolios", json={"name": "Portfolio 2"})

        response = client.get("/api/portfolios")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_get_portfolio(self, client):
        """Test getting a single portfolio."""
        # Create portfolio
        create_response = client.post(
            "/api/portfolios",
            json={"name": "My Portfolio"}
        )
        portfolio_id = create_response.json()["id"]

        # Get portfolio
        response = client.get(f"/api/portfolios/{portfolio_id}")
        assert response.status_code == 200
        assert response.json()["name"] == "My Portfolio"

    def test_get_portfolio_not_found(self, client):
        """Test getting a non-existent portfolio."""
        response = client.get("/api/portfolios/non-existent-id")
        assert response.status_code == 404

    def test_update_portfolio(self, client):
        """Test updating a portfolio."""
        # Create portfolio
        create_response = client.post(
            "/api/portfolios",
            json={"name": "Original Name"}
        )
        portfolio_id = create_response.json()["id"]

        # Update portfolio
        response = client.put(
            f"/api/portfolios/{portfolio_id}",
            json={"name": "Updated Name", "description": "New description"}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"
        assert response.json()["description"] == "New description"

    def test_delete_portfolio(self, client):
        """Test deleting a portfolio."""
        # Create portfolio
        create_response = client.post(
            "/api/portfolios",
            json={"name": "To Delete"}
        )
        portfolio_id = create_response.json()["id"]

        # Delete portfolio
        response = client.delete(f"/api/portfolios/{portfolio_id}")
        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(f"/api/portfolios/{portfolio_id}")
        assert get_response.status_code == 404

    def test_delete_portfolio_not_found(self, client):
        """Test deleting a non-existent portfolio."""
        response = client.delete("/api/portfolios/non-existent-id")
        assert response.status_code == 404
