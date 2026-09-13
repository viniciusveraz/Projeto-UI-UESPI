'use strict';
/*JS*/
const CONFIG = {
  urlClima: 'https://api.open-meteo.com/v1/forecast',
  urlMar: 'https://marine-api.open-meteo.com/v1/marine',
  urlMare: null,
  urlIA: null,
  timeoutMs: 8000,
  cacheMs:   600000,
};

const SPOTS = [
  { id:'bg',       nome:'Barra Grande',    curto:'Barra Grande', lat:-2.9186, lon:-41.2861,
    tags:['bg','barra grande','barra'], perfil:'kite',
    nota:'Capital brasileira do kitesurf. Lagoa rasa, vento lateral constante e escolinha em cada esquina.' },
  { id:'barrinha', nome:'Barrinha',        curto:'Barrinha',     lat:-2.9280, lon:-41.3170,
    tags:['barrinha'], perfil:'kite',
    nota:'Vizinha da Barra Grande e mais vazia. Downwind clássico de BG até aqui, com peixe frito na chegada.' },
  { id:'cajueiro', nome:'Cajueiro da Praia', curto:'Cajueiro',   lat:-2.9297, lon:-41.3411,
    tags:['cajueiro','cajueiro da praia'], perfil:'natureza',
    nota:'Onde ficam os peixes-boi marinhos, no Santuário dos Peixes-Boi. Passeio calmo, de manhã cedo.' },
  { id:'coqueiro', nome:'Praia do Coqueiro', curto:'Coqueiro',   lat:-2.8700, lon:-41.5750,
    tags:['coqueiro','praia do coqueiro'], perfil:'estrutura',
    nota:'A mais estruturada de Luís Correia: barracas, restaurante com vista e falésias no fim da praia.' },
  { id:'macapa',   nome:'Praia de Macapá', curto:'Macapá',       lat:-2.8500, lon:-41.5333,
    tags:['macapa','macapá'], perfil:'sossego',
    nota:'Encontro do rio com o mar, água calma e barracas rústicas. É o sossego do litoral.' },
  { id:'luis',     nome:'Luís Correia',    curto:'Luís Correia', lat:-2.8797, lon:-41.6667,
    tags:['luis correia','luís correia','atalaia','pedra do sal'], perfil:'estrutura',
    nota:'Sede do município e base de quem quer hotel, farmácia e banco por perto. Atalaia é a praia mais movimentada.' },
];

let spotAtivo = SPOTS[0];

/* ===========================================================================
   [2] UTILIDADES
   =========================================================================== */
const $ = (id) => document.getElementById(id);
const limitar = (v,min,max) => Math.max(min, Math.min(max, v));

const normalizar = (s) => s.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

function distancia(a,b){
  if (Math.abs(a.length-b.length) > 2) return 9;
  const m=[];
  for (let i=0;i<=b.length;i++) m[i]=[i];
  for (let j=0;j<=a.length;j++) m[0][j]=j;
  for (let i=1;i<=b.length;i++)
    for (let j=1;j<=a.length;j++)
      m[i][j] = b[i-1]===a[j-1] ? m[i-1][j-1]
              : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
  return m[b.length][a.length];
}

const DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
const paraCardeal = (g) => DIRS[Math.round(((g%360)/22.5))%16];
const kmhParaNos  = (k) => k * 0.539957;

