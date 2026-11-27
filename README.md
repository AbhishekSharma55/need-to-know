# Need-to-Know

**Share the details a recipient asks for while keeping the original document on your device.**

Imagine you need to submit one receipt for both a work reimbursement and a warranty claim. Your employer’s checklist asks for the merchant, date, and total. The warranty form asks for the product, purchase date, and order number. Need-to-Know reads the receipt on your device, explains which fields each request calls for, and lets you review and export two different copies.

Google’s #BuildHybridAI 2026 entry uses **Android and desktop Chrome**. Firebase AI Logic runs Gemini Nano when reading a private image or matching fields locally. A separate cloud call interprets a public checklist or request text you explicitly approve for that call. Original photos, extracted values, and prepared copies stay local throughout preparation. You decide when and where to send the export.

## Project documents

- [Grand Prize strategy](RESEARCH.md#grand-prize-strategy) explains what makes this entry competitive, what evidence judges should see, and which results would weaken the case.
- [RESEARCH.md](RESEARCH.md) covers the official rubric, competing products, Firebase capabilities, and the assumptions we need to test.
- [BUILD_PLAN.md](BUILD_PLAN.md) covers the demo, data flow, team ownership, verification, and submission package.

## What we want to prove

People can satisfy a recipient’s request while disclosing fewer extra fields than they do with a fixed redaction template. The demo shows the same receipt responding to two requests, what gets sent for cloud inference, and what the recipient would receive. The evidence comes from the actual request payload, the actual export, and a comparison against OCR and fixed templates.

## Run the Chrome workspace

Use Node.js 24 and desktop Chrome. From the repository root:

```sh
npm --prefix web ci
npm --prefix web run dev
```

Open the local URL shown by Vite. Switch between **Work reimbursement** and **Warranty request** to compare the same synthetic receipt. **Your own request** accepts manual field selection or an approved Gemini prompt. **Import receipt** opens a JPEG or PNG locally. The editable preview downloads a new HTML summary. The sample and manual workflows run with the page open offline and require no Firebase configuration.

### Enable live Firebase AI Logic

Register the web app in the team’s Firebase project, then enable Firebase AI Logic with the Gemini Developer API. Put the web configuration in an ignored `web/.env.local` file and restart Vite. A hosted build uses a registered reCAPTCHA Enterprise App Check site key. [Firebase AI Logic setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) · [Firebase AI Logic App Check](https://firebase.google.com/docs/ai-logic/app-check)

```dotenv
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_web_app_id
VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=your_recaptcha_enterprise_site_key
VITE_CLOUD_MODEL=gemini-3.5-flash-lite
```

For local cloud testing without a site key, omit `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` and set `VITE_APPCHECK_LOCAL_DEBUG=true`. Set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` in Chrome DevTools before the first cloud call, then register the generated token in the Firebase console. The debug option runs only in Vite development mode. Store tokens in the browser or the local Firebase CLI credential store. [App Check localhost setup](https://firebase.google.com/docs/app-check/web/debug-provider)

For on-device inference, choose **Prepare local model** in supported desktop Chrome, wait for it to be ready, and choose **Read with Gemini Nano**. For cloud inference, open the checklist controls, choose **Review cloud request**, check the prompt, and choose **Send to Gemini**. [Chrome on-device requirements](https://developer.chrome.com/docs/ai/prompt-api)

### Run checks

```sh
npm --prefix web run build
npm --prefix web test
npm --prefix web run benchmark
```

The benchmark uses local Tesseract.js OCR on four [synthetic receipt images](fixtures/receipts/) and evaluates eight requests. It applies a generic template, separate presets for each purpose, hand-labeled request fields, and [checklists from eight live Firebase AI Logic calls](fixtures/receipts/cloud-checklists.json) to the same OCR output. Each case counts extra fields, omissions, and incorrect values. Use `npm --prefix web run --silent benchmark -- --json` for the per-field results.

| Synthetic benchmark method | Exact outputs | Extra fields | Missing fields | Incorrect values |
| --- | ---: | ---: | ---: | ---: |
| OCR + generic template | 2 / 8 | 9 | 7 | 0 |
| OCR + purpose preset | 4 / 8 | 3 | 2 | 0 |
| OCR + hand-labeled request fields | 8 / 8 | 0 | 0 | 0 |
| OCR + recorded Gemini cloud checklist | 8 / 8 | 0 | 0 | 0 |

These are synthetic development cases used to refine cloud checklist handling. They measure field selection with OCR held constant. Separately, a live desktop Chrome smoke test read the synthetic warranty receipt using Gemini Nano. The workspace reported on-device Firebase AI Logic inference and showed source evidence for the product, purchase date, and order number `FW-82419`. The preview contained those three fields. Recipient acceptance still requires a separate trial.

Person A can use the [shared receipt manifest](fixtures/receipts/manifest.json) and PNGs for Android evaluation. `fieldwork.png` contains the same sample values as the Chrome workspace. Its two requests provide the expected reimbursement and warranty exports. The other receipts include different layouts, similar identifiers, and requests that depart from a standard template.
