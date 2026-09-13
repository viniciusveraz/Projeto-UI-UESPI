/*CAJU — efeitos de mouse originais, agora com rAF e suporte a toque*/
const area = $('cajuArea'), svg = $('cajuGraphic');
const eyeL = $('eyeL'), eyeR = $('eyeR'), mouth = $('mouth');
const corpoCaju = $('cajuBody'), armL = $('armL'), armR = $('armR');

const BASE_CORPO = 'M100,20 C130,20 150,50 150,90 C150,130 130,160 100,160 C70,160 50,130 50,90 C50,50 70,20 100,20 Z';
const BASE_ARM_L = 'M50,90 Q30,100 40,120';
const BASE_ARM_R = 'M150,90 Q170,100 160,120';
const BOCA_NORMAL = 'M90,110 Q100,120 110,110';
const BOCA_SORRISO= 'M85,110 Q100,125 115,110';
const BOCA_ALEGRE = 'M85,115 Q100,135 115,115';

let ponteiro = null, quadroPendente = false;

function agendar(){
  if (quadroPendente) return;
  quadroPendente = true;
  requestAnimationFrame(() => { quadroPendente = false; desenharCaju(); });
}

function desenharCaju(){
  if (!ponteiro) return;
  const r = area.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  const dx = ponteiro.x - cx, dy = ponteiro.y - cy;

  const maxOlho = 4;
  const ox = limitar((dx/innerWidth)*maxOlho*2, -maxOlho, maxOlho);
  const oy = limitar((dy/innerHeight)*maxOlho*2, -maxOlho, maxOlho);
  eyeL.style.transform = eyeR.style.transform = `translate(${ox}px,${oy}px)`;

  const dist = Math.hypot(dx,dy), raio = 250;
  if (dist < raio){
    const esticar = 30, nx = dx/raio, ny = dy/raio;
    armL.setAttribute('d', `M50,90 Q${30+nx*esticar*.5},${100+ny*esticar*.5} ${40+nx*esticar},${120+ny*esticar}`);
    armR.setAttribute('d', `M150,90 Q${170+nx*esticar*.5},${100+ny*esticar*.5} ${160+nx*esticar},${120+ny*esticar}`);
    mouth.setAttribute('d', dist<100 ? BOCA_ALEGRE : (entrada.value ? BOCA_SORRISO : BOCA_NORMAL));
  }else{
    armL.setAttribute('d', BASE_ARM_L);
    armR.setAttribute('d', BASE_ARM_R);
    if (!entrada.value) mouth.setAttribute('d', BOCA_NORMAL);
  }
}

addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  ponteiro = { x:e.clientX, y:e.clientY };
  agendar();
}, { passive:true });

if (matchMedia('(hover: none)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  let fase = 0;
  setInterval(() => {
    fase += .05;
    const ox = Math.sin(fase)*3, oy = Math.cos(fase*.7)*2;
    eyeL.style.transform = eyeR.style.transform = `translate(${ox}px,${oy}px)`;
  }, 90);
}

function apertarCaju(){
  corpoCaju.setAttribute('d','M100,25 C135,25 155,55 155,90 C155,125 135,155 100,155 C65,155 45,125 45,90 C45,55 65,25 100,25 Z');
  mouth.setAttribute('d','M85,105 Q100,130 115,105');
  setTimeout(() => {
    corpoCaju.setAttribute('d', BASE_CORPO);
    mouth.setAttribute('d', entrada.value ? BOCA_SORRISO : BOCA_NORMAL);
  }, 200);
}
area.addEventListener('click', apertarCaju);
area.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); apertarCaju(); } });

function inclinarComVento(nos){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ang = limitar(nos/5, 0, 7);
  svg.style.transform = `rotate(${-ang}deg)`;
}

/* ===========================================================================
   [6] CÉREBRO DO CHAT
   =========================================================================== */
const chat = $('chat'), mensagens = $('mensagens'), digitando = $('digitando');
const entrada = $('userInput'), btnEnviar = $('btnEnviar'), caixaSug = $('sugestoes');

const contexto = { ultimoLugar:null, ultimoAssunto:null, turnos:0 };

function acharLugar(txt){
  for (const s of SPOTS)
    for (const tag of s.tags)
      if (txt.includes(normalizar(tag))) return s;
  return null;
}

function pontuar(tokens, termos){
  let p = 0;
  for (const termo of termos){
    const t = normalizar(termo);
    if (t.includes(' ')){ if (tokens.frase.includes(t)) p += 2; continue; }
    if (tokens.lista.includes(t)) { p += 2; continue; }
    if (t.length > 4 && tokens.lista.some(tk => tk.length>4 && distancia(tk,t) <= 1)) p += 1;
  }
  return p;
}

const INTENCOES = [
  {
    id:'vento',
    termos:['vento','ventando','kite','kitesurf','kitar','surf','wing','windsurf','rajada','condicao','condicoes','ta bom','da pra velejar','velejar','downwind','ventou'],
    async responder(q, lugar){
      const s = lugar || contexto.ultimoLugar || SPOTS[0];
      const d = await servico.condicoes(s).catch(()=>null);
      if (!d?.clima) return { texto:`Não consegui puxar o vento de ${s.nome} agora. Abre o botão de condições no topo pra tentar de novo.` };
      const nos = d.clima.ventoNos, v = lerVento(nos), dir = paraCardeal(d.clima.dirGraus);
      const temporada = (new Date().getMonth() >= 6 || new Date().getMonth() <= 0)
        ? 'Você pegou a temporada boa: de julho a janeiro o vento é constante.'
        : 'Fora da temporada (fevereiro a junho) o vento fica irregular — vale checar dia a dia.';
      return {
        texto:`${s.nome} está com ${Math.round(nos)} nós de ${dir}, rajadas de ${Math.round(d.clima.rajadaNos)}.\n\n${v.txt}\n\n${temporada}`,
        aoVivo:`${Math.round(nos)} kt ${dir} · ${s.curto}`,
        vento:nos,
      };
    },
  },
  {
    id:'mare',
    termos:['mare','mares','preamar','baixamar','baixa mar','tabua','vazante','enchente','seca','agua baixa'],
    async responder(q, lugar){
      const s = lugar || contexto.ultimoLugar || SPOTS[0];
      const d = await servico.condicoes(s).catch(()=>null);
      const m = d?.mare;
      if (!m) return { texto:'Não consegui calcular a maré agora. Tenta pelo botão de condições no topo.' };
      const px = m.extremos?.[0];
      const hora = px ? new Date(px.hora).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : null;
      const aviso = m.estimado
        ? '\n\nImportante: isso é estimativa por modelo, serve pra planejar passeio. Pra navegar, use a tábua oficial da Marinha.'
        : '';
      return {
        texto:`Maré em ${s.nome}: ${m.alturaAtual} m agora.${px ? `\n\nPróxima ${px.tipo==='alta'?'preamar':'baixa-mar'} às ${hora}, com ${px.altura} m.` : ''}\n\nNa maré baixa aparecem as piscinas naturais e o caminho fica melhor pra caminhar. Na cheia o banho é mais gostoso perto da barraca.${aviso}`,
        aoVivo:`${m.alturaAtual} m · ${s.curto}`,
      };
    },
  },
  {
    id:'clima',
    termos:['clima','tempo','chuva','chover','chovendo','sol','temperatura','calor','quente','uv','protetor','nublado','previsao'],
    async responder(q, lugar){
      const s = lugar || contexto.ultimoLugar || SPOTS[0];
      const d = await servico.condicoes(s).catch(()=>null);
      if (!d?.clima) return { texto:'Não consegui buscar o clima agora. Tenta de novo em instantes.' };
      const c = d.clima;
      const uv = c.uv>=11?'UV extremo — evite o sol entre 10h e 15h.' : c.uv>=8?'UV muito alto, protetor a cada 2 horas.' : 'UV dentro do normal, mas protetor sempre.';
      return {
        texto:`${s.nome} agora: ${c.temp}°, sensação de ${c.sensacao}°, céu ${(CEU[c.codigo]||'—').toLowerCase()}.\n\nChance de chuva hoje: ${c.chuva ?? '—'}%. ${uv}\n\nA chuva aqui é de fevereiro a maio, e mesmo assim costuma ser pancada rápida de fim de tarde.`,
        aoVivo:`${c.temp}° · ${s.curto}`,
      };
    },
  },
  {
    id:'praia',
    termos:['praia','praias','melhor praia','banho','mar','onde ficar','onde ir','recomenda','indicacao','dica'],
    responder(q, lugar){
      if (lugar) return { texto:`${lugar.nome}. ${lugar.nota}\n\nQuer saber como chegar, o vento de hoje ou onde comer por lá?` };
      return { texto:'O litoral tem só 66 km, dá pra conhecer tudo em poucos dias:\n\n• Barra Grande — kitesurf, movimento e gente do mundo todo\n• Barrinha — o mesmo vento, com metade da gente\n• Cajueiro da Praia — peixes-boi marinhos, passeio calmo\n• Praia do Coqueiro — a mais estruturada, com falésias\n• Macapá — água calma no encontro do rio com o mar\n• Luís Correia — base urbana, Atalaia é a mais cheia\n\nQual perfil você quer: agito, sossego ou natureza?' };
    },
  },
  {
    id:'delta',
    termos:['delta','parnaiba','passeio de barco','barco','lancha','guara','manguezal','ilha','dunas','tatus'],
    responder(){ return { texto:'O Delta do Parnaíba é o único delta em mar aberto das Américas. São 5 braços e mais de 70 ilhas.\n\nComo fazer:\n• Barco regional — dia inteiro, sai de Porto dos Tatus (Ilha Grande) e custa menos\n• Lancha rápida — 4 a 5 horas, para em menos pontos, mas rende mais tempo em cada um\n\nSaia cedo. No fim da tarde o revoar dos guarás vermelhos sobre o mangue é o ponto alto do passeio. Reserve com antecedência na alta estação.' }; },
  },
  {
    id:'peixeboi',
    termos:['peixe boi','peixes boi','peixe-boi','santuario','manate','aquasis'],
    responder(){ return { texto:'O Santuário dos Peixes-Boi fica em Cajueiro da Praia. É um dos poucos lugares do Brasil onde dá pra ver o peixe-boi marinho em vida livre.\n\nO passeio é de barco, sai bem cedo, e a regra é clara: não se toca, não se alimenta e não se entra na água com eles. Vá com condutor credenciado — é o que garante que o bicho continue lá no ano que vem.' }; },
  },
  {
    id:'comer',
    termos:['comer','restaurante','comida','gastronomia','fome','peixe','caranguejo','almoco','jantar','barraca','bar'],
    responder(q, lugar){
      const base = 'A torta de caranguejo é o prato símbolo daqui, não dá pra ir embora sem provar. Depois: peixada, camarão na moranga e a carne de sol com nata.\n\nOnde: as barracas da Praia do Coqueiro e da Atalaia servem peixe fresco com vista pro mar. Em Barra Grande, os restaurantes ficam na rua principal e enchem depois que o vento cai, lá pelas 18h. Em Macapá as barracas são rústicas e é justamente aí que está a graça.';
      return { texto: lugar ? `Em ${lugar.nome}: ${lugar.nota}\n\n${base}` : base };
    },
  },
  {
    id:'chegar',
    termos:['chegar','como chegar','como chego','chegar em','transporte','aeroporto','onibus','carro','distancia','longe','estrada','uber','translado','transfer','voo'],
    responder(q, lugar){
      const alvo = lugar || contexto.ultimoLugar;
      const extra = alvo?.id==='bg' || alvo?.id==='barrinha'
        ? '\n\nPra Barra Grande: de Parnaíba são cerca de 1h15 por estrada asfaltada até quase o fim, com um trecho final de areia. Vans e transfers saem de Parnaíba e do aeroporto todo dia.'
        : '';
      return { texto:`O aeroporto mais usado é o de Parnaíba (PHB), com voos de Fortaleza e Teresina. Muita gente também chega por Fortaleza e faz os 350 km de carro em cerca de 4h30.\n\nDe Parnaíba, Luís Correia fica a 15 km e Macapá a uns 25 km. Sem carro, dá pra combinar transfer ou usar as vans locais.${extra}` };
    },
  },
  {
    id:'quando',
    termos:['quando','melhor epoca','temporada','mes','alta estacao','baixa estacao','ferias','epoca'],
    responder(){ return { texto:'Depende do que você quer:\n\n• Julho a janeiro — vento constante, sol firme, pouca chuva. É a temporada de kite e a mais cheia.\n• Fevereiro a maio — período de chuva, paisagem mais verde, preço menor e praia vazia. O vento fica irregular.\n• Junho — meio do caminho, e costuma ser uma boa janela de preço.\n\nPra kite, o auge é entre agosto e novembro.' }; },
  },
  {
    id:'hospedagem',
    termos:['hotel','pousada','pousadas','hospedagem','hospedar','dormir','ficar','resort','airbnb','diaria','camping','onde ficar'],
    responder(){ return { texto:'Onde se hospedar, por perfil:\n\n• Barra Grande — pousadas pé na areia, muita coisa voltada pro kite, com escolinha e guarda de equipamento\n• Luís Correia e Coqueiro — mais opções de hotel, farmácia e mercado por perto\n• Macapá e Cajueiro — poucas pousadas, bem simples, pra quem quer sossego mesmo\n\nNa alta estação, principalmente entre setembro e dezembro, Barra Grande lota. Reserve com meses de antecedência.' }; },
  },
  {
    id:'equipamento',
    termos:['alugar','alugo','aluguel','equipamento','escola','escolinha','aula','aula de kite','escola de kite','instrutor','prancha','asa','iniciante','aprender'],
    responder(){ return { texto:'Barra Grande é onde está a estrutura de kite: várias escolas na rua principal, com aula credenciada, aluguel de equipamento e guarda no fim do dia.\n\nPra quem nunca andou: o padrão é um curso de 3 a 5 aulas, feito na lagoa rasa, onde você fica em pé e o risco é baixo. Confira se o instrutor tem certificação (IKO ou equivalente) e se o seguro está incluso.\n\nSe já anda, dá pra alugar só o kite por dia ou por semana — e vale reservar antes entre setembro e dezembro.' }; },
  },
  {
    id:'saudacao',
    termos:['oi','ola','bom dia','boa tarde','boa noite','eai','opa','fala','hey'],
    responder(){ return { texto: contexto.turnos>1 ? 'Opa, de novo por aqui. O que você quer saber?' : 'Olá. Sou o Caju. Pode perguntar sobre praias, vento, maré, passeios ou onde comer.' }; },
  },
  {
    id:'agradecimento',
    termos:['obrigado','obrigada','valeu','vlw','brigado','show','massa','top','otimo'],
    responder(){ return { texto:'Por nada. Boa viagem — e me chama se surgir mais alguma dúvida.' }; },
  },
];

