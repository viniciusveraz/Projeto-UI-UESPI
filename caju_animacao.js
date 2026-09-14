const area = $('cajuArea'), svg = $('cajuGraphic');
const eyeL = $('eyeL'), eyeR = $('eyeR'), mouth = $('mouth');
const corpoCaju = $('cajuBody'), armL = $('armL'), armR = $('armR');
const BASE_CORPO = 'M100,20 C130,20 150,50 150,90 C150,130 130,160 100,160 C70,160 50,130 50,90 C50,50 70,20
100,20 Z';
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
corpoCaju.setAttribute('d','M100,25 C135,25 155,55 155,90 C155,125 135,155 100,155 C65,155 45,125 45,90 C45,55 65,25
100,25 Z');
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
