import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyCurrency, selectedPropertyCurrency } from '../lib/property-currency.mjs';
import { appraisalPrices } from '../lib/prices.mjs';
const usd={valorReferenciaMoneda:'USD',precioObjetivoMoneda:'USD',precioVentaMoneda:'USD'};
test('currency comes from the property, a uniform legacy appraisal or PEN for an unpriced property',()=>{
 assert.equal(propertyCurrency({moneda:'USD'}),'USD');
 assert.equal(propertyCurrency({},usd),'USD');
 assert.equal(propertyCurrency({}), 'PEN');
 assert.equal(propertyCurrency({},{...usd,precioObjetivoMoneda:'PEN'}),'');
});
test('new or edited amounts cannot use conflicting currencies and mixed legacy data needs an explicit choice',()=>{
 assert.throws(()=>selectedPropertyCurrency({valorReferenciaMoneda:'USD',precioVentaMoneda:'PEN'},{}));
 assert.throws(()=>selectedPropertyCurrency({}, {}, {...usd,precioObjetivoMoneda:'PEN'}));
 assert.equal(selectedPropertyCurrency({moneda:'USD'}, {}, {...usd,precioObjetivoMoneda:'PEN'}),'USD');
 for(const moneda of ['EUR','',null,77])assert.throws(()=>selectedPropertyCurrency({moneda}, {moneda:''}, {...usd,precioObjetivoMoneda:'PEN'}));
});
test('selecting another currency preserves every amount; conversion is explicitly manual',()=>{
 const previous={...usd,valorReferencia:'100.00',precioObjetivo:'90.00',precioVenta:'110.00'};
 const currency=selectedPropertyCurrency({moneda:'PEN'},{moneda:'USD'},previous);
 const next=appraisalPrices({valorReferenciaMoneda:currency,precioObjetivoMoneda:currency,precioVentaMoneda:currency},previous);
 for(const key of ['valorReferencia','precioObjetivo','precioVenta'])assert.equal(next[key],previous[key]);
 for(const key of Object.keys(usd))assert.equal(next[key],'PEN');
});
