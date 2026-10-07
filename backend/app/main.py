from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routes import router as api_router
from app.scheduler import setup_scheduler, start_scheduler, shutdown_scheduler
from app.database import init_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    setup_scheduler()
    start_scheduler()
    print("[OK] Backend Abandono Xuma iniciado")
    yield
    shutdown_scheduler()
    print("[OK] Backend detenido")


app = FastAPI(
    title="Abandono Xuma - API",
    description="API para dashboard de abandono de llamadas en contingencia",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Total-Filas"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": "Abandono Xuma API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }