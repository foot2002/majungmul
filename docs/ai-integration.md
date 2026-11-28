# Claude · ChatGPT API 연결

로컬 개발은 프로젝트 루트의 `.env_dev`에 각 서비스의 API 키를 입력하면 된다.
앱의 **우리 가게 → AI 글쓰기 연결**에서 Claude 또는 ChatGPT를 선택한다.
글 생성·주제 추천·자동 수정·자료 분석·메뉴판 읽기에 선택한 AI를 사용한다.

## 사진으로 SNS 만들기

1. **오늘 → 찍고 SNS 만들기 / 사진 골라 SNS 만들기**에서 사진을 최대 3장 선택한다.
2. 가게 이름·동네와 AI 연결이 준비되어 있으면 사진을 읽고 주제 및 6개 채널 홍보물을 자동으로 만든다. 준비되지 않았다면 사진을 유지하고 기본 정보와 AI를 선택하는 화면을 보여준다. 영업시간·메뉴·가격·특징·질문 답변은 선택 사항이며, 입력한 정보만 참고한다.
3. 인스타그램·블로그·쇼츠·스레드·페이스북·당근 탭에서 수정하고 **홍보 글 복사**로 가져간다. 사진 카드 저장과 30초 영상 만들기도 같은 화면에서 사용할 수 있다.

`photoPromotion` 요청 한 번에 사진 1~3장과 가게 정보를 함께 보낸다. LLM은 사진별 관찰 내용, 자동 주제, 6개 채널 초안을 한 응답으로 반환한다. 서버는 누락된 채널·사진 인덱스·중복 인덱스를 검사한다. 사진은 업로드 시 최대 1280px JPEG로 변환한다. 새 사진으로 시작할 때 이전 글의 주제·사진을 가져오지 않는다.

생성 후 짧은 도입 문장을 줄바꿈하고, 방문 안내가 빠졌으면 사실을 추가하지 않는 짧은 안내를 붙인다. 채널별 길이·가게의 직접 말투 등도 검사한다. 필요한 경우 사진 분석 결과와 같은 기본 정보로 문장을 한 번 더 다듬는다(추가 요청 최대 1회). 다듬기에 실패해도 최초 초안을 유지하며, 남은 형식 문제는 검토 화면에 표시한다.

생성 중 취소하거나 다른 화면으로 이동하면 이후 도착한 결과는 적용하지 않는다. 오류가 나면 사진과 입력을 유지하고 같은 화면에서 재시도 또는 AI 변경이 가능하다. 자동으로 예시 문구로 바꾸지 않으며, 예시 매장에서 **AI 없이 예시 결과만 보기**를 누른 경우에만 기본 문구를 사용한다. 얼굴이 있거나 문서·무관한 사진으로 판단하면 확인 화면에서 멈춘다. AI 판단은 완벽하지 않으므로 게시 전 내용을 확인한다.

## 처음 설정에서 메뉴판 읽기

처음 설정 3단계의 **메뉴판 사진으로 채우기**에서 사진을 올린다. 같은 화면의 **메뉴판 사진을 읽을 AI**에서 연결된 Claude 또는 ChatGPT를 선택할 수 있다. 읽어온 이름·가격을 확인하고 필요하면 수정한 뒤 **체크한 메뉴 등록**을 누르면 가게 메뉴에 저장된다. 같은 이름의 메뉴는 가격만 갱신하며 기존 다른 메뉴는 유지한다.

가격이 불분명한 항목은 빈칸·체크 해제로 표시한다. 직접 가격을 적고 체크하면 등록할 수 있으며, 사진에 명시된 0원은 그대로 인식한다. AI 오류 시 사진을 유지하고 오류 원인을 화면에 표시하므로, AI를 바꾸거나 **선택한 사진 다시 읽기**로 재시도할 수 있다. 취소하거나 해당 화면을 나간 뒤 도착한 결과는 반영하지 않는다. 메뉴판 사진은 최대 15MB를 받아 JPEG로 축소하고 AI에 보낸다.

## 설정

`.env_dev`에는 다음 항목이 준비되어 있다. 키 입력란만 본인 계정의 키로 채운다.
이 파일은 Git에서 제외된다. `.env`는 운영용으로 예약하며 로컬 개발에서 대신 읽지 않는다. 서버의 환경파일 생성·배포 방법은 [운영·개발 분리 안내](../deploy/ec2/README.md)를 참고한다.

```dotenv
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_WORKSPACE_ID=
LLM_ENABLED=true
LLM_DEFAULT_PROVIDER=anthropic
LLM_ANTHROPIC_MODEL=claude-sonnet-5
LLM_ANTHROPIC_QUICK_MODEL=
LLM_OPENAI_MODEL=gpt-5.4-mini
LLM_OPENAI_QUICK_MODEL=
```

- `ANTHROPIC_API_KEY`: Claude API 키.
- `OPENAI_API_KEY`: OpenAI API 키. 앱에서 ChatGPT로 표시한다.
- `ANTHROPIC_WORKSPACE_ID`: 여러 워크스페이스에 접근하는 Claude 키일 때 사용한다.
  특정 워크스페이스에 속한 키라면 비워 둔다.
