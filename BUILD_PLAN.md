# Need-to-Know build and verification plan

Build one complete flow for preparing a document to share. Use a synthetic receipt with a name, address, merchant, purchase date, product, total, order number, and partial payment details. The same receipt serves two requests, each with a checklist the judges can inspect.

## The sample workflow

| Recipient | Example request | Expected export |
| --- | --- | --- |
| Employer | “Include the retailer, transaction date, and amount you paid. If the receipt lists both a subtotal and a final amount, use the final amount.” | Merchant, purchase date, final total. |
| Manufacturer | “Provide what you bought, the purchase date, and the original order reference. A payment authorization code is a different reference.” | Product, purchase date, order number. |

1. Open or fetch the two request checklists. Show the source, the cloud result, and the request context approved for that call. Cache the checklists for the offline portion.
2. Enable airplane mode on Android and add the synthetic receipt. Firebase AI Logic reads a fresh image with Gemini Nano. Local OCR can provide text and coordinates. Mark each suggested field with the checklist line that called for it and the part of the receipt where it came from.
3. Review each requested field beside its source value. Select which approved values to keep. Prompt the user to check a field when the model cannot distinguish similar values. Render the export locally from the final selection.
4. Switch requests and show that the same receipt produces a different export. Replay one request in the desktop Chrome workspace and compare the two exported artifacts. Save a local disclosure entry if the user chooses to record the share.

## Product surfaces

| Surface | Workflow |
| --- | --- |
| Android | Photograph or import a receipt, apply a cached checklist offline, review source regions and selected fields, and use the platform’s share sheet for the rendered result. |
| Desktop Chrome | Select a public request checklist or preview text approved for analysis, then import a receipt image explicitly and prepare its export in the same local review workflow. Surface browser model readiness and provide manual review if needed. |
| Disclosure history | Store the purpose, recipient label, field names, and recorded time locally. Say whether the user prepared an export or marked it as sent. |

## How data moves

| Data | Where it goes |
| --- | --- |
| Original image, OCR text and coordinates, extracted values, and draft or final export | Local processing and storage as needed for the session. An explicit user export hands the final artifact to a chosen destination. |
| Request type, public URL, or explicitly approved request text | The separate Firebase AI Logic cloud prompt. Show the exact app payload before sending user-approved text. |
| Cited checklist and open questions | Returned to the device, validated, and optionally cached for offline use. |
| Disclosure history | Local by default. Any future cross-device ledger would require an explicit opt-in and a defined field allowlist. |

### Implementation decisions

1. **Interpret the request separately.** Call cloud Gemini through Firebase AI Logic using `ONLY_IN_CLOUD`. Send the request context through a typed builder that accepts an approved public source or confirmed request excerpt. Return a checklist of requested fields, conditions, supporting source references, and open questions. Use Search grounding for an eligible public-source path and show the documented attribution UI. The two demo checklists also ship as fixtures so an offline run has known inputs. [Firebase Search grounding](https://firebase.google.com/docs/ai-logic/grounding-google-search)
2. **Read the original locally.** Use Firebase AI Logic `ONLY_ON_DEVICE` on Android and Chrome. Limit the first release to receipt images or screenshots. Identify amounts, dates, merchant and product details, and similar identifiers. Reference OCR spans for proposed values so the user can review the exact text. When Nano is unavailable, keep manual field selection and on-device OCR available where supported. [Android inference modes](https://firebase.google.com/docs/ai-logic/hybrid/android/configuration-options) · [Web inference modes](https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options)
3. **Match and explain.** Give the device the checklist and the relevant source spans. Have the local model propose a field, matching checklist item, and a source reference. Validate that references exist and that extracted values correspond to the referenced text. Put conflicts and missing fields in a review state. Run the allowed export fields through a separate deterministic selection step when the user confirms them.
4. **Render and share.** Generate a new clearly labeled summary from the approved fields. Show the finished artifact before the user invokes share or download. Keep the source file, extraction, and rendered artifact outside telemetry, cloud prompts, and crash-report payloads. Show the cloud request in a demo inspector and check actual network behavior with synthetic inputs.
5. **Wire Firebase for judging.** Set up App Check on both Firebase AI Logic clients. Pin the SDK and cloud model versions once verified. If a hosted checklist catalog is useful, Firestore can store public recipes and source references. The shared demo uses synthetic material and is usable with local history. [Firebase production checklist](https://firebase.google.com/docs/ai-logic/production-checklist)

## Person A and Person B

- **Person A** owns Android capture, local OCR and Nano extraction, offline behavior, and proof of what leaves the device.
- **Person B** owns the Chrome workspace, cloud checklist interpretation, export preview, and competitor baseline.
- **Both** agree on the shared request and field schemas, use the same two demo checklists and receipt, and rehearse the judges’ path with the actual devices. Verify the phone’s Nano 4 support and the cloud call before investing in interface polish.

## Verification and impact evidence

| Check | Evidence to record |
| --- | --- |
| Fresh offline inference | Start in airplane mode after model preparation. Capture a fresh synthetic receipt and show the SDK’s on-device source and the resulting editable fields. |
| Actual cloud inference | Use a supported model to interpret a fresh public checklist or approved synthetic request. Record the SDK source and cited checklist. |
| Data boundary | Inspect app-controlled requests while processing a receipt with unique synthetic marker values. Confirm those markers appear only in intended local artifacts, and the cloud request contains only approved request context. |
| Export correctness | Extract text from each output and inspect its visual rendering and metadata. Compare against the expected fields in both demo checklists. |
| Ambiguity | Use a receipt with a subtotal, total, last four digits, order number, and authorization code. Include a request that omits a required detail and verify the product prompts for review. |
| Degraded mode | Test unavailable local model, unreachable cloud, a cached checklist, and denied connectivity. Verify that manual selection works and the app accurately reports which cloud steps ran. |
| User value | Compare manual preparation, fixed templates plus OCR, and Need-to-Know on the same fixtures. Count excess disclosures, required fields omitted, time to finish, and whether a recipient would accept the result. |

Start with varied synthetic examples and a small set of real request checklists whose text can be shared. Ask recipients to judge whether the resulting summary is sufficient and record cases where they require a different format. Keep benchmark denominators, the exact model configuration, and failed examples. The key assumption is that request-aware suggestions improve on a field template enough to justify AI. Score both methods before making an impact claim.

## Judge demo and submission

Start with the same receipt and two different requests. Show the cloud interpreting the request text and the actual context sent. Switch the phone to airplane mode and show fresh on-device extraction and local review. Put both finished copies side by side and show which fields differ. Demonstrate the Chrome workspace and its inference source, then show one measured comparison against the baseline if available.

Package a hosted synthetic example, an Android test build, a public licensed repository, instructions to reproduce both inference paths, and a public YouTube demo within three minutes. Use English and show both entered platforms. [Official submission rules](https://firebasehybridaihackathon.devpost.com/rules)
