import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User,
    UserRole,
    Institution,
    TrainingProgramme,
    Batch,
    Module,
    ContentItem,
    TraineeProfile,
    batch_trainees
)
from app.schemas import (
    InstitutionResponse,
    TrainingProgrammeCreate,
    TrainingProgrammeResponse,
    ModuleCreate,
    ModuleResponse,
    ContentItemCreate,
    ContentItemResponse,
    BatchCreate,
    BatchResponse,
    BatchAddTraineesRequest,
    BatchTraineeItem
)
from app.dependencies import get_current_user, require_role
from app.services.storage_service import validate_file_upload, upload_to_cloudinary

router = APIRouter(prefix="/api/trainer", tags=["Trainer Course Management"])
public_router = APIRouter(prefix="/api", tags=["Institutions & Public"])

# Directory for uploaded course files (PDFs, docs)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def seed_default_institutions(db: Session):
    if db.query(Institution).count() == 0:
        defaults = [
            Institution(name="Vaikunth Mehta National Institute of Cooperative Management (VAMNICOM)", code="VAMNICOM-PUN", location="Pune, Maharashtra"),
            Institution(name="National Institute of Cooperative Management (NICM)", code="NICM-GND", location="Gandhinagar, Gujarat"),
            Institution(name="Regional Institute of Cooperative Management (RICM)", code="RICM-BLR", location="Bengaluru, Karnataka"),
            Institution(name="Regional Institute of Cooperative Management (RICM)", code="RICM-CHD", location="Chandigarh"),
            Institution(name="Institute of Cooperative Management (ICM)", code="ICM-BPL", location="Bhopal, Madhya Pradesh"),
        ]
        db.add_all(defaults)
        db.commit()

@public_router.get("/institutions", response_model=List[InstitutionResponse])
def get_institutions(db: Session = Depends(get_db)):
    seed_default_institutions(db)
    return db.query(Institution).all()

def format_programme_response(programme: TrainingProgramme) -> TrainingProgrammeResponse:
    modules_res = []
    for m in programme.modules:
        c_items = [
            ContentItemResponse(
                id=c.id,
                module_id=c.module_id,
                type=c.type,
                title=c.title,
                url_or_file_path=c.url_or_file_path,
                url=getattr(c, "url", None) or c.url_or_file_path,
                order=c.order,
                created_at=c.created_at
            ) for c in m.content_items
        ]
        modules_res.append(ModuleResponse(
            id=m.id,
            programme_id=m.programme_id,
            title=m.title,
            order=m.order,
            created_at=m.created_at,
            content_items=c_items
        ))

    batches_res = [
        BatchResponse(
            id=b.id,
            programme_id=b.programme_id,
            batch_name=b.batch_name,
            trainee_count=len(b.trainees),
            created_at=b.created_at
        ) for b in programme.batches
    ]

    return TrainingProgrammeResponse(
        id=programme.id,
        title=programme.title,
        description=programme.description,
        institution_id=programme.institution_id,
        institution_name=programme.institution.name if programme.institution else None,
        trainer_id=programme.trainer_id,
        trainer_name=programme.trainer.name if programme.trainer else None,
        start_date=programme.start_date,
        end_date=programme.end_date,
        created_at=programme.created_at,
        modules=modules_res,
        batches=batches_res
    )

@router.post("/programmes", response_model=TrainingProgrammeResponse, status_code=status.HTTP_201_CREATED)
def create_programme(
    data: TrainingProgrammeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TRAINER, UserRole.ADMIN]))
):
    # Ensure institution exists
    inst = db.query(Institution).filter(Institution.id == data.institution_id).first()
    if not inst:
        seed_default_institutions(db)
        inst = db.query(Institution).first()
        if not inst:
            raise HTTPException(status_code=400, detail="Invalid institution_id")

    programme = TrainingProgramme(
        title=data.title,
        description=data.description,
        institution_id=inst.id,
        trainer_id=current_user.id,
        start_date=data.start_date,
        end_date=data.end_date
    )
    db.add(programme)
    db.commit()
    db.refresh(programme)
    return format_programme_response(programme)

@router.get("/programmes", response_model=List[TrainingProgrammeResponse])
def list_programmes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TRAINER, UserRole.ADMIN]))
):
    if current_user.role == UserRole.ADMIN:
        programmes = db.query(TrainingProgramme).order_by(TrainingProgramme.id.desc()).all()
    else:
        programmes = db.query(TrainingProgramme).filter(
            TrainingProgramme.trainer_id == current_user.id
        ).order_by(TrainingProgramme.id.desc()).all()

    return [format_programme_response(p) for p in programmes]

@router.get("/programmes/{id}", response_model=TrainingProgrammeResponse)
def get_programme(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    programme = db.query(TrainingProgramme).filter(TrainingProgramme.id == id).first()
    if not programme:
        raise HTTPException(status_code=404, detail="Programme not found")
    return format_programme_response(programme)

@router.post("/programmes/{id}/modules", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
def add_module(
    id: int,
    data: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TRAINER, UserRole.ADMIN]))
):
    programme = db.query(TrainingProgramme).filter(TrainingProgramme.id == id).first()
    if not programme:
        raise HTTPException(status_code=404, detail="Programme not found")

    new_module = Module(
        programme_id=programme.id,
        title=data.title,
        order=data.order
    )
    db.add(new_module)
    db.commit()
    db.refresh(new_module)

    return ModuleResponse(
        id=new_module.id,
        programme_id=new_module.programme_id,
        title=new_module.title,
        order=new_module.order,
        created_at=new_module.created_at,
        content_items=[]
    )

