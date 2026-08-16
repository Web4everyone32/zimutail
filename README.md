# Zimutail live data release

A working vertical slice of Zimutail with customer measurements, explainable fit recommendations and persistent SKU-level seller inventory.

## Run the frontend

```bash
npm install
npm run dev
```

## Included in this slice

- Editable manual body profile and slim/regular/relaxed preferences
- Transparent FastAPI ease-based fit scoring with reasons and confidence
- In-stock-only recommendation ranking from the cloud API
- Neon-backed variant inventory adjustment with conflict protection
- Immediate recommendation suppression when available stock reaches zero
- Offline demo fallback for resilient hackathon presentation
- Responsive customer and seller workspace

## Run the backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

The backend uses SQLite by default for local development. Set `DATABASE_URL` in the project `.env` to use Neon PostgreSQL.
