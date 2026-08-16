# Zimutail first release

An initial working vertical slice of Zimutail: customer measurements, explainable fit recommendations, and SKU-level seller inventory.

## Run the frontend

```bash
npm install
npm run dev
```

## Included in this slice

- Editable manual body profile
- Transparent ease-based fit scoring
- In-stock-only recommendation ranking
- Variant inventory adjustment
- Immediate recommendation suppression at zero stock
- Responsive customer/seller workspace

The current data is intentionally local demo data. The next slice connects these interfaces to the FastAPI/PostgreSQL backend.
