# Next.js Prisma Docker Project

Next.js, Prisma, MariaDB를 도커로 구성한 풀스택 인증 시스템 프로젝트입니다.

## 🚀 주요 기능

- **사용자 인증 시스템**: JWT 기반 로그인/회원가입
- **보안**: bcrypt를 통한 비밀번호 해싱
- **세션 관리**: 세션스토리지 기반 토큰 관리
- **보호된 라우트**: 인증이 필요한 페이지 보호
- **반응형 UI**: Tailwind CSS를 활용한 모던한 디자인

## 🛠 기술 스택

- **Frontend**: Next.js 15.3.5 (App Router)
- **Database**: MariaDB 11.6.1-rc
- **ORM**: Prisma 6.11.1
- **Authentication**: JWT + bcrypt
- **Styling**: Tailwind CSS 4
- **Reverse Proxy**: Nginx
- **Container**: Docker & Docker Compose
- **Package Manager**: pnpm

## 📁 프로젝트 구조

```
nextjs-prisma-docker/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 라우트
│   │   │   └── auth/         # 인증 API (로그인/회원가입)
│   │   ├── login/            # 로그인 페이지
│   │   ├── register/         # 회원가입 페이지
│   │   └── page.tsx          # 메인 대시보드
│   ├── components/           # React 컴포넌트
│   │   └── ProtectedRoute.tsx # 보호된 라우트 컴포넌트
│   ├── contexts/             # React Context
│   │   └── AuthContext.tsx   # 인증 상태 관리
│   └── lib/                  # 유틸리티 함수들
│       ├── jwt.ts           # JWT 토큰 관리
│       └── prisma.ts        # Prisma 클라이언트
├── prisma/                   # Prisma 스키마 및 마이그레이션
│   ├── schema.prisma        # 데이터베이스 스키마
│   └── migrations/          # 마이그레이션 파일들
├── Dockerfile               # Next.js 앱 도커 설정
├── docker-compose.yml       # 전체 서비스 구성
├── docker-entrypoint.sh     # 도커 시작 스크립트
├── nginx.conf              # Nginx 프록시 설정
└── .dockerignore           # 도커 빌드 제외 파일
```

## �� 도커 실행 방법

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

## 🌐 접속 정보

- **웹 애플리케이션**: http://localhost
- **데이터베이스**: localhost:3306
  - Host: localhost
  - Port: 3306
  - Database: db
  - Username: root
  - Password: root

## 🔐 인증 시스템

### 사용자 모델
```prisma
model User {
  id       Int @id @default(autoincrement())
  email    String @unique
  password String
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt
}
```

### API 엔드포인트
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인

### 보안 기능
- 비밀번호 bcrypt 해싱
- JWT 토큰 기반 인증
- 세션스토리지 토큰 저장
- 보호된 라우트 자동 리다이렉트

## 📊 데이터베이스 마이그레이션

프로젝트를 처음 실행할 때 데이터베이스 스키마가 자동으로 생성됩니다:

```bash
# 도커 컨테이너가 시작될 때 자동으로 실행됨
# docker-entrypoint.sh에서 다음 명령어 실행:
# pnpm db:deploy (prisma migrate deploy && prisma generate)
```

수동으로 마이그레이션을 실행하려면:
```bash
# 컨테이너 내부에서 Prisma 마이그레이션 실행
docker-compose exec app pnpm prisma migrate dev

# 또는 컨테이너 외부에서 실행
docker-compose exec app pnpm prisma db push
```

## 🛠 개발 환경

로컬 개발을 위해서는 별도의 환경 변수 설정이 필요합니다:

```bash
# .env 파일 생성
DATABASE_URL="mysql://root:root@localhost:3306/db"
JWT_SECRET="your-secret-key-here"
```

## 🏗 서비스 구성

### 1. MariaDB (포트: 3306)
- 데이터베이스 서버
- 영구 데이터 저장을 위한 볼륨 마운트
- 자동 스키마 마이그레이션

### 2. Next.js App (내부 포트: 3000)
- 웹 애플리케이션 서버
- Prisma를 통한 데이터베이스 연결
- JWT 인증 API 제공
- 보호된 라우트 관리

### 3. Nginx (포트: 80)
- 리버스 프록시 서버
- localhost:80 → Next.js 앱으로 요청 전달
- Gzip 압축 및 헬스체크 제공

## 🔧 문제 해결

### 데이터베이스 연결 오류
```bash
# 데이터베이스 컨테이너 상태 확인
docker-compose ps db

# 데이터베이스 로그 확인
docker-compose logs db

# 데이터베이스 재시작
docker-compose restart db
```

### Next.js 앱 오류
```bash
# 앱 컨테이너 로그 확인
docker-compose logs app

# 컨테이너 재시작
docker-compose restart app

# 빌드 캐시 삭제 후 재빌드
docker-compose build --no-cache app
```

### 인증 관련 문제
```bash
# 브라우저 개발자 도구에서 세션스토리지 확인
# JWT 토큰이 올바르게 저장되어 있는지 확인

# API 응답 확인
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Nginx 오류
```bash
# Nginx 설정 테스트
docker-compose exec nginx nginx -t

# Nginx 로그 확인
docker-compose logs nginx

# Nginx 재시작
docker-compose restart nginx
```

## 📝 사용법

1. **프로젝트 시작**
   ```bash
   docker-compose up --build
   ```

2. **회원가입**
   - http://localhost 접속
   - "회원가입" 버튼 클릭
   - 이메일과 비밀번호 입력

3. **로그인**
   - 이메일과 비밀번호로 로그인
   - JWT 토큰이 세션스토리지에 저장됨

4. **대시보드**
   - 로그인 후 사용자 정보 확인
   - 로그아웃 기능 사용

## 🔄 최근 업데이트

- ✅ Docker entrypoint 스크립트 수정 (Node.js 모듈 오류 해결)
- ✅ JWT 기반 인증 시스템 구현
- ✅ 보호된 라우트 컴포넌트 추가
- ✅ 사용자 대시보드 페이지 구현
- ✅ Tailwind CSS 4 업그레이드
- ✅ Next.js 15.3.5 업그레이드
- ✅ Prisma 6.11.1 업그레이드
