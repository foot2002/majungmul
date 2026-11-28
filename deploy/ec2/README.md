# EC2 운영·개발 분리

하나의 EC2에서 서로 다른 서비스·배포 폴더·환경파일로 실행한다.
개발은 변경 내용을 검증하는 서버이며, Vite 개발 서버 대신 빌드한 Node 앱을 실행한다.

| 항목 | 운영 | 개발 |
| --- | --- | --- |
| 접속 주소 | http://16.208.56.91 | http://16.208.56.91:8080 |
| 배포 브랜치 | `main` | `dev` |
| Nginx → Node | `80` → `127.0.0.1:3000` | `8080` → `127.0.0.1:3001` |
| 서비스 | `majungmul-prod` | `majungmul-dev` |
| 환경파일 | `/etc/majungmul/.env` | `/etc/majungmul/.env_dev` |
| 현재 배포 | `/srv/majungmul/prod/current` | `/srv/majungmul/dev/current` |
| 배포 이력 | `/srv/majungmul/prod/releases/` | `/srv/majungmul/dev/releases/` |
| DB 이름 | `majungmul` | `majungmul_dev` |

서버 접속: `ec2-user@ec2-16-208-56-91.ap-northeast-3.compute.amazonaws.com`.
Amazon Linux 2023, Node.js 22, Nginx를 사용한다. 현재 주소는 HTTP이다.

## 환경파일

최초 분리 시 서버에 두 파일을 생성했다. 운영 DB 설정은 기존
`/etc/majungmul/env`에서 보존하고, 개발에는 별도 DB와 제한된 계정을 설정했다.
기존 AI 키를 두 환경에 등록했으므로 초기 API 사용량은 같은 공급자 계정에 청구된다.
별도 API 예산이 필요하면 개발 파일의 키만 별도 프로젝트 키로 교체한다.

환경파일은 Git과 배포 압축 파일에 들어가지 않는다. 배포 폴더 밖에 있으므로
매번 복사할 필요가 없다. 새 서버를 만들 때는 안전한 경로로 한 번 생성해야 한다.
파일 권한은 `root:root`, `0600`으로 유지한다.

```sh
# 서버에서 개발 설정 변경
sudoedit /etc/majungmul/.env_dev
sudo systemctl restart majungmul-dev

# 서버에서 운영 설정 변경
sudoedit /etc/majungmul/.env
sudo systemctl restart majungmul-prod
```

로컬 `npm run dev`와 `npm run ai:models`는 프로젝트 루트의 `.env_dev`를 사용한다.
`.env_dev`가 없더라도 운영 `.env`의 서버 키를 대신 읽지 않는다.
로컬 개발 파일도 최초 분리 시 생성했으며, 기존 로컬 `.env`는 보존했다.
서버 DB 비밀번호를 로컬 파일에 복사하지 않는다.
설정 항목은 [AI 연결 안내](../../docs/ai-integration.md)를 참고한다.

서버에서는 systemd가 지정된 파일을 읽는다. 두 앱 모두 `NODE_ENV=production`이며
`APP_ENV=prod` / `APP_ENV=dev`로 환경을 구분한다. 개발 앱 화면에는
**개발 검증 환경** 표시가 나온다. 포트와 환경 이름은 서비스 실행 명령이 고정한다.

## 데이터와 접근 분리

- 초기 분리에서는 운영의 기존 `00c809e` 배포본을 그대로 보존했다. 개발에는 최신 AI 기능을 배포했다.
- 현재 배포한 앱의 가게 정보·게시물은 브라우저 localStorage에 저장된다.
  포트가 달라 운영과 개발의 브라우저 데이터가 분리된다.
- 개발 DB는 운영 데이터를 복사하지 않은 빈 DB다. 개발 DB 계정에는 운영 테이블 접근 권한이 없다.
  DB 연결 기능은 별도 `feature/DBconnect` 브랜치에 있어, 현재 앱이 DB를 사용하는 것은 아니다.
  이 브랜치를 통합할 때 개발 DB에 스키마를 준비하고 인증 흐름을 별도로 검증해야 한다.
