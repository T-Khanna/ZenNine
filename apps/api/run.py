"""
Bootstrap script: creates the venv + installs deps on first run, then starts the API server.
Usage: python apps/api/run.py  (from repo root, or directly from apps/api/)
"""
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
VENV = HERE / ".venv"
PYTHON = VENV / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")


def ensure_venv() -> None:
    if not PYTHON.exists():
        print("First run: creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", str(VENV)], check=True)
        print("Installing dependencies...")
        subprocess.run(
            [str(PYTHON), "-m", "pip", "install", "-r", str(HERE / "requirements.txt")],
            check=True,
        )


if __name__ == "__main__":
    ensure_venv()
    os.chdir(HERE)
    cmd = [str(PYTHON), "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"]
    if sys.platform == "win32":
        # os.execv on Windows spawns a new PID and exits this process, so the parent
        # (concurrently) loses its handle and cannot guarantee a clean kill on shutdown.
        # subprocess.run keeps this wrapper alive, giving concurrently a stable PID to kill.
        subprocess.run(cmd)
    else:
        # On Unix, execv truly replaces this process (same PID) — no wrapper overhead.
        os.execv(str(PYTHON), cmd)
