# Condiciones ampliadas del comprador en DNI y poderes

En venta, 1. DNI y poderes → Comprador mantiene la asignación y Persona natural / Persona jurídica. Para persona natural incorpora:

1. Tipo de persona del comprador.
2. Estado civil del comprador: Por verificar, Soltero, Casado o Varios compradores (agrupación).
3. Régimen patrimonial del comprador cuando se selecciona Casado: Por verificar, Sociedad conyugal o Separación de bienes.
4. Documentos correspondientes, incluida la representación y sus adjuntos.

El vendedor usa el mismo orden. Véase [orden e impuestos](orden-identificacion-impuestos-2026-11-10.md).

Tras elegir la composición se muestran los DNI, permitiendo varios archivos o un PDF conjunto. Matrimonio habilita la nueva categoría opcional COMPRADOR_PARTIDA_MATRIMONIAL. La partida de separación de bienes aparece únicamente con Matrimonio + Separación de bienes. Poder y vigencia de poder del comprador aparecen únicamente si se selecciona representación. Se conservan como adjuntos opcionales, igual que los del vendedor; no se cambian requisitos legales por esta interfaz.

Las personas jurídicas conservan ficha RUC, DNI del gerente, poder y vigencia del gerente. Los casos del vendedor sobre haber adquirido el inmueble siendo soltero o por herencia no se copian al comprador: describen antecedentes del propietario vendedor, no condiciones de la nueva adquisición.

Persistencia: compradorComposicion, compradorRegimen y compradorRepresentante se guardan en la configuración versionada del expediente. Son compatibles con registros anteriores, que comienzan Por verificar al no existir esos campos; no se requiere migración. Los selectores muestran pendientes de revisión antes del cierre para compradores naturales asignados. Esto no impide asignar y seleccionar el tipo desde 4. Impuestos y constancias, ni preparar sus documentos allí antes de completar la identificación.

Los controles de comprador y vendedor son independientes. Cambiar a persona jurídica, desasignar o modificar las condiciones no borra documentos: los que dejan de aplicar se consultan en Documentos anteriores. Las opciones se conservan al volver a la condición anterior. El historial usa nombres legibles para los tres campos nuevos. Alquiler conserva sus condiciones propias.

Verificación: TypeScript, ESLint, pruebas de expediente, clasificación de archivos y extras; matriz de composición/régimen/representación, validación de enums, defaults antiguos, cierre y conservación de archivos. Navegador en 375/1440 px con identificación, documentos condicionales, guardado/reapertura, conservación de adjuntos, persona jurídica, solo consulta y regresión del acceso compartido desde impuestos. Las pruebas usan datos sintéticos y API simulada, sin escribir en expedientes reales.

## Publicación y comprobaciones

- Estado READY, producción Next.js, proyecto inmobiliaria-alfarov2 (prj_Y4rkO3CVHKLA2akcLF6rguUJksvG), equipo team_qcKFQOeqeLWTJFsCLGnZvPiL.
- Despliegue dpl_BJBa7Ao2i7jkhGoi6iQ49YzYsgEq; URL https://inmobiliaria-alfarov2-57lf0iefa-puma19.vercel.app.
- Preparado con --prod --skip-domain; GET del expediente comprobado con HTTP 401 y JSON esperado sin sesión. Promovido y confirmado mediante inspect de https://intranet.inmobiliariaalbertoalfaro.com.pe.
- Compilación de producción completada aproximadamente en un minuto. Consulta posterior de logs de nivel error: sin registros encontrados.
- TypeScript, ESLint y las tres suites de expediente/carpetas/extras pasaron. Las pruebas de identificación y FASE 2 pasaron en 375 y 1440 px, incluida la sincronización 4 ↔ 1 y la conservación de documentos del comprador.
- Referencia Git base 288e7060b41df8f9eafc2bfa67c102ff186a35b7 con archivos locales de trabajo; sin commit nuevo ni migración.
