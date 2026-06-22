import logging
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("aeroreply-ai")

app = FastAPI(title="AeroReply AI Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ChatPayload(BaseModel):
    message: str
    conversationId: str
    chatHistory: list = []

class ChatResponse(BaseModel):
    reply: str
    triggerHandoff: bool
    conversationId: str
    processingTimeMs: float


# ---------------------------------------------------------------------------
# Middleware — request timing logger
# ---------------------------------------------------------------------------

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration_ms}ms)")
    return response


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"status": "online", "service": "AeroReply AI Engine", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "AeroReply AI Engine"}


@app.post("/chat", response_model=ChatResponse)
def process_ai_chat(payload: ChatPayload):
    start = time.time()
    try:
        user_message = payload.message.strip()
        if not user_message:
            raise HTTPException(status_code=422, detail="Message cannot be empty.")

        logger.info(f"Processing message | conv={payload.conversationId} | msg=\"{user_message[:80]}\"")

        # ----------------------------------------------------------------
        # 1. Human-handoff keyword detection
        # ----------------------------------------------------------------
        handoff_keywords = ["human", "agent", "support", "representative", "help me", "real person"]
        if any(kw in user_message.lower() for kw in handoff_keywords):
            logger.info(f"Handoff triggered | conv={payload.conversationId}")
            return ChatResponse(
                reply="I'm connecting you with a live support agent right now. Please hold on — someone will be with you shortly.",
                triggerHandoff=True,
                conversationId=payload.conversationId,
                processingTimeMs=round((time.time() - start) * 1000, 2),
            )

        # ----------------------------------------------------------------
        # 2. Intent matching — common e-commerce queries
        # ----------------------------------------------------------------
        message_lower = user_message.lower()

        if any(kw in message_lower for kw in ["order", "track", "shipping", "delivery", "where is my"]):
            reply = (
                "I can help with your order! Could you please share your order number? "
                "Once I have it, I can pull up the latest shipping details for you."
            )
        elif any(kw in message_lower for kw in ["return", "refund", "exchange"]):
            reply = (
                "No worries — returns and refunds are straightforward with us. "
                "Our standard return window is 30 days from delivery. "
                "Would you like me to start a return request for you?"
            )
        elif any(kw in message_lower for kw in ["discount", "coupon", "promo", "sale"]):
            reply = (
                "Great timing! You can apply a promo code at checkout. "
                "If you're looking for our latest deals, I'd recommend checking our homepage banner. "
                "Is there a specific product you had in mind?"
            )
        elif any(kw in message_lower for kw in ["password", "login", "account", "sign in"]):
            reply = (
                "For account access issues, you can reset your password from the login page using 'Forgot Password'. "
                "If you're still locked out, let me know and I'll escalate this to our account team."
            )
        elif any(kw in message_lower for kw in ["hi", "hello", "hey", "greetings"]):
            reply = (
                "Hello! Welcome to AeroReply support. I'm your AI assistant — here to help with "
                "orders, returns, account questions, and more. What can I assist you with today?"
            )
        else:
            reply = (
                f"Thanks for reaching out! I received your message: \"{user_message}\". "
                "I'm looking into this for you. If you need immediate assistance, "
                "just type 'human agent' and I'll connect you with our support team right away."
            )

        processing_ms = round((time.time() - start) * 1000, 2)
        logger.info(f"Reply generated | conv={payload.conversationId} | {processing_ms}ms")

        return ChatResponse(
            reply=reply,
            triggerHandoff=False,
            conversationId=payload.conversationId,
            processingTimeMs=processing_ms,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unhandled error | conv={payload.conversationId} | {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal AI service error. Please try again.")
