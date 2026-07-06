/* ═══════════ Notebook — 📔 도덕 수첩 (원칙 카드 팝업 & 열람 UI) ═══════════ */
const Notebook = {

  /* ───── 획득 시 전면 카드 팝업 — 원칙 전문을 읽고 닫아야 진행 ───── */
  showCard(item) {
    return new Promise(resolve => {
      Sound.win();
      UI.hearts(6);
      const set = DATA.moralSets[item.set];
      const ov = UI.overlay(`
        <div class="ov-panel principle-card">
          <div class="pc-set">${set.icon} ${set.name} · ${set.sub}</div>
          <div class="pc-icon">${item.icon}</div>
          <h3>${item.title}</h3>
          <p class="pc-text">${item.text}</p>
          ${item.noah ? `<p class="pc-noah">🤖 "${item.noah}"</p>` : ''}
          <p class="pc-saved">📔 도덕 수첩에 기록되었습니다!</p>
          <div class="ov-choices"><button class="choice-btn ok">마음에 새겼어요!</button></div>
        </div>`);
      ov.querySelector('.ok').onclick = () => { Sound.pop(); UI.close(ov); resolve(); };
    });
  },

  /* ───── 수첩 열람 (HUD 버튼 / 메인 화면 버튼 공용) ───── */
  open() {
    const owned = new Set(State.notebookAll());
    const sessionCount = DATA.moralItems.filter(i => State.has(i.id)).length;
    const totalOwned = DATA.moralItems.filter(i => owned.has(i.id)).length;
    const hasOldRecords = totalOwned > sessionCount;
    const wasEnabled = Player.enabled;
    Player.enabled = false;

    const tabs = Object.keys(DATA.moralSets);   // robot / ethics / user
    const ov = UI.overlay(`
      <div class="ov-panel notebook-panel">
        <button class="nb-close">✕</button>
        <h3>📔 도덕 수첩 <span class="nb-progress">모은 원칙 ${totalOwned} / ${DATA.moralItems.length}</span></h3>
        ${hasOldRecords ? '<p class="ov-sub">✨ 이전 모험에서 모은 기록도 함께 보여요!</p>' : ''}
        <div class="nb-tabs">
          ${tabs.map((t, i) => `<button class="nb-tab ${i === 0 ? 'on' : ''}" data-t="${t}">
            ${DATA.moralSets[t].icon} ${DATA.moralSets[t].name}</button>`).join('')}
        </div>
        <p class="nb-sub"></p>
        <div class="nb-cards"></div>
      </div>`);

    const cardsEl = ov.querySelector('.nb-cards');
    const subEl = ov.querySelector('.nb-sub');
    const render = setKey => {
      subEl.textContent = '— ' + DATA.moralSets[setKey].sub + ' —';
      cardsEl.innerHTML = DATA.moralItems.filter(i => i.set === setKey).map(i =>
        owned.has(i.id)
          ? `<div class="nb-card"><span class="nb-ic">${i.icon}</span>
               <div><b>${i.title}</b><p>${i.text}</p></div></div>`
          : `<div class="nb-card locked"><span class="nb-ic">❓</span>
               <div><b>? ? ?</b><p>아직 발견하지 못했어요 — ${i.hint} 찾아보세요!</p></div></div>`
      ).join('');
    };
    ov.querySelectorAll('.nb-tab').forEach(btn => {
      btn.onclick = () => {
        Sound.pop();
        ov.querySelectorAll('.nb-tab').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        render(btn.dataset.t);
      };
    });
    render(tabs[0]);
    ov.querySelector('.nb-close').onclick = () => {
      Sound.pop();
      UI.close(ov);
      Player.enabled = wasEnabled;
    };
  },
};