- `LLM_ENABLED`: `true`일 때 키가 설정된 공급자를 사용할 수 있다. `false`이면 AI 호출을 끈다.
- `LLM_DEFAULT_PROVIDER`: 첫 방문 시 기본 공급자(`anthropic` 또는 `openai`).
- `LLM_*_MODEL`: 해당 공급자의 글쓰기·수정·메뉴판 읽기 모델 ID.
- `LLM_*_QUICK_MODEL`: 자료 분석·주제 추천 모델. 비우면 같은 공급자의 기본 모델을 사용한다.

두 키를 모두 넣을 필요는 없다. 한쪽만 입력하면 해당 공급자만 활성화된다.
이미지 입력을 지원하며 본인 API 계정에서 접근할 수 있는 모델을 선택한다.
모델 ID에는 `openai/`, `anthropic/` 같은 게이트웨이 접두사를 붙이지 않는다.

1. `.env_dev`를 저장하고 `bun run dev` 또는 `npm run dev`로 서버를 시작한다.
2. **우리 가게 → AI 글쓰기 연결**에서 공급자를 선택한다.
3. **연결 확인**을 눌러 짧은 생성 요청 1회로 실제 API 응답을 확인한다.

`사용 준비됨`은 키와 모델 설정이 있다는 뜻이며 실제 인증 성공을 의미하지 않는다.
API 키나 모델을 변경하면 서버를 재시작하고 **설정 새로고침**을 누른다.
기존에 **AI 사용 안 함**을 선택한 브라우저에서는 원하는 공급자를 직접 선택한다.
사용 가능한 모델 목록은 `bun run ai:models`로 조회할 수 있다. 설정된 키의 공급자만 조회하며
추론 요청은 하지 않는다. 조회 명령은 Node.js 22에서 `.env_dev`를 읽고,
실행 환경에 이미 설정된 값이 있으면 그 값을 우선한다.

## 호출 구조

```text
app.ts → client.ts → TanStack 서버 함수 → service.server.ts
  ├─ Claude → https://api.anthropic.com/v1/messages
  └─ ChatGPT → https://api.openai.com/v1/chat/completions
```

각 공급자의 API 키로 직접 호출한다. 비용은 각 공급자 계정에 청구된다.
API 키는 서버에서만 읽으며 브라우저와 localStorage에는 보내지 않는다.
localStorage에는 공급자 선택만 추가로 저장한다. 선택한 가게 정보·자료는 해당 AI로 전달된다.

## 배포 및 오류 처리

- `.env`, `.env.*`, `.env_*`는 Git에서 제외한다. 키에 `VITE_` 접두사를 붙이지 않는다.
- EC2에서는 운영 `/etc/majungmul/.env`, 개발 `/etc/majungmul/.env_dev`에 설정을 등록한다. 파일 권한은
  `root:root`, `0600`으로 관리하고 운영은 `sudo systemctl restart majungmul-prod`, 개발은 `sudo systemctl restart majungmul-dev`로 적용한다.
  서비스 파일도 바꿨다면 먼저 `sudo systemctl daemon-reload`를 실행한다.
- Lovable 등 다른 호스팅에서는 같은 이름의 서버 환경변수/Secret을 등록한다.
  빌드는 키 없이 가능하며 운영 키는 런타임에 읽는다.
- 키가 없으면 외부 호출을 하지 않는다. 잘못된 JSON, 인증 오류, 잔액 부족, 한도 초과, 통신 실패 시
  이유를 표시하고 재시도를 제공한다. 채널 발행은 기존 시연 기능이다.
- 사진 기반 홍보는 최대 3장, 다른 작업은 1장(장당 2MB 이하, JPEG/PNG/WebP), 프롬프트 40,000자, 요청 60초로 제한한다.
  서버 프로세스당 분당 20회·동시 3회로 제한하고 자동 재시도는 하지 않는다.
- 현재 앱은 로그인 없이 동작한다. 요청 제한은 여러 서버 간에 공유되지 않는다.
  AI를 외부에 공개할 때는 인증된 접근 경로와 사용자별 한도·공급자 예산을 설정한다.
- API 키와 공급자의 원본 오류 본문은 브라우저 응답이나 서버 로그에 보내지 않는다.

## 검증

```sh
bun run test
bunx tsc --noEmit
bun run build:ec2
```

자동 테스트는 모의 응답으로 요청 형식·공급자별 인증·이미지·오류 처리를 확인한다.
실제 연결은 키 입력 후 앱의 **연결 확인**으로 검증한다.

참고: [Claude API 인증](https://platform.claude.com/docs/en/api/overview),
[Claude Sonnet 5](https://platform.claude.com/docs/en/docs/about-claude/models/whats-new-sonnet-5),
[OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create),
[GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini).


## 실제 AI 장면 추가

음식·손님을 추가하는 사진 편집과 6초 I2V 장면 생성은 [AI 장면 안내](ai-scenes.md)를 참고한다. 완성된 장면은 기존 30초 영상의 가운데에 삽입된다. 영상 생성에는 별도의 서버 `FAL_KEY`가 필요하다.

고정 제목·장면 이미지·한국어 내레이션·자막 중심의 영상은 [30초 내레이션 숏츠](reference-shorts.md)에서 만든다. 이 기능은 OpenAI 이미지·음성과 브라우저 합성을 사용하므로 FAL 키가 필요 없다. 대본은 ChatGPT/Claude 중 선택한다.