async function buscarJson(url){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
  try{
    const r = await fetch(url, { signal: ctrl.signal, headers:{ 'Accept':'application/json' } });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/* ===========================================================================
   [3] SERVIÇO DE DADOS
   =========================================================================== */
const cache = new Map();

const servico = {
  async condicoes(spot, forcar=false){
    const chave = spot.id;
    const guardado = cache.get(chave);
    if (!forcar && guardado && Date.now()-guardado.ts < CONFIG.cacheMs) return guardado.dados;

    const [clima, mar] = await Promise.allSettled([
      this.buscarClima(spot),
      this.buscarMar(spot),
    ]);

    const dados = {
      spot,
      clima: clima.status==='fulfilled' ? clima.value : null,
      mar:   mar.status  ==='fulfilled' ? mar.value   : null,
      mare:  await this.buscarMare(spot),
      erro:  clima.status==='rejected',
      ts:    Date.now(),
    };
    cache.set(chave, { ts:Date.now(), dados });
    return dados;
  },

  async buscarClima(spot){
    const p = new URLSearchParams({
      latitude: spot.lat, longitude: spot.lon,
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day',
      hourly:  'wind_speed_10m,precipitation_probability',
      daily:   'uv_index_max,precipitation_probability_max,sunset',
      timezone:'America/Fortaleza', wind_speed_unit:'kmh', forecast_days:'1',
    });
    const j = await buscarJson(`${CONFIG.urlClima}?${p}`);
    const c = j.current || {};
    return {
      temp:      Math.round(c.temperature_2m),
      sensacao:  Math.round(c.apparent_temperature),
      umidade:   Math.round(c.relative_humidity_2m),
      ventoNos:  kmhParaNos(c.wind_speed_10m || 0),
      rajadaNos: kmhParaNos(c.wind_gusts_10m || 0),
      dirGraus:  c.wind_direction_10m || 0,
      codigo:    c.weather_code,
      dia:       c.is_day === 1,
      uv:        j.daily?.uv_index_max?.[0] ?? null,
      chuva:     j.daily?.precipitation_probability_max?.[0] ?? null,
      porHora:   j.hourly?.wind_speed_10m || [],
      fonte:     'Open-Meteo',
    };
  },

  async buscarMar(spot){
    const p = new URLSearchParams({
      latitude: spot.lat, longitude: spot.lon,
      current:'wave_height,wave_period,sea_surface_temperature',
      timezone:'America/Fortaleza',
    });
    const j = await buscarJson(`${CONFIG.urlMar}?${p}`);
    const c = j.current || {};
    return {
      ondaM:   c.wave_height ?? null,
      periodo: c.wave_period ?? null,
      aguaC:   c.sea_surface_temperature ?? null,
    };
  },

  async buscarMare(spot){
    if (CONFIG.urlMare){
      try{
        const j = await buscarJson(`${CONFIG.urlMare}?lat=${spot.lat}&lon=${spot.lon}`);
        return { ...j, estimado:false };
      }catch(e){
        console.warn('[mare] provedor indisponível, usando estimativa');
      }
    }
    return modeloMare();
  },

  async perguntarIA(pergunta, contexto){
    if (!CONFIG.urlIA) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs*2);
    try{
      const r = await fetch(CONFIG.urlIA, {
        method:'POST', signal:ctrl.signal,
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ pergunta, spot: contexto.spot?.id, condicoes: contexto.resumo }),
      });
      if(!r.ok) throw new Error('HTTP '+r.status);
      const j = await r.json();
      return typeof j.resposta === 'string' ? j.resposta : null;
    }catch(e){
      return null;
    } finally { clearTimeout(t); }
  },
};

function modeloMare(){
  const agora = Date.now();
  const T = 12.4206 * 3600e3;
  const ref = Date.UTC(2026,0,1,3,10);
  const diasLua = ((agora - Date.UTC(2000,0,6,18,14)) / 86400e3) % 29.53059;
  const sizigia = Math.abs(Math.cos(diasLua/29.53059 * 2*Math.PI));
  const media = 1.7;
  const amp   = 0.85 + sizigia * 0.65;
  const fase  = (t) => 2*Math.PI * ((t-ref)%T)/T;
  const alt   = (t) => media + amp*Math.cos(fase(t));

  const extremos = [];
  let subindo = alt(agora+6e5) > alt(agora);
  for (let t=agora; t<agora+14*3600e3; t+=6e5){
    const v = alt(t+6e5), sobe = v > alt(t);
    if (sobe !== subindo){
      extremos.push({ hora:new Date(t).toISOString(), tipo: subindo?'alta':'baixa', altura:+alt(t).toFixed(2) });
      subindo = sobe;
    }
  }
  const serie = [];
  for (let i=0;i<=48;i++){
    const t = agora - 3*3600e3 + i*(15*3600e3/48);
    serie.push({ t, h: alt(t) });
  }
  return { alturaAtual:+alt(agora).toFixed(2), unidade:'m', extremos, serie, fonte:'estimativa', estimado:true };
}
