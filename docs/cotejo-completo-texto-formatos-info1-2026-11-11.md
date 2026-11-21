# Cotejo completo de modelos Word — 2026-11-11

Revisión de los dos originales en `tests/info1` frente a `lib/minute-template.ts`. Esta revisión no modifica los modelos ni publica cambios.

> Las diferencias de formato detectadas en este cotejo quedan corregidas por la implementación descrita en [formatos-word-info1-2026-11-11.md](./formatos-word-info1-2026-11-11.md). El detalle siguiente conserva el diagnóstico original.

## Resultado

El contenido de alquiler está completo, con las correcciones de redacción documentadas. En venta se conserva la estructura y se retiró la frase repetida de condición de firma; también se reformuló la oración del plazo máximo. El título se conserva en el campo de título, fuera del cuerpo.

Los modelos actuales solo incorporan texto: no trasladan los rangos de negrita y subrayado de los Word. El editor y los exportadores actuales admiten negrita y tamaño, pero no subrayado. El PDF usa una fuente serif y 11,5 pt como base; los Word usan Calibri de 11 pt. El título exportado también recibe un formato propio. No se conservaron sangrías, listas, saltos y espaciado del original.

Los originales contienen negrita y subrayado simple; no se detectan cursiva, tachado ni resaltado en los fragmentos del cuerpo. «OBSERVACIONES» tiene 16 pt en venta y 14 pt en alquiler.

## Texto completo y formatos originales por fragmento

N = negrita; S = subrayado simple. Los fragmentos sin anotación usan el formato base. Los espacios se mantienen dentro de cada fragmento entre comillas. Se omiten únicamente párrafos vacíos en el listado; se contabilizan en el resumen.

### ESTRUCTURA  CONTRATO ALQUILER.docx

62 párrafos con texto; 29 vacíos. Fuente base: Calibri, 11 pt.

1. N: " ESTRUCTURA DE CONTRATO DE ALQUILER"

2. N: "( PARA NOTARÍA )"

3. N, S: "DATOS ARRENDADORES  :"; S: "  "; base: "     "

4. N: "PERSONA NATURAL :   ( Según DNI )"

5. base: "XXXXXXXXXXXXXXXXXXXX   ( Estado Civil )  DNI.  XXXXXXXX"

6. base: "Fecha de Caducidad :    XX / XX / 20XX"

7. base: "XXXXXXXXXXXXXXXXXXXX   (Estado Civil )       DNI. XXXXXXXXX"

8. base: "Fecha de Caducidad :     XX /XX  /20XX "

9. N: "PARTIDA DE SEPARACIÓN PATRIMONIAL :   XXXXXXXX"

10. N: "PERSONA JURÍDICA :   ( Según FICHA RUC )"

11. N: "( Nombre de la Empresa P.Jurírida ) "

12. N: "RUC : "

13. N: "Dirección"

14. N: "Nombre del Gerente"

15. N: "DNI del Gerente"

16. N: "Dirección del Gerente"

17. N: "PARTIDA REGISTRAL DEL PODER"

18. N, S: "DATOS ARRENDATARIO  :"; base: "      ( Según DNI ) "

19. N: "PERSONA NATURAL :"

20. base: "XXXXXXXXXXXXXXXXXXXXXXX    (Estado Civil ) DNI. XXXXXXXX "

21. base: "Fecha de Caducidad:   XX / XX / 20XX"

22. base: "PARTIDA DE SEPARACIÓN PATRIMONIAL :   XXXXXXXXXXXX"

23. N: "PERSONA JURÍDICA :   :   ( Según FICHA RUC )"

24. N: "( Nombre de la Empresa P.Jurírida ) "

25. N: "RUC : "

26. N: "Dirección :"

27. N: "Nombre del Gerente :"

28. N: "DNI del Gerente  :"

29. N: "Dirección del Gerente  :"

30. N: "PARTIDA REGISTRAL DEL PODER  :"

31. N, S: "DIRECCIÓN DEL PREDIO   :"; S: "  "

32. N: "Según Copia Literal : "

33. base: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

34. N: "Según Autoavaluo :"

35. base: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX "

36. N, S: "NÚMERO DE PARTIDA REGISTRAL DEL PREDIO  :"; S: "  "; base: "    "; N: "XXXXXXXXXXXXX"

37. N, S: "PLAZO DEL CONTRATO : "

38. base: "XXXXX     Años"

39. base: "Fecha de Inicio de Contrato :   "

40. base: "Fecha de Fin de Contrato :"

41. N, S: "MONTO DE LA MERCED CONDUCTIVA  MENSUAL "; base: " "

42. N: "AÑO 1 :   S/."

43. N: "AÑO 2 :   S/."

44. N: "AÑO 3 :   S/."

45. N: "AÑO 4 :   S/."

