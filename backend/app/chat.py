from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from . import models, database
from .auth import get_current_user
from pydantic import BaseModel
import httpx
import os

router = APIRouter()

# Konfigurasi OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "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")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    id: int
    message: str
    response: str
    created_at: str

@router.post("/chat", response_model=ChatResponse)
async def create_chat(
    chat: ChatMessage,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        # Generate response using OpenRouter
        async with httpx.AsyncClient() as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "openai/gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": chat.message}]
                }
            )
            response.raise_for_status()
            ai_response = response.json()["choices"][0]["message"]["content"]
        
        # Create chat record
        db_chat = models.Chat(
            user_id=current_user.user_id,
            message=chat.message,
            response=ai_response
        )
        db.add(db_chat)
        db.commit()
        db.refresh(db_chat)
        
        if not db_chat.chat_id:
            raise HTTPException(status_code=500, detail="Failed to create chat record")
        
        return {
            "id": db_chat.chat_id,
            "message": db_chat.message,
            "response": db_chat.response,
            "created_at": db_chat.created_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chats", response_model=List[ChatResponse])
async def get_chats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    chats = db.query(models.Chat).filter(models.Chat.user_id == current_user.user_id).all()
    return [
        {
            "id": chat.chat_id,
            "message": chat.message,
            "response": chat.response,
            "created_at": chat.created_at.isoformat()
        }
        for chat in chats
    ] 