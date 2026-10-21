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
