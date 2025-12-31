from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.services.workflow_service import WorkflowService
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse


router = APIRouter()


def get_workflow_service(db: Session = Depends(get_db)) -> WorkflowService:
    return WorkflowService(db)


@router.get("/workflows", response_model=List[WorkflowResponse])
async def list_workflows(
    category: Optional[str] = Query(None, description="Filter by category"),
    service: WorkflowService = Depends(get_workflow_service),
) -> List[WorkflowResponse]:
    """List all workflow templates."""
    return service.list_all(category=category)


@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    service: WorkflowService = Depends(get_workflow_service),
) -> WorkflowResponse:
    """Get a workflow template by ID."""
    workflow = service.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.post("/workflows", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    data: WorkflowCreate,
    service: WorkflowService = Depends(get_workflow_service),
) -> WorkflowResponse:
    """Create a new workflow template."""
    return service.create(data)


@router.put("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    service: WorkflowService = Depends(get_workflow_service),
) -> WorkflowResponse:
    """Update a workflow template."""
    workflow = service.update(workflow_id, data)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.delete("/workflows/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: str,
    service: WorkflowService = Depends(get_workflow_service),
):
    """Delete a workflow template."""
    result = service.delete(workflow_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if result is False:
        raise HTTPException(status_code=403, detail="Cannot delete built-in workflow")
