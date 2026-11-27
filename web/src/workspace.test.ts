import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cloudPrompt,
  compareFields,
  createContext,
  demoChecklists,
  demoReceipt,
  demoRequests,
  exportHtml,
  exportRows,
  parseChecklist,
  parseSuggestions,
} from './workspace.ts';

test('the two requests export different field allowlists from the same receipt', () => {
  const selected = Object.keys(demoReceipt) as (keyof typeof demoReceipt)[];
  assert.deepEqual(exportRows(demoChecklists.reimbursement, demoReceipt, selected).map(row => row.field),
    ['merchant', 'purchaseDate', 'total']);
  assert.deepEqual(exportRows(demoChecklists.warranty, demoReceipt, selected).map(row => row.field),
    ['product', 'purchaseDate', 'orderNumber']);
});

test('the export excludes unchecked, empty, and unrequested values', () => {
  const rows = exportRows(demoChecklists.warranty, { ...demoReceipt, orderNumber: ' ' }, ['orderNumber', 'address', 'purchaseDate']);
  assert.deepEqual(rows.map(row => row.field), ['purchaseDate']);
  const html = exportHtml(demoChecklists.warranty.title, rows);
  for (const privateValue of [demoReceipt.name, demoReceipt.address, demoReceipt.paymentDigits, demoReceipt.paymentReference, demoReceipt.orderNumber]) {
    assert.ok(!html.includes(privateValue));
  }
});

test('reviewed values and titles are treated as text in the rendered export', () => {
  const rows = exportRows(demoChecklists.warranty, { product: '<script>alert(1)</script>' }, ['product']);
  const html = exportHtml('<img src=x onerror=alert(1)>', rows);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('the cloud prompt serializes only approved context fields', () => {
  const context = { ...createContext('request', demoRequests.warranty), document: demoReceipt };
  const prompt = cloudPrompt(context);
  assert.ok(prompt.includes(demoRequests.warranty));
  for (const value of Object.values(demoReceipt)) assert.ok(!prompt.includes(value), value);
  assert.throws(() => createContext('public', 'https://user:secret@example.org/private'), /public HTTPS/);
  assert.throws(() => createContext('public', 'https://example.org/checklist?access=secret'), /query parameters/);
});

test('cloud checklist keeps supported fields with verbatim evidence and drops duplicates', () => {
  const context = createContext('request', demoRequests.warranty);
  const result = parseChecklist(JSON.stringify({
    title: 'Warranty',
    items: [
      { field: 'orderNumber', evidence: 'original order reference', note: 'The order identifier.' },
      { field: 'orderNumber', evidence: 'purchase date', note: 'Duplicate.' },
      { field: 'address', evidence: 'shipping address', note: 'Invented.' },
      { field: 'ssn', evidence: 'Provide what you bought', note: 'Unknown field.' },
    ],
    questions: ['Ask whether an itemized receipt is required.'],
  }), context);
  assert.deepEqual(result.items.map(item => item.field), ['orderNumber']);
  assert.equal(result.questions.length, 1);
});

test('receipt inference cannot return an unrequested field or a value unsupported by its quoted line', () => {
  const result = parseSuggestions(JSON.stringify({
    orderNumber: { value: 'FW-82419', source: 'Order number: FW-82419' },
    product: { value: 'Wireless Headphones', source: 'Studio Speakers' },
    address: { value: demoReceipt.address, source: demoReceipt.address },
  }), demoChecklists.warranty);
  assert.deepEqual(Object.keys(result), ['orderNumber']);
});

test('an order reference does not authorize exporting a payment reference', () => {
  const context = createContext('request', 'Use the order reference to match the card entry.');
  const result = parseChecklist(JSON.stringify({
    items: [{ field: 'paymentReference', evidence: 'order reference to match the card entry', note: 'Match the card entry.' }],
    questions: [],
  }), context);
  assert.deepEqual(result.items, []);
  assert.match(result.questions[0], /explicitly identify a payment reference/);
});

test('accepts an explicit payment authorization reference', () => {
  const context = createContext('request', 'Include the payment authorization code.');
  const result = parseChecklist(JSON.stringify({
    items: [{ field: 'paymentReference', evidence: 'payment authorization code', note: 'Include the authorization.' }],
    questions: [],
  }), context);
  assert.deepEqual(result.items.map(item => item.field), ['paymentReference']);
});

test('the comparator counts excess and missing fields separately', () => {
  assert.deepEqual(compareFields(['merchant', 'purchaseDate', 'total'], ['product', 'purchaseDate', 'orderNumber']), {
    extra: ['merchant', 'total'],
    missing: ['product', 'orderNumber'],
  });
});