async function pensar(pergunta){
  const frase = normalizar(pergunta);
  const tokens = { frase, lista: frase.split(' ') };
  const lugar = acharLugar(frase);
  if (lugar) contexto.ultimoLugar = lugar;

  let melhor = null, maiorP = 0;
  for (const it of INTENCOES){
    const p = pontuar(tokens, it.termos);
    if (p > maiorP){ maiorP = p; melhor = it; }
  }

  if (!melhor && lugar && contexto.ultimoAssunto)
    melhor = INTENCOES.find(i => i.id === contexto.ultimoAssunto);
  if (!melhor && lugar) melhor = INTENCOES.find(i => i.id === 'praia');

  if (melhor){
    contexto.ultimoAssunto = melhor.id;
    return await melhor.responder(pergunta, lugar);
  }

  const ia = await servico.perguntarIA(pergunta, { spot:contexto.ultimoLugar, resumo:resumoAtual() });
  if (ia) return { texto: ia };

  return { texto:'Essa eu não sei responder ainda. Mas mando bem em: vento e kite, maré, clima, as praias do litoral, o Delta do Parnaíba, os peixes-boi, onde comer, como chegar e melhor época.\n\nQual desses te ajuda agora?' };
}

function resumoAtual(){
  if (!ultimo?.clima) return null;
  return { spot:ultimo.spot.nome, ventoNos:Math.round(ultimo.clima.ventoNos), temp:ultimo.clima.temp };
}

