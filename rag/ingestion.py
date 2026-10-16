"""Extracción de texto por página desde PDF y DOCX."""
from pathlib import Path
from typing import List


def extract_pages(path: str) -> List[str]:
    p = Path(path)
    ext = p.suffix.lower()
    if ext == ".pdf":
        from pypdf import PdfReader
        return [(page.extract_text() or "") for page in PdfReader(str(p)).pages]
    if ext == ".docx":
        from docx import Document
        # DOCX no tiene páginas fijas: se trata como una sola "página".
        return ["\n\n".join(par.text for par in Document(str(p)).paragraphs)]
    if ext in (".txt", ".md"):
        return [p.read_text(encoding="utf-8")]
    raise ValueError(f"Formato no soportado: {ext}")
