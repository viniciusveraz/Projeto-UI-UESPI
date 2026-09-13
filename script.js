/* PAINEL DE CONDIÇÕES*/
const btnCond = $('btnCondicoes'), painel = $('painelCondicoes'), overlay = $('overlay');
let painelAberto = false;

function abrirPainel(){
  painel.hidden = false;
  requestAnimationFrame(() => {
    painel.classList.add('aberto'); overlay.classList.add('aberto');
  });
  btnCond.setAttribute('aria-expanded','true');
  painelAberto = true;
  iniciarVento();
  carregar(spotAtivo);
}
function fecharPainel(){
  painel.classList.remove('aberto'); overlay.classList.remove('aberto');
  btnCond.setAttribute('aria-expanded','false');
  painelAberto = false;
  pararVento();
  setTimeout(() => { if(!painelAberto) painel.hidden = true; }, 340);
  btnCond.focus();
}
btnCond.addEventListener('click', () => painelAberto ? fecharPainel() : abrirPainel());
overlay.addEventListener('click', fecharPainel);
document.addEventListener('keydown', e => { if(e.key==='Escape' && painelAberto) fecharPainel(); });

let toqueY = null;
painel.addEventListener('touchstart', e => { toqueY = e.touches[0].clientY; }, {passive:true});
painel.addEventListener('touchmove', e => {
  if (toqueY===null || window.innerWidth>=720) return;
  const d = e.touches[0].clientY - toqueY;
  if (d > 70 && $('corpoPainel').scrollTop <= 0){ fecharPainel(); toqueY = null; }
}, {passive:true});
painel.addEventListener('touchend', () => { toqueY = null; });

const listaSpots = $('listaSpots');
SPOTS.forEach(s => {
  const b = document.createElement('button');
  b.className='spot'; b.textContent = s.curto; b.dataset.id = s.id;
  b.setAttribute('aria-pressed', s.id===spotAtivo.id ? 'true':'false');
  b.addEventListener('click', () => {
    spotAtivo = s;
    [...listaSpots.children].forEach(c => c.setAttribute('aria-pressed', c.dataset.id===s.id ? 'true':'false'));
    carregar(s);
  });
  listaSpots.appendChild(b);
});

$('btnAtualizar').addEventListener('click', () => {
  $('btnAtualizar').classList.add('girando');
  carregar(spotAtivo, true).finally(() =>
    setTimeout(() => $('btnAtualizar').classList.remove('girando'), 500));
});

function lerVento(nos){
  if (nos < 8)  return { cor:'#9AA0AE', txt:'Sem vento pra kite. Dia de rede, caiaque ou stand up.' };
  if (nos < 12) return { cor:'#E4B85C', txt:'Vento fraco. Só com kite grande ou foil — bom pra aula.' };
  if (nos < 18) return { cor:'#4CAF7D', txt:'Vento bom. Kite 12m dá conta na boa.' };
  if (nos < 25) return { cor:'#3FB8C4', txt:'Condição clássica de Barra Grande. Kite 9 a 10m.' };
  if (nos < 32) return { cor:'#EF476F', txt:'Vento forte. Kite pequeno, 7m ou menos, e só quem já anda bem.' };
  return           { cor:'#E4572E', txt:'Muito forte. Fica em terra — não compensa o risco.' };
}
const CEU = { 0:'Limpo',1:'Quase limpo',2:'Parcial',3:'Nublado',45:'Névoa',48:'Névoa',51:'Garoa',53:'Garoa',
  55:'Garoa forte',61:'Chuva leve',63:'Chuva',65:'Chuva forte',80:'Pancadas',81:'Pancadas',82:'Pancada forte',
  95:'Trovoada',96:'Trovoada',99:'Trovoada' };

let ultimo = null;

async function carregar(spot, forcar=false){
  const corpo = $('corpoPainel');
  corpo.classList.add('carregando');
  $('seloFonte').textContent = 'carregando';
  $('seloFonte').className = 'selo';

  try{
    const d = await servico.condicoes(spot, forcar);
    ultimo = d;
    pintar(d);
  }catch(e){
    $('seloFonte').textContent = 'sem conexão';
    $('seloFonte').className = 'selo erro';
    $('vDesc').textContent = 'Não consegui buscar os dados. Toque em Atualizar pra tentar de novo.';
  }finally{
    corpo.classList.remove('carregando');
  }
}