function adicionar(texto, quem, aoVivo){
  const linha = document.createElement('div');
  linha.className = 'linha' + (quem==='eu' ? ' eu' : '');
  const balao = document.createElement('div');
  balao.className = 'balao ' + (quem==='eu' ? 'eu' : 'bot');
  balao.textContent = texto;
  if (aoVivo){
    const tag = document.createElement('span');
    tag.className = 'aovivo';
    const p = document.createElement('span'); p.className = 'pontinho-vivo';
    tag.append(p, document.createTextNode(aoVivo));
    balao.append(document.createElement('br'), tag);
  }
  linha.appendChild(balao);
  mensagens.appendChild(linha);
  chat.scrollTop = chat.scrollHeight;
}

const PROXIMAS = {
  vento:   ['Como está a maré?','Onde alugo equipamento?','Melhor época pra kite'],
  mare:    ['Vento em Barra Grande','Vai chover hoje?','Praias mais tranquilas'],
  clima:   ['Vento agora','Como chegar de Parnaíba?','Onde comer bem?'],
  praia:   ['Vento em Barra Grande','Onde comer bem?','Onde me hospedar?'],
  delta:   ['Ver os peixes-boi','Melhor época pra ir','Como chegar de Parnaíba?'],
  comer:   ['Onde me hospedar?','Praias mais tranquilas','Vento agora'],
  chegar:  ['Onde me hospedar?','Melhor praia pra família','Dicas do Delta'],
  inicial: ['Tá ventando em Barra Grande?','Como está a maré hoje?','Dicas do Delta do Parnaíba','Onde comer bem?'],
};
function pintarSugestoes(chave){
  const lista = PROXIMAS[chave] || PROXIMAS.inicial;
  caixaSug.textContent = '';
  lista.forEach((t,i) => {
    const b = document.createElement('button');
    b.className = 'sug'; b.textContent = t;
    b.style.animationDelay = (i*.05)+'s';
    b.addEventListener('click', () => { entrada.value = t; enviar(); });
    caixaSug.appendChild(b);
  });
}

