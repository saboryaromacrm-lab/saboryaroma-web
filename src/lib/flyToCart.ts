/**
 * Animación "volar al carrito": clona la imagen del producto y la anima en
 * arco hasta el ícono del carrito del header, que rebota al llegar. El
 * header expone el destino vía #header-cart-link / #header-cart-count.
 */
const DURATION = 700;

function bounceCart(cartIcon: HTMLElement) {
  cartIcon.style.transition = 'none';
  cartIcon.style.transform = 'scale(1.25)';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cartIcon.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
      cartIcon.style.transform = 'scale(1)';
    });
  });

  const badge = document.getElementById('header-cart-count');
  if (badge) {
    badge.style.transition = 'none';
    badge.style.transform = 'scale(1.6)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        badge.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
        badge.style.transform = 'scale(1)';
      });
    });
  }

  burst(cartIcon.getBoundingClientRect());
}

function burst(cartRect: DOMRect) {
  const cx = cartRect.left + cartRect.width / 2;
  const cy = cartRect.top + cartRect.height / 2;
  const colors = ['#ff8f00', '#3ed1a1', '#086633'];

  for (let i = 0; i < 6; i++) {
    const p = document.createElement('div');
    const angle = (i / 6) * Math.PI * 2;
    const dist = 18 + Math.random() * 20;
    const size = 4 + Math.random() * 4;
    p.style.cssText = [
      'position:fixed', 'z-index:9999', 'pointer-events:none',
      `width:${size}px`, `height:${size}px`, `top:${cy}px`, `left:${cx}px`,
      `background:${colors[i % colors.length]}`, 'border-radius:50%',
      'transform:translate(-50%,-50%) scale(1)', 'opacity:1', 'transition:none',
    ].join(';');
    document.body.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transition = 'all 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      p.style.left = `${cx + Math.cos(angle) * dist}px`;
      p.style.top = `${cy + Math.sin(angle) * dist}px`;
      p.style.opacity = '0';
      p.style.transform = 'translate(-50%,-50%) scale(0)';
    });
    setTimeout(() => p.remove(), 500);
  }
}

export function flyToCart(sourceEl: HTMLElement | null) {
  const cartIconEl = document.getElementById('header-cart-link');
  if (!cartIconEl) return;
  // Alias ya angostado: la función `frame` (declaración hoisteada) no hereda
  // el narrowing del guard de arriba y TS la ve como HTMLElement | null.
  const cartIcon: HTMLElement = cartIconEl;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bounceCart(cartIcon);
    return;
  }

  if (!sourceEl) { bounceCart(cartIcon); return; }

  const sourceRect = sourceEl.getBoundingClientRect();
  const cartRect = cartIcon.getBoundingClientRect();
  const img = sourceEl instanceof HTMLImageElement ? sourceEl : sourceEl.querySelector('img');

  const startW = Math.min(sourceRect.width, 90);
  const startH = Math.min(sourceRect.height, 90);
  const startX = sourceRect.left + sourceRect.width / 2 - startW / 2;
  const startY = sourceRect.top + sourceRect.height / 2 - startH / 2;
  const destX = cartRect.left + cartRect.width / 2 - startW * 0.15;
  const destY = cartRect.top + cartRect.height / 2 - startH * 0.15;
  const midX = (startX + destX) / 2;
  const midY = Math.min(startY, destY) - 70;

  const flyer = document.createElement('div');
  flyer.style.cssText = [
    'position:fixed', 'z-index:9999', 'pointer-events:none',
    `width:${startW}px`, `height:${startH}px`, `top:${startY}px`, `left:${startX}px`,
    'border-radius:16px', 'overflow:hidden',
    'box-shadow:0 8px 24px rgba(8,102,51,.35), 0 0 0 3px #3ed1a1',
    'transition:none',
  ].join(';');
  if (img && img.src) {
    const clone = document.createElement('img');
    clone.src = img.src;
    clone.alt = '';
    clone.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    flyer.appendChild(clone);
  } else {
    flyer.style.background = 'linear-gradient(135deg, #086633, #3ed1a1)';
  }
  document.body.appendChild(flyer);

  let startTime: number | null = null;

  function frame(ts: number) {
    if (startTime === null) startTime = ts;
    const progress = Math.min((ts - startTime) / DURATION, 1);
    const t = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;

    const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * midX + t ** 2 * destX;
    const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * midY + t ** 2 * destY;
    const scale = t < 0.2 ? 1 + 0.1 * (t / 0.2) : 1.1 - 0.9 * ((t - 0.2) / 0.8);
    const opacity = t < 0.7 ? 1 : 1 - ((t - 0.7) / 0.3) * 0.6;

    flyer.style.left = `${x}px`;
    flyer.style.top = `${y}px`;
    flyer.style.transform = `scale(${scale})`;
    flyer.style.opacity = String(opacity);
    flyer.style.borderRadius = `${16 + t * 30}px`;

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      bounceCart(cartIcon);
      flyer.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
      flyer.style.opacity = '0';
      flyer.style.transform = 'scale(0.3)';
      setTimeout(() => flyer.remove(), 160);
    }
  }

  requestAnimationFrame(frame);
}
