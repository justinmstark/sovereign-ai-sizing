from fastapi import FastAPI, HTTPException, Query
from typing import Optional
from .db import conn

app = FastAPI(title="Chip Registry API", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/chips")
def list_chips(vendor: Optional[str] = None, model: Optional[str] = None):
    q = """
    SELECT c.chip_id, v.name AS vendor, c.model_name, c.variant, c.generation, c.active
    FROM chip c JOIN chip_vendor v ON v.vendor_id = c.vendor_id
    WHERE ($1::text IS NULL OR v.name ILIKE '%'||$1||'%')
      AND ($2::text IS NULL OR c.model_name ILIKE '%'||$2||'%')
    ORDER BY v.name, c.model_name, c.variant;
    """
    with conn() as c:
        return c.execute(q, (vendor, model)).fetchall()

@app.get("/workloads")
def list_workloads(service_class: Optional[str] = None):
    q = """
    SELECT workload_id, service_class, model_name, params_b, precision, serving_stack
    FROM model_workload
    WHERE ($1::text IS NULL OR service_class = $1)
    ORDER BY service_class, model_name;
    """
    with conn() as c:
        return c.execute(q, (service_class,)).fetchall()

@app.get("/tps")
def get_tps(
    chip_id: str = Query(...),
    workload_id: str = Query(...),
    context_len: int = Query(..., ge=1),
    output_len: int = Query(..., ge=1),
    batch_size: int = Query(..., ge=1),
    concurrency: int = Query(..., ge=1),
):
    q = """
    SELECT
      pb.bench_id, pb.tps_per_gpu, pb.p50_latency_ms, pb.p95_latency_ms,
      pb.confidence_score, pb.last_validated_date
    FROM perf_benchmark pb
    WHERE pb.chip_id = $1::uuid
      AND pb.workload_id = $2::uuid
      AND pb.context_len = $3
      AND pb.output_len = $4
      AND pb.batch_size = $5
      AND pb.concurrency = $6
      AND pb.effective_from <= CURRENT_DATE
      AND (pb.effective_to IS NULL OR pb.effective_to > CURRENT_DATE)
    ORDER BY pb.last_validated_date DESC
    LIMIT 1;
    """
    with conn() as c:
        row = c.execute(q, (chip_id, workload_id, context_len, output_len, batch_size, concurrency)).fetchone()
    if not row:
        raise HTTPException(404, "No exact benchmark found for that scenario.")
    return row
