import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Seoul");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seatId, startedAt, endedAt, password, studentId } = body;

    // 필수 필드 검증
    if (!seatId || !startedAt || !endedAt || !password || !studentId) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 시간 범위 검증 (최대 4시간)
    const reservationHours = endedAt - startedAt + 1;
    if (reservationHours > 4 || reservationHours < 1) {
      return NextResponse.json(
        { error: '예약 시간은 1시간 이상 4시간 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // 유저 인증
    const user = await prisma.user.findUnique({
      where: { studentId }
    });

    if (!user) {
      return NextResponse.json(
        { error: '존재하지 않는 학번입니다.' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 현재 날짜를 refDate로 설정 (오늘 날짜)
    const refDate = dayjs.tz().startOf('day').toDate();

    // 해당 유저가 오늘 이미 예약이 있는지 확인 (하루 1회 제한)
    // CANCELLED 상태를 제외한 모든 예약 포함
    const existingUserReservation = await prisma.reservation.findFirst({
      where: {
        user_id: user.id,
        refDate: refDate,
        status: { not: 'CANCELLED' }
      }
    });

    if (existingUserReservation) {
      return NextResponse.json(
        { error: '하루에 한 번만 예약할 수 있습니다.' },
        { status: 409 }
      );
    }

    // 같은 날짜, 같은 좌석의 모든 관련 예약 조회 (ACTIVE + 퇴실한 EXPIRED, CANCELLED 제외)
    const existingReservations = await prisma.reservation.findMany({
      where: {
        seat_id: parseInt(seatId),
        refDate: refDate,
        OR: [
          { status: 'ACTIVE' },
          { 
            status: 'EXPIRED',
            checkoutAt: { not: null }
          }
        ]
      },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        status: true,
        checkoutAt: true
      }
    });

    // 시간 충돌 검사 (퇴실한 예약은 실제 사용 시간만 검사)
    for (const reservation of existingReservations) {
      let actualEndedAt = reservation.endedAt;
      
      // 퇴실한 예약의 경우 실제 사용 시간만 검사
      if (reservation.checkoutAt && reservation.status === 'EXPIRED') {
        const checkoutTime = dayjs(reservation.checkoutAt).add(9, 'hour');
        const timeOffset = parseInt(process.env.DEV_TIME_OFFSET || '0');
        const checkoutHour = checkoutTime.hour() + timeOffset;
        actualEndedAt = checkoutHour;
      }
      
      // 시간 겹침 검사
      const hasConflict = (
        (startedAt >= reservation.startedAt && startedAt <= actualEndedAt) ||
        (endedAt >= reservation.startedAt && endedAt <= actualEndedAt) ||
        (startedAt <= reservation.startedAt && endedAt >= actualEndedAt)
      );
      
      if (hasConflict) {
        return NextResponse.json(
          { error: '해당 시간대에 이미 예약이 있습니다.' },
          { status: 409 }
        );
      }
    }

    // 예약 생성
    const reservation = await prisma.reservation.create({
      data: {
        user_id: user.id,
        seat_id: parseInt(seatId),
        startedAt,
        endedAt,
        refDate
      },
      include: {
        user: {
          select: {
            studentId: true
          }
        }
      }
    });

    return NextResponse.json({
      message: '예약이 성공적으로 생성되었습니다.',
      reservation: {
        id: reservation.id,
        seatId: reservation.seat_id,
        startedAt: reservation.startedAt,
        endedAt: reservation.endedAt,
        refDate: reservation.refDate,
        studentId: reservation.user.studentId
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Reservation creation error:', error);
    return NextResponse.json(
      { error: '예약 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET 요청 - 현재일 기준 모든 좌석 예약 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seatId = searchParams.get('seatId');
    
    // 현재 날짜를 refDate로 설정 (오늘 날짜)
    const refDate = dayjs.tz().startOf('day').toDate();

    if (seatId) {
      // 특정 좌석의 예약 시간대 조회 (ACTIVE 상태 + 당일 퇴실한 EXPIRED 예약)
      const reservations = await prisma.reservation.findMany({
        where: {
          seat_id: parseInt(seatId),
          refDate: refDate,
          OR: [
            { status: 'ACTIVE' },
            { 
              status: 'EXPIRED',
              checkoutAt: { not: null } // 퇴실한 예약만 포함
            }
          ]
        },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          extendedAt: true,
          extendedCount: true,
          checkoutAt: true,
          status: true,
          refDate: true,
          user: {
            select: {
              studentId: true
            }
          }
        },
        orderBy: {
          startedAt: 'asc'
        }
      });

      // 예약된 시간 슬롯들을 배열로 변환 (9시부터 24시까지, 0-15 인덱스)
      const reservedTimeSlots: number[] = [];
      reservations.forEach(reservation => {
        let actualEndedAt = reservation.endedAt;
        
        // 퇴실한 예약의 경우 실제 사용 시간만 계산
        if (reservation.checkoutAt && reservation.status === 'EXPIRED') {
          const checkoutTime = dayjs(reservation.checkoutAt);
          const timeOffset = parseInt(process.env.DEV_TIME_OFFSET || '0');
          const checkoutTimeWithOffset = checkoutTime.add(timeOffset, 'hour'); // 날짜와 시간을 함께 고려

          // 예약 시간을 dayjs 객체로 변환 (refDate 기준)
          const reservationDate = dayjs(reservation.refDate);
          const reservationStart = reservationDate.hour(reservation.startedAt).startOf('hour');
          const reservationEnd = reservationDate.hour(reservation.endedAt).endOf('hour');

          // 퇴실 시간이 예약 시간 내에 있는지 확인
          if (checkoutTimeWithOffset.isAfter(reservationStart) && checkoutTimeWithOffset.isBefore(reservationEnd)) {
            // 퇴실 시간이 예약 시간 내에 있으면 실제 퇴실 시간 사용
            // 예: 9시 20분 퇴실 → 9시대 사용, endedAt = 9
            // 예: 10시 5분 퇴실 → 10시대 사용, endedAt = 10
            actualEndedAt = checkoutTimeWithOffset.hour();
          }
          // 그렇지 않으면 원래 endedAt 유지
        }
        
        for (let i = reservation.startedAt - 9; i <= actualEndedAt - 9; i++) {
          if (i >= 0 && i < 16) {
            reservedTimeSlots.push(i);
          }
        }
      });

      return NextResponse.json({
        seatId: parseInt(seatId),
        refDate,
        reservations,
        reservedTimeSlots: [...new Set(reservedTimeSlots)].sort((a, b) => a - b)
      });

    } else {
      // 모든 좌석의 예약 리스트 조회 (ACTIVE 상태만)
      const reservations = await prisma.reservation.findMany({
        where: {
          refDate: refDate,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          seat_id: true,
          startedAt: true,
          endedAt: true,
          extendedAt: true,
          extendedCount: true,
          checkoutAt: true,
          createdAt: true,
          user: {
            select: {
              studentId: true
            }
          }
        },
        orderBy: [
          { seat_id: 'asc' },
          { startedAt: 'asc' }
        ]
      });

      // 좌석별로 그룹화
      const reservationsBySeat = reservations.reduce((acc, reservation) => {
        const seatId = reservation.seat_id;
        if (!acc[seatId]) {
          acc[seatId] = [];
        }
        acc[seatId].push(reservation);
        return acc;
      }, {} as Record<number, typeof reservations>);

      return NextResponse.json({
        refDate,
        totalReservations: reservations.length,
        reservationsBySeat,
        allReservations: reservations
      });
    }

  } catch (error) {
    console.error('Reservations fetch error:', error);
    return NextResponse.json(
      { error: '예약 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
