// The letter is a single document. Scroll changes its accompanying photograph,
// never replaces the words or moves the reader's focus.
export function createScrollLetter(root, { content, photo, flowers, escapeHtml: esc }) {
  const scene = root.closest('.scene');
  const captions = ['my favorite person.', 'in the ordinary days.', 'a place to come home to.', 'always, a little longer.'];
  const themes = ['Untuk hadirmu', 'Aku ingin ada', 'Pelan-pelan, bertumbuh', 'Dan seluruh doaku'];
  const keys = content.letterPhotos?.length ? content.letterPhotos : ['hero', 'moment0', 'moment1', 'moment3'];
  const count = content.letter.length;
  root.innerHTML = `
    <div class="letter-stanzas">
      ${content.letter.map((text, i) => `<section class="letter-stanza${i === 0 ? ' is-current' : ''}" data-letter-stanza="${i}" aria-labelledby="${i === 0 ? 'letter-title' : `letter-theme-${i}`}">
        <div class="letter-bait-number" aria-hidden="true"><span>${String(i + 1).padStart(2, '0')}</span><i></i></div>
        ${i === 0 ? `<p class="eyebrow">UNTUK <span data-recipient></span>, DENGAN SELURUH RASA</p><h2 id="letter-title" tabindex="-1">Happy birthday,<br><em>my love.</em></h2>` : `<h3 id="letter-theme-${i}">${esc(themes[i] || 'Masih tentangmu')}</h3>`}
        <p class="letter-verse">${esc(text)}</p>
        ${i === 0 ? '<span class="letter-scroll-hint">Masih ada yang ingin kukatakan <span aria-hidden="true">↓</span></span>' : ''}
      </section>`).join('')}
      <div class="letter-signoff"><span aria-hidden="true">♡</span><p class="handwritten">Dengan seluruh rasa,</p><p class="letter-sender">${esc(content.sender)}</p><p class="letter-endnote">Ceritanya sampai di sini.<br>Sayangku untukmu, semoga tak pernah selesai.</p><div class="letter-end-actions"><button id="close-letter" class="text-button">Lipat kembali suratnya ↗</button><button id="replay" class="text-button">Baca cerita ini lagi ↺</button></div></div>
    </div>
    <aside class="letter-gallery" aria-label="Foto yang menemani surat">
      <div class="letter-gallery-note"><span class="eyebrow">SEBUAH SURAT, SEPENUH HATI</span><span class="letter-photo-count" aria-hidden="true">01 / ${String(count).padStart(2, '0')}</span></div>
      <div class="letter-photo-stack">${content.letter.map((_, i) => `<figure class="letter-frame${i === 0 ? ' is-current' : ''}" data-letter-photo="${i}" aria-hidden="${i !== 0}">${photo(keys[i % keys.length], `Kenangan surat ${i + 1}`)}<figcaption class="handwritten">${esc(captions[i % captions.length])}</figcaption></figure>`).join('')}${flowers('flower-letter')}</div>
      <div class="letter-thread" aria-hidden="true"><span></span><i>♡</i></div>
    </aside>`;
  const stanzas = [...root.querySelectorAll('[data-letter-stanza]')];
  const frames = [...root.querySelectorAll('[data-letter-photo]')];
  const gallery = root.querySelector('.letter-gallery');
  const narrow = matchMedia('(max-width: 700px)');
  let scheduled = false;
  function select(index) {
    root.dataset.letterActive = String(index);
    stanzas.forEach((stanza, i) => stanza.classList.toggle('is-current', i === index));
    frames.forEach((frame, i) => {
      frame.classList.toggle('is-current', i === index);
      frame.setAttribute('aria-hidden', String(i !== index));
    });
    root.querySelector('.letter-photo-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
  }
  function update() {
    scheduled = false;
    if (root.hidden || scene.hidden || scene.inert) return;
    const viewport = scene.getBoundingClientRect();
    const mobile = narrow.matches;
    const readingTop = mobile ? gallery.getBoundingClientRect().bottom : viewport.top;
    const anchor = readingTop + (viewport.bottom - readingTop) * .42;
    // Keep the photograph until the next stanza reaches the reading anchor,
    // including long paragraphs and scrolling back through earlier words.
    let index = 0;
    for (let i = 1; i < stanzas.length; i++)
      if (stanzas[i].getBoundingClientRect().top <= anchor) index = i;
    if (String(index) !== root.dataset.letterActive) select(index);
    const range = scene.scrollHeight - scene.clientHeight;
    root.style.setProperty('--letter-progress', range > 0 ? scene.scrollTop / range : 0);
  }
  function refresh() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }
  scene.addEventListener('scroll', refresh, { passive: true });
  const resize = new ResizeObserver(refresh);
  resize.observe(scene);
  resize.observe(root);
  return {
    refresh,
    reset() {
      scene.scrollTop = 0;
      if (!root.hidden) root.querySelectorAll('.photo-slot img').forEach(image => { image.loading = 'eager'; });
      select(0);
      root.style.setProperty('--letter-progress', 0);
      refresh();
    },
  };
}
