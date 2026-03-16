/**
 * NightOS — Image Gallery App
 * Shows procedurally generated art since we have no real images bundled.
 * Users can also upload their own images.
 */

'use strict';

(function () {
  /** Generate a gradient image on a canvas element */
  function makeArtCanvas(width, height, seed) {
    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deterministic "random" from seed
    const r = (n) => Math.abs(Math.sin(seed * 9301 + n * 49297) % 1);

    const gradients = [
      ['#1a2d5a','#4f8ef7'],
      ['#1a0533','#e040fb'],
      ['#0f3460','#16213e'],
      ['#1a3a2a','#4ade80'],
      ['#2d1b69','#11998e'],
      ['#141e30','#4f8ef7'],
      ['#2a0a3a','#f59e0b'],
      ['#16213e','#e11d48'],
    ];
    const [c1, c2] = gradients[Math.floor(r(1) * gradients.length)];

    const grd = ctx.createLinearGradient(
      r(2) * width, r(3) * height,
      r(4) * width, r(5) * height
    );
    grd.addColorStop(0, c1);
    grd.addColorStop(1, c2);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    // Draw some circles
    for (let i = 0; i < 5; i++) {
      const x = r(i * 10 + 6) * width;
      const y = r(i * 10 + 7) * height;
      const rad = r(i * 10 + 8) * Math.min(width, height) * 0.35;
      const alpha = 0.05 + r(i * 10 + 9) * 0.15;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }

    return canvas;
  }

  const GALLERY_ITEMS = [
    { name: 'Nebula Dream',   seed: 1  },
    { name: 'Ocean Depths',   seed: 2  },
    { name: 'Aurora',         seed: 3  },
    { name: 'Solar Flare',    seed: 4  },
    { name: 'Void Garden',    seed: 5  },
    { name: 'Midnight',       seed: 6  },
    { name: 'Inferno',        seed: 7  },
    { name: 'Neon City',      seed: 8  },
    { name: 'Forest Spirit',  seed: 9  },
    { name: 'Cyber Dawn',     seed: 10 },
    { name: 'Deep Space',     seed: 11 },
    { name: 'Rose Quartz',    seed: 12 },
  ];

  /** Extra user-uploaded images */
  const userImages = [];

  function open() {
    const el = WindowManager.create({
      id: 'imagegallery',
      title: 'Gallery',
      icon: '🖼️',
      width: 680,
      height: 480,
      content: buildUI(),
    });
    initGallery(el);
  }

  function buildUI() {
    return `
      <div class="win-toolbar">
        <button class="win-toolbar-btn" id="gal-upload">📂 Add Images</button>
        <div class="win-toolbar-sep"></div>
        <button class="win-toolbar-btn" id="gal-refresh">🔄 Refresh</button>
      </div>
      <div class="gallery-grid" id="gallery-grid" role="list" aria-label="Images"></div>`;
  }

  function initGallery(el) {
    function render() {
      const grid = el.querySelector('#gallery-grid');
      if (!grid) return;
      grid.innerHTML = '';

      const allItems = [
        ...GALLERY_ITEMS,
        ...userImages,
      ];

      allItems.forEach((item, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'gallery-item';
        wrapper.tabIndex = 0;
        wrapper.setAttribute('role', 'listitem');
        wrapper.setAttribute('aria-label', item.name);

        let canvas;
        if (item.dataUrl) {
          // User-uploaded image
          const img = document.createElement('img');
          img.src = item.dataUrl;
          img.alt = item.name;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          canvas = img;
        } else {
          canvas = makeArtCanvas(220, 220, item.seed);
          canvas.style.cssText = 'width:100%;height:100%;display:block;';
        }

        const label = document.createElement('div');
        label.className = 'gallery-label';
        label.textContent = item.name;

        wrapper.appendChild(canvas);
        wrapper.appendChild(label);

        const openLightbox = () => showLightbox(item, canvas);
        wrapper.addEventListener('click', openLightbox);
        wrapper.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(); }
        });

        grid.appendChild(wrapper);
      });
    }

    function showLightbox(item, sourceCanvas) {
      const lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-label', `Viewing: ${item.name}`);
      lb.setAttribute('aria-modal', 'true');

      const inner = document.createElement('div');
      inner.className = 'lightbox-inner';

      let display;
      if (item.dataUrl) {
        display = document.createElement('img');
        display.src = item.dataUrl;
        display.alt = item.name;
        display.style.cssText = 'max-width:90vw;max-height:80vh;border-radius:8px;display:block;';
      } else {
        display = makeArtCanvas(800, 600, item.seed);
        display.style.cssText = 'max-width:90vw;max-height:80vh;border-radius:8px;display:block;';
      }

      const closeBtn = document.createElement('button');
      closeBtn.className = 'lightbox-close';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('aria-label', 'Close lightbox');

      const title = document.createElement('div');
      title.style.cssText = 'color:white;text-align:center;margin-top:10px;font-size:0.9rem;';
      title.textContent = item.name;

      inner.appendChild(closeBtn);
      inner.appendChild(display);
      inner.appendChild(title);
      lb.appendChild(inner);
      document.body.appendChild(lb);

      const closeLb = () => {
        lb.style.opacity = '0';
        lb.style.transition = 'opacity 0.2s';
        setTimeout(() => lb.remove(), 220);
      };

      closeBtn.addEventListener('click', closeLb);
      lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
      document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') { closeLb(); document.removeEventListener('keydown', handler); }
      });

      closeBtn.focus();
    }

    // Upload button
    el.querySelector('#gal-upload').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.addEventListener('change', () => {
        const files = Array.from(input.files);
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = ev => {
            userImages.push({ name: file.name.replace(/\.[^.]+$/, ''), dataUrl: ev.target.result });
            render();
          };
          reader.readAsDataURL(file);
        });
      });
      input.click();
    });

    el.querySelector('#gal-refresh').addEventListener('click', render);

    render();
  }

  NightOS.registerApp('imagegallery', {
    title: 'Gallery',
    icon: '🖼️',
    open,
  });
})();
