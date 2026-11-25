# RDS 연동

- Engine: PostgreSQL
- Endpoint: `majungmuldb.cav6wiwhibh6.ap-northeast-3.rds.amazonaws.com:5432`
- Schema: `schema.sql`

## 1) 스키마 적용 (EC2에서)

```sh
sudo dnf install -y postgresql15
export DATABASE_URL='postgresql://USER:PASSWORD@majungmuldb.cav6wiwhibh6.ap-northeast-3.rds.amazonaws.com:5432/DBNAME?sslmode=require'
psql "$DATABASE_URL" -f schema.sql
```

## 2) 앱 환경변수

`/etc/majungmul/env` 에 동일 `DATABASE_URL` 을 넣고 `majungmul.service` 를 재시작한다.

## 3) 확인

```sh
curl -s http://127.0.0.1:3000/api/health/db
# {"ok":true,"at":"..."}
```

비밀번호·계정 정보는 저장소에 넣지 않는다.
