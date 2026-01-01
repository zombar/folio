"""Tests for animation functionality (TDD approach)."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.generation import Generation, GenerationType, GenerationStatus
from app.models.portfolio import Portfolio
from app.schemas.generation import GenerationCreate, GenerationResponse


# Test fixtures
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def portfolio(db_session):
    """Create a test portfolio."""
    portfolio = Portfolio(name="Test Portfolio")
    db_session.add(portfolio)
    db_session.commit()
    db_session.refresh(portfolio)
    return portfolio


@pytest.fixture
def completed_generation(db_session, portfolio):
    """Create a completed txt2img generation."""
    gen = Generation(
        portfolio_id=portfolio.id,
        generation_type=GenerationType.TXT2IMG,
        prompt="Test prompt",
        width=1024,
        height=1024,
        seed=12345,
        steps=20,
        cfg_scale=7.0,
        sampler="euler",
        status=GenerationStatus.COMPLETED,
        image_path="images/test.webp",
        thumbnail_path="images/test_thumb.webp",
    )
    db_session.add(gen)
    db_session.commit()
    db_session.refresh(gen)
    return gen


# Phase 1: Model Tests


class TestGenerationTypeAnimateEnum:
    """Tests for ANIMATE enum value in GenerationType."""

    def test_generation_type_has_animate(self):
        """GenerationType enum should have ANIMATE value."""
        assert hasattr(GenerationType, "ANIMATE")
        assert GenerationType.ANIMATE.value == "animate"

    def test_animate_is_valid_generation_type(self):
        """ANIMATE should be a valid GenerationType."""
        assert GenerationType.ANIMATE in GenerationType


class TestGenerationAnimationFields:
    """Tests for animation-specific fields on Generation model."""

    def test_generation_has_video_path_field(self, db_session, portfolio):
        """Generation should have video_path field."""
        gen = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.TXT2IMG,
            prompt="Test",
            width=1024,
            height=1024,
            seed=1,
            steps=20,
            cfg_scale=7.0,
            sampler="euler",
            status=GenerationStatus.PENDING,
        )
        gen.video_path = "animations/test.mp4"
        db_session.add(gen)
        db_session.commit()
        db_session.refresh(gen)
        assert gen.video_path == "animations/test.mp4"

    def test_generation_has_motion_bucket_id_field(self, db_session, portfolio):
        """Generation should have motion_bucket_id field for SVD."""
        gen = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.TXT2IMG,
            prompt="Test",
            width=1024,
            height=1024,
            seed=1,
            steps=20,
            cfg_scale=7.0,
            sampler="euler",
            status=GenerationStatus.PENDING,
            motion_bucket_id=127,
        )
        db_session.add(gen)
        db_session.commit()
        db_session.refresh(gen)
        assert gen.motion_bucket_id == 127

    def test_generation_has_fps_field(self, db_session, portfolio):
        """Generation should have fps field."""
        gen = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.TXT2IMG,
            prompt="Test",
            width=1024,
            height=1024,
            seed=1,
            steps=20,
            cfg_scale=7.0,
            sampler="euler",
            status=GenerationStatus.PENDING,
            fps=8,
        )
        db_session.add(gen)
        db_session.commit()
        db_session.refresh(gen)
        assert gen.fps == 8

    def test_generation_has_duration_seconds_field(self, db_session, portfolio):
        """Generation should have duration_seconds field."""
        gen = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.TXT2IMG,
            prompt="Test",
            width=1024,
            height=1024,
            seed=1,
            steps=20,
            cfg_scale=7.0,
            sampler="euler",
            status=GenerationStatus.PENDING,
            duration_seconds=3.0,
        )
        db_session.add(gen)
        db_session.commit()
        db_session.refresh(gen)
        assert gen.duration_seconds == 3.0


class TestAnimateGeneration:
    """Tests for creating animate-type generations."""

    def test_create_animate_generation(self, db_session, completed_generation):
        """Can create an animate-type generation with source_generation_id."""
        animate_gen = Generation(
            portfolio_id=completed_generation.portfolio_id,
            generation_type=GenerationType.ANIMATE,
            source_generation_id=completed_generation.id,
            prompt=completed_generation.prompt,
            width=completed_generation.width,
            height=completed_generation.height,
            seed=12345,
            steps=20,
            cfg_scale=2.5,
            sampler="euler",
            status=GenerationStatus.PENDING,
            motion_bucket_id=127,
            fps=8,
            duration_seconds=3.0,
        )
        db_session.add(animate_gen)
        db_session.commit()
        db_session.refresh(animate_gen)

        assert animate_gen.generation_type == GenerationType.ANIMATE
        assert animate_gen.source_generation_id == completed_generation.id
        assert animate_gen.motion_bucket_id == 127
        assert animate_gen.fps == 8
        assert animate_gen.duration_seconds == 3.0

    def test_animate_generation_source_relationship(
        self, db_session, completed_generation
    ):
        """Animate generation should have relationship to source."""
        animate_gen = Generation(
            portfolio_id=completed_generation.portfolio_id,
            generation_type=GenerationType.ANIMATE,
            source_generation_id=completed_generation.id,
            prompt=completed_generation.prompt,
            width=completed_generation.width,
            height=completed_generation.height,
            seed=12345,
            steps=20,
            cfg_scale=2.5,
            sampler="euler",
            status=GenerationStatus.PENDING,
        )
        db_session.add(animate_gen)
        db_session.commit()
        db_session.refresh(animate_gen)

        assert animate_gen.source_generation is not None
        assert animate_gen.source_generation.id == completed_generation.id


class TestGenerationToDict:
    """Tests for to_dict including animation fields."""

    def test_to_dict_includes_video_path(self, db_session, portfolio):
        """to_dict should include video_path."""
        gen = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.ANIMATE,
            prompt="Test",
            width=1024,
            height=1024,
            seed=1,
            steps=20,
            cfg_scale=7.0,
            sampler="euler",
            status=GenerationStatus.COMPLETED,
            video_path="animations/test.mp4",
        )
        db_session.add(gen)
        db_session.commit()

        data = gen.to_dict()
        assert "video_path" in data
        assert data["video_path"] == "animations/test.mp4"

    def test_to_dict_includes_animation_fields(self, db_session, portfolio):
        """to_dict should include motion_bucket_id, fps, duration_seconds."""
        gen = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.ANIMATE,
            prompt="Test",
            width=1024,
            height=1024,
            seed=1,
            steps=20,
            cfg_scale=7.0,
            sampler="euler",
            status=GenerationStatus.PENDING,
            motion_bucket_id=100,
            fps=12,
            duration_seconds=5.0,
        )
        db_session.add(gen)
        db_session.commit()

        data = gen.to_dict()
        assert "motion_bucket_id" in data
        assert data["motion_bucket_id"] == 100
        assert "fps" in data
        assert data["fps"] == 12
        assert "duration_seconds" in data
        assert data["duration_seconds"] == 5.0


# Phase 2: Schema Tests


class TestGenerationSchemas:
    """Tests for generation schema updates for animation support."""

    def test_generation_create_accepts_animate_type(self):
        """GenerationCreate should accept 'animate' as generation_type."""
        data = GenerationCreate(
            portfolio_id="test-portfolio-id",
            prompt="Test prompt",
            generation_type="animate",
            source_generation_id="source-gen-id",
            motion_bucket_id=127,
            fps=8,
            duration_seconds=3.0,
        )
        assert data.generation_type == "animate"
        assert data.motion_bucket_id == 127
        assert data.fps == 8
        assert data.duration_seconds == 3.0

    def test_generation_create_animation_fields_optional(self):
        """Animation fields should be optional in GenerationCreate."""
        data = GenerationCreate(
            portfolio_id="test-portfolio-id",
            prompt="Test prompt",
        )
        # These should default to None or not raise
        assert data.motion_bucket_id is None
        assert data.fps is None
        assert data.duration_seconds is None

    def test_generation_response_includes_animation_fields(self):
        """GenerationResponse should include animation fields."""
        data = {
            "id": "test-id",
            "portfolio_id": "test-portfolio-id",
            "generation_type": "animate",
            "prompt": "Test",
            "negative_prompt": None,
            "width": 1024,
            "height": 576,
            "seed": 12345,
            "steps": 20,
            "cfg_scale": 2.5,
            "sampler": "euler",
            "scheduler": "karras",
            "status": "completed",
            "progress": 100,
            "error_message": None,
            "image_path": None,
            "thumbnail_path": None,
            "parent_id": None,
            "source_generation_id": "source-id",
            "workflow_id": None,
            "model_filename": None,
            "lora_filename": None,
            "mask_path": None,
            "denoising_strength": None,
            "grow_mask_by": None,
            "upscale_factor": None,
            "upscale_model": None,
            "sharpen_amount": None,
            "outpaint_left": None,
            "outpaint_right": None,
            "outpaint_top": None,
            "outpaint_bottom": None,
            "outpaint_feather": None,
            "video_path": "animations/test.mp4",
            "motion_bucket_id": 127,
            "fps": 8,
            "duration_seconds": 3.0,
            "created_at": "2024-01-01T00:00:00",
            "completed_at": "2024-01-01T00:01:00",
        }
        response = GenerationResponse(**data)
        assert response.video_path == "animations/test.mp4"
        assert response.motion_bucket_id == 127
        assert response.fps == 8
        assert response.duration_seconds == 3.0


# Phase 3: Service Tests


class TestJobTypeAnimationEnum:
    """Tests for ANIMATION enum value in JobType."""

    def test_job_type_has_animation(self):
        """JobType enum should have ANIMATION value."""
        from app.services.job_queue import JobType

        assert hasattr(JobType, "ANIMATION")
        assert JobType.ANIMATION.value == "animation"

    def test_animation_is_valid_job_type(self):
        """ANIMATION should be a valid JobType."""
        from app.services.job_queue import JobType

        assert JobType.ANIMATION in JobType


class TestGenerationServiceAnimation:
    """Tests for animation methods in GenerationService."""

    def test_list_animations_returns_animate_type_only(self, db_session, portfolio):
        """list_animations should only return animate-type generations."""
        # Create txt2img generation
        txt2img = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.TXT2IMG,
            prompt="Test",
            width=1024,
            height=1024,
            seed=1,
            steps=20,
            cfg_scale=7.0,
            sampler="euler",
            status=GenerationStatus.COMPLETED,
            image_path="images/test.webp",
        )
        db_session.add(txt2img)

        # Create animate generation
        animate = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.ANIMATE,
            source_generation_id=txt2img.id,
            prompt="Test",
            width=1024,
            height=576,
            seed=1,
            steps=20,
            cfg_scale=2.5,
            sampler="euler",
            status=GenerationStatus.COMPLETED,
            video_path="animations/test.mp4",
        )
        db_session.add(animate)
        db_session.commit()

        from app.services.generation_service import GenerationService

        service = GenerationService(db_session)
        animations = service.list_animations(portfolio.id)

        assert len(animations) == 1
        assert animations[0].generation_type == "animate"
        assert animations[0].video_path == "animations/test.mp4"

    def test_should_auto_animate_at_25_percent(self, db_session, portfolio):
        """should_auto_animate returns True when animations < 25% of txt2img."""
        # Create 4 txt2img generations (need 1 animation for 25%)
        for i in range(4):
            gen = Generation(
                portfolio_id=portfolio.id,
                generation_type=GenerationType.TXT2IMG,
                prompt=f"Test {i}",
                width=1024,
                height=1024,
                seed=i,
                steps=20,
                cfg_scale=7.0,
                sampler="euler",
                status=GenerationStatus.COMPLETED,
                image_path=f"images/test{i}.webp",
            )
            db_session.add(gen)
        db_session.commit()

        from app.services.generation_service import GenerationService

        service = GenerationService(db_session)
        result = service.should_auto_animate(portfolio.id)

        assert result is True

    def test_should_not_auto_animate_at_25_percent(self, db_session, portfolio):
        """should_auto_animate returns False when animations >= 25% of txt2img."""
        # Create 4 txt2img generations
        txt2imgs = []
        for i in range(4):
            gen = Generation(
                portfolio_id=portfolio.id,
                generation_type=GenerationType.TXT2IMG,
                prompt=f"Test {i}",
                width=1024,
                height=1024,
                seed=i,
                steps=20,
                cfg_scale=7.0,
                sampler="euler",
                status=GenerationStatus.COMPLETED,
                image_path=f"images/test{i}.webp",
            )
            db_session.add(gen)
            txt2imgs.append(gen)
        db_session.commit()
        db_session.refresh(txt2imgs[0])

        # Create 1 animation (25%)
        animate = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.ANIMATE,
            source_generation_id=txt2imgs[0].id,
            prompt="Test",
            width=1024,
            height=576,
            seed=1,
            steps=20,
            cfg_scale=2.5,
            sampler="euler",
            status=GenerationStatus.COMPLETED,
            video_path="animations/test.mp4",
        )
        db_session.add(animate)
        db_session.commit()

        from app.services.generation_service import GenerationService

        service = GenerationService(db_session)
        result = service.should_auto_animate(portfolio.id)

        assert result is False

    def test_get_uanimated_generation(self, db_session, portfolio):
        """get_unanimated_generation returns a txt2img without an animation."""
        # Create txt2img without animation
        gen1 = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.TXT2IMG,
            prompt="Test 1",
            width=1024,
            height=1024,
            seed=1,
            steps=20,
            cfg_scale=7.0,
            sampler="euler",
            status=GenerationStatus.COMPLETED,
            image_path="images/test1.webp",
        )
        db_session.add(gen1)

        # Create txt2img with animation
        gen2 = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.TXT2IMG,
            prompt="Test 2",
            width=1024,
            height=1024,
            seed=2,
            steps=20,
            cfg_scale=7.0,
            sampler="euler",
            status=GenerationStatus.COMPLETED,
            image_path="images/test2.webp",
        )
        db_session.add(gen2)
        db_session.commit()
        db_session.refresh(gen2)

        # Create animation for gen2
        animate = Generation(
            portfolio_id=portfolio.id,
            generation_type=GenerationType.ANIMATE,
            source_generation_id=gen2.id,
            prompt="Test 2",
            width=1024,
            height=576,
            seed=1,
            steps=20,
            cfg_scale=2.5,
            sampler="euler",
            status=GenerationStatus.COMPLETED,
            video_path="animations/test.mp4",
        )
        db_session.add(animate)
        db_session.commit()
        db_session.refresh(gen1)

        from app.services.generation_service import GenerationService

        service = GenerationService(db_session)
        result = service.get_unanimated_generation(portfolio.id)

        assert result is not None
        assert result.id == gen1.id


# Phase 4: API Tests


class TestAnimationEndpoints:
    """Tests for animation API endpoint registration (route existence only)."""

    def test_video_endpoint_route_exists(self):
        """Video route should be registered in images router."""
        from app.api.images import router

        routes = [route.path for route in router.routes]
        assert "/images/{generation_id}/video" in routes

    def test_animations_endpoint_route_exists(self):
        """Animations route should be registered in portfolios router."""
        from app.api.portfolios import router

        routes = [route.path for route in router.routes]
        assert "/portfolios/{portfolio_id}/animations" in routes
