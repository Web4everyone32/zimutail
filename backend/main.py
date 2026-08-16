from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Zimutail API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])

class BodyProfile(BaseModel):
    chest: float = Field(gt=0)
    waist: float = Field(gt=0)
    hip: float = Field(gt=0)
    shoulder: float = Field(gt=0)
    sleeve: float = Field(gt=0)

class GarmentVariant(BodyProfile):
    id: int
    name: str
    sku: str
    size: str
    colour: str
    stock: int = Field(ge=0)

VARIANTS = [
    GarmentVariant(id=1, name="Everyday Oxford", sku="OX-BLU-M", size="M", colour="Harbour blue", stock=7, chest=108, waist=104, hip=106, shoulder=45, sleeve=63),
    GarmentVariant(id=2, name="Everyday Oxford", sku="OX-BLU-L", size="L", colour="Harbour blue", stock=0, chest=114, waist=110, hip=112, shoulder=47, sleeve=64),
]

@app.get("/api/v1/health")
def health(): return {"status": "ok"}

@app.get("/api/v1/catalogue")
def catalogue(): return [variant for variant in VARIANTS if variant.stock > 0]

@app.post("/api/v1/fit/recommendations")
def recommend(profile: BodyProfile):
    results = []
    for garment in VARIANTS:
        if garment.stock <= 0: continue
        ease = garment.chest - profile.chest
        label = "Best fit" if 8 <= ease <= 13 else "Close match" if 5 <= ease <= 16 else "Not recommended"
        results.append({"variant": garment, "result": label, "chest_ease_cm": ease, "rule_version": "shirt-regular-v1"})
    return sorted(results, key=lambda result: abs(result["chest_ease_cm"] - 10))