46. N: "AÑO 5 :   S/. "

47. N, S: "CONDICIONES DEL CONTRATO  :"

48. base: "ADELANTO  :   XXX    Meses"

49. base: "GARANTÍA  :    XXX    Meses "

50. N, S: "NUMERO DE CUENTA Y  CCI.  :"

51. N: "XXXXXXXXXXXXXXXXXXXXXXXXXX"

52. N: "XXXXXXXXXXXXXXXXXXXXXXXXXX"

53. N, S: "PENALIDADES   :"

54. N: "Por Atrazo en el Pago  :    XXXXXXXXXXXXXX"

55. N: "Por incumplimiento del Plazo del Contrato :  XXXXXXXXXXXXXXXX"

56. N: "Por entrega tardía del inmueble  :   XXXXXXXXXXXXXXXX"

57. N, S: "SERVICIOS  :"

58. N: "Luz ,   por cuenta de  XXXXXXXX"

59. N: "Agua ,  por cuenta de  XXXXXXXXX"

60. N: "Internet ,  por cuenta de  XXXXXXXXX"

61. N: "Gas ,  por cuenta de  XXXXXXXX"

62. N, 14.0 pt: "OBSERVACIONES :"

#### Diferencias textuales frente al modelo actual

Comparación de palabras, ignorando cambios de espacios y líneas. El título se compara aparte del cuerpo.

- Original: PATRIMONIAL → Actual: DE PATRIMONIOS
- Original: P.Jurírida → Actual: persona jurídica
- Original: PATRIMONIAL → Actual: DE PATRIMONIOS
- Original: : → Actual: (retirado)
- Original: P.Jurírida → Actual: persona jurídica
- Original: Autoavaluo → Actual: autoavalúo
- Original: NUMERO → Actual: NÚMERO
- Original: Atrazo → Actual: atraso

Total: 8 diferencias textuales localizadas.

### ESTRUCTURA  MINUTA DE CV.docx

62 párrafos con texto; 35 vacíos. Fuente base: Calibri, 11 pt.

1. N: " ESTRUCTURA DE MINUTA DE COMPRA VENTA"

2. N: "( PARA NOTARÍA )"

3. N, S: "DATOS VENDEDORES  :"; S: "  "; base: "     "

4. N: "PERSONA NATURAL :   ( Según DNI )"

5. base: "XXXXXXXXXXXXXXXXXXXX   ( Estado Civil )  DNI.  XXXXXXXX"

6. base: "Fecha de Caducidad :    XX / XX / 20XX"

7. base: "XXXXXXXXXXXXXXXXXXXX   (Estado Civil )       DNI. XXXXXXXXX"

8. base: "Fecha de Caducidad :     XX /XX  /20XX "

9. N: "PARTIDA DE SEPARACIÓN PATRIMONIAL :   XXXXXXXX"

10. N: "PERSONA JURÍDICA :   ( Según FICHA RUC )"

11. N: "( Nombre de la Empresa P.Jurírida ) "

12. N: "RUC : "

13. N: "Dirección"

14. N: "Nombre del Gerente"

15. N: "DNI del Gerente"

16. N: "Dirección del Gerente"

17. N: "PARTIDA REGISTRAL DEL PODER"

18. N, S: "DATOS COMPRADORES  :"; base: "      ( Según DNI ) "

19. N: "PERSONA NATURAL :"

20. base: "XXXXXXXXXXXXXXXXXXXXXXX    (Estado Civil ) DNI. XXXXXXXX "

21. base: "Fecha de Caducidad:   XX / XX / 20XX"

22. base: "PARTIDA DE SEPARACIÓN PATRIMONIAL :   XXXXXXXXXXXX"

23. N: "PERSONA JURÍDICA :   :   ( Según FICHA RUC )"

24. N: "( Nombre de la Empresa P.Jurírida ) "

25. N: "RUC : "

26. N: "Dirección :"

27. N: "Nombre del Gerente :"

28. N: "DNI del Gerente  :"

29. N: "Dirección del Gerente  :"

30. N: "PARTIDA REGISTRAL DEL PODER  :"

31. N, S: "DIRECCIÓN DEL PREDIO   :"; S: "  "

32. N: "Según Copia Literal : "

33. base: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

34. N: "Según Autoavaluo :"

35. base: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX "

36. N, S: "INFORMACIÓN DEL PREDIO  EN AUTOAVALUO   ( Ver PU ) :"

37. N: "Condición de Propiedad :   XXXXX"

38. N: "Estado :  XXXXXX"

39. N: "Tipo :  PROPIEDAD  XXXXXX"

40. N: "Actividad / Uso  :    XXXXXXX"

41. N: "%  Propiedad  :  XXXXX%"

