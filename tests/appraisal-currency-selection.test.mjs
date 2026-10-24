import test from 'node:test';
import assert from 'node:assert/strict';
import { commonAppraisalCurrency, applyAppraisalCurrency } from '../lib/appraisal-currency.mjs';
import { appraisalPrices } from '../lib/prices.mjs';

test('one explicit selection applies currency to all three amounts without converting numbers', () => {
 const previous={valorReferencia:'300000.00',precioObjetivo:'280000.00',precioVenta:'320000.00',valorReferenciaMoneda:'PEN',precioObjetivoMoneda:'PEN',precioVentaMoneda:'PEN'};
 assert.equal(commonAppraisalCurrency(previous),'PEN');
 const next=applyAppraisalCurrency(previous,'USD');
 assert.equal(commonAppraisalCurrency(next),'USD');
 for(const key of ['valorReferencia','precioObjetivo','precioVenta'])assert.equal(next[key],previous[key]);
 assert.equal(previous.precioVentaMoneda,'PEN');
 assert.deepEqual(appraisalPrices(next,previous),next);
 assert.throws(()=>applyAppraisalCurrency(previous,'EUR'));
});
test('legacy mixed amounts keep their currencies when no common choice is made', () => {
 const previous={valorReferencia:'300000.00',precioObjetivo:'85000.00',precioVenta:'90000.00',valorReferenciaMoneda:'PEN',precioObjetivoMoneda:'USD',precioVentaMoneda:'USD'};
 assert.equal(commonAppraisalCurrency(previous),'');
 assert.deepEqual(appraisalPrices({precioVenta:'89000'},previous),{...previous,precioVenta:'89000.00'});
 assert.equal(commonAppraisalCurrency({}),'PEN');
 assert.equal(commonAppraisalCurrency(applyAppraisalCurrency(previous,'PEN')),'PEN');
});
