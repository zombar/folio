from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.workflow import WorkflowTemplate
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse


class WorkflowService:
    """Service for workflow template operations."""

    def __init__(self, db: Session):
        self.db = db

    def list_all(self, category: Optional[str] = None) -> List[WorkflowResponse]:
        """List all workflow templates, optionally filtered by category."""
        query = self.db.query(WorkflowTemplate)
        if category:
            query = query.filter(WorkflowTemplate.category == category)
        workflows = query.order_by(WorkflowTemplate.updated_at.desc()).all()
        return [WorkflowResponse(**w.to_dict()) for w in workflows]

    def get(self, workflow_id: str) -> Optional[WorkflowResponse]:
        """Get a workflow template by ID."""
        workflow = self.db.query(WorkflowTemplate).filter(
            WorkflowTemplate.id == workflow_id
        ).first()
        if not workflow:
            return None
        return WorkflowResponse(**workflow.to_dict())

    def create(self, data: WorkflowCreate) -> WorkflowResponse:
        """Create a new workflow template."""
        workflow = WorkflowTemplate(
            name=data.name,
            description=data.description,
            workflow_json=data.workflow_json,
            category=data.category,
            is_builtin=False,
        )
        self.db.add(workflow)
        self.db.commit()
        self.db.refresh(workflow)
        return WorkflowResponse(**workflow.to_dict())

    def update(
        self, workflow_id: str, data: WorkflowUpdate
    ) -> Optional[WorkflowResponse]:
        """Update a workflow template."""
        workflow = self.db.query(WorkflowTemplate).filter(
            WorkflowTemplate.id == workflow_id
        ).first()
        if not workflow:
            return None

        if data.name is not None:
            workflow.name = data.name
        if data.description is not None:
            workflow.description = data.description
        if data.workflow_json is not None:
            workflow.workflow_json = data.workflow_json
        if data.category is not None:
            workflow.category = data.category

        self.db.commit()
        self.db.refresh(workflow)
        return WorkflowResponse(**workflow.to_dict())

    def delete(self, workflow_id: str) -> Optional[bool]:
        """
        Delete a workflow template.
        Returns None if not found, False if builtin, True if deleted.
        """
        workflow = self.db.query(WorkflowTemplate).filter(
            WorkflowTemplate.id == workflow_id
        ).first()
        if not workflow:
            return None
        if workflow.is_builtin:
            return False

        self.db.delete(workflow)
        self.db.commit()
        return True

    def prepare_workflow(
        self,
        workflow_id: str,
        model_filename: Optional[str] = None,
        lora_filename: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Prepare a workflow for generation by injecting model filenames.
        Returns the prepared workflow dict or None if not found.
        """
        workflow = self.db.query(WorkflowTemplate).filter(
            WorkflowTemplate.id == workflow_id
        ).first()
        if not workflow:
            return None

        # Deep copy the workflow JSON
        import copy
        prepared = copy.deepcopy(workflow.workflow_json)

        # Inject checkpoint model if specified
        if model_filename:
            for node in prepared.values():
                if isinstance(node, dict) and node.get("class_type") == "CheckpointLoaderSimple":
                    node["inputs"]["ckpt_name"] = model_filename
                    break

        # Inject LoRA if specified
        if lora_filename:
            for node in prepared.values():
                if isinstance(node, dict) and "LoraLoader" in node.get("class_type", ""):
                    node["inputs"]["lora_name"] = lora_filename
                    break

        return prepared
