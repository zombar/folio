"""Built-in workflow templates seeded on startup."""

from sqlalchemy.orm import Session

from app.models.workflow import WorkflowTemplate


# Basic SDXL txt2img workflow
TXT2IMG_SDXL = {
    "3": {
        "class_type": "KSampler",
        "inputs": {
            "cfg": 7.0,
            "denoise": 1.0,
            "latent_image": ["5", 0],
            "model": ["4", 0],
            "negative": ["7", 0],
            "positive": ["6", 0],
            "sampler_name": "euler",
            "scheduler": "normal",
            "seed": 0,
            "steps": 30
        }
    },
    "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
            "ckpt_name": "model.safetensors"
        }
    },
    "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
            "batch_size": 1,
            "height": 1024,
            "width": 1024
        }
    },
    "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "clip": ["4", 1],
            "text": ""
        }
    },
    "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "clip": ["4", 1],
            "text": ""
        }
    },
    "8": {
        "class_type": "VAEDecode",
        "inputs": {
            "samples": ["3", 0],
            "vae": ["4", 2]
        }
    },
    "9": {
        "class_type": "SaveImage",
        "inputs": {
            "filename_prefix": "folio",
            "images": ["8", 0]
        }
    }
}

# SDXL txt2img with LoRA workflow
TXT2IMG_SDXL_LORA = {
    "3": {
        "class_type": "KSampler",
        "inputs": {
            "cfg": 7.0,
            "denoise": 1.0,
            "latent_image": ["5", 0],
            "model": ["10", 0],
            "negative": ["7", 0],
            "positive": ["6", 0],
            "sampler_name": "euler",
            "scheduler": "normal",
            "seed": 0,
            "steps": 30
        }
    },
    "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
            "ckpt_name": "model.safetensors"
        }
    },
    "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
            "batch_size": 1,
            "height": 1024,
            "width": 1024
        }
    },
    "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "clip": ["10", 1],
            "text": ""
        }
    },
    "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "clip": ["10", 1],
            "text": ""
        }
    },
    "8": {
        "class_type": "VAEDecode",
        "inputs": {
            "samples": ["3", 0],
            "vae": ["4", 2]
        }
    },
    "9": {
        "class_type": "SaveImage",
        "inputs": {
            "filename_prefix": "folio",
            "images": ["8", 0]
        }
    },
    "10": {
        "class_type": "LoraLoader",
        "inputs": {
            "clip": ["4", 1],
            "lora_name": "lora.safetensors",
            "model": ["4", 0],
            "strength_clip": 1.0,
            "strength_model": 1.0
        }
    }
}


BUILTIN_WORKFLOWS = [
    {
        "name": "SDXL Text to Image",
        "description": "Basic text-to-image generation using SDXL checkpoints.",
        "category": "txt2img",
        "workflow_json": TXT2IMG_SDXL,
    },
    {
        "name": "SDXL Text to Image + LoRA",
        "description": "Text-to-image with LoRA support for styles and characters.",
        "category": "txt2img",
        "workflow_json": TXT2IMG_SDXL_LORA,
    },
]


def seed_builtin_workflows(db: Session) -> int:
    """
    Seed built-in workflow templates.
    Returns the number of workflows created.
    """
    created = 0

    for workflow_data in BUILTIN_WORKFLOWS:
        # Check if workflow already exists by name
        existing = db.query(WorkflowTemplate).filter(
            WorkflowTemplate.name == workflow_data["name"],
            WorkflowTemplate.is_builtin.is_(True)
        ).first()

        if not existing:
            template = WorkflowTemplate(
                name=workflow_data["name"],
                description=workflow_data["description"],
                category=workflow_data["category"],
                workflow_json=workflow_data["workflow_json"],
                is_builtin=True,
            )
            db.add(template)
            created += 1

    if created > 0:
        db.commit()

    return created
