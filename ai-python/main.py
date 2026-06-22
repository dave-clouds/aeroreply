from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests

app = FastAPI(title="AeroReply AI Microservice")

# Define the structure of the data coming from your Node.js Gateway
class ChatPayload(BaseModel):
    message: str
    conversationId: str
    chatHistory: list = []

@app.get("/")
def read_root():
    return {"status": "online", "service": "AeroReply AI Engine"}

@app.post("/chat")
def process_ai_chat(payload: ChatPayload):
    try:
        user_message = payload.message.strip()
        
        # 1. Simple State Machine Check: Look for human handoff keywords
        handoff_keywords = ["human", "agent", "support", "representative", "help me"]
        if any(keyword in user_message.lower() for keyword in handoff_keywords):
            return {
                "reply": "I am patching you through to a live human support agent right now. Please hold on...",
                "triggerHandoff": True
            }
            
        # 2. Base AI Reply Placeholder (We will link real LLM client API next)
        ai_reply = f"Thank you for reaching out to AeroReply! You said: '{user_message}'. How else can I help your e-commerce store convert more sales?"
        
        return {
            "reply": ai_reply,
            "triggerHandoff": False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
