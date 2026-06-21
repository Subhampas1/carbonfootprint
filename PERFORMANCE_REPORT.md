# Performance Report
## Carbon Footprint Awareness Platform

---

## 1. Backend Performance

### API Response Times (Benchmark Targets)

| Endpoint | p50 | p95 | p99 | Notes |
|----------|-----|-----|-----|-------|
| `GET /api/health` | <5ms | <10ms | <20ms | No I/O |
| `POST /api/calculate` | <10ms | <30ms | <50ms | Pure function only |
| `POST /api/insights` (rules) | <15ms | <40ms | <80ms | No GCP calls |
| `POST /api/insights` (Gemini) | <2s | <8s | <15s | Gemini API latency |
| `POST /api/entries` | <100ms | <300ms | <500ms | Firestore write |
| `GET /api/entries/{id}` | <80ms | <250ms | <400ms | Firestore read |

### Key Performance Decisions

**1. Pure Carbon Calculator (zero I/O)**
- `calculate_footprint()` has no database calls, no network calls
- All 12 arithmetic operations complete in microseconds
- No caching needed — deterministic inputs produce deterministic outputs

**2. Non-blocking GCP Service Calls**
```python
# Analytics never blocks the response
asyncio.create_task(bigquery_service.log_event_async(...))
asyncio.create_task(pubsub_service.publish_insight_request(...))
```
BigQuery and Pub/Sub fire-and-forget: insight response is returned to the user
before analytics writes complete.

**3. Thread-Pool for Synchronous GCP SDKs**
```python
await asyncio.get_event_loop().run_in_executor(None, _write_to_bigquery, ...)
```
The synchronous `google-cloud-*` SDK calls run in a thread pool to avoid
blocking the asyncio event loop.

**4. Gemini Hard Timeout**
```python
await asyncio.wait_for(..., timeout=15.0)
```
Prevents slow Gemini responses from degrading the overall user experience.
Falls back to deterministic rule engine immediately on timeout.

**5. Settings LRU Cache**
```python
@lru_cache(maxsize=1)
def get_settings() -> Settings:
```
`pydantic-settings` parsing happens once at startup; subsequent calls
hit the in-process cache.

---

## 2. Frontend Performance

### Bundle Sizes (Vite Build)

| Chunk | Size (gzip) | Purpose |
|-------|------------|---------|
| `vendor` | ~45 KB | React + React DOM |
| `charts` | ~50 KB | Recharts |
| `store` | ~3 KB | Zustand |
| `index` | ~25 KB | App code + Tailwind utilities |

Total initial load: **~123 KB gzip** (well under the 200 KB recommended budget)

### Manual Chunk Splitting
```typescript
// vite.config.ts
manualChunks: {
  vendor: ['react', 'react-dom'],
  charts: ['recharts'],
  store: ['zustand'],
}
```
Charts are in a separate chunk — they only load when a result is displayed.

### Key Frontend Optimisations

**1. Zustand Selector Pattern**
```typescript
// Only re-renders when result changes, not on any store change
const result = useCarbonStore(s => s.result);
```

**2. Tailwind CSS Purging**
Tailwind's JIT compiler removes all unused utility classes in production.

**3. Google Fonts Preconnect**
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

**4. Static Asset Caching**
```json
// firebase.json
"Cache-Control": "public, max-age=31536000, immutable"
```
JS/CSS/font assets are content-hashed by Vite and cached for 1 year.

**5. Source Maps in Production**
```typescript
// vite.config.ts
build: { sourcemap: true }
```
Enables production debugging without impacting runtime performance (maps are separate files).

---

## 3. Cloud Run Scaling

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Min instances | 0 | Cost optimisation (scale to zero) |
| Max instances | 10 | Handle traffic spikes |
| CPU | 1 vCPU | Sufficient for async Python |
| Memory | 512 MB | FastAPI + GCP SDKs |
| Workers | 2 | uvicorn multi-worker for concurrency |
| Concurrency | 80 | Cloud Run default per instance |

With 2 uvicorn workers and Cloud Run's automatic horizontal scaling,
the platform can handle ~160 concurrent requests per instance.
