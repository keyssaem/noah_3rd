# 💡 아이디어 보관함 (보류·추후 구현 예정)

## 보류 — AR 보물찾기: 로봇 3원칙 × 마커 기반
- **위치**: 3단계 이동 퀘스트 구간(교실→운동장→복도 사이 쉬는시간)
- **활동**: 교사가 교실 뒤·복도·창가에 마커 3장을 숨겨두고, 학생이 태블릿으로 찾아 비추면
  3D 아이템(원칙 두루마리)이 떠오르며 게임 내 '도덕 수첩'에 자동 기록
- **가치**: 신체 활동 + 협동 + 디지털 결합. 단, 수업 준비물(마커 인쇄·부착)이 필요하므로 선택 심화 활동으로 설계
- ⚠ AR.js는 https(또는 localhost) 필수, 태블릿 후면 카메라 권장, 실패 시 폴백(일반 클릭 획득) 병행

## 추후 구현 예정 (도덕 수첩 연계)
- **6-2 헌장에 '수첩 완성 뱃지'**: 9/9 수집 시 헌장 이미지에 특별 도장 추가
- **결말 분기 3종**: 최종 O/X + 5단계 행동 로그(거절 여부·팀 공평도·칭찬 선택) 기반의
  엔딩 연출 분기(단짝/좋은 이웃/연구자 꿈나무) — O든 X든 도덕적 관계면 모두 굿엔딩 (열린 결말 유지)
- **히든 엔딩**: 도덕 수첩 9/9 + 노아의 일기 전부 수집 시, 쿠키 후 '노아의 진짜 편지' 언락
- **4-1 교수님 회상 씬 ↔ 수첩 연동** (B3에서 구현): "여러분이 수첩에 모은 바로 그 인공지능 윤리 3대 원칙입니다"

## 📷 MediaPipe 미니게임 로드맵 (2026-07-07 우선순위 확정)
- **인프라 전제**: 태블릿 카메라는 GitHub Pages(https) 접속 필수 — PC IP(http) 접속은 getUserMedia 차단됨. 노트북은 localhost OK. file:// 는 폴백 전용
- ✅ **공통 기반(Phase 0) — 2026-07-07 구현 완료**: `js/mp.js` — dynamic import() CDN 로더(무빌드 유지) + CamGate(노아의 개인정보 안내 + 거절 존중 처리, 모든 게임 공용) + 모델 lazy load 진행바
- ✅ **Phase 1 — ② 가위바위보 — 2026-07-07 구현 완료** (`Mini.rpsBattle('tool'|'respect')`): 3-2 필승판 + 슬로우 리플레이(타임스탬프만 기록 → 그래픽 재연) + 공정성 질문(`State.rpsFair`) / 5-2 봉인판(🎴 선봉인). 폴백: 버튼 3개(카메라 인식 2회 실패 시 자동 전환). Dev Mode 점프 버튼 2개 추가됨
- ✅ **Phase 2 — 🎈 노아의 기억 풍선 — 2026-07-09 구현 완료** (`Mini.balloonGame()`): ⚠ 초기 구현이었던 '누가 지키는 약속' 3분류 게임은 **교육적 사유로 폐기**(윤리 3대 원칙은 로봇·사용자·사회 모두의 원칙이라 분류가 중첩됨 + 스토리에선 교수님이 노아에게 가르친 약속이라 몰입한 학생일수록 오답). 대체: **제목↔뜻 짝맞추기** — AR 전체 화면 카메라(거울) 위에 제목 풍선이 떠다니고(세트별 테두리: 로봇=노랑/윤리=주황/사용자=파랑), 하단 문제 바에 뜻(`moralItems.q` 초6 요약문, `**키워드**` 강조) 표시. 잡기=핀치 or 1.5초 호버(게이지), 놓기=수첩 슬롯에서 핀치 해제 or 0.8초 유지. 오답은 잡는 순간 펑+힌트. 1~3라운드 2지선다→이후 3지선다. 첫 시도 정답=⭐(`State.balloonStars` 0~9, 헌장 뱃지 연계 후보). 폴백: 같은 게임을 탭으로(카메라 모드에서도 탭 병행). 손 소실 1초 시 풍선 제자리 복귀. 위치: 5-5 노아 고백 직후. 양손 협동은 v2
- **Phase 3 — ④ 운동측정 축소판** (Pose Landmarker lite ~5.5MB): 3종 → **ⓐ 만세 횟수 1종으로 축소**. 도구화(등급 발표)/존중(잘하는 점 1가지) 2연출. 리스크: 카메라와 1.5~2m 거리·상반신 프레이밍
- **Phase 4 — ① 노아의 눈**: 연출1(20장 시연)은 **무모델 스크립트 연출**(외부 에셋 0 원칙 유지). 연출2만 Image Classifier + 한국어 화이트리스트 30개. ⚠ ImageNet에 '사람' 클래스 없음 → 얼굴 "사람 99.9%" 비트는 스크립트 처리
- **Phase 5 — ③ 허공 그리기** (hand 모델 ⑥과 공유): 검지 스무딩 필수, 상태 전환 단순화("검지 펴면 그리기"). 기존 마우스/터치가 주 모드, 허공은 부가 모드
- 새 미니게임마다 Dev Mode 패널에 점프 버튼 추가할 것

