// Constructor de PDF ejecutado exclusivamente en el servidor de pago.
// No publicar este archivo en GitHub Pages: se incorpora en la Edge Function.
function construirEscrito(datos) {
    // Usar la fecha de Veracruz, no la fecha UTC del servidor.
    const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const campo = (tipo) => partes.find(x => x.type === tipo)?.value || '';
    const yyyy = Number(campo('year')), mm = campo('month'), dd = campo('day');
    function normalizar(valor) {
        return String(valor || '').replace(/[\u2018\u2019\u02bb]/g, "'")
            .replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014\u2212]/g, '-')
            .replace(/[\u2022\u2023\u25cf]/g, '-').replace(/\u00a0/g, ' ')
            .replace(/\t/g, ' ').replace(/\r\n?/g, '\n').normalize('NFC')
            .replace(/[^\u000a\u0020-\u007e\u00a0-\u00ff]/g, '?');
    }
    function bytes(s) {
        const a = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++)
            a[i] = s.charCodeAt(i) & 255;
        return a;
    }
    function safe(s) { return normalizar(s).replace(/([\\()])/g, '\\$1').replace(/\n/g, ' '); }
    const ancho = 595.28, alto = 841.89, izquierda = 54, derecha = 541, limite = derecha - izquierda;
    const comandos = [];
    let pagina = [], y = 780;
    function escribir(x, posY, t, size = 10.8, bold = false, color = '0 0 0') {
        pagina.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${posY.toFixed(2)} Tm (${safe(t)}) Tj ET`);
    }
    function paginaNueva() {
        if (pagina.length)
            comandos.push(pagina.join('\n') + '\n');
        pagina = [];
        y = 780;
    }
    function medida(txt, size = 10) {
        let suma = 0;
        for (const c of normalizar(txt)) {
            if (c === ' ')
                suma += 2.75;
            else if ('ilI.,;:!|\'`'.includes(c))
                suma += 2.8;
            else if ('mwMW@%'.includes(c))
                suma += 8.5;
            else if ('ABCDEFGHJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ'.includes(c))
                suma += 7.3;
            else
                suma += 5.35;
        }
        return suma * size / 10;
    }
    function partir(texto, size = 10) {
        const lineas = [];
        for (const bloque of normalizar(texto).split('\n')) {
            const palabras = bloque.split(/\s+/).filter(Boolean);
            if (!palabras.length) {
                lineas.push('');
                continue;
            }
            let linea = '';
            for (let palabra of palabras) {
                while (medida(palabra, size) > limite) {
                    if (linea) {
                        lineas.push(linea);
                        linea = '';
                    }
                    let n = 1;
                    while (n < palabra.length && medida(palabra.slice(0, n + 1), size) <= limite)
                        n++;
                    lineas.push(palabra.slice(0, n));
                    palabra = palabra.slice(n);
                }
                const candidato = linea ? linea + ' ' + palabra : palabra;
                if (medida(candidato, size) > limite && linea) {
                    lineas.push(linea);
                    linea = palabra;
                }
                else
                    linea = candidato;
            }
            if (linea)
                lineas.push(linea);
        }
        return lineas;
    }
    function asegurar(altura) { if (y - altura < 73)
        paginaNueva(); }
    function parrafo(texto, { tam = 10.5, inter = 15, espacio = 9, negrita = false } = {}) {
        for (const l of partir(texto, tam)) {
            asegurar(inter);
            if (l)
                escribir(izquierda, y, l, tam, negrita);
            y -= inter;
        }
        y -= espacio;
    }
    function titulo(texto) { asegurar(36); escribir(izquierda, y, texto, 11.1, true); y -= 20; }
    function fechaLegible(s) {
        const [a, m, d] = s.split('-').map(Number);
        const f = new Date(a, m - 1, d);
        return f.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    function generar(datos) {
        comandos.length = 0;
        pagina = [];
        paginaNueva();
        parrafo(`${datos.municipio}, a ${fechaLegible(`${yyyy}-${mm}-${dd}`)}.`, { espacio: 18 });
        parrafo('ASUNTO: RECLAMACIÓN DE RESPONSABILIDAD PATRIMONIAL POR DAÑOS MATERIALES.', { negrita: true, espacio: 15 });
        parrafo(`A ${(datos.autoridad.startsWith('La ') ? datos.autoridad : 'La ' + datos.autoridad).toUpperCase()}`, { negrita: true, espacio: 3 });
        parrafo('P R E S E N T E.', { negrita: true, espacio: 20 });
        parrafo(`Quien suscribe, ${datos.nombre}, por mi propio derecho, señalando como domicilio para recibir notificaciones el ubicado en ${datos.domicilio}, y correo electrónico de contacto ${datos.correo}, comparezco para presentar RECLAMACIÓN DE RESPONSABILIDAD PATRIMONIAL, con motivo de daños materiales que considero directamente relacionados con el estado de una vía pública, bajo los hechos y elementos que manifiesto a continuación.`);
        titulo('I. OBJETO Y PRESTACIÓN RECLAMADA');
        parrafo(`Solicito que se tramite la presente reclamación y, en caso de acreditarse los presupuestos legales, se reconozca la responsabilidad patrimonial de la administración que resulte competente y se determine la indemnización correspondiente al daño material reclamado, cuyo importe estimado por la persona promovente es de $${Number(datos.monto).toFixed(2)} (MXN), sin perjuicio de la valoración de las pruebas y de las normas aplicables.`);
        titulo('II. HECHOS');
        parrafo(`PRIMERO. El ${fechaLegible(datos.fecha)}${datos.hora ? ' aproximadamente a las ' + datos.hora + ' horas' : ''}, ocurrió un incidente relacionado con el estado de la superficie vial en ${datos.calle}, colonia o referencia ${datos.colonia}, municipio de ${datos.municipio}.`);
        parrafo(`SEGUNDO. La persona promovente describe los hechos del siguiente modo: ${datos.descripcion}`);
        parrafo(`TERCERO. El bien material que manifiesto afectado es: ${datos.bien}. Estimo el daño reclamado en $${Number(datos.monto).toFixed(2)} (MXN), cantidad sujeta a comprobación y valoración por la autoridad.`);
        parrafo(`CUARTO. Respecto del nexo causal entre la condición de la vía y el daño material alegado, manifiesto lo siguiente: ${datos.causalidad}`);
        if (datos.folio)
            parrafo(`QUINTO. Como referencia ciudadana se señala el folio ${datos.folio}, que no sustituye la presentación de esta reclamación ni constituye por sí mismo una prueba de responsabilidad.`);
        titulo('III. FUNDAMENTO DE DERECHO');
        parrafo('Fundo esta reclamación en los artículos 1, 2, 3 y 4 de la Ley número 602 de Responsabilidad Patrimonial de la Administración Pública Estatal y Municipal del Estado de Veracruz de Ignacio de la Llave, relativos al objeto, ámbito de aplicación y lesión patrimonial; en sus artículos 14 y 15, relativos al procedimiento a instancia de parte y a la presentación ante la dependencia presuntamente responsable; y en los artículos 16 y 17, referentes a la relación de causalidad y carga de la prueba. Solicito que, si se acredita la procedencia de la indemnización, se valore conforme a los artículos 7 a 10 de la misma Ley. Asimismo, son aplicables el artículo 139 y demás disposiciones conducentes del Código de Procedimientos Administrativos para el Estado de Veracruz de Ignacio de la Llave.');
        parrafo('La referencia al artículo 24 de la Ley número 602 no implica una certificación del cumplimiento del plazo de prescripción: corresponde revisar la fecha de la lesión, su eventual continuidad y las circunstancias legales del caso.');
        titulo('IV. PRUEBAS OFRECIDAS');
        parrafo(`La persona promovente señala como categoría principal de pruebas: ${datos.evidencias}.`);
        parrafo(`Las evidencias concretas que manifiesta tener disponibles para acompañar a la reclamación son: ${datos.detalle_pruebas}`);
        parrafo('Solicito se tengan por ofrecidas las pruebas antes indicadas, mismas que se acompañarán al momento de presentar esta reclamación, en la medida en que estén disponibles y sean pertinentes, para su admisión y valoración conforme a derecho.', { tam: 10.5, inter: 15.5, espacio: 16 });
        titulo('V. PUNTOS PETITORIOS');
        parrafo('PRIMERO. Se tenga por presentada, con los anexos que se acompañen al momento de su entrega, la reclamación de responsabilidad patrimonial y se determine lo conducente sobre su admisión y tramitación.');
        parrafo('SEGUNDO. Se analicen los hechos, las evidencias efectivamente presentadas y la relación de causalidad entre la actuación administrativa y la lesión patrimonial alegada, en términos de los artículos 16 y 17 de la Ley número 602.');
        parrafo(`TERCERO. De acreditarse los requisitos legales, se reconozca la indemnización por los daños materiales reclamados, considerando el importe estimado de $${Number(datos.monto).toFixed(2)} (MXN), sujeto a su comprobación y a la valoración correspondiente.`);
        parrafo('CUARTO. Si existe concurrencia de administraciones públicas, se proceda conforme al artículo 15 de la Ley número 602 y a las disposiciones que resulten aplicables.');
        parrafo('QUINTO. Se emita la resolución fundada y motivada que corresponda y se practiquen las notificaciones conforme a derecho en el domicilio señalado.');
        titulo('VI. FIRMA');
        asegurar(100);
        parrafo('PROTESTO LO NECESARIO', { negrita: true, espacio: 21 });
        escribir(izquierda, y, '________________________________________', 10);
        y -= 24;
        parrafo(datos.nombre, { negrita: true, espacio: 11 });
        parrafo('Firma autógrafa o por el medio legalmente autorizado, al presentar el escrito.', { tam: 9.2, inter: 14, espacio: 13 });
        if (pagina.length)
            comandos.push(pagina.join('\n') + '\n');
        const n = comandos.length;
        const objetos = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            `<< /Type /Pages /Kids [${Array.from({ length: n }, (_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${n} >>`,
            '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>'
        ];
        comandos.forEach((stream, i) => {
            const id = 6 + i * 2;
            objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id} 0 R >>`);
            objetos.push(`<< /Length ${bytes(stream).length} >>\nstream\n${stream}endstream`);
        });
        const infoId = objetos.length + 1;
        objetos.push('<< /Title (Reclamacion de responsabilidad patrimonial) /Producer (Generador de escritos) >>');
        let doc = '%PDF-1.4\n%âãÏÓ\n';
        const offsets = [0];
        for (let i = 0; i < objetos.length; i++) {
            offsets.push(bytes(doc).length);
            doc += `${i + 1} 0 obj\n${objetos[i]}\nendobj\n`;
        }
        const xref = bytes(doc).length;
        doc += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
        offsets.slice(1).forEach(offset => { doc += String(offset).padStart(10, '0') + ' 00000 n \n'; });
        doc += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
        return bytes(doc);
    }
    return generar(datos);
}
window.cbmxPreviewPDF = construirEscrito;
