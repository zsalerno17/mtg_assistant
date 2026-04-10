import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import decks, collection, ai, analyses

load_dotenv()

logging.basicConfig(level=logging.DEBUG)

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