42. N: "Valor Arancelario del Predio :    S/. XXXXXXXXX   =   US$ XXXXXX      ,   T.C. S/. XXXX"

43. N, S: "NÚMERO DE PARTIDA REGISTRAL DEL PREDIO  :"; S: "  "; base: "    "; N: "XXXXXXXXXXXXX"

44. N, S: "MONTO DE LA VENTA  ( FORMAL DECLARADA ):"; base: " "

45. N: "US$ XXXXXXXXXX   ó   S/. XXXXXXXXX     T.C.  XXXXX   (venta)"

46. N, S: "FORMA DE PAGO  :"

47. base: "Se realizará de la siguiente manera :"

48. N, S: "A LA FIRMA DE LA MINUTA : "

49. N: "A la firma de la MINUTA de Compra venta "; base: "se cancelará la suma de "; N: " S/.  XXXXXXXXXX ( XXXXXXXXXXXXXXXXXX  y  00/100 SOLES )  ;"; base: "    ("; N: "equivalentes a US$ XXXXXXXX  XXXXXXXXXXXXXXXXXX Y  00/100 DÓLARES AMERICANOS )"; base: "  al Tipo de Cambio S/. XXXXXX  (venta) de la siguiente manera : "

50. N: "S/. XXXXXXXXXXXX  ( XXXXXXXXX y 00/100 SOLES )"; base: " mediante depósito en cuenta a nombre de XXXXXXXXXXXXXX    "; N, S: "(XXXXXXXXXXXXXXX  )."

51. N: "S/. XXXXXXXXXXXXXX  ( XXXXXXXXXXXXXXXXXXXXXX  Y 00/100 SOLES )  al Tipo de cambio S/. XXXX "; base: "  cancelados con Cheque de Gerencia No negociable o Transferencia Interbancaria o Depósito en Cuenta  a nombre de XXXXXXXXXXXXXXXX  en SU Cuenta del XXXXXXXXXXXX  , para la cancelación de la  deuda con el XXXXXXXXXXXXXXXXX    de acuerdo a la liquidación que entregue XXXXXX"

52. N, S: "A LA FIRMA DE LA ESCRITURA:"

53. N: "A la firma de la ESCRITURA PÚBLICA de Compra venta "; base: "se pagará el monto de  "; N: "S/. XXXXXXXXXXXXX ( XXXXXXXXXX   y 00/100 SOLES )  ;"; base: "   ("; N: "equivalentes a US$ XXXXXXXXXXXXXX   y 00/100 Dólares Americanos)"; base: "  al Tipo de Cambio S/. XXXXXX   (venta)."

54. N: "La Escritura Pública será firmada cuando XXXXXXXXXXXXXXXXXX."

55. N, S: "Plazo para la Formalización de la Compra Venta  :"

56. base: "La escritura Pública se firmará cuando XXXXXXXXXXXXXXXXXXXXXXXX"

57. N, S: "FECHA DE LA FIRMA DE LA ESCRITURA PÚBLICA :"

58. base: "Se deja constancia, que la MINUTA de la Escritura Pública  deberá celebrarse ante cualquier Notaría a más tardar en el día XXXXX "

59. N, S: "CARGAS  :"

60. base: "LOS VENDEDORES declaran y LOS COMPRADORES conocen y aceptan que existe hipoteca inscrita en el Asiento XXXXXXXX  de la partida registral del inmueble  en favor del Banco XXXXXXXXXXXXXXXXXXX que será cancelada con la compraventa del inmueble."

61. N, S: "TÍTULOS EN TRÁMITE   :"; base: "   XXXXXXXXX"

62. N, 16.0 pt: "OBSERVACIONES :"

#### Diferencias textuales frente al modelo actual

Comparación de palabras, ignorando cambios de espacios y líneas. El título se compara aparte del cuerpo.

- Original: PATRIMONIAL → Actual: DE PATRIMONIOS
- Original: P.Jurírida → Actual: persona jurídica
- Original: PATRIMONIAL → Actual: DE PATRIMONIOS
- Original: : → Actual: (retirado)
- Original: P.Jurírida → Actual: persona jurídica
- Original: Autoavaluo → Actual: autoavalúo
- Original: AUTOAVALUO → Actual: AUTOAVALÚO
- Original: Compra venta → Actual: compraventa
- Original: Compra venta → Actual: compraventa
- Original: La Escritura Pública será firmada cuando XXXXXXXXXXXXXXXXXX. → Actual: (retirado)
- Original: Compra Venta → Actual: compraventa
- Original: constancia, → Actual: constancia de
- Original: MINUTA de la Escritura Pública → Actual: escritura pública
- Original: cualquier Notaría → Actual: notaría
- Original: en → Actual: (retirado)
- Original: XXXXX → Actual: XXXXX.

Total: 16 diferencias textuales localizadas.
