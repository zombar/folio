

SAMPLE_WORKFLOW = {
    "3": {
        "class_type": "KSampler",
        "inputs": {
            "seed": 123,
            "steps": 30,
            "cfg": 7.0,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1.0,
        }
    },
    "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
            "ckpt_name": "model.safetensors"
        }
    },
    "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "text": "a photo",
            "clip": ["4", 1]
        }
    }
}


class TestWorkflowsAPI:
    """Tests for workflow template CRUD operations."""

    def test_create_workflow(self, client):
        """Test creating a new workflow template."""
        response = client.post(
            "/api/workflows",
            json={
                "name": "Test Workflow",
                "description": "A test workflow",
                "workflow_json": SAMPLE_WORKFLOW,
                "category": "txt2img"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Workflow"
        assert data["description"] == "A test workflow"
        assert data["category"] == "txt2img"
        assert not data["is_builtin"]
        assert "id" in data
        assert "workflow_json" in data

    def test_list_workflows_empty(self, client):
        """Test listing workflows when none exist."""
        response = client.get("/api/workflows")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_workflows(self, client):
        """Test listing workflows."""
        # Create two workflows
        client.post(
            "/api/workflows",
            json={"name": "Workflow 1", "workflow_json": SAMPLE_WORKFLOW}
        )
        client.post(
            "/api/workflows",
            json={"name": "Workflow 2", "workflow_json": SAMPLE_WORKFLOW}
        )

        response = client.get("/api/workflows")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_list_workflows_by_category(self, client):
        """Test filtering workflows by category."""
        client.post(
            "/api/workflows",
            json={"name": "Txt2Img", "workflow_json": SAMPLE_WORKFLOW, "category": "txt2img"}
        )
        client.post(
            "/api/workflows",
            json={"name": "Img2Img", "workflow_json": SAMPLE_WORKFLOW, "category": "img2img"}
        )

        # Filter by txt2img
        response = client.get("/api/workflows?category=txt2img")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Txt2Img"

    def test_get_workflow(self, client):
        """Test getting a single workflow."""
        # Create workflow
        create_response = client.post(
            "/api/workflows",
            json={"name": "My Workflow", "workflow_json": SAMPLE_WORKFLOW}
        )
        workflow_id = create_response.json()["id"]

        # Get workflow
        response = client.get(f"/api/workflows/{workflow_id}")
        assert response.status_code == 200
        assert response.json()["name"] == "My Workflow"
        assert response.json()["workflow_json"] == SAMPLE_WORKFLOW

    def test_get_workflow_not_found(self, client):
        """Test getting a non-existent workflow."""
        response = client.get("/api/workflows/non-existent-id")
        assert response.status_code == 404

    def test_update_workflow(self, client):
        """Test updating a workflow."""
        # Create workflow
        create_response = client.post(
            "/api/workflows",
            json={"name": "Original Name", "workflow_json": SAMPLE_WORKFLOW}
        )
        workflow_id = create_response.json()["id"]

        # Update workflow
        response = client.put(
            f"/api/workflows/{workflow_id}",
            json={"name": "Updated Name", "description": "New description"}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"
        assert response.json()["description"] == "New description"

    def test_delete_workflow(self, client):
        """Test deleting a workflow."""
        # Create workflow
        create_response = client.post(
            "/api/workflows",
            json={"name": "To Delete", "workflow_json": SAMPLE_WORKFLOW}
        )
        workflow_id = create_response.json()["id"]

        # Delete workflow
        response = client.delete(f"/api/workflows/{workflow_id}")
        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(f"/api/workflows/{workflow_id}")
        assert get_response.status_code == 404

    def test_delete_workflow_not_found(self, client):
        """Test deleting a non-existent workflow."""
        response = client.delete("/api/workflows/non-existent-id")
        assert response.status_code == 404

    def test_cannot_delete_builtin_workflow(self, client, db_session):
        """Test that built-in workflows cannot be deleted."""
        from app.models.workflow import WorkflowTemplate
        import uuid

        # Create a builtin workflow directly in the database
        builtin = WorkflowTemplate(
            id=str(uuid.uuid4()),
            name="Built-in Workflow",
            workflow_json=SAMPLE_WORKFLOW,
            is_builtin=True
        )
        db_session.add(builtin)
        db_session.commit()

        # Try to delete it
        response = client.delete(f"/api/workflows/{builtin.id}")
        assert response.status_code == 403

        # Verify not deleted
        get_response = client.get(f"/api/workflows/{builtin.id}")
        assert get_response.status_code == 200

    def test_update_workflow_json(self, client):
        """Test updating workflow JSON content."""
        # Create workflow
        create_response = client.post(
            "/api/workflows",
            json={"name": "Workflow", "workflow_json": SAMPLE_WORKFLOW}
        )
        workflow_id = create_response.json()["id"]

        # Update with new workflow JSON
        new_workflow = {**SAMPLE_WORKFLOW, "new_node": {"class_type": "NewNode"}}
        response = client.put(
            f"/api/workflows/{workflow_id}",
            json={"workflow_json": new_workflow}
        )
        assert response.status_code == 200
        assert "new_node" in response.json()["workflow_json"]
