'use strict';
const story = document.querySelector('.scroll-story');
const stage = document.querySelector('.car-stage');
const label = document.querySelector('#state-label');
const heroTop = document.querySelector('.hero-top');
const hud = document.querySelector('.detail-hud');
const lines = document.querySelector('.detail-lines');
const pinContainer = document.querySelector('.detail-pins');
const tabContainer = document.querySelector('.detail-tabs');
const category = document.querySelector('#detail-category');
const detailTitle = document.querySelector('#detail-title');
const detailDescription = document.querySelector('#detail-description');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let scheduled = false;
let displayedProgress = null;
let lastFrameTime = null;
const clamp = value => Math.min(1, Math.max(0, value));
const smooth = value => value * value * (3 - 2 * value);
const treatments = [
  { part: 'CAPÔ', title: 'Descontaminação', subtitle: 'Preparação da pintura', x: 460, y: 430, mobile: [650, 435], label: [6, 37], text: 'Remove partículas aderidas à pintura que a lavagem comum pode deixar para trás. Produtos e técnicas de descontaminação preparam a superfície para o acabamento.' },
  { part: 'PINTURA', title: 'Polimento + proteção', subtitle: 'Refino e brilho profundo', x: 1100, y: 530, mobile: [910, 500], label: [76, 31], text: 'O polimento técnico refina o verniz e trata marcas superficiais. Depois, cera, selante ou vitrificação cerâmica podem proteger o acabamento; o coating também favorece a repelência à água.' },
  { part: 'VIDROS', title: 'Limpeza + repelência', subtitle: 'Transparência e acabamento', x: 820, y: 325, mobile: [820, 325], label: [6, 25], text: 'A descontaminação remove oleosidade e impurezas impregnadas. Com o vidro preparado, um tratamento hidrorrepelente ajuda a água a escorrer pela superfície.' },
  { part: 'RODAS', title: 'Limpeza técnica', subtitle: 'Atenção ao pó de freio', x: 731, y: 632, mobile: [731, 632], label: [8, 70], text: 'Limpeza dos detalhes da roda e descontaminação de resíduos ferrosos, como partículas do pó de freio, com produtos compatíveis com o acabamento.' },
  { part: 'PNEUS', title: 'Limpeza + acabamento', subtitle: 'Cor e aspecto renovados', x: 1340, y: 660, mobile: [710, 735], label: [76, 68], text: 'A limpeza prepara a borracha para receber um finalizador específico, que realça a cor e renova o acabamento dos flancos do pneu.' },
  { part: 'INTERIOR', title: 'Higienização interna', subtitle: 'Cuidado com cada material', x: 1080, y: 315, mobile: [940, 320], label: [76, 48], text: 'Limpeza de bancos, carpetes e superfícies internas, com técnicas e produtos escolhidos conforme o material: tecido, couro, plástico ou acabamento delicado.' }
];
let selectedIndex = 0;
let manualSelection = false;
let manualTarget = null;
let previousTarget = null;
let visibleTreatmentCount = 0;
const svgNS = 'http://www.w3.org/2000/svg';
const pins = [], tabs = [], leaders = [];
treatments.forEach((treatment, index) => {
  const pin = document.createElement('button');
  pin.className = 'detail-pin';
  pin.type = 'button';
  pin.setAttribute('aria-label', `${treatment.part}: ${treatment.title}`);
  pin.setAttribute('aria-controls', 'detail-description');
  pin.innerHTML = `<span class="pin-dot" aria-hidden="true"></span><span class="pin-copy"><small>${String(index + 1).padStart(2, '0')} / ${treatment.part}</small><strong>${treatment.title}</strong><em>${treatment.subtitle}</em></span>`;
  pin.addEventListener('click', () => selectTreatment(index, true));
  pinContainer.append(pin); pins.push(pin);
  const tab = document.createElement('button');
  tab.className = 'detail-tab'; tab.type = 'button';
  tab.textContent = `${String(index + 1).padStart(2, '0')} ${treatment.part}`;
  tab.addEventListener('click', () => selectTreatment(index, true));
  tabContainer.append(tab); tabs.push(tab);
  const leader = document.createElementNS(svgNS, 'path');
  leader.classList.add('detail-leader');
  lines.querySelector('g').append(leader); leaders.push(leader);
});
function selectTreatment(index, manual = false) {
  selectedIndex = index;
  if (manual) { manualSelection = true; manualTarget = previousTarget; }
  const treatment = treatments[index];
  category.textContent = `${String(index + 1).padStart(2, '0')} / ${treatment.part}`;
  detailTitle.textContent = treatment.title;
  detailDescription.textContent = treatment.text;
  pins.forEach((pin, i) => { pin.classList.toggle('is-selected', i === index); pin.setAttribute('aria-pressed', String(i === index)); });
  tabs.forEach((tab, i) => { tab.classList.toggle('is-selected', i === index); tab.setAttribute('aria-pressed', String(i === index)); });
  leaders.forEach((leader, i) => leader.classList.toggle('is-selected', i === index));
}
function positionTreatments() {
  const { width, height } = stage.getBoundingClientRect();
  const mobile = width <= 760;
  const fit = Math.max(width / 1536, height / 1024);
  const offsetX = (width - 1536 * fit) * (mobile ? 0.48 : 0.5);
  const offsetY = (height - 1024 * fit) * 0.5;
  lines.setAttribute('viewBox', `0 0 ${width} ${height}`);
  treatments.forEach((treatment, index) => {
    const [sourceX, sourceY] = mobile ? treatment.mobile : [treatment.x, treatment.y];
    const x = sourceX * fit + offsetX, y = sourceY * fit + offsetY;
    const left = mobile ? x : width * treatment.label[0] / 100;
    const top = mobile ? y : height * treatment.label[1] / 100;
    pins[index].style.left = `${left}px`; pins[index].style.top = `${top}px`;
    const endX = mobile ? Math.min(width - 30, Math.max(30, x + 28)) : left + (treatment.label[0] < 50 ? 160 : 0);
    const endY = mobile ? y - 28 : top + 19;
    const bendX = mobile ? endX : (endX + x) / 2;
    leaders[index].setAttribute('d', `M ${x} ${y} L ${bendX} ${endY} L ${endX} ${endY}`);
    // Separate part markers stay anchored to the actual photographed surface.
    pins[index].style.setProperty('--point-x', `${x - left}px`);
    pins[index].style.setProperty('--point-y', `${y - top}px`);
  });
}
selectTreatment(0);
positionTreatments();
function progressAt(top, height, viewport) {
  const distance = Math.max(1, height - viewport);
  const raw = Math.min(1, Math.max(0, -top / distance));
  return raw;
}
function updateStory(timestamp = performance.now()) {
  scheduled = false;
  const rect = story.getBoundingClientRect();
  const target = reducedMotion.matches ? 1 : progressAt(rect.top, rect.height, window.innerHeight);
  const dt = lastFrameTime === null ? 16 : Math.min(40, Math.max(1, timestamp - lastFrameTime));
  lastFrameTime = timestamp;
  if (displayedProgress === null || reducedMotion.matches) displayedProgress = target;
  else displayedProgress += (target - displayedProgress) * (1 - Math.exp(-dt / 95));
  if (Math.abs(target - displayedProgress) < 0.00008) displayedProgress = target;
  const progress = displayedProgress;
  const cleaning = clamp((progress - 0.02) / 0.45);
  const reveal = reducedMotion.matches ? 1 : smooth(cleaning);
  stage.style.setProperty('--reveal', String(reveal));
  const hudProgress = reducedMotion.matches ? 1 : clamp((progress - 0.54) / 0.1);
  hud.style.opacity = String(smooth(hudProgress));
  hud.inert = hudProgress < 0.5;
  heroTop.style.opacity = String(1 - smooth(hudProgress));
  heroTop.style.pointerEvents = hudProgress > 0.5 ? 'none' : '';
  visibleTreatmentCount = reducedMotion.matches ? 6 : Math.min(6, Math.max(0, Math.ceil((progress - 0.58) / 0.06)));
  treatments.forEach((_, index) => {
    const visible = reducedMotion.matches ? 1 : smooth(clamp((progress - 0.58 - index * 0.06) / 0.06));
    pins[index].style.opacity = String(visible);
    pins[index].disabled = visible < 0.5;
    leaders[index].style.opacity = String(visible);
    tabs[index].disabled = visible < 0.5;
  });
  if (manualTarget !== null && Math.abs(target - manualTarget) > 0.025) manualSelection = false;
  previousTarget = target;
  if (!manualSelection) {
    const autoIndex = Math.max(0, visibleTreatmentCount - 1);
    if (selectedIndex !== autoIndex) selectTreatment(autoIndex);
  }
  label.textContent = progress < 0.12 ? '01 / O ponto de partida' : progress < 0.47 ? '02 / O cuidado em cada detalhe' : progress < 0.58 ? '03 / O brilho de novo' : '04 / Explore os cuidados do seu carro';
  if (!reducedMotion.matches && displayedProgress !== target) scheduleUpdate();
}
function scheduleUpdate() { if (!scheduled) { scheduled = true; requestAnimationFrame(updateStory); } }
window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', () => { positionTreatments(); scheduleUpdate(); });
reducedMotion.addEventListener('change', scheduleUpdate);
updateStory();
document.querySelectorAll('.service-list details').forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open) document.querySelectorAll('.service-list details').forEach(other => { if (other !== item) other.open = false; });
  });
});
document.querySelectorAll('.service-quote').forEach(link => {
  link.addEventListener('click', () => { document.querySelector('#service').value = link.dataset.service; });
});
document.querySelector('#quote-form').addEventListener('submit', event => {
  event.preventDefault();
  const vehicle = document.querySelector('#vehicle').value.trim();
  const service = document.querySelector('#service').value;
  const message = `Olá, JP Car Detail! Gostaria de um orçamento.\nServiço: ${service}.${vehicle ? `\nMeu veículo: ${vehicle}.` : ''}`;
  window.open(`https://wa.me/5515998438390?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
});
const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() { menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Abrir menu'); mobileNav.hidden = true; }
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); menuButton.focus(); } });
window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); });
