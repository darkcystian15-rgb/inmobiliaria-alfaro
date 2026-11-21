from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as E
from difflib import SequenceMatcher
import json
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'};w='{'+ns['w']+'}'
def val(node,path,default=None):
 e=node.find(path,ns) if node is not None else None
 return e.get(w+'val',default) if e is not None else default
def corrected(s):
 for a,b in [('P.Jurírida','persona jurídica'),('Atrazo','atraso'),('Autoavaluo','autoavalúo'),('AUTOAVALUO','AUTOAVALÚO'),('Compra venta','compraventa'),('Compra Venta','compraventa'),('COMPRA VENTA','COMPRAVENTA'),('NUMERO','NÚMERO'),('PERSONA JURÍDICA :   :','PERSONA JURÍDICA :'),('PARTIDA DE SEPARACIÓN PATRIMONIAL','PARTIDA DE SEPARACIÓN DE PATRIMONIOS')]:s=s.replace(a,b)
 return s.replace('Se deja constancia, que la MINUTA de la Escritura Pública  deberá celebrarse ante cualquier Notaría a más tardar en el día XXXXX','Se deja constancia de que la escritura pública deberá celebrarse ante notaría a más tardar el día XXXXX.')
# Los datos particulares del documento de referencia no son valores por defecto.
promise_fields = {
 10: ('SEPARACIÓN PATRIMONIAL', 'PARTIDA DE SEPARACIÓN DE PATRIMONIOS :   XXXXXXXXXXX'),
 17: ('SEPARACIÓN PATRIMONIAL', 'PARTIDA DE SEPARACIÓN DE PATRIMONIOS :   XXXXXXXXXXX'),
 24: ('(DEIRECCION', '(DIRECCIÓN COMPLETA SEGÚN AUTOAVALÚO)'),
 27: ('Condición de Propiedad', 'Condición de Propiedad :   XXXXXXXXXX'),
 28: ('Estado', 'Estado :   XXXXXXXXXX'),
 29: ('Tipo', 'Tipo :   XXXXXXXXXX'),
 30: ('Actividad / Uso', 'Actividad / Uso :   XXXXXXXXXX'),
 31: ('%  Propiedad', '%  Propiedad :   XXXXX%'),
 44: ('A la firma de LA PROMESA', 'A la firma de la PROMESA DE VENTA se pagará la suma de S/. XXXXXXXX (XXXXXXXX y 00/100 SOLES), equivalente a US$ XXXXXXXX al tipo de cambio S/. XXXXX. Beneficiario: XXXXXXXX. Medio de pago: XXXXXXXX. Banco y cuenta: XXXXXXXX. Detalle de pagos y comprobantes: XXXXXXXX.'),
 48: ('EL dia', 'El día XX de XXXXXXXX de 20XX se realizará el pago de S/. XXXXXXXX (XXXXXXXX y 00/100 SOLES), equivalente a US$ XXXXXXXX al tipo de cambio S/. XXXXX, mediante XXXXXXXX a nombre de XXXXXXXX. Banco y cuenta: XXXXXXXX. Destino del pago y liquidación de deuda, si corresponde: XXXXXXXX.'),
 52: ('A la firma de la ESCRITURA', 'A la firma de la ESCRITURA PÚBLICA de compraventa se pagará la suma de S/. XXXXXXXX (XXXXXXXX y 00/100 SOLES), equivalente a US$ XXXXXXXX (XXXXXXXX y 00/100 DÓLARES AMERICANOS), al tipo de cambio S/. XXXXX (venta).'),
 54: ('La Escritura Pública será firmada', 'La escritura pública será firmada cuando XXXXXXXXXXXXXXXXXX.'),
 59: ('La escritura Pública se firmará', 'Plazo y condiciones acordadas para la formalización de la compraventa: XXXXXXXXXXXXXXXXXX.'),
 69: ('LOS VENDEDORES declaran', 'Cargas y gravámenes conocidos: XXXXXXXXXXXXXXXXXX. Asiento y partida registral: XXXXXXXX. Acreedor, de corresponder: XXXXXXXX. Condiciones acordadas para su cancelación o levantamiento: XXXXXXXXXXXXXXXXXX.'),
 71: ('Títulos en Trámite', 'Títulos en trámite :   XXXXXXXXXXXXXXXXXX'),
 75: ('En el Asiento No', 'Observaciones registrales y documentos pendientes de cotejo: XXXXXXXXXXXXXXXXXX.'),
 76: ('Como se manejará', 'Acuerdos u observaciones adicionales para revisión de notaría: XXXXXXXXXXXXXXXXXX.'),
 78: ('EL PRECIO DE VENTA', 'EL PRECIO DE VENTA DEL INMUEBLE ES DE US$ XXXXXXXX (XXXXXXXX Y 00/100 DÓLARES AMERICANOS), EQUIVALENTE A S/. XXXXXXXX (XXXXXXXX Y 00/100 SOLES).'),
}
models={}
sources={'alquiler':'ESTRUCTURA  CONTRATO ALQUILER.docx', 'venta':'ESTRUCTURA  MINUTA DE CV.docx', 'promesa':'ESTRUCTURA  PROMESA DE CV .docx'}
for op, filename in sources.items():
 path=Path('tests/info1')/filename
 with ZipFile(path) as z:
  root=E.fromstring(z.read('word/document.xml'));styles=E.fromstring(z.read('word/styles.xml'));nums=E.fromstring(z.read('word/numbering.xml'))
  absnums={a.get(w+'abstractNumId'):a.find('w:lvl',ns) for a in nums.findall('w:abstractNum',ns)}
  numdefs={n.get(w+'numId'):absnums[val(n,'w:abstractNumId')] for n in nums.findall('w:num',ns)}
  counts={};text='';formats=[];paragraphs=[];previous_context=None
  for index,p in enumerate(root.findall('w:body/w:p',ns)):
   if index==0:continue # El título se guarda por separado.
   original='';charstyles=[]
   for run in p.findall('w:r',ns):
    s=''.join(('\t' if t.tag == w+'tab' else t.text or '') for t in run if t.tag in [w+'t', w+'tab'])
    style={'bold':val(run,'w:rPr/w:b','yes') not in ['0','false'] if run.find('w:rPr/w:b',ns) is not None else False,'underline':val(run,'w:rPr/w:u','none')!='none','size':int(val(run,'w:rPr/w:sz','22'))/2}
    original+=s;charstyles.extend([style]*len(s))
   if original.strip()=='La Escritura Pública será firmada cuando XXXXXXXXXXXXXXXXXX.':continue
   new=corrected(original)
   if op=='promesa' and index in promise_fields:
    prefix, replacement=promise_fields[index]
    if not original.startswith(prefix):raise ValueError(f'Revisar campo de promesa {index}: cambió el Word original')
    new=replacement
   newstyles=[]
   for tag,a,b,c,d in SequenceMatcher(None,original,new,autojunk=False).get_opcodes():
    if tag=='equal':newstyles.extend(charstyles[a:b])
    elif tag in ['replace','insert']:newstyles.extend([charstyles[min(a,len(charstyles)-1)] if charstyles else {'bold':False,'underline':False,'size':11}]*(d-c))
   props={'align':'left','indent':0,'firstLine':0,'before':0,'after':8,'line':259/240}
   pp=p.find('w:pPr',ns)
   sid=val(p,'w:pPr/w:pStyle')
   style=next((s for s in styles.findall('w:style',ns) if s.get(w+'styleId')==sid),None)
   layers=[style.find('w:pPr',ns) if style is not None else None]
   numid=val(p,'w:pPr/w:numPr/w:numId')
   prefix=''
   if numid and numid!='0':
    lvl=numdefs[numid];layers.append(lvl.find('w:pPr',ns));counts[numid]=counts.get(numid,0)+1
    prefix='● ' if val(lvl,'w:numFmt')=='bullet' else chr(96+counts[numid])+') '
   layers.append(pp)
   for layer in layers:
    if layer is None:continue
    align=val(layer,'w:jc')
    if align:props['align']='justify' if align=='both' else align
    ind=layer.find('w:ind',ns)
    if ind is not None:
     if w+'left' in ind.attrib:props['indent']=int(ind.get(w+'left'))/20
     if w+'hanging' in ind.attrib:props['firstLine']=-int(ind.get(w+'hanging'))/20
     if w+'firstLine' in ind.attrib:props['firstLine']=int(ind.get(w+'firstLine'))/20
    spacing=layer.find('w:spacing',ns)
    if spacing is not None:
     for key in ['before','after']:
      if w+key in spacing.attrib:props[key]=int(spacing.get(w+key))/20
     if w+'line' in spacing.attrib:props['line']=int(spacing.get(w+'line'))/240
   context = sid if style is not None and style.find('w:pPr/w:contextualSpacing',ns) is not None else None
   if context and context == previous_context and paragraphs:
    paragraphs[-1]['after']=0;props['before']=0
   previous_context=context
   if prefix:
    new=prefix+new;newstyles=[newstyles[0] if newstyles else {'bold':False,'underline':False,'size':11}]*len(prefix)+newstyles
   start=len(text);text+=new+'\n';paragraphs.append({'start':start,'end':len(text)-1,**props})
   for i,st in enumerate(newstyles):
    at=start+i
    if formats and formats[-1]['end']==at and all(formats[-1].get(k)==v for k,v in st.items()):formats[-1]['end']=at+1
    else:formats.append({'start':at,'end':at+1,**st})
  # No es necesario un salto final; se mantienen los párrafos vacíos interiores.
  text=text[:-1];paragraphs[-1]['end']=len(text)
  models[op]={'text':text,'formats':formats,'paragraphs':paragraphs,'layout':'word-model'}
  print(op,len(text),len(formats),len(paragraphs),len(json.dumps(models[op])))
promise=models.pop('promesa')
Path('lib/promise-source-model.ts').write_text("// Generado del Word de promesa de tests/info1; datos particulares sustituidos por campos por completar.\nimport type { MinuteDocument } from './minute-document';\nexport const promiseSourceModel: Pick<MinuteDocument, 'text' | 'formats' | 'paragraphs' | 'layout'> = "+json.dumps(promise,ensure_ascii=False,indent=2)+';\n')
Path('lib/minute-source-models.ts').write_text("// Generado de los Word de tests/info1; conserva formatos y correcciones de redacción.\nimport type { MinuteDocument } from './minute-document';\nexport const minuteSourceModels: Record<'venta' | 'alquiler', Pick<MinuteDocument, 'text' | 'formats' | 'paragraphs' | 'layout'>> = "+json.dumps(models,ensure_ascii=False,indent=2)+';\n')
