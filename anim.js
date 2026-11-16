/* Moteur d'animation par calques (cut-out) — La Voix d'Ambrine.
   Chaque pictogramme animé = une image de fond + des calques découpés dans le dessin
   original, avec pivots et hiérarchie (main -> avant-bras). Rendu sur <canvas>. */
'use strict';
(function (g) {
  const cache = new Map();
  function loadImg(url) {
    if (!cache.has(url)) cache.set(url, new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
    }));
    return cache.get(url);
  }
  const NEUTRAL = { rot: 0, tx: 0, ty: 0, sx: 1, sy: 1, op: 1, rv: 1, rvy: 1 };
  const mul = (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
                         a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];

  class Rig {
    constructor(canvas, spec, dir) { this.c = canvas; this.spec = spec; this.dir = dir; this.raf = 0; this.running = false; }
    static async load(canvas, dir) {
      const spec = await (await fetch(dir + '/anim.json')).json();
      const r = new Rig(canvas, spec, dir);
      const urls = new Set(spec.parts.map(p => p.img));
      r.base = await loadImg(dir + '/' + spec.base);
      r.imgs = {}; await Promise.all([...urls].map(async u => r.imgs[u] = await loadImg(dir + '/' + u)));
      canvas.width = spec.w * spec.U; canvas.height = spec.h * spec.U;
      r.ctx = canvas.getContext('2d'); r.byId = Object.fromEntries(spec.parts.map(p => [p.id, p]));
      r.rest(); // image de repos
      return r;
    }
    val(p, ch, t, amp) {
      const a = p.tracks[ch]; if (!a) return NEUTRAL[ch];
      const x = t * this.spec.fps, i = Math.floor(x), f = x - i;
      let v = i >= a.length - 1 ? a[a.length - 1] : a[i] + (a[i+1] - a[i]) * f;
      if (amp !== 1 && !p.fx && ch !== 'op' && ch !== 'rv' && ch !== 'rvy') v = NEUTRAL[ch] + (v - NEUTRAL[ch]) * amp;
      return v;
    }
    local(p, t, amp) {
      const rot = this.val(p, 'rot', t, amp) * Math.PI / 180, tx = this.val(p, 'tx', t, amp), ty = this.val(p, 'ty', t, amp);
      const sx = this.val(p, 'sx', t, amp), sy = this.val(p, 'sy', t, amp), [px, py] = p.pivot;
      const c = Math.cos(rot), s = Math.sin(rot);
      // T(tx,ty) T(p) R S T(-p)
      const a = c*sx, b = s*sx, cc = -s*sy, d = c*sy;
      return [a, b, cc, d, tx + px - (a*px + cc*py), ty + py - (b*px + d*py)];
    }
    world(p, t, amp, memo) {
      if (memo[p.id]) return memo[p.id];
      let m = this.local(p, t, amp);
      if (p.parent) m = mul(this.world(this.byId[p.parent], t, amp, memo), m);
      return (memo[p.id] = m);
    }
    render(t, amp = 1) {
      const { ctx, spec } = this, U = spec.U, W = this.c.width, H = this.c.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(this.base, 0, 0, W, H);
      const memo = {};
      for (const p of spec.parts) {
        const op = this.val(p, 'op', t, amp); if (op <= 0.003) continue;
        const rv = this.val(p, 'rv', t, amp), rvy = this.val(p, 'rvy', t, amp); if (rv <= 0.003 || rvy <= 0.003) continue;
        const m = this.world(p, t, amp, memo), [bx, by, bw, bh] = p.box;
        ctx.save(); ctx.setTransform(U, 0, 0, U, 0, 0); ctx.transform(...m); ctx.globalAlpha = Math.min(1, op);
        if (rv < 0.999 || rvy < 0.999) { ctx.beginPath(); ctx.rect(bx, by, bw * rv, bh * rvy); ctx.clip(); }
        ctx.drawImage(this.imgs[p.img], bx, by, bw, bh); ctx.restore();
      }
    }
    get dur() { return this.spec.dur; }
    rest() { this.render(this.spec.dur, 0); }   // image lisible = fin de l'animation (identique au pictogramme)
    stop() { cancelAnimationFrame(this.raf); this.running = false; }
    /* options: loop (bool), amp (0..1), speed, onend */
    play({ loop = false, amp = 1, speed = 1, onend } = {}) {
      this.stop(); this.running = true; const t0 = performance.now();
      const tick = now => {
        let t = (now - t0) / 1000 * speed;
        if (t >= this.dur) {
          if (loop) { this.render(t % this.dur, amp); this.raf = requestAnimationFrame(tick); return; }
          this.rest(); this.running = false; onend && onend(); return;   // retour à l'image lisible
        }
        this.render(t, amp); this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
  }
  g.Rig = Rig;
})(window);
