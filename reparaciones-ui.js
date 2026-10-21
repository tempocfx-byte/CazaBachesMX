/* CazaBachesMX: aviso ciudadano de reparación. Se usa desde mapa y seguimiento.
   Únicamente muestra y envía avisos. El dictamen es exclusivo del administrador. */
(() => {
  'use strict';
  const ENDPOINT = 'https://joyfxdjdzjcfbcgjnjsn.supabase.co/functions/v1/reparaciones-baches';
  const SITE_KEY = '0x4AAAAAAFeFVfO7fFUm1cEw';
  const reFolio = /^CBMX-[A-F0-9]{12}$/;
  let dialog, widgetId = null, actual = '', alGuardar = null, enviando = false;
  let scriptPromise;

  const style = document.createElement('style');
  style.textContent = `
  .cb-repair-action{padding:12px 17px;border:0;border-radius:11px;background:#126c60;color:white;font:700 14px system-ui,sans-serif;cursor:pointer}
  .cb-repair-action:disabled{opacity:.5;cursor:wait}
  .cb-repair-dialog{border:0;border-radius:19px;padding:0;width:min(540px,calc(100% - 22px));max-width:540px;max-height:calc(100dvh - 25px);overflow:auto;box-shadow:0 22px 75px #071e2888;background:#fff;color:#173a3d}
  .cb-repair-dialog::backdrop{background:#071e28ae}
  .cb-repair-head{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:18px 22px;border-bottom:1px solid #dce8e3}
  .cb-repair-head h2{font:800 21px system-ui,sans-serif;margin:0}
  .cb-repair-close{width:38px;height:38px;flex:none;border:0;border-radius:50%;background:#e8f3ef;color:#123c39;font-size:24px;cursor:pointer}
  .cb-repair-form{padding:20px 22px 24px;font:14px/1.55 system-ui,sans-serif}
  .cb-repair-form label{display:block;font-weight:700;margin:14px 0 6px}
  .cb-repair-form textarea,.cb-repair-form input[type=file]{display:block;width:100%;box-sizing:border-box;border:1px solid #bbcfc9;border-radius:9px;padding:11px;font:inherit;color:#173a3d}
  .cb-repair-form textarea{min-height:85px;resize:vertical}
  .cb-repair-tip{color:#607576;font-size:13px;line-height:1.5}
  .cb-repair-result{white-space:pre-wrap;padding:13px;border-radius:9px;background:#e9f6ef;margin:12px 0;overflow-wrap:anywhere}
  .cb-repair-result:empty{display:none}
  .cb-repair-result.error{background:#fff0ef;color:#942c2c}
  `;
  document.head.append(style);

  function construir() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'cb-repair-dialog';
    dialog.setAttribute('aria-labelledby','cbRepairTitle');
    dialog.innerHTML = `
      <div class="cb-repair-head"><h2 id="cbRepairTitle">Avisar que el bache fue reparado</h2>
        <button type="button" class="cb-repair-close" aria-label="Cerrar formulario">×</button></div>
      <form id="cbRepairForm" class="cb-repair-form">
        <p>Tu aviso será revisado por un administrador. <strong>No se marcará como reparado automáticamente.</strong></p>
        <p><strong>Folio:</strong> <span id="cbRepairFolio"></span></p>
        <label for="cbRepairComment">¿Qué observaste? (opcional)</label>
        <textarea id="cbRepairComment" maxlength="500" placeholder="Ej. El pavimento fue reparado esta mañana."></textarea>
        <label for="cbRepairPhoto">Fotografía actual * (obligatoria)</label>
        <input id="cbRepairPhoto" type="file" required accept="image/jpeg,image/png,image/webp">
        <p class="cb-repair-tip">Debes adjuntar una fotografía actual JPG, PNG o WebP de hasta 5 MB. No incluyas rostros, placas ni datos personales.</p>
        <label>Verificación de seguridad *</label>
        <div id="cbRepairTurnstile"></div>
        <div id="cbRepairResult" class="cb-repair-result" role="status" aria-live="polite"></div>
        <button id="cbRepairSend" class="cb-repair-action" type="submit">Enviar aviso para revisión</button>
      </form>`;
    document.body.append(dialog);
    dialog.querySelector('.cb-repair-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.querySelector('form').addEventListener('submit', enviar);
  }
  function mensaje(text, fallo=false) {
    const el=dialog.querySelector('#cbRepairResult');
    el.classList.toggle('error',fallo); el.textContent=text;
  }
  function cargarTurnstile() {
    if(window.turnstile?.render)return Promise.resolve(window.turnstile);
    if(scriptPromise)return scriptPromise;
    scriptPromise = new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true;
      script.onload=()=>window.turnstile?.render?resolve(window.turnstile):reject(Error('No se cargó Turnstile'));
      script.onerror=()=>reject(Error('No se pudo cargar Turnstile'));
      document.head.append(script);
    });
    return scriptPromise.catch(err=>{scriptPromise=undefined;throw err;});
  }
  async function mostrar(folio,callback) {
    const f=String(folio||'').trim().toUpperCase();
    if(!reFolio.test(f))throw Error('Folio de bache inválido');
    construir();actual=f;alGuardar=typeof callback==='function'?callback:null;
    dialog.querySelector('form').reset();
    dialog.querySelector('#cbRepairFolio').textContent=f;
    dialog.querySelector('#cbRepairSend').disabled=false;
    mensaje('');
    if(!dialog.open)dialog.showModal();
    try {
      const turnstile=await cargarTurnstile();
      if(widgetId===null){
        widgetId=turnstile.render('#cbRepairTurnstile',{sitekey:SITE_KEY,theme:'auto'});
      } else {turnstile.reset(widgetId);}
    } catch {mensaje('No se pudo cargar la verificación de seguridad. Cierra y vuelve a intentarlo.',true);}
  }
  async function enviar(e) {
    e.preventDefault();if(enviando)return;
    const file=dialog.querySelector('#cbRepairPhoto').files[0];
    if(!file){
      mensaje('Adjunta una fotografía actual del bache reparado para enviar el aviso.',true);
      dialog.querySelector('#cbRepairPhoto').focus();
      return;
    }
    if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size<1 || file.size>5*1024*1024){
      mensaje('La fotografía debe ser JPG, PNG o WebP y pesar máximo 5 MB.',true);return;
    }
    const token=widgetId===null?'':window.turnstile?.getResponse(widgetId);
    if(!token){mensaje('Completa la verificación de seguridad.',true);return;}
    const form=new FormData();
    form.append('accion','avisar');form.append('folio',actual);
    form.append('comentario',dialog.querySelector('#cbRepairComment').value.trim());
    form.append('turnstile_token',token);
    form.append('imagen',file,file.name);
    enviando=true;
    const btn=dialog.querySelector('#cbRepairSend');btn.disabled=true;
    mensaje('Registrando aviso...');
    try {
      const response=await fetch(ENDPOINT,{method:'POST',body:form,cache:'no-store'});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(result.error||'No fue posible registrar el aviso');
      mensaje('Aviso recibido correctamente.\nUn administrador verificará si el bache fue reparado.\nMientras tanto, el reporte sigue figurando como no reparado.');
      if(alGuardar)await alGuardar(result);
    } catch(err) {
      mensaje(err.message||'Error de conexión',true);
      window.turnstile?.reset(widgetId);
      btn.disabled=false;
    } finally {enviando=false;}
  }

  async function consultarEstado(folio) {
    const f=String(folio||'').trim().toUpperCase();
    if(!reFolio.test(f))throw Error('Folio inválido');
    const r=await fetch(ENDPOINT+'?accion=estado&folio='+encodeURIComponent(f),{cache:'no-store'});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.error||'No se pudo consultar el estado de reparación');
    return data;
  }
  async function listarEstados() {
    const r=await fetch(ENDPOINT+'?accion=estados_publicos',{cache:'no-store'});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.error||'No se pudieron consultar las reparaciones');
    return Array.isArray(data.estados)?data.estados:[];
  }
  window.CazaReparacion={mostrar,consultarEstado,listarEstados};
})();
