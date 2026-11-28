# Majungmul

## AI API 연결

Claude·ChatGPT 연동 구조와 설정은 [AI 연결 안내](docs/ai-integration.md)를 참고한다.
아래 시안 이관 기록의 외부 API 제외 조건은 초기 버전에 해당한다.
현재는 서버 환경 설정 후 **우리 가게 → AI 글쓰기 연결**에서 공급자를 선택할 수 있다.

참고 영상 형태의 제목·이미지·한국어 내레이션·자막·배경음악 영상은
[30초 홍보 숏츠 안내](docs/reference-shorts.md)를 참고한다. 대본은 ChatGPT/Claude,
이미지와 음성은 OpenAI를 사용하며 FAL 키 없이 MP4로 만들 수 있다.

## 초기 시안 이관 기록

첨부한 majungmul-app.html 은 완성된 시안이고, LOVABLE_HANDOFF.md 는 안내서야.

먼저 두 파일을 프로젝트의 reference/ 폴더에 그대로 저장해줘(작업 중에 계속 다시 볼 수 있게). 그다음 둘 다 끝까지 읽어줘.

이 시안 전체를 React + TypeScript로 똑같이 옮겨줘. 로그인·서버·Supabase·외부 API는 쓰지 말고 지금 수준 그대로만.

[규칙]

- 디자인을 새로 해석하지 마. 원본 CSS 값(색, 여백, 둥글기, 글자 크기, 그림자, keyframes)을 그대로 옮기고, Tailwind로 정확히 안 되면 원본 CSS를 그대로 써.

- 문구는 한 글자도 바꾸지 마.

- 저장은 원본처럼 localStorage만.

- cap.sample(AI), cap.db, claude.use('user'), claude.use('dictation') 은 Claude 전용이라 빼고, AI가 꺼졌을 때 원본이 하는 동작(fallbackDrafts 등 예시 결과)을 그대로 써.

- PDF·워드·엑셀 읽기는 npm 패키지 pdfjs-dist, mammoth, xlsx 로.

- prefers-reduced-motion 처리도 원본처럼.

[옮길 범위: 전부]

1) 랜딩: viewLanding, initLanding, initStreet, .ld 로 시작하는 CSS 전부. 트램, 팔다리 흔들며 걷는 손님, 두 줄 컬러 띠, 숫자 올라가기, 휴대폰 장면 전환, 스크롤 등장 효과 포함.

2) 앱 화면: 첫 설정(viewSetup), 오늘(viewHome), 새 글(viewCreate), 현황(viewStatus), 우리 가게(viewStore), 자료함(viewLibrary).

3) 공통: 왼쪽 메뉴, 모바일 위 로고·아래 메뉴, 팝업(modal), 알림(toast), 로고 누르면 랜딩으로 이동.

4) 데이터·로직: 상태 S, 자료 M, 업종 설정 IND, 예시 데이터(exampleState, exampleMats, examplePosts), 글 검사·자동 수정, 자료 고르기, 사진 품질·중복 검사 등 원본 함수 전부. 원본의 모든 클릭 동작(data-act)이 똑같이 동작해야 해.

[진행]

- 한 번에 다 못 하면 멈추지 말고 위 순서대로 계속 이어서 끝까지 해줘.

- 다 끝나면 reference/majungmul-app.html 과 화면별로 비교해서 다른 곳(색, 간격, 문구, 애니메이션, 버튼 동작, 모바일 화면)을 찾아 고치고, 고친 목록을 알려줘.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://majungmul.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/03e9bc32-4178-4d69-aa83-27354bb00801).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
