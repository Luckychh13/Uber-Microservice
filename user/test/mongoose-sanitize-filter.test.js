const test = require('node:test');
const assert = require('node:assert/strict');

const mongoose = require('mongoose');

// Regression guard for GHSA-pcrw-h46h-c93h:
// with sanitizeFilter enabled, countDocuments() must sanitize its filter
// before it reaches the MongoDB driver. Previously the count filter was
// passed through untouched, so an attacker-controlled value such as
// `{ $ne: null }` bypassed the selector-injection protection.
test('countDocuments applies sanitizeFilter to the filter sent to MongoDB', async () => {
  mongoose.set('sanitizeFilter', true);

  const schema = new mongoose.Schema({ account: mongoose.Schema.Types.Mixed });
  const Account = mongoose.model('SanitizeCountRegression', schema);

  const filters = [];
  Object.defineProperty(Account, '$__collection', {
    configurable: true,
    writable: true,
    value: {
      collectionName: 'sanitize_count_regression',
      countDocuments: async (filter) => {
        filters.push(JSON.parse(JSON.stringify(filter)));
        return 0;
      }
    }
  });

  await Account.countDocuments({ account: { $ne: null } }).exec();

  assert.equal(filters.length, 1);
  assert.deepEqual(filters[0], { account: { $eq: { $ne: null } } });
});
