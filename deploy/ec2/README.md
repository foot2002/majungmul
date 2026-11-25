# EC2 배포

- 주소: http://16.208.56.91
- 서버: `ec2-user@ec2-16-208-56-91.ap-northeast-3.compute.amazonaws.com`
- OS / 런타임: Amazon Linux 2023 / Node.js 22 / Nginx
- 실행 구조: Nginx `:80` → Node.js `127.0.0.1:3000`
- 실행 파일: `/srv/majungmul/current/server/index.mjs`
- 배포본: `/srv/majungmul/releases/<배포 ID>` (`current` 심볼릭 링크로 선택)
- 서비스: `majungmul.service`, `nginx.service` (부팅 시 자동 시작)

## 빌드

로컬에서 빌드해 메모리가 작은 EC2에는 실행 결과물만 전송한다.

```sh
bun install --frozen-lockfile
bun run test
bun run build:ec2
```

`build:ec2`는 Nitro의 `node-server` 타깃을 사용한다. 기존 `build` 명령과
Lovable의 배포 설정은 그대로 유지한다. `.output/` 전체가 독립 실행 가능한
배포본이며, 서버에 소스나 `node_modules`를 따로 설치할 필요가 없다.

macOS에서 전송용 압축 파일을 만들 때는 메타데이터 파일이 섞이지 않도록 한다.

```sh
COPYFILE_DISABLE=1 tar --no-xattrs -czf /tmp/majungmul-app.tar.gz -C .output .
```

## 서버 설정

```sh
sudo dnf install -y nginx nodejs22
```

이 디렉터리의 파일을 아래 경로에 설치한다.

- `majungmul.service` → `/etc/systemd/system/majungmul.service`
- `nginx.conf` → `/etc/nginx/conf.d/majungmul.conf`

`.output/` 내용물을 새 `/srv/majungmul/releases/<배포 ID>/`에 올린 뒤,
모든 파일을 서비스 계정에서 읽을 수 있게 설정한다. `current`를 새 배포본으로
전환하고 다음 명령으로 적용한다. 이전 배포 디렉터리는 롤백을 위해 보관한다.

```sh
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl enable majungmul nginx
sudo systemctl restart majungmul
sudo systemctl reload-or-restart nginx
curl --fail --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:3000/
curl --fail --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1/
```

EC2 보안 그룹에서 TCP 80 인바운드가 허용되어야 외부에서 접속할 수 있다.
현재 주소는 HTTP이며, HTTPS는 도메인과 인증서를 연결한 뒤 설정한다.

## 운영 / 롤백

```sh
sudo systemctl status majungmul nginx
sudo journalctl -u majungmul -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/error.log
readlink -f /srv/majungmul/current
ls /srv/majungmul/releases
```

롤백은 `current`를 이전 배포 디렉터리로 다시 연결하고
`sudo systemctl restart majungmul`을 실행한다.
앱 데이터는 기존과 동일하게 사용자의 브라우저 localStorage에 저장된다.
