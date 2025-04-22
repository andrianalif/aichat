from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from . import models, database
from .auth import get_current_user
from pydantic import BaseModel, Field
import httpx
import os
from datetime import datetime, timedelta
from fastapi.responses import JSONResponse
from cachetools import TTLCache
import asyncio
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Konfigurasi OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY environment variable is not set")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Rate limiting configuration
RATE_LIMIT_WINDOW = 60  # seconds
MAX_REQUESTS_PER_WINDOW = 10
rate_limit_cache = TTLCache(maxsize=1000, ttl=RATE_LIMIT_WINDOW)

# Response caching configuration
response_cache = TTLCache(maxsize=100, ttl=300)  # Cache for 5 minutes

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)

class ChatResponse(BaseModel):
    id: int
    message: str
    response: str
    created_at: str

def check_rate_limit(user_id: int) -> bool:
    current_time = datetime.utcnow()
    user_requests = rate_limit_cache.get(user_id, [])
    
    # Remove old requests
    user_requests = [time for time in user_requests if (current_time - time).total_seconds() < RATE_LIMIT_WINDOW]
    
    if len(user_requests) >= MAX_REQUESTS_PER_WINDOW:
        return False
    
    user_requests.append(current_time)
    rate_limit_cache[user_id] = user_requests
    return True

def get_cached_response(message: str) -> Optional[str]:
    return response_cache.get(message)

def cache_response(message: str, response: str):
    response_cache[message] = response

@router.post("/chat", response_model=ChatResponse)
async def create_chat(
    chat: ChatMessage,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        # Check rate limit
        if not check_rate_limit(current_user.user_id):
            return JSONResponse(
                status_code=429,
                content={"detail": f"Rate limit exceeded. Maximum {MAX_REQUESTS_PER_WINDOW} requests per {RATE_LIMIT_WINDOW} seconds."}
            )

        # Check cache first
        cached_response = get_cached_response(chat.message)
        if cached_response:
            db_chat = models.Chat(
                user_id=current_user.user_id,
                message=chat.message,
                response=cached_response,
                created_at=datetime.utcnow()
            )
            try:
                db.add(db_chat)
                db.commit()
                db.refresh(db_chat)
                return {
                    "id": db_chat.chat_id,
                    "message": db_chat.message,
                    "response": db_chat.response,
                    "created_at": db_chat.created_at.isoformat()
                }
            except Exception as db_error:
                db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Database error: {str(db_error)}"
                )

        # Generate response using OpenRouter with timeout
        async with httpx.AsyncClient() as client:
            try:
                response = await asyncio.wait_for(
                    client.post(
                        OPENROUTER_API_URL,
                        headers={
                            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": "http://localhost:3000",
                            "X-Title": "AI Chat App",
                            "User-Agent": "AI Chat App/1.0"
                        },
                        json={
                            "model": "openai/gpt-3.5-turbo",
                            "messages": [{"role": "user", "content": chat.message}]
                        }
                    ),
                    timeout=30.0  # 30 seconds timeout
                )
            except asyncio.TimeoutError:
                raise HTTPException(
                    status_code=504,
                    detail="Request to AI service timed out"
                )
            
            if response.status_code == 401:
                print(f"OpenRouter API Error: {response.text}")  # Debug log
                raise HTTPException(
                    status_code=500,
                    detail="Invalid OpenRouter API key. Please check your environment variables."
                )
            elif response.status_code != 200:
                print(f"OpenRouter API Error: {response.text}")  # Debug log
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"OpenRouter API error: {response.text}"
                )
                
            response_data = response.json()
            if not response_data.get("choices"):
                raise HTTPException(
                    status_code=500,
                    detail="Invalid response from OpenRouter API"
                )
                
            ai_response = response_data["choices"][0]["message"]["content"]
            
            # Cache the response
            cache_response(chat.message, ai_response)
        
        # Create chat record
        db_chat = models.Chat(
            user_id=current_user.user_id,
            message=chat.message,
            response=ai_response,
            created_at=datetime.utcnow()
        )
        
        try:
            db.add(db_chat)
            db.commit()
            db.refresh(db_chat)
        except Exception as db_error:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(db_error)}"
            )
        
        if not db_chat.chat_id:
            raise HTTPException(
                status_code=500,
                detail="Failed to create chat record"
            )
        
        return {
            "id": db_chat.chat_id,
            "message": db_chat.message,
            "response": db_chat.response,
            "created_at": db_chat.created_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/chats", response_model=List[ChatResponse])
async def get_chats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        chats = db.query(models.Chat).filter(
            models.Chat.user_id == current_user.user_id
        ).order_by(models.Chat.created_at.desc()).all()
        
        return [
            {
                "id": chat.chat_id,
                "message": chat.message,
                "response": chat.response,
                "created_at": chat.created_at.isoformat()
            }
            for chat in chats
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch chat history: {str(e)}"
        ) 