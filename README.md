# Next.js Prisma Docker Project

Next.js, Prisma, MariaDB를 도커로 구성한 프로젝트입니다.

## 기술 스택

- **Frontend**: Next.js 15.3.5
- **Database**: MariaDB 11.6.1-rc
- **ORM**: Prisma
- **Reverse Proxy**: Nginx
- **Container**: Docker & Docker Compose

## 프로젝트 구조

```
nextjs-prisma-docker/
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # React 컴포넌트
│   ├── contexts/      # React Context
│   └── lib/          # 유틸리티 함수들
├── prisma/           # Prisma 스키마 및 마이그레이션
├── Dockerfile        # Next.js 앱 도커 설정
├── docker-compose.yml # 전체 서비스 구성
├── nginx.conf        # Nginx 프록시 설정
└── .dockerignore     # 도커 빌드 제외 파일
```

## 도커 실행 방법

### 1. 전체 서비스 실행
```bash
# 모든 서비스 빌드 및 실행
docker-compose up --build

# 백그라운드 실행
docker-compose up -d --build
```

### 2. 개별 서비스 실행
```bash
# 데이터베이스만 실행
docker-compose up db

# Next.js 앱만 실행
docker-compose up app

# Nginx만 실행
docker-compose up nginx
```

### 3. 서비스 중지
```bash
# 모든 서비스 중지
docker-compose down

# 볼륨까지 삭제
docker-compose down -v
```

## 접속 정보

- **웹 애플리케이션**: http://localhost
- **데이터베이스**: localhost:3306
  - Host: localhost
  - Port: 3306
  - Database: db
  - Username: root
  - Password: root

## 데이터베이스 마이그레이션

프로젝트를 처음 실행할 때 데이터베이스 스키마를 생성해야 합니다:

```bash
# 컨테이너 내부에서 Prisma 마이그레이션 실행
docker-compose exec app pnpm prisma migrate dev

# 또는 컨테이너 외부에서 실행
docker-compose exec app pnpm prisma db push
```

## 개발 환경

로컬 개발을 위해서는 별도의 환경 변수 설정이 필요합니다:

```bash
# .env 파일 생성
DATABASE_URL="mysql://root:root@localhost:3306/db"
```

## 서비스 구성

### 1. MariaDB (포트: 3306)
- 데이터베이스 서버
- 영구 데이터 저장을 위한 볼륨 마운트

### 2. Next.js App (내부 포트: 3000)
- 웹 애플리케이션 서버
- Prisma를 통한 데이터베이스 연결

### 3. Nginx (포트: 80)
- 리버스 프록시 서버
- localhost:80 → Next.js 앱으로 요청 전달
- Gzip 압축 및 헬스체크 제공

## 문제 해결

### 데이터베이스 연결 오류
```bash
# 데이터베이스 컨테이너 상태 확인
docker-compose ps db

# 데이터베이스 로그 확인
docker-compose logs db
```

### Next.js 앱 오류
```bash
# 앱 컨테이너 로그 확인
docker-compose logs app

# 컨테이너 재시작
docker-compose restart app
```

### Nginx 오류
```bash
# Nginx 설정 테스트
docker-compose exec nginx nginx -t

# Nginx 로그 확인
docker-compose logs nginx
```
