import logging
import os
import time
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("aeroreply-ai")

# ---------------------------------------------------------------------------
# Gemini client — initialised once at startup
# ---------------------------------------------------------------------------
_GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not _GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set — AI responses will be unavailable")

gemini_client: Optional[genai.Client] = None
if _GEMINI_API_KEY:
    try:
        gemini_client = genai.Client(api_key=_GEMINI_API_KEY)
        logger.info("Gemini client initialised successfully")
    except Exception as e:
        logger.error(f"Failed to initialise Gemini client: {e}")

# Model fallback chain — tried in order on 429 (rate limit) or 404 (unavailable)
# List verified against models.list() for this API key
GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
]
GEMINI_MODEL = GEMINI_MODELS[0]

# ---------------------------------------------------------------------------
# System prompt — instructs Gemini to return structured JSON only
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are AeroReply, an expert AI customer support agent for e-commerce businesses.
Your job is to help customers with orders, shipping, returns, refunds, account issues, and product questions.

RESPONSE RULES:
1. Always reply in the same language the customer uses.
2. Be concise, warm, and solution-focused. Never use filler phrases like "Certainly!" or "Of course!".
3. Evaluate every message for escalation signals. Set triggerHandoff to true ONLY when:
   - The customer explicitly asks for a human, agent, or representative.
   - The customer is clearly frustrated, distressed, or has used aggressive language in two or more messages.
   - The issue requires account-level access or manual intervention you cannot resolve (e.g., fraud, unresolved disputes).
   - The customer repeats the same complaint three or more times without resolution.
4. Classify the primary intent of each message into one of: order_tracking, return_refund, account_access, product_question, pricing_discount, complaint, greeting, handoff_request, other.
5. You must ALWAYS respond with valid JSON matching this exact schema — no markdown, no prose outside JSON:
{
  "reply": "<your response to the customer>",
  "triggerHandoff": <true or false>,
  "intent": "<one of the intent labels above>",
  "confidence": <float 0.0 to 1.0 indicating how confident you are in your reply>
}"""

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="AeroReply AI Microservice", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class HistoryMessage(BaseModel):
    role: str   # "customer" | "ai" | "agent"
    content: str

class ChatPayload(BaseModel):
    message: str
    conversationId: str
    chatHistory: List[HistoryMessage] = []

class ChatResponse(BaseModel):
    reply: str
    triggerHandoff: bool
    intent: str
    confidence: float
    conversationId: str
    processingTimeMs: float

# ---------------------------------------------------------------------------
# Gemini response schema — enforces structured JSON output
# ---------------------------------------------------------------------------
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "reply":          {"type": "string"},
        "triggerHandoff": {"type": "boolean"},
        "intent": {
            "type": "string",
            "enum": [
                "order_tracking", "return_refund", "account_access",
                "product_question", "pricing_discount", "complaint",
                "greeting", "handoff_request", "other"
            ],
        },
        "confidence": {"type": "number"},
    },
    "required": ["reply", "triggerHandoff", "intent", "confidence"],
}

# ---------------------------------------------------------------------------
# Helper — convert our chat history format to Gemini Content objects
# ---------------------------------------------------------------------------
def build_gemini_history(history: List[HistoryMessage]) -> List[types.Content]:
    """
    Map our internal roles to Gemini's user/model roles.
    'customer' → user, 'ai'/'agent' → model.
    Only include the last 10 turns to stay within context limits.
    """
    gemini_history = []
    for msg in history[-10:]:
        gemini_role = "user" if msg.role == "customer" else "model"
        gemini_history.append(
            types.Content(
                role=gemini_role,
                parts=[types.Part(text=msg.content)],
            )
        )
    return gemini_history

# ---------------------------------------------------------------------------
# Helper — parse Gemini JSON response defensively
# ---------------------------------------------------------------------------
def parse_gemini_response(raw_text: str) -> dict:
    import json, re
    text = raw_text.strip()
    # Strip markdown code fences if Gemini wraps the output anyway
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)

# ---------------------------------------------------------------------------
# Request timing middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    ms = round((time.time() - start) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({ms}ms)")
    return response

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AeroReply AI Engine",
        "version": "2.0.0",
        "model": GEMINI_MODEL,
        "gemini_ready": gemini_client is not None,
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AeroReply AI Engine",
        "gemini_ready": gemini_client is not None,
    }

@app.post("/chat", response_model=ChatResponse)
def process_ai_chat(payload: ChatPayload):
    start = time.time()

    user_message = payload.message.strip()
    if not user_message:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    logger.info(f'Processing | conv={payload.conversationId} | msg="{user_message[:80]}"')

    # ------------------------------------------------------------------
    # Guard: no Gemini client available
    # ------------------------------------------------------------------
    if gemini_client is None:
        raise HTTPException(
            status_code=503,
            detail="AI service unavailable: GEMINI_API_KEY not configured.",
        )

    try:
        # Build prior conversation history for multi-turn context
        history = build_gemini_history(payload.chatHistory)

        # Compose the full contents list:
        # [history turns...] + current user message
        contents = history + [
            types.Content(
                role="user",
                parts=[types.Part(text=user_message)],
            )
        ]

        # Try each model in the fallback chain until one succeeds
        response = None
        last_error = None
        for model_name in GEMINI_MODELS:
            try:
                logger.info(f"Trying model: {model_name}")
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        response_schema=RESPONSE_SCHEMA,
                        temperature=0.3,
                        max_output_tokens=512,
                    ),
                )
                logger.info(f"Success with model: {model_name}")
                break
            except Exception as model_err:
                last_error = model_err
                err_str = str(model_err)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    logger.warning(f"Model {model_name} rate-limited, trying next...")
                    continue
                if "404" in err_str or "NOT_FOUND" in err_str:
                    logger.warning(f"Model {model_name} not available, trying next...")
                    continue
                if "503" in err_str or "UNAVAILABLE" in err_str:
                    logger.warning(f"Model {model_name} unavailable/overloaded, trying next...")
                    continue
                raise  # all other errors bubble up immediately

        if response is None:
            raise last_error

        raw_text = response.text
        logger.debug(f"Gemini raw response: {raw_text}")

        parsed = parse_gemini_response(raw_text)

        reply          = str(parsed.get("reply", "")).strip()
        trigger_handoff = bool(parsed.get("triggerHandoff", False))
        intent         = str(parsed.get("intent", "other"))
        confidence     = float(parsed.get("confidence", 1.0))

        if not reply:
            raise ValueError("Gemini returned an empty reply field")

        ms = round((time.time() - start) * 1000, 2)
        logger.info(
            f"Reply generated | conv={payload.conversationId} | "
            f"intent={intent} | handoff={trigger_handoff} | {ms}ms"
        )

        return ChatResponse(
            reply=reply,
            triggerHandoff=trigger_handoff,
            intent=intent,
            confidence=confidence,
            conversationId=payload.conversationId,
            processingTimeMs=ms,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Gemini call failed | conv={payload.conversationId} | {type(e).__name__}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=502,
            detail=f"AI processing error: {type(e).__name__} — {str(e)}",
        )