function pintar(d){
  const c = d.clima;
  $('btnLocal').textContent = d.spot.curto;

  if (c){
    const nos = c.ventoNos, dir = paraCardeal(c.dirGraus), v = lerVento(nos);
    $('vNum').textContent    = Math.round(nos);
    $('vDir').textContent    = `${dir} (${Math.round(c.dirGraus)}°)`;
    $('vRajada').textContent = Math.round(c.rajadaNos);
    $('vDesc').textContent   = `${Math.round(nos*1.852)} km/h · umidade ${c.umidade}%`;
    $('btnVento').textContent = `${Math.round(nos)} kt ${dir}`;
    $('agulhaBtn').style.transform = `rotate(${c.dirGraus+180}deg)`;

    $('veredito').querySelector('.bolha').style.background = v.cor;
    $('vereditoTxt').textContent = v.txt;

    $('cTemp').textContent    = `${c.temp}°`;
    $('cTempSub').textContent = `sensação ${c.sensacao}°`;
    $('cCeu').textContent     = CEU[c.codigo] ?? '—';
    $('cChuva').textContent   = c.chuva!=null ? `${c.chuva}% de chuva hoje` : 'sem previsão';
    $('cUv').textContent      = c.uv!=null ? Math.round(c.uv) : '—';
    $('cUvSub').textContent   = c.uv==null ? '—' : c.uv>=11?'extremo, evite 10h–15h' : c.uv>=8?'muito alto, protetor sempre' : c.uv>=6?'alto':'moderado';

    $('seloFonte').textContent = 'ao vivo · ' + c.fonte;
    $('seloFonte').className = 'selo';
    ventoCanvas.nos = nos; ventoCanvas.graus = c.dirGraus;
  }

  if (d.mar){
    $('cOnda').textContent = d.mar.ondaM!=null ? `${d.mar.ondaM.toFixed(1)} m` : '—';
    $('cOndaSub').textContent = [
      d.mar.periodo!=null ? `período ${Math.round(d.mar.periodo)}s` : null,
      d.mar.aguaC!=null   ? `água ${Math.round(d.mar.aguaC)}°`      : null,
    ].filter(Boolean).join(' · ') || 'sem leitura no ponto';
  }

  if (d.mare) pintarMare(d.mare);

  const min = Math.round((Date.now()-d.ts)/60000);
  $('atualizadoEm').textContent = min<1 ? 'Atualizado agora' : `Atualizado há ${min} min`;
}

function pintarMare(m){
  $('mareAlt').textContent = `${m.alturaAtual} m`;
  $('seloMare').textContent = m.estimado ? 'estimativa' : m.fonte || 'oficial';
  $('seloMare').className = m.estimado ? 'selo estimado' : 'selo';

  const px = m.extremos?.[0];
  if (px){
    const h = new Date(px.hora).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    $('marePx').textContent = '';
    const rot = document.createTextNode(px.tipo==='alta' ? 'Preamar' : 'Baixa-mar');
    const b = document.createElement('b');
    b.textContent = `${h} · ${px.altura} m`;
    $('marePx').append(rot, b);
  }

  const serie = m.serie;
  if (!serie?.length) return;
  const W=300, H=56, hs = serie.map(p=>p.h);
  const min = Math.min(...hs), max = Math.max(...hs), amp = (max-min)||1;
  const x = i => (i/(serie.length-1))*W;
  const y = h => H-4 - ((h-min)/amp)*(H-12);
  const linha = serie.map((p,i)=> `${i?'L':'M'}${x(i).toFixed(1)},${y(p.h).toFixed(1)}`).join(' ');
  $('mareLinha').setAttribute('d', linha);
  $('mareArea').setAttribute('d', `${linha} L${W},${H} L0,${H} Z`);

  const agora = Date.now();
  let idx = 0, melhor = Infinity;
  serie.forEach((p,i) => { const d=Math.abs(p.t-agora); if(d<melhor){ melhor=d; idx=i; } });
  $('mareAgora').setAttribute('cx', x(idx).toFixed(1));
  $('mareAgora').setAttribute('cy', y(serie[idx].h).toFixed(1));
}

const ventoCanvas = { nos:14, graus:75, raf:null, riscos:[], ctx:null };
function iniciarVento(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('telaVento');
  const redim = () => {
    const r = painel.getBoundingClientRect(), dpr = Math.min(devicePixelRatio||1, 2);
    cv.width = r.width*dpr; cv.height = r.height*dpr;
    ventoCanvas.ctx = cv.getContext('2d');
    ventoCanvas.ctx.scale(dpr,dpr);
    ventoCanvas.w = r.width; ventoCanvas.h = r.height;
  };
  redim();
  ventoCanvas.redim = redim;
  addEventListener('resize', redim);
  ventoCanvas.riscos = Array.from({length:34}, () => ({
    x: Math.random()*ventoCanvas.w, y: Math.random()*ventoCanvas.h,
    len: 14+Math.random()*46, op: .10+Math.random()*.30, vel: .5+Math.random(),
  }));
  const quadro = () => {
    const { ctx, w, h } = ventoCanvas;
    if(!ctx) return;
    ctx.clearRect(0,0,w,h);
    const rad = (ventoCanvas.graus+180) * Math.PI/180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const base = limitar(ventoCanvas.nos/9, .35, 3.4);
    ctx.lineCap='round';
    ventoCanvas.riscos.forEach(r => {
      ctx.strokeStyle = `rgba(63,184,196,${r.op})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + dx*r.len, r.y + dy*r.len);
      ctx.stroke();
      r.x += dx*base*r.vel; r.y += dy*base*r.vel;
      if (r.x < -70) r.x = w+50; if (r.x > w+70) r.x = -50;
      if (r.y < -70) r.y = h+50; if (r.y > h+70) r.y = -50;
    });
    ventoCanvas.raf = requestAnimationFrame(quadro);
  };
  quadro();
}
function pararVento(){
  if (ventoCanvas.raf) cancelAnimationFrame(ventoCanvas.raf);
  ventoCanvas.raf = null;
  if (ventoCanvas.redim) removeEventListener('resize', ventoCanvas.redim);
}
