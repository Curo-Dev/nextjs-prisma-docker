import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Seoul");

export async function POST(request: NextRequest) {
  try {
    // Vercel Cron 인증 헤더 확인
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = dayjs.tz();
    const timeOffset = parseInt(process.env.DEV_TIME_OFFSET || '0');
    const currentHour = now.hour() + timeOffset; // UTC+9 (한국시간) + 개발용 오프셋
    const today = now.startOf('day').toDate();

    console.log(`[Cron] 예약 만료 처리 시작 - 현재 시간: ${currentHour}시`);

    // 현재 시간 이전에 끝나야 할 ACTIVE 상태의 예약들을 찾음
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        refDate: today,
        status: 'ACTIVE',
        endedAt: {
          lt: currentHour
        },
        // 이미 퇴실하지 않은 예약들만
        checkoutAt: null
      },
      include: {
        user: {
          select: {
            studentId: true
          }
        }
      }
    });

    console.log(`[Cron] 만료 대상 예약: ${expiredReservations.length}개`);

    if (expiredReservations.length === 0) {
      return NextResponse.json({
        message: '만료할 예약이 없습니다.',
        expiredCount: 0,
        currentHour
      });
    }

    // 예약들을 EXPIRED 상태로 변경
    const expiredIds = expiredReservations.map(r => r.id);
    
    const updateResult = await prisma.reservation.updateMany({
      where: {
        id: {
          in: expiredIds
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    // 로그 기록
    const expiredDetails = expiredReservations.map(r => ({
      id: r.id,
      seatId: r.seat_id,
      studentId: r.user.studentId,
      timeRange: `${r.startedAt}:00-${r.endedAt}:00`,
      extendedCount: r.extendedCount
    }));

    console.log(`[Cron] 만료 처리 완료:`, expiredDetails);

    return NextResponse.json({
      message: `${updateResult.count}개의 예약이 만료 처리되었습니다.`,
      expiredCount: updateResult.count,
      currentHour,
      expiredReservations: expiredDetails
    });

  } catch (error) {
    console.error('[Cron] 예약 만료 처리 오류:', error);
    return NextResponse.json(
      { 
        error: '예약 만료 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET 요청으로 수동 실행 가능 (개발/테스트용)
export async function GET(request: NextRequest) {
  // 개발 환경에서만 허용
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }
  
  return POST(request);
}
