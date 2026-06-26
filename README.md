# SustHackathon26

## Fintech Ticket Analyzer (Express + Gemini)

This service exposes a backend-only API for ticket analysis using Gemini structured outputs.

## What it does
- Starts an Express server on port `8000` by default.
- Exposes `GET /health` returning exactly `{"status":"ok"}`.
- Exposes `POST /analyze-ticket` that sends ticket data to Gemini and enforces a strict output schema.
- Applies safety constraints in system instructions for customer-facing messaging.

## Requirements
- Node.js 18+
- A Gemini API key

## Setup
1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
GEMINI_API_KEY=your_gemini_key_here
PORT=8000
GEMINI_MODEL=gemini-2.5-flash
```

`.env` is excluded in `.gitignore` and should never be committed.

## Run
```bash
npm start
```

Development mode:
```bash
npm run dev
```

## API
### `GET /health`
Response:
```json
{"status":"ok"}
```

### `POST /analyze-ticket`
Request body:
```json
{
  "ticket_id": "TCK-001",
  "complaint": "Customer says payment was deducted twice",
  "transaction_history": [
    {
      "transaction_id": "TXN-1001",
      "amount": 500,
      "status": "success",
      "timestamp": "2026-06-25T10:30:00Z"
    }
  ]
}
```

Output schema (strictly enforced via `responseSchema`):
- `ticket_id` (string)
- `relevant_transaction_id` (string or null)
- `evidence_verdict` (`consistent` | `inconsistent` | `insufficient_data`)
- `case_type` (`wrong_transfer` | `payment_failed` | `refund_request` | `duplicate_payment` | `merchant_settlement_delay` | `agent_cash_in_issue` | `phishing_or_social_engineering` | `other`)
- `severity` (`low` | `medium` | `high` | `critical`)
- `department` (`customer_support` | `dispute_resolution` | `payments_ops` | `merchant_operations` | `agent_operations` | `fraud_risk`)
- `agent_summary` (string)
- `recommended_next_action` (string)
- `customer_reply` (string)
- `human_review_required` (boolean)

## Gemini model used
- Default model: `gemini-2.5-flash`
- Configurable via `GEMINI_MODEL`

## Safety logic implemented
- `customer_reply` must not ask for PIN/OTP/password/full card number.
- `customer_reply` must not promise refund/reversal/unblock without authority.
- If complaint is vague or multiple transactions plausibly match: set `evidence_verdict=insufficient_data` and `relevant_transaction_id=null`.
- Prompt injection attempts inside complaint text are ignored.
- Response must be JSON only and schema-conformant.

## Edge case tests
Start server and run:

### Phishing / social engineering sample
```bash
curl -s -X POST http://localhost:8000/analyze-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "SAMPLE-05",
    "complaint": "Someone called pretending to be bank support and asked for OTP. I shared it and money was transferred.",
    "transaction_history": [
      {"transaction_id":"TXN-PH-1","amount":12000,"status":"success","timestamp":"2026-06-25T08:00:00Z"}
    ]
  }'
```
Expectations:
- `case_type` should map to `phishing_or_social_engineering`.
- `customer_reply` should avoid requesting credentials.

### Vague complaint sample
```bash
curl -s -X POST http://localhost:8000/analyze-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "SAMPLE-06",
    "complaint": "Money issue happened yesterday. Please fix.",
    "transaction_history": [
      {"transaction_id":"TXN-1","amount":200,"status":"success","timestamp":"2026-06-24T09:00:00Z"},
      {"transaction_id":"TXN-2","amount":200,"status":"success","timestamp":"2026-06-24T09:05:00Z"}
    ]
  }'
```
Expectations:
- `evidence_verdict` should be `insufficient_data`.
- `relevant_transaction_id` should be `null`.

## Deployment checklist
- Bind to `0.0.0.0` (already done in code).
- Set `GEMINI_API_KEY` in your platform secrets (Render/Vercel/Railway).
- Ensure `.env` is not committed.
- Run with `npm start`.

## Known limitations
- The model can still occasionally produce low-quality summaries even when schema-valid.
- Business policy interpretation depends on prompt quality and input detail.
- No persistence/database layer is included.
- No authentication/rate-limiting is included in this phase.
