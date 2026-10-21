/* Comprobante jurídico CazaBachesMX. Generador PDF local sin dependencias de terceros.
   La clave privada nunca se transmite a un servicio de generación de documentos. */
(() => {
  'use strict';
  const ancho = 595.28, alto = 841.89;
  function latin1(text) {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      bytes[i] = c <= 255 ? c : 63;
    }
    return bytes;
  }
  function safe(text) {
    return String(text).replace(/[\u2018\u2019]/g,"'")
      .replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-')
      .replace(/[^\u0020-\u00ff]/g,'?')
      .replace(/([\\()])/g,'\\$1');
  }
  function generar(datos) {
    if (!datos || !/^CBJ-[A-F0-9]{12}$/.test(String(datos.folio||'')) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(datos.clave_privada||''))) {
      throw new Error('Las credenciales del expediente no son válidas');
    }
    const cmds = [];
    const rect = (x,y,w,h,color) => {
      cmds.push(`${color} rg ${x} ${y} ${w} ${h} re f`);
    };
    function write(x,y,str,size=10,bold=false,color='0.11 0.22 0.24') {
      cmds.push(`BT /${bold?'F2':'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${safe(str)}) Tj ET`);
    }
    function wrap(text,max=82) {
      const words=String(text).split(/\s+/);
      const lines=[];let current='';
      for(const w of words){
        if((current+' '+w).trim().length>max && current){lines.push(current);current=w;}
        else current=(current+' '+w).trim();
      }
      if(current)lines.push(current);
      return lines;
    }
    rect(0,alto-103,ancho,103,'0.055 0.18 0.21');
    rect(38,alto-117,6,50,'0.70 0.92 0.42');
    write(54,786,'CazaBachesMX',20,true,'1 1 1');
    write(54,761,'COMPROBANTE DE SOLICITUD JURÍDICA',13,true,'1 1 1');
    write(54,741,'Recepción electrónica de orientación inicial',9,false,'0.85 0.91 0.90');

    write(47,692,'Conserva este archivo en un lugar seguro',13,true);
    write(47,670,'El folio y la clave privada permiten consultar el estado del expediente.',10);
    rect(46,492,503,156,'0.93 0.97 0.95');
    write(64,620,'FOLIO DEL EXPEDIENTE',10,true,'0.10 0.43 0.38');
    write(64,596,String(datos.folio),18,true);
    write(64,566,'CLAVE PRIVADA DE SEGUIMIENTO',10,true,'0.10 0.43 0.38');
    write(64,546,String(datos.clave_privada),11,true);
    const fecha = datos.fecha instanceof Date ? datos.fecha : new Date(datos.fecha||Date.now());
    write(64,516,'Generado: '+(Number.isNaN(fecha.getTime())?'Fecha no disponible':fecha.toLocaleString('es-MX',{dateStyle:'long',timeStyle:'short'})),9);

    write(47,462,'CONDICIONES INFORMATIVAS',13,true,'0.10 0.43 0.38');
    const terminos = [
      'Este comprobante acredita únicamente la recepción de una solicitud de orientación jurídica inicial.',
      'La recepción no implica aceptación del caso, representación legal ni emisión de un dictamen.',
      'El registro no equivale a presentar una reclamación ante una autoridad ni suspende o interrumpe plazos legales.',
      'La revisión preliminar no garantiza indemnización, resultado favorable ni procedencia de acciones.',
      'Conserva la clave privada sin compartirla. La información se trata conforme al aviso de privacidad de CazaBachesMX; este comprobante no lo sustituye.',
      'Si se aproxima un plazo legal, consulta oportunamente a un profesional sin esperar una respuesta de esta plataforma.'
    ];
    let y=437;
    for(let k=0;k<terminos.length;k++){
      const parts=wrap(terminos[k],94);
      for(let i=0;i<parts.length;i++){
        write(i===0?48:62,y,(i===0?`${k+1}. `:'')+parts[i],9.6);
        y-=15;
      }
      y-=7;
    }
    rect(46,84,503,49,'0.94 0.96 0.97');
    write(58,115,'Documento generado automáticamente después del registro.',9,true);
    write(58,100,'No es un documento expedido por una autoridad ni acredita indemnización.',9);
    write(47,53,'CazaBachesMX - Iniciativa ciudadana independiente',9,false,'0.38 0.48 0.48');

    const stream=cmds.join('\n')+'\n';
    const objetos=[
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      `<< /Length ${latin1(stream).length} >>\nstream\n${stream}endstream`,
      `<< /Title (Comprobante juridico CazaBachesMX) /Producer (CazaBachesMX) >>`
    ];
    let documento='%PDF-1.4\n%âãÏÓ\n';
    const offsets=[0];
    for(let i=0;i<objetos.length;i++){
      offsets.push(latin1(documento).length);
      documento+=`${i+1} 0 obj\n${objetos[i]}\nendobj\n`;
    }
    const startxref=latin1(documento).length;
    documento+=`xref\n0 ${objetos.length+1}\n0000000000 65535 f \n`;
    for(const offset of offsets.slice(1)) documento+=String(offset).padStart(10,'0')+' 00000 n \n';
    documento+=`trailer\n<< /Size ${objetos.length+1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
    return new Blob([latin1(documento)],{type:'application/pdf'});
  }
  function descargar(datos) {
    const pdf=generar(datos);
    const url=URL.createObjectURL(pdf);
    try{
      const a=document.createElement('a');a.href=url;
      a.download='CazaBachesMX_Comprobante_'+datos.folio+'.pdf';
      document.body.append(a);a.click();a.remove();
    } finally {setTimeout(()=>URL.revokeObjectURL(url),60000);}
  }
  window.CazaComprobanteJuridico={generar,descargar};
})();
