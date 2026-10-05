from fastapi import APIRouter, Depends
from app.models import User, UserRole
from app.dependencies import require_role

router = APIRouter(prefix="/api/protected", tags=["Role Protected Resources"])

@router.get("/trainee")
def get_trainee_content(user: User = Depends(require_role([UserRole.TRAINEE, UserRole.ADMIN]))):
    return {
        "message": f"Welcome Trainee {user.name} to the Trainee Portal.",
        "user_id": user.id,
        "role": user.role.value
    }

@router.get("/trainer")
def get_trainer_content(user: User = Depends(require_role([UserRole.TRAINER, UserRole.ADMIN]))):
    return {
        "message": f"Welcome Trainer {user.name} to the Trainer Portal.",
        "user_id": user.id,
        "role": user.role.value
    }

@router.get("/admin")
def get_admin_content(user: User = Depends(require_role([UserRole.ADMIN]))):
    return {
        "message": f"Welcome Administrator {user.name} to the NCCT Control Center.",
        "user_id": user.id,
        "role": user.role.value
    }

@router.get("/employer")
def get_employer_content(user: User = Depends(require_role([UserRole.EMPLOYER, UserRole.ADMIN]))):
    return {
        "message": f"Welcome Employer {user.name} to the Talent Management Portal.",
        "user_id": user.id,
        "role": user.role.value
    }
