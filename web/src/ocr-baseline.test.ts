import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseReceiptText, scoreExport, selectFields } from './ocr-baseline.ts';

test('extracts the total and order reference separately from similar private fields', () => {
  const values = parseReceiptText([
    'Store: Fieldwork Supply',
    'Subtotal: $80.00',
    'Amount paid: $86.40',
    'Authorization: AUTH-717930',
    'Order #: FW-82419',
  ].join('\n'));
  assert.deepEqual(selectFields(values, ['total', 'orderNumber']), {
    total: '$86.40',
    orderNumber: 'FW-82419',
  });
  assert.equal(values.subtotal, '$80.00');
  assert.equal(values.paymentReference, 'AUTH-717930');
});

test('scores wrong values separately from omissions and extra disclosures', () => {
  const actual = { total: '$8.64', address: '462 Example Avenue' };
  const reference = { total: '$86.40', merchant: 'Fieldwork Supply' };
  assert.deepEqual(scoreExport(actual, reference, ['total', 'merchant']), {
    extra: ['address'],
    missing: ['merchant'],
    incorrect: ['total'],
  });
});
