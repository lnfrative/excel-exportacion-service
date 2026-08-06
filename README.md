# excel-exportacion-service

Microservicio que genera el Excel institucional **"Reporte de Medición y Acciones de Mejora del Resultado de Aprendizaje/Competencias"** (`FT-02-V01/PRO-DAR-004`) con fidelidad visual exacta respecto a la plantilla oficial: mismos colores, merges, formato condicional, validaciones de datos y gráfico.

## Por qué NO usa una librería de Excel de alto nivel

ExcelJS, ClosedXML, EPPlus u openpyxl **re-serializan todo el workbook** (estilos, merges, formato condicional) desde su propio modelo interno al guardar. Con documentos institucionales controlados esto es un riesgo real de pequeñas divergencias visuales.

Este servicio en cambio trata el `.xlsx` como lo que es — un zip de XML (OOXML) — y **solo reescribe los nodos `<c>` de celdas de datos dentro de `xl/worksheets/sheet1.xml`**. Cada otra entrada del zip (`styles.xml`, el gráfico, comentarios, tema, la hoja oculta vestigial, etc.) se copia **byte-idéntica** del template al output. Esto es posible porque la plantilla tiene estructura fija (máx. 4 criterios, máx. 51 estudiantes) y nunca requiere insertar filas ni desplazar merges.

**No migres la escritura de celdas a ExcelJS/otra librería de alto nivel** sin entender esta decisión — ver `src/excel/buildWorkbook.ts` y el test `test/integrity-diff.spec.ts`, que falla si cualquier entrada del zip fuera de `sheet1.xml` cambia, o si se tocan merges/validaciones/formato condicional/anchos de columna.

## Uso

```bash
cp .env.example .env   # define API_KEY
npm install
npm run dev            # http://localhost:3000
```

```bash
curl -X POST http://localhost:3000/api/reportes/medicion/excel \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d @test/fixtures/payload-completo.json \
  -o reporte-medicion.xlsx
```

`GET /health` no requiere autenticación. Todo lo bajo `/api/*` requiere el header `X-Api-Key`.

## Contrato del payload

```jsonc
{
  "facultad": "string",
  "resultadoAprendizaje": "string",
  "codigoMateria": "string",
  "nombreMateria": "string",
  "nombreDocente": "string",
  "meta": 0.75,                 // decimal 0-1, la celda ya tiene formato "0%"
  "periodo": "PAO-0" | "PAO-1" | "PAO-2",
  "criterios": [                // 1 a 4 elementos (límite duro de la plantilla)
    { "nombre": "string", "tipoInstrumento": "string", "descripcionInstrumento": "string" }
  ],
  "estudiantes": [               // 0 a 51 elementos
    {
      "nombre": "string",
      "calificaciones": ["U" | "D" | "S" | "E"]  // mismo largo y orden que `criterios`
    }
  ],
  "accionesMejora": {            // opcional, cada fuente es opcional
    "curso":       { "factorMejora": "string", "accionPropuesta": "string", "responsable": "string", "fechaInicioFin": "string", "observaciones": "string" },
    "programa":    { "...": "..." },
    "instrumento": { "...": "..." }
  }
}
```

Notas importantes:

- **Escala de logro**: el payload usa `U/D/S/E` (igual que `T_RML_CALIFICACIONCRITERIO.NIVELLOGRO` en MedicionesLTI). El servicio mapea `U → I` internamente porque la plantilla Excel valida contra `I/D/S/E` — no envíes `I`, el schema lo rechaza.
- `estudiantes[i].calificaciones.length` debe ser igual a `criterios.length` (validado en el handler, no en el JSON Schema — devuelve 400 con el detalle si no coincide).
- `accionesMejora.*.fechaInicioFin` es **una sola celda de texto libre** (ej. `"01/03/2026 - 30/06/2026"`), la plantilla no tiene columnas separadas para fecha inicio/fin.
- Las posiciones de criterios/estudiantes que el payload no llena quedan explícitamente vacías (limpia el dummy data — "PEPE", "Describa criterio N" — que trae la plantilla de referencia).
- Nunca se escribe en la columna de autonumeración de estudiantes ni en las secciones de fórmulas (% de cumplimiento por criterio, logro global del RA) — se recalculan solas al abrir el archivo en Excel/LibreOffice.

## Tests

```bash
npm test
```

- `test/buildWorkbook.spec.ts`: valores correctos en cada celda, mapeo `U→I`, fórmulas intactas, limpieza de posiciones no usadas.
- `test/integrity-diff.spec.ts`: la prueba más importante — descomprime plantilla y output, verifica que **ninguna entrada del zip fuera de `sheet1.xml` cambió un solo byte**, y que merges/validaciones/formato condicional/anchos de columna/filas dentro de `sheet1.xml` son idénticos.

## Docker

```bash
docker build -t excel-exportacion-service .
docker run --rm -p 3000:3000 -e API_KEY=change-me excel-exportacion-service
```
