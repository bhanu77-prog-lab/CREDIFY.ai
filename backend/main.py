"""CREDIFY.ai FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Explainable scam and fraud detection for SMS, calls, email, links "
            "and UPI payment requests."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        # Keep local development flexible while production origins come from
        # CORS_ORIGINS above.
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        # Never leak a stack trace to the UI; the demo must degrade politely.
        return JSONResponse(
            status_code=500,
            content={"detail": "Something went wrong while processing your request."},
        )

    @app.get("/api/health", tags=["system"])
    def health() -> dict:
        return {
            "status": "ok",
            "app": settings.app_name,
            "version": settings.app_version,
        }

    register_routers(app)
    return app


def register_routers(app: FastAPI) -> None:
    from routers import analyze, auth, community, dashboard, intel, scans

    app.include_router(auth.router)
    app.include_router(analyze.router)
    app.include_router(scans.router)
    app.include_router(dashboard.router)
    app.include_router(intel.router)
    app.include_router(community.router)


app = create_app()
