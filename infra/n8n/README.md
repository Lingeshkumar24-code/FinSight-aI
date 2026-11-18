# n8n Cloud — Automation Layer

These four workflows correspond to the "Automation (External)" boxes in
the architecture diagram. They are described here rather than exported
as inert JSON, because every node in them calls either a webhook on
this API or a business-specific SMTP/Slack/email credential that only
means something inside your own n8n Cloud account — a static export
would just be dead config. `document_ingestion.workflow.json` is
included as one fully worked example of the shape these take; the
other three follow the same pattern.

All four authenticate their calls to this API with a shared secret
(`N8N_SHARED_SECRET` in `.env`), sent as the `X-N8N-Secret` header. Add
a corresponding check in any route you expose specifically for n8n
(not needed for the routes already in `app/api/routes/`, which use
normal user JWT auth — these workflows act on a schedule or on a
storage event, not on behalf of a logged-in user).

## 1. Document Ingestion Workflow (on Upload)

**Trigger:** Supabase Storage "object created" event (webhook) on the
`financial-documents` bucket.

**Steps:**
1. Receive the storage event (bucket, path, business_id from the
   object's metadata).
2. If the file is a PDF/XLSX (binary), run OCR/text-extraction
   (n8n's built-in Extract from PDF node, or a call out to a
   document-AI service for scanned statements).
3. POST the extracted plain text to `POST /api/v1/documents/upload`
   on this API (same endpoint the frontend's Upload page calls) — this
   chunks and indexes it into the vector store.
4. Update the `documents` row's `status` to `processed` (or `failed`,
   with the error, on any step failure) via a direct Postgres node.
5. Notify the business owner (email/in-app) that their document is
   ready for the AI Advisor to reference.

See `document_ingestion.workflow.json` for the node graph.

## 2. Budget & Risk Monitoring (Scheduled)

**Trigger:** Cron, e.g. daily at 07:00 in the business's timezone.

**Steps:**
1. For each active business, pull its latest `financial_records` row.
2. Call `POST /api/v1/financials/risk` and `POST
   /api/v1/financials/budget-variance` with that data.
3. If `overall_level` is `high` or `critical`, or any budget line is a
   `breach`, trigger the Alerts & Notifications workflow (#4) with the
   specific flags.
4. Log the run (success/failure, businesses processed) to a Slack
   channel or n8n's own execution log for ops visibility.

## 3. Monthly Report Generation (PDF + Email)

**Trigger:** Cron, 1st of each month.

**Steps:**
1. For each business, gather the prior month's ratios
   (`POST /financials/ratios`) and risk report
   (`POST /financials/risk`).
2. Call `POST /api/v1/reports/generate` with that data to get back a
   PDF.
3. Upload the PDF to Supabase Storage under the business's reports
   folder, and insert a `reports` row pointing at it.
4. Email the PDF (or a link to it) to the business owner.

## 4. Alerts & Notifications (Email / In-App)

**Trigger:** Webhook, called by workflow #2 (or directly by this API,
if you'd rather raise alerts synchronously when a risk check runs
inline during a user's session).

**Steps:**
1. Receive the flag(s) that triggered the alert.
2. Fan out: email via SMTP node, push an in-app notification row (a
   `notifications` table — not yet in `schema.sql`; add it following
   the same pattern as `chat_messages` if you need this), and
   optionally a Slack message for internal ops monitoring.
3. De-duplicate: don't re-alert on the same flag code within, say, 24
   hours — check a `last_alerted_at` timestamp before sending.

---

**Local dev note:** none of this requires n8n running for the rest of
the app to work. The API's own `/documents/upload` endpoint accepts
plain text directly (see `app/api/routes/documents.py`), so you can
develop and test the RAG/advisor flow without n8n at all — n8n's job
is purely to get *binary* files (PDF/XLSX) turned into text before
they reach that same endpoint, and to run things on a schedule nothing
in the request/response-driven FastAPI app should be doing.
