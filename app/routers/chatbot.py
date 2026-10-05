from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app.schemas import ChatbotMessageRequest, ChatbotMessageResponse
from app.services.chatbot_service import process_chatbot_message

router = APIRouter(prefix="/api/chatbot", tags=["AI Chatbot"])


@router.post("/message", response_model=ChatbotMessageResponse, status_code=status.HTTP_200_OK)
def send_chatbot_message(
    req: ChatbotMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Receives chat message, identifies intent using keyword classifier,
    invokes relevant domain service using the authenticated user identity,
    and returns formatted response.
    """
    result = process_chatbot_message(req.message, current_user, db)
    return ChatbotMessageResponse(
        intent=result["intent"],
        response=result["response"],
        is_fallback=result.get("is_fallback", False)
    )
