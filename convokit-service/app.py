import io
import os
import tempfile
import zipfile

from fastapi import Body, FastAPI
from fastapi.responses import Response

from exporter import to_convokit

app = FastAPI(title="ConvoKit Converter")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/convert")
def convert(export: dict = Body(...)):
    """Convert an experiment export JSON into a zipped ConvoKit corpus."""
    corpus = to_convokit(export)
    with tempfile.TemporaryDirectory() as d:
        corpus.dump("corpus", base_path=d)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            for root, _, files in os.walk(d):
                for f in files:
                    full = os.path.join(root, f)
                    z.write(full, os.path.relpath(full, d))
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="convokit-corpus.zip"'},
    )
