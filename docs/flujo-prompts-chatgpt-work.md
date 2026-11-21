# Generación de prompts para ChatGPT Work

El flujo se usa en **Fase 2 → Planos → Plano de ubicación referencial**. Puede aplicarse a otros apartados cuando el ingeniero quiera encargar a ChatGPT Work la lectura de los archivos originales de la intranet.

## Qué hace la intranet

- Usa el modelo de prompt del ingeniero y conserva su redacción. Completa los datos básicos del inmueble seleccionado. Para el plano son la zona, el número, el tipo, la dirección y el contacto.
- Al generar el prompt, consulta únicamente la ficha del inmueble. La lectura de las copias literales, los CRI y los modelos queda a cargo de ChatGPT Work.
- Muestra el texto completo en un campo editable. **Copiar prompt** copia la versión visible, con los cambios del usuario. **Restaurar texto automático** vuelve a generar el texto a partir del modelo y los datos de la ficha.

## Qué hace ChatGPT Work

El ingeniero pega el prompt en su sesión de ChatGPT Work. Allí, Work sigue la ruta indicada en la intranet, abre los archivos originales y realiza la tarea según el modelo. Para el plano referencial, el prompt dirige a Work a **2. Documentos del inmueble** para consultar la copia literal o el CRI y a **8. Planos** para consultar el modelo gráfico. La navegación requiere que Work pueda acceder a la intranet e iniciar sesión.

## Credenciales

El campo de contraseña es opcional. Si el usuario la ingresa, aparece en el texto visible y copiado, en la línea de acceso del modelo. La contraseña se mantiene mientras el formulario está abierto y se descarta al cerrarlo. Con el campo vacío, el prompt indica que se use una sesión autorizada de la intranet.

## Aplicación a otros apartados

Para cada apartado, toma como base el prompt que ya usa el ingeniero y define qué datos de la ficha deben rellenarse automáticamente. Conserva el editor y la opción de copiar el texto. Deja en el prompt la ruta de los documentos y el resultado que se espera de ChatGPT Work.