## 🧍 P3 GLB 캐릭터 (2026-07-09 진행 중)
- **경로 A 확정**: Tripo에서 애니메이션 클립 포함 재수출 완료. 8개 GLB(각 ~3MB, Draco 없음, 41관절 표준 휴머노이드 리그) → `media/glb/`. 주인공/친구=1클립, 노아 인간/동물=4클립, 선생님=1클립, 자동차=정적(0클립). ⚠ 클립 이름이 전부 `NlaTrack.00x`로 무의미 → **DevMode 🎭GLB 뷰어로 눈으로 식별 필요**(idle/wave/scared 등)
- ✅ **P3-A 노아 GLB 완료**: `js/assets.js`(GLTFLoader/SkeletonUtils 전역, preload+캐시+instance+normalize), `Chars.glbChar()`(AnimationMixer 래퍼, 박스와 동일 인터페이스), `Chars.noah()`가 GLB 로드 시 GLB·실패 시 `_noahBox` 폴백. 디자인 선택 직후 `Assets.preloadWithBar` 프리로드. 현재 idle=클립0 기본. 클립 식별 후 `Chars.NOAH_CLIPS`에 wave/scared 매핑 예정(노아 고백 연출 등)
- ✅ **클립 식별 확정 (2026-07-10)** — `Chars.CLIPS`(characters.js): playerM{idle:0,sit:1,walk:3,surprise:4} playerF{idle:0,sit:1,walk:2,surprise:4}(남녀 공통동작만; 남[2]둘러보기·여[3]인정하기 제외) teacher/friendM/friendF{look:0} noahHuman{idle:0,greet:1,admit:2,scared:3} noahAnimal{idle:1,greet:2,scared:3}(**[0] 미사용**) noahCar{}(정적). `CLIP_LABELS`로 뷰어에 한국어 표시. glbChar 기본 대기 = idle ?? look ?? 0.
- ✅ **노아 클립 연출 연결 (2026-07-10)**: `Player.camLock`+`focusOn(target,{dist,height,lookH,snap})`/`clearFocus()`(player.js) — 카메라를 노아에게 밀어넣어 크게 잡기(연출 중 3인칭 추적 대신 락). `snapCamera`가 락 자동 해제(전환 누수 방지). `Flow.noahMoment(clipKey,opts)`(클립재생+포커스)/`noahRest()`(idle복귀+포커스해제). 연결: ①첫 등장 `greet`(enterClassroom1 조립 직후) ②시스템오류 `scared`(endings.fakeEnding 패널 shatter 직후, snap) ③노아 고백 `admit`(respect5, 자동차/동물은 admit 없어 no-op=idle 유지). 박스 폴백·자동차형은 클립 no-op+카메라만.
- ✅ **P3-B+C 주인공 GLB 완료 (2026-07-10)**: `glbChar`에 이동 상태기계(`_loco`: walk+idle 클립 보유 시 moving 플래그로 대기↔걷기 자동 크로스페이드, 걷기 배속 `Chars.PLAYER_WALK_TS=1.6`). `Chars.player()` GLB 우선+박스 폴백(height 1.65). 시작 버튼에서 `preloadWithBar(['playerM','playerF'])` → 선택 화면 미리보기도 GLB. 검증: 남 idle0↔walk3, 여 walk2, 스폰·이동·정지 전 구간 통과. 걷기 배속은 눈 튜닝 대상.
- **남은 것**: 선생님/친구 NPC GLB(친구는 머리색·옷색 틴트로 여러명). ⚠ 안정성: examples/js CDN 실패 시 박스 폴백 동작하나, 심사 대비 three+loader 로컬 벤더링 권장. ⚠ GLB는 http 서버/https 필수 — file:// 더블클릭 시 로컬 fetch 차단되어 박스 폴백(뷰어는 `Assets.failHint()`로 안내)

## 🛡 안정성 팩 (심사 1순위 — 미구현)
- Service Worker(PWA) 오프라인 캐시: 첫 로드 후 비행기모드 시연 가능 → "구형기기 오류없이 구동" 증거
- CDN 벤더링: three.min.js·GLTFLoader·SkeletonUtils·폰트·MediaPipe wasm+손모델을 저장소 동봉(학교망 필터 대비)
- `renderer.setPixelRatio(min(dpr,1.5))` + FPS 자동 강등 + 씬당 스킨메시 1~2개 제한
- GitHub Pages 한도: 파일 100MB/저장소 1GB/대역 월100GB. media/temporary_files(~80MB)는 .gitignore 권장. DB 불필요(localStorage 완결이 심사 유리)

## 추후 검토 — 지도서 활동지(6-3-3, 187쪽) 연계 미니게임
- **균형 저울 게임**(과의인화 vs 도구화 vs 균형 분류) — 인격화 서브 에피소드(B5)와 연계
- **노아 사용 설명서 만들기 워크숍** — 설명서 PNG 발급, 종이 활동지 부착용
