import test from "node:test";
import assert from "node:assert/strict";
import { parsePrice } from "../lib/prices.mjs";

test("prices preserve cents and fit the database precision", () => {
  assert.equal(parsePrice("450000"), "450000.00");
  assert.equal(parsePrice(" 450000.5 "), "450000.50");
  assert.equal(parsePrice(450000.25), "450000.25");
  assert.equal(parsePrice("9999999999999.99"), "9999999999999.99");
  assert.equal(parsePrice("0.01"), "0.01");
});

test("invalid or missing prices cannot silently become valid amounts", () => {
  for (const value of [null, undefined, "", "0", 0, -1, "NaN", "Infinity", "1e5", "450,000", "450000.999", "10000000000000", {}, true]) {
    assert.equal(parsePrice(value), null, String(value));
  }
});

test('appraisal currencies are independent and old amounts default to soles without conversion', async () => {
  const { appraisalPrices, formatPrice } = await import('../lib/prices.mjs');
  const result = appraisalPrices({valorReferencia:'300000',precioObjetivo:'80000',precioVenta:'95000',valorReferenciaMoneda:'PEN',precioObjetivoMoneda:'USD',precioVentaMoneda:'USD'});
  assert.equal(result.valorReferencia, '300000.00');
  assert.equal(result.precioObjetivo, '80000.00');
  assert.equal(result.valorReferenciaMoneda, 'PEN');
  assert.equal(result.precioObjetivoMoneda, 'USD');
  assert.match(formatPrice(result.precioObjetivo, result.precioObjetivoMoneda), /^US\$ /);
  assert.match(formatPrice(result.valorReferencia, result.valorReferenciaMoneda), /^S\/ /);
  const old = appraisalPrices({valorReferencia:'100',precioObjetivo:'200',precioVenta:'300'});
  assert.equal(old.precioVentaMoneda, 'PEN');
  const patched = appraisalPrices({precioVenta:'350'}, result);
  assert.equal(patched.precioObjetivo, result.precioObjetivo);
  assert.equal(patched.precioObjetivoMoneda, 'USD');
  assert.equal(patched.precioVentaMoneda, 'USD');
  const currencyOnly = appraisalPrices({precioVentaMoneda:'PEN'}, result);
  assert.equal(currencyOnly.precioVenta, result.precioVenta);
  assert.equal(currencyOnly.precioVentaMoneda, 'PEN');
  for (const invalid of ['EUR', '', null, 1, {}]) assert.throws(() => appraisalPrices({precioVentaMoneda:invalid},result));
  for (const invalid of ['0', '-1', '1.234', null]) assert.throws(() => appraisalPrices({precioObjetivo:invalid},result));
});
