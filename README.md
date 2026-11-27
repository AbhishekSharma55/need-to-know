# Need-to-Know

**Share the details a recipient asks for while keeping the original document on your device.**

Imagine you need to submit one receipt for both a work reimbursement and a warranty claim. Your employer’s checklist asks for the merchant, date, and total. The warranty form asks for the product, purchase date, and order number. Need-to-Know reads the receipt on your device, explains which fields each request calls for, and lets you review and export two different copies.

Google’s #BuildHybridAI 2026 entry uses **Android and desktop Chrome**. Firebase AI Logic runs Gemini Nano when reading a private image or matching fields locally. A separate cloud call interprets a public checklist or request text you explicitly approve for that call. Original photos, extracted values, and prepared copies stay local throughout preparation. You decide when and where to send the export.

## Project documents

- [RESEARCH.md](RESEARCH.md) covers the official rubric, competing products, Firebase capabilities, and the assumptions we need to test.
- [BUILD_PLAN.md](BUILD_PLAN.md) covers the demo, data flow, team ownership, verification, and submission package.

## What we want to prove

People can satisfy a recipient’s request while disclosing fewer extra fields than they do with a fixed redaction template. The demo shows the same receipt responding to two requests, what gets sent for cloud inference, and what the recipient would receive. The evidence comes from the actual request payload, the actual export, and a comparison against OCR and fixed templates.
