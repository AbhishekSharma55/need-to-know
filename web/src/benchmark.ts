import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Tesseract from 'tesseract.js';
import { fixedTemplates, parseReceiptText, scoreExport, selectFields } from './ocr-baseline.ts';
import type { Field, FieldValues } from './workspace.ts';

type Request = {
  preset: 'reimbursement' | 'warranty';
  text: string;
  fields: Field[];
};

type Receipt = {
  id: string;
  image: string;
  fields: FieldValues;
  requests: Request[];
};

const fixtureDir = new URL('../../fixtures/receipts/', import.meta.url);
const receipts: Receipt[] = JSON.parse(await readFile(new URL('manifest.json', fixtureDir), 'utf8'));
const languagePackage = fileURLToPath(import.meta.resolve('@tesseract.js-data/eng/package.json'));
const worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
  langPath: join(dirname(languagePackage), '4.0.0_best_int'),
  cacheMethod: 'none',
});

const results = [];
try {
  await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK });
  for (const receipt of receipts) {
    const imagePath = fileURLToPath(new URL(receipt.image, fixtureDir));
    const { data } = await worker.recognize(imagePath);
    const values = parseReceiptText(data.text);

    for (const request of receipt.requests) {
      const runs = [
        ['OCR + fixed generic template', fixedTemplates.generic],
        ['OCR + purpose preset', fixedTemplates[request.preset]],
        ['OCR + reference request', request.fields],
      ] as const;

      for (const [method, template] of runs) {
        const actual = selectFields(values, template);
        results.push({
          receipt: receipt.id,
          request: request.preset,
          method,
          ...scoreExport(actual, receipt.fields, request.fields),
        });
      }
    }
  }
} finally {
  await worker.terminate();
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ engine: 'Tesseract.js 7.0.0', results }, null, 2));
} else {
  console.log(`${receipts.length} synthetic receipt images, ${results.length / 3} requests. No model inference or recipient testing.`);
  console.table(results.map(({ extra, missing, incorrect, ...rest }) => ({
    ...rest,
    extra: extra.length,
    missing: missing.length,
    incorrect: incorrect.length,
  })));
}
