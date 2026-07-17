/* ═══════════ State — 게임 상태 & localStorage ═══════════ */
const State = {
  data: {
    name: '', gender: 'm', noahDesign: 'human',
    notebook: [], stage: 1,                // notebook: 이번 모험에서 모은 원칙 id
    bond: 0, bondType: 'intimacy',         // 관계 게이지 (3단계 친밀도 / 5단계 존중)
    favorite: '',                          // 노아 잡담에서 말한 '가장 좋아하는 것'
    relationDef: '',                       // 나는 노아를 ___(으)로 대하겠습니다 (스스로 정하기)
    logDecline: false,                     // 행동 로그: 5-1에서 정중히 거절했는가
    teamFair: false,                       // 행동 로그: 팀 편성이 공평했는가
    chatCount: 0,                          // 행동 로그: 노아와 자발적으로 나눈 잡담 횟수
    friendDef: '', friendReason: '',      // 나에게 친구란 ___ (수미상관 앞)
    ox1: '', ox1Reason: '',               // 3단계 O/X 질문
    ox2: '', ox2Reason: '',               // 6단계 O/X 재질문
    promises: [],                          // 나의 약속 3가지
    signature: '',                         // 서명 dataURL
    schoolArt: '',                         // 도구화(3-3) 미술에서 그린 '나의 학교' 그림 dataURL (헌장 왼쪽)
    noahArt: '',                           // 존중(5-3) 미술에서 그린 '노아와 함께 있는 나의 모습' dataURL (헌장 오른쪽)
  },

  set(key, value) {
    this.data[key] = value;
    try { localStorage.setItem('noah_save', JSON.stringify(this.data)); } catch (e) {}
  },
  get(key) { return this.data[key]; },

  restore() {
    try {
      const saved = JSON.parse(localStorage.getItem('noah_save') || '{}');
      Object.assign(this.data, saved);
    } catch (e) {}
  },

  reset() {
    try { localStorage.removeItem('noah_save'); } catch (e) {}
  },

  /* ───── 📔 도덕 수첩 ───── */
  collect(id) {
    if (!this.data.notebook.includes(id)) {
      this.data.notebook.push(id);
      this.set('notebook', this.data.notebook);
      // 회차를 넘어 누적 저장 (메인 화면 열람용)
      try {
        const all = JSON.parse(localStorage.getItem('noah_notebook_all') || '[]');
        if (!all.includes(id)) {
          all.push(id);
          localStorage.setItem('noah_notebook_all', JSON.stringify(all));
        }
      } catch (e) {}
    }
  },
  has(id) { return this.data.notebook.includes(id); },
  notebookAll() {   // 이번 모험 + 이전 모험 기록의 합집합
    try {
      const all = JSON.parse(localStorage.getItem('noah_notebook_all') || '[]');
      return [...new Set([...all, ...this.data.notebook])];
    } catch (e) { return [...this.data.notebook]; }
  },

  /* %NAME% 치환 */
  fill(text) { return text.replace(/%NAME%/g, this.data.name || '친구'); },
};