let ocupado = false;
async function enviar(){
  const txt = entrada.value.trim();
  if (!txt || ocupado) return;
  ocupado = true;
  contexto.turnos++;

  adicionar(txt, 'eu');
  entrada.value = '';
  atualizarBotao();
  mouth.setAttribute('d', BOCA_NORMAL);

  svg.style.transform = 'rotate(-5deg)';
  setTimeout(() => { svg.style.transform = 'rotate(0deg)'; }, 200);

  digitando.classList.add('on');
  chat.scrollTop = chat.scrollHeight;

  let r;
  try{ r = await pensar(txt); }
  catch(e){ r = { texto:'Deu um problema aqui do meu lado. Pergunta de novo?' }; }

  await new Promise(res => setTimeout(res, 420 + Math.random()*380));

  digitando.classList.remove('on');
  adicionar(r.texto, 'bot', r.aoVivo);
  if (typeof r.vento === 'number') inclinarComVento(r.vento);

  mouth.setAttribute('d', BOCA_ALEGRE);
  setTimeout(() => mouth.setAttribute('d', BOCA_NORMAL), 520);

  pintarSugestoes(contexto.ultimoAssunto);
  ocupado = false;
}

function atualizarBotao(){
  btnEnviar.classList.toggle('ativo', entrada.value.trim().length > 0);
}
entrada.addEventListener('input', () => {
  atualizarBotao();
  mouth.setAttribute('d', entrada.value ? BOCA_SORRISO : BOCA_NORMAL);
});
entrada.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); enviar(); } });
btnEnviar.addEventListener('click', enviar);

/* ===========================================================================
   PARTIDA
   =========================================================================== */
adicionar('Olá. Sou o Caju, seu guia pelo litoral do Piauí.\n\nAlém de praias, passeios e comida, eu leio o vento, o clima e a maré em tempo real — é só perguntar, ou abrir o botão de condições no canto superior.', 'bot');
pintarSugestoes('inicial');

servico.condicoes(SPOTS[0]).then(d => {
  ultimo = d;
  if (d.clima){
    $('btnVento').textContent = `${Math.round(d.clima.ventoNos)} kt ${paraCardeal(d.clima.dirGraus)}`;
    $('agulhaBtn').style.transform = `rotate(${d.clima.dirGraus+180}deg)`;
    ventoCanvas.nos = d.clima.ventoNos; ventoCanvas.graus = d.clima.dirGraus;
    inclinarComVento(d.clima.ventoNos);
  }
}).catch(() => { $('btnVento').textContent = 'condições'; });
