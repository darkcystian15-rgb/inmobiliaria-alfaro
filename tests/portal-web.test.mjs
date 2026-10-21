import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWebDraft,normalizeWebDraft,webPublicationChecklist,publicWebSnapshot,bannerChecklist,normalizeBanners} from '../lib/portal-web-rules.mjs';
const source={id:8,type:'Casa',operation:'venta',state:'activo',baseText:'Una casa amplia, con buena iluminación y espacios para toda la familia.',valuationApproved:true,identityDocument:true,valuationFile:true,completedVisitPhotos:true,photos:[{id:1},{id:2}],propietario:'PRIVADO',documento:'DNI-PRIVADO',observaciones:'PRIVADO'};
const draft=()=>({...initialWebDraft(source),listingMode:'new',title:'Casa familiar en Nuevo Chimbote',publicLocation:'Urbanización referencial',district:'Nuevo Chimbote',landArea:'120',priceMode:'consult',photos:[{id:1,caption:'Fachada'}],coverPhotoId:1,dataAuthorized:true,photosAuthorized:true});
test('Cada requisito esencial bloquea publicar y devuelve un faltante identificable',()=>{
 assert.equal(webPublicationChecklist(source,draft()).complete,true);
 for(const key of ['valuationApproved','identityDocument','valuationFile','completedVisitPhotos'])assert.equal(webPublicationChecklist({...source,[key]:false},draft()).complete,false,key);
 for(const patch of [{title:''},{description:'Breve'},{district:''},{publicLocation:''},{type:'Industrial sin correspondencia'},{landArea:''},{photos:[]},{coverPhotoId:99},{dataAuthorized:false},{photosAuthorized:false},{priceMode:'amount',price:'100',currency:''}])assert.equal(webPublicationChecklist(source,{...draft(),...patch}).complete,false,JSON.stringify(patch));
 assert.equal(webPublicationChecklist(source,draft(),false).missing.at(-1).key,'sourceVersion');
});
test('La foto seleccionada debe pertenecer al inmueble y no repetirse',()=>{
 for(const photos of [[{id:99,caption:''}],[{id:1,caption:''},{id:1,caption:''}]])assert.equal(webPublicationChecklist(source,{...draft(),photos}).complete,false);
});
test('Superficies y modalidad se adaptan al inmueble; cero no suplanta desconocido',()=>{
 assert.equal(webPublicationChecklist(source,{...draft(),type:'Departamento',landArea:'120',builtArea:''}).complete,false);
 assert.equal(webPublicationChecklist(source,{...draft(),type:'Terreno',landArea:'',builtArea:'120'}).complete,false);
 assert.equal(webPublicationChecklist(source,{...draft(),landArea:'-1'}).complete,false);
 assert.equal(webPublicationChecklist({...source,operation:'alquiler'},{...draft(),priceMode:'amount',price:'1200',currency:'PEN',priceBasis:'total'}).complete,false);
});
test('La instantánea pública no incluye datos personales ni las rutas privadas',()=>{
 const snapshot=publicWebSnapshot(source,draft());assert.equal(snapshot.price,null);assert.ok(!JSON.stringify(snapshot).includes('PRIVADO'));assert.ok(!('sourceRevision' in snapshot));
 assert.equal(snapshot.sourceId,8);assert.equal(snapshot.photos[0].id,1);
});
test('La portada exige imagen registrada, autorización y un enlace interno seguro',()=>{
 const item={id:'banner',imageId:'asset',title:'Tu próximo hogar',enabled:true,authorized:true,href:'/propiedades?status=Venta',buttonLabel:'Ver inmuebles'};
 assert.equal(bannerChecklist([item],['asset']).complete,true);
 for(const patch of [{authorized:false},{imageId:'desconocida'},{title:''},{href:'https://externo.test'},{href:'//externo.test'},{href:'/\\externo.test'},{href:'javascript:alert(1)'}])assert.equal(bannerChecklist([{...item,...patch}],['asset']).complete,false);
 assert.equal(bannerChecklist([],[]).complete,false);assert.throws(()=>normalizeBanners([item,item]));
 assert.equal(normalizeWebDraft({...draft(),dataAuthorized:'true'}).dataAuthorized,false);
});

 test('Los anuncios anteriores usan data web y no exigen documentos ni alta interna retroactiva',()=>{
 const legacy={...source,origin:'portal',state:'historico',valuationApproved:false,identityDocument:false,valuationFile:false,completedVisitPhotos:false,baseText:'',photos:[{id:0}]};
 const existing={...draft(),listingMode:'',type:'',title:'Casa',description:'Ficha existente',landArea:'',photos:[{id:0,caption:'Portada actual'}],coverPhotoId:0};
 const result=webPublicationChecklist(legacy,existing);
 assert.equal(result.complete,true);assert.equal(result.total,13);
 assert.equal(webPublicationChecklist({...legacy,origin:undefined},existing).complete,false);
 for(const patch of [{title:''},{description:''},{photos:[]},{dataAuthorized:false},{publicLocation:''}])assert.equal(webPublicationChecklist(legacy,{...existing,...patch}).complete,false);
 });

test('Bloques y mapa son opcionales; solo los apartados activados e incompletos bloquean',async()=>{
 const {coordinatesFromText,validCoordinates,snapshotPublicSettings}=await import('../lib/portal-web-settings.mjs');
 assert.equal(webPublicationChecklist(source,{...draft(),additionalInfoMode:'replace',additionalInfo:[],map:{mode:'none'}}).complete,true);
 for(const patch of [{additionalInfoMode:'replace',additionalInfo:[{title:'',content:'Texto'}]},{map:{mode:'exact',latitude:'91',longitude:'-78'}},{map:{mode:'approximate',latitude:'',longitude:''}}])assert.equal(webPublicationChecklist(source,{...draft(),...patch}).complete,false);
 assert.equal(validCoordinates(0,-78),true);assert.equal(validCoordinates(0,0),false);
 assert.deepEqual(coordinatesFromText('https://www.google.com/maps/@-9.123456,-78.54321,16z'),{latitude:'-9.123456',longitude:'-78.54321'});
 assert.deepEqual(coordinatesFromText('https://www.google.com/maps/place/casa/@-9,-78,16z/data=!3d-9.12!4d-78.54'),{latitude:'-9.12',longitude:'-78.54'});assert.equal(coordinatesFromText('https://www.google.com/maps/%ZZ'),null);
 assert.equal(coordinatesFromText('https://evil.invalid/?q=-9,-78'),null);assert.equal(coordinatesFromText('https://maps.app.goo.gl/abc'),null);
 const snapshot=snapshotPublicSettings({map:{mode:'approximate',latitude:'-9.123456',longitude:'-78.543210'}});assert.equal(snapshot.map.latitude,-9.12);assert.ok(!JSON.stringify(snapshot).includes('-9.123456'));
 assert.equal(snapshotPublicSettings({map:{mode:'none',latitude:'-9.123456',longitude:'-78.543210'}}).map.latitude,null);
});