@router.post("/modules/{id}/content", response_model=ContentItemResponse, status_code=status.HTTP_201_CREATED)
def add_content_item(
    id: int,
    data: ContentItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TRAINER, UserRole.ADMIN]))
):
    module = db.query(Module).filter(Module.id == id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    item = ContentItem(
        module_id=module.id,
        type=data.type.lower(),
        title=data.title,
        url_or_file_path=data.url_or_file_path,
        url=data.url_or_file_path,
        order=data.order
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return ContentItemResponse(
        id=item.id,
        module_id=item.module_id,
        type=item.type,
        title=item.title,
        url_or_file_path=item.url_or_file_path,
        url=item.url or item.url_or_file_path,
        order=item.order,
        created_at=item.created_at
    )

@router.post("/modules/{id}/upload-content", response_model=ContentItemResponse, status_code=status.HTTP_201_CREATED)
async def upload_content_file(
    id: int,
    title: str = Form(...),
    type: str = Form("pdf"),
    order: int = Form(1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TRAINER, UserRole.ADMIN]))
):
    module = db.query(Module).filter(Module.id == id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # 1. Validate file size and type (PDF, mp4, etc.)
    file_bytes = validate_file_upload(file=file, item_type=type.lower())

    # 2. Upload to Cloudinary (or local fallback if unconfigured)
    resource_type = "video" if type.lower() == "video" else "raw"
    upload_result = upload_to_cloudinary(
        file_bytes=file_bytes,
        filename=file.filename or f"module_{id}_{type.lower()}",
        folder=f"ncct/curriculum/modules/{id}",
        resource_type=resource_type
    )
    secure_url = upload_result["secure_url"]

    # 3. Store returned secure_url in ContentItem.url and ContentItem.url_or_file_path
    item = ContentItem(
        module_id=module.id,
        type=type.lower(),
        title=title,
        url_or_file_path=secure_url,
        url=secure_url,
        order=order
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return ContentItemResponse(
        id=item.id,
        module_id=item.module_id,
        type=item.type,
        title=item.title,
        url_or_file_path=item.url_or_file_path,
        url=item.url or item.url_or_file_path,
        order=item.order,
        created_at=item.created_at
    )

@router.post("/programmes/{id}/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    id: int,
    data: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TRAINER, UserRole.ADMIN]))
):
    programme = db.query(TrainingProgramme).filter(TrainingProgramme.id == id).first()
    if not programme:
        raise HTTPException(status_code=404, detail="Programme not found")

    batch = Batch(
        programme_id=programme.id,
        batch_name=data.batch_name
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    return BatchResponse(
        id=batch.id,
        programme_id=batch.programme_id,
        batch_name=batch.batch_name,
        trainee_count=0,
        created_at=batch.created_at
    )

@router.post("/batches/{id}/trainees", response_model=List[BatchTraineeItem])
def add_trainees_to_batch(
    id: int,
    data: BatchAddTraineesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TRAINER, UserRole.ADMIN]))
):
    batch = db.query(Batch).filter(Batch.id == id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    added_list = []
    for identifier in data.trainee_ids:
        identifier_str = str(identifier).strip()
        # Find TraineeProfile by trainee_id string or integer ID
        trainee_prof = None
        if identifier_str.isdigit():
            trainee_prof = db.query(TraineeProfile).filter(TraineeProfile.id == int(identifier_str)).first()
        if not trainee_prof:
            trainee_prof = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == identifier_str).first()

        if trainee_prof and trainee_prof not in batch.trainees:
            batch.trainees.append(trainee_prof)

    db.commit()
    db.refresh(batch)

    return [
        BatchTraineeItem(
            id=t.id,
            trainee_id=t.trainee_id,
            name=t.user.name,
            email=t.user.email,
            institution=t.institution,
            course_enrolled=t.course_enrolled
        ) for t in batch.trainees
    ]

@router.get("/batches/{id}/trainees", response_model=List[BatchTraineeItem])
def get_batch_trainees(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TRAINER, UserRole.ADMIN]))
):
    batch = db.query(Batch).filter(Batch.id == id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    return [
        BatchTraineeItem(
            id=t.id,
            trainee_id=t.trainee_id,
            name=t.user.name,
            email=t.user.email,
            institution=t.institution,
            course_enrolled=t.course_enrolled
        ) for t in batch.trainees
    ]

@router.get("/trainees/search", response_model=List[BatchTraineeItem])
def search_trainees(
    query: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TRAINER, UserRole.ADMIN]))
):
    """
    Search registered trainees by trainee_id, name, or email.
    """
    profiles_query = db.query(TraineeProfile).join(User, TraineeProfile.user_id == User.id)
    if query:
        q = f"%{query}%"
        profiles_query = profiles_query.filter(
            (TraineeProfile.trainee_id.ilike(q)) |
            (User.name.ilike(q)) |
            (User.email.ilike(q)) |
            (TraineeProfile.institution.ilike(q))
        )
    profiles = profiles_query.limit(20).all()

    return [
        BatchTraineeItem(
            id=p.id,
            trainee_id=p.trainee_id,
            name=p.user.name,
            email=p.user.email,
            institution=p.institution,
            course_enrolled=p.course_enrolled
        ) for p in profiles
    ]
