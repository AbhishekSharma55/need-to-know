import { compareFields, demoChecklists, demoReceipt, exportRows } from './workspace.ts';
import type { Field } from './workspace.ts';

const typicalReceiptFields: Field[] = ['merchant', 'purchaseDate', 'total'];
const expected = {
  reimbursement: ['merchant', 'purchaseDate', 'total'],
  warranty: ['product', 'purchaseDate', 'orderNumber'],
} satisfies Record<keyof typeof demoChecklists, Field[]>;

const results = (Object.keys(expected) as (keyof typeof expected)[]).flatMap(request => {
  const checklist = demoChecklists[request];
  const chosen = checklist.items.map(item => item.field);
  const generated = exportRows(checklist, demoReceipt, chosen).map(row => row.field);
  const runs = [
    ['Fixed receipt template', typicalReceiptFields],
    ['Request fixture + allowlist', generated],
  ] as const;
  return runs.map(([method, fields]) => {
    const { extra, missing } = compareFields(fields, expected[request]);
    return { request, method, extra: extra.length, missing: missing.length };
  });
});

console.log('Synthetic fixture with perfect transcription. Measures field selection only.');
console.table(results);
