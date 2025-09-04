# 개발 환경 설정

## 시간 오프셋 설정 (개발/테스트용)

개발 환경에서 시간대 테스트를 위한 환경 변수 설정

### 환경 변수 설정

`.env.local` 파일에 다음 변수들을 추가하세요:

```bash
# 백엔드 API용 시간 오프셋 (시간 단위)
DEV_TIME_OFFSET=9

# 프론트엔드용 시간 오프셋 (시간 단위)
NEXT_PUBLIC_DEV_TIME_OFFSET=9

# Cron 인증용 (선택사항)
CRON_SECRET=your-dev-secret
```

### 사용 예시

현재 시간이 새벽 0시(00:00)일 때:
- `DEV_TIME_OFFSET=9` 설정 시 → 시스템에서는 9시(09:00)로 인식
- `DEV_TIME_OFFSET=12` 설정 시 → 시스템에서는 12시(12:00)로 인식

### 테스트 시나리오

1. **9시 예약 테스트**: `DEV_TIME_OFFSET=9` 설정
2. **12시 예약 만료 테스트**: `DEV_TIME_OFFSET=12` 설정
3. **연장 가능 시간 테스트**: `DEV_TIME_OFFSET=10` 설정 (10:40분에 11시 예약 연장 가능)

### 주의사항

- **프로덕션 환경에서는 절대 사용하지 마세요**
- 개발 완료 후 환경 변수를 제거하거나 0으로 설정하세요
- 프론트엔드용은 `NEXT_PUBLIC_` 접두사가 필요합니다

### Cron 수동 테스트

개발 환경에서 Cron 작업을 수동으로 테스트:

```bash
# GET 요청으로 수동 실행 (개발 환경에서만)
curl http://localhost:3000/api/cron/expire-reservations
```
