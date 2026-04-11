import logging
from dotenv import load_dotenv
load_dotenv()  # Must run before any module that reads os.environ

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import decks, collection, ai, analyses

# Silence noisy third-party debug logs; keep WARNING+ for everything else
logging.basicConfig(level=logging.INFO)
for noisy in ("hpack", "httpcore", "httpx", "h2"):
    logging.getLogger(noisy).setLevel(logging.WARNING)

app = FastAPI(title="MTG Assistant API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "https://*.vercel.app",   # Vercel preview/prod deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(decks.router, prefix="/api/decks", tags=["decks"])
app.include_router(collection.router, prefix="/api/collection", tags=["collection"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(analyses.router, prefix="/api/analyses", tags=["analyses"])


@app.get("/health")
def health():
    return {"status": "ok"}
