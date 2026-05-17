from fastapi import FastAPI

app = FastAPI(title="ZenNine API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/ping")
def ping() -> dict[str, str]:
    return {"message": "pong"}