- 쿠키는 포트별로 격리되지 않는다. 현재 인증이 없는 개발 앱에서는 Nginx가
  요청의 `Cookie`와 응답의 `Set-Cookie`를 제거한다. DB 인증 통합 시 이 설정을
  무작정 해제하지 말고, 별도 호스트명 또는 SSH 터널의 다른 호스트로 인증을 분리한다.
- 개발 `8080`은 보안 그룹과 Nginx 모두 지정한 접속 IP에서만 허용한다.
  Node `3000` / `3001` 포트는 외부에 개방하지 않는다.
- 개발 서비스는 CPU 50%, 메모리 상한 384MiB를 적용했다. 서버 장애와 총 자원은 공유한다.

개발 접속 IP가 바뀌면 EC2 보안 그룹 `sg-0aa14f9518f64bca0`의 TCP 8080
허용 IP(`/32`)와 `/etc/nginx/majungmul-dev-allow.conf`를 함께 변경한다.
이 파일에는 `allow 127.0.0.1;`, `allow <접속 IP>;`, `deny all;`을 둔다.
수정 후 `sudo nginx -t && sudo systemctl reload nginx`로 적용한다.

## 다음 배포

로컬에서 테스트와 빌드를 수행하고 `.output/`만 전송한다.
배포 명령은 브랜치와 커밋되지 않은 변경을 검사하며, 해당 환경만 재시작한다.
시작 또는 HTTP 상태 확인이 실패하면 이전 배포본으로 되돌린다.

```sh
# 로컬: 개발 배포
git switch dev
MAJUNGMUL_SSH_KEY=/path/to/key.pem bash deploy/ec2/deploy.sh dev

# 로컬: 검증된 변경을 main에 반영한 후 운영 배포
git switch main
MAJUNGMUL_SSH_KEY=/path/to/key.pem bash deploy/ec2/deploy.sh prod
```

이 스크립트 자체도 운영에 사용할 `main`에 반영되어 있어야 한다.
`main` 반영 및 운영 버전 교체는 이번 환경 분리와 별도로 수행한다.
스크립트는 환경파일·Nginx·systemd 설정을 덮어쓰지 않는다.
그 설정을 변경한 경우 아래 서버 경로에 해당 파일을 설치하고 검증한다.

| 저장소 파일 | 서버 설치 경로 |
| --- | --- |
| `majungmul-prod.service` | `/etc/systemd/system/majungmul-prod.service` |
| `majungmul-dev.service` | `/etc/systemd/system/majungmul-dev.service` |
| `nginx.conf` | `/etc/nginx/conf.d/majungmul.conf` |
| `nginx-dev.conf` | `/etc/nginx/conf.d/majungmul-dev.conf` |

서비스 변경 시 `sudo systemctl daemon-reload` 후 해당 서비스만 재시작한다.
Nginx 변경 시 `sudo nginx -t` 성공 후 `sudo systemctl reload nginx`를 실행한다.
두 앱과 Nginx는 부팅 시 자동 시작한다.

## 상태 확인과 롤백

```sh
sudo systemctl status majungmul-prod majungmul-dev nginx
sudo journalctl -u majungmul-dev -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/majungmul-dev.error.log
readlink -f /srv/majungmul/dev/current
curl --fail http://127.0.0.1:3000/ -o /dev/null
curl --fail http://127.0.0.1:3001/ -o /dev/null
```

수동 롤백은 해당 환경의 `current` 링크를 이전 `releases/<배포 ID>`로 바꾸고
그 환경의 서비스만 재시작한다. 운영과 개발의 링크를 함께 바꾸지 않는다.
최초 분리 전 설정 백업은 `/srv/majungmul/backups/`에 보관한다.
기존 `majungmul.service`, `/srv/majungmul/current`, `/etc/majungmul/env`는
이전 구조 복구를 위해 남겨두었으며, 기존 서비스는 중지·비활성화했다.
저장소의 `majungmul.service` 역시 이전 구조의 참고 파일이다.
