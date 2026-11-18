# 마중물 — Lovable 이관 안내

## 1. 파일 구성

- `majungmul-app.html` : 지금까지 만든 앱 전체(랜딩 + 앱 화면 + 로직). HTML·CSS·JS가 한 파일에 들어 있어요(약 210KB).
- 이 파일은 브라우저에서 그냥 열어도 동작해요. 다만 Claude 밖에서는 **AI 글쓰기·사진 분석·음성 입력이 꺼지고**, 저장은 브라우저(localStorage)에만 돼요.

## 2. 그대로 붙여넣으면 안 되는 이유

Lovable은 React + TypeScript + Tailwind 프로젝트를 만들어요. 이 파일은 순수 HTML/JS라서 **"똑같이 보이게 React로 옮겨줘"** 라고 시켜야 해요.
그리고 아래 4가지는 claude.ai 안에서만 되는 기능이라 **Lovable에서는 다른 것으로 바꿔야** 해요.

| 지금 코드 (Claude 전용) | 하는 일 | Lovable에서 바꿀 것 |
|---|---|---|
| `cap.sample.json(prompt, {modelTier, images})` | AI 글 초안·주제 추천·사진 태깅·자료 고르기 | Supabase Edge Function → Anthropic API 호출 (API 키는 서버 비밀값으로) |
| `cap.sample.limits()` | 이미지 입력 가능 여부 | Edge Function이 항상 이미지 지원 → 제거 |
| `cap.db.collection('data/users/<uid>')` | 가게 상태(state)·자료(m_<id>) 저장 | Supabase 테이블 `shop_state`, `materials` (+ 사진은 Storage) |
| `claude.use('user').id()` | 사용자 구분 | Supabase Auth (카카오/네이버/이메일 로그인) |
| `claude.use('dictation')` | 말로 입력 | 브라우저 Web Speech API 또는 빼기 |

`modelTier:'quick'` 은 가벼운 모델(예: Haiku), `'default'` 는 기본 모델(예: Sonnet)로 바꾸면 돼요.

## 3. 코드 위치 지도 (줄 번호는 대략)

| 부분 | 위치 |
|---|---|
| 디자인 토큰·공통 CSS | 파일 앞부분 `<style>` |
| 랜딩 CSS (`.ld …`, 거리·트램 애니메이션) | `<style>` 중간 |
| 업종 설정 `IND` (필수 입력·질문·금지어) | ~401줄 |
| 저장/불러오기 `persist`, `saveState`, `saveMat` | ~494–540줄 |
| 자료 고르기 `selectMaterials` / 사진 품질·중복 | ~600–750줄 |
| 글 검사·자동 수정 `contentProblems`, `autoFixAll` | ~755줄 |
| AI 호출 (`aiTag`, `aiTopics`, `aiDrafts`, `aiRewrite`) | ~840–940줄 |
| 화면: 오늘 `viewHome` | ~989줄 |
| 화면: 자료함 `viewLibrary` | ~1046줄 |
| 화면: 첫 설정 4단계 `viewSetup` | ~1101줄 |
| 화면: 우리 가게 `viewStore` | ~1128줄 |
| 화면: 새 글 `viewCreate` | ~1185줄 |
| 화면: 현황 `viewStatus` | ~1372줄 |
| 화면: 랜딩 `viewLanding`, `initLanding`, `initStreet` | ~1432–1585줄 |
| 이벤트 처리 (`data-act` 클릭 분기) | `render()` 아래 |
| 시작 코드 (Claude 기능 연결) | 파일 맨 끝 |

## 4. 추천 진행 순서

1. **GitHub에 올리기**: 새 저장소에 `reference/majungmul-app.html` 로 넣고 Lovable 프로젝트와 GitHub 연결. (채팅창에 210KB를 통째로 붙이면 잘리거나 무시될 수 있어요.)
2. **랜딩부터** 옮기기 → 화면 비교 → 앱 화면 하나씩(오늘 → 새 글 → 현황 → 우리 가게 → 자료함 → 첫 설정).
3. 화면이 다 맞으면 **Supabase 연결**(로그인·저장) → **Edge Function으로 AI 연결**.
4. 마지막으로 채널 발행(인스타·스레드·유튜브 공식 API, 네이버 블로그는 크롬 확장)을 실제로 붙이기. 지금 코드는 발행을 **흉내만** 내요.

## 5. Lovable에 넣을 첫 프롬프트 (복사해서 사용)

```
reference/majungmul-app.html 은 완성된 시안이야. 이 파일과 화면·문구·색·애니메이션이 똑같이 보이도록 React + TypeScript + Tailwind로 옮겨줘.

규칙
- 디자인을 새로 해석하지 말고 원본 CSS 값(색, 여백, 둥글기, 글자 크기, keyframes)을 그대로 옮길 것. 필요하면 Tailwind 대신 CSS 모듈을 써도 돼.
- 문구는 한 글자도 바꾸지 말 것.
- 이번 단계는 랜딩 페이지(viewLanding, initLanding, initStreet와 .ld 관련 CSS)만. 트램·걷는 손님·흐르는 띠·숫자 올라가기·스크롤 등장 애니메이션 포함.
- prefers-reduced-motion 처리도 원본처럼.
- "무료로 시작하기"는 /app/setup, "예시 가게로 둘러보기"는 /app 로 이동하게만 해둬.
- 끝나면 원본과 다른 부분을 목록으로 알려줘.
```

다음 단계 프롬프트 예시:

```
이제 viewHome(오늘) 화면을 같은 규칙으로 옮겨줘. 상태 S, 자료 M 구조는 원본 그대로 타입으로 정의하고, 저장은 일단 localStorage로.
```

```
cap.sample.json 을 쓰는 부분을 Supabase Edge Function "ai" 로 바꿔줘. 요청: {prompt, tier:'quick'|'default', images?: base64[]}, 응답: JSON. Anthropic API 키는 Supabase secret ANTHROPIC_API_KEY 로.
```

## 6. 주의할 점

- AI 비용·호출 수 제한(사장님당 하루 횟수)은 Edge Function에서 걸어야 해요.
- 손님 사진·후기에는 개인정보가 있을 수 있어요. Storage 접근 권한(RLS)을 사용자 본인만으로 꼭 설정하세요.
- PDF·워드·엑셀 읽기는 cdnjs의 pdf.js / mammoth / xlsx를 쓰고 있어요. Lovable에서는 npm 패키지(`pdfjs-dist`, `mammoth`, `xlsx`)로 바꾸면 돼요.
- 브랜드명은 아직 '마중물'이에요. 이름을 바꾸면 이관 전에 바꾸는 게 편해요.
