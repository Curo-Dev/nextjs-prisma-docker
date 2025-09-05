import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Seoul");

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservationId, password, studentId, extendHours } = body;

    // 필수 필드 검증
    if (!reservationId || !password || !studentId || !extendHours) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 연장 시간 검증 (1-3시간)
    if (extendHours < 1 || extendHours > 3) {
      return NextResponse.json(
        { error: '연장 시간은 1시간, 2시간, 또는 3시간만 가능합니다.' },
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

    // 예약 정보 조회 및 소유권 확인
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { user: true }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: '예약 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (reservation.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '활성 상태가 아닌 예약은 연장할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 패스워드 인증으로만 권한 확인 - user_id 검증 제거

    // 연장 횟수 제한 확인 (최대 2회)
    if (reservation.extendedCount >= 2) {
      return NextResponse.json(
        { error: '최대 2회까지만 연장할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 현재 날짜 설정
    const refDate = dayjs.tz().startOf('day').toDate();
    
    // 연장하려는 시간대가 비어있는지 확인
    const newEndedAt = reservation.endedAt + extendHours;
    const extendStartTime = reservation.endedAt + 1; // 연장은 기존 예약 다음 시간부터 시작
    
    console.log('=== 연장 처리 디버깅 ===');
    console.log('- 예약 ID:', reservationId);
    console.log('- 원래 endedAt:', reservation.endedAt);
    console.log('- 연장 시간 (extendHours):', extendHours);
    console.log('- 계산된 newEndedAt:', newEndedAt);
    console.log('- extendStartTime:', extendStartTime);
    
    // 연장 시간대에 다른 ACTIVE 예약이 있는지 확인
    const conflictingReservation = await prisma.reservation.findFirst({
      where: {
        seat_id: reservation.seat_id,
        refDate: refDate,
        status: 'ACTIVE',
        id: { not: reservationId }, // 현재 예약 제외
        OR: [
          {
            AND: [
              { startedAt: { lte: extendStartTime } },
              { endedAt: { gte: extendStartTime } }
            ]
          },
          {
            AND: [
              { startedAt: { lte: newEndedAt } },
              { endedAt: { gte: newEndedAt } }
            ]
          },
          {
            AND: [
              { startedAt: { gte: extendStartTime } },
              { endedAt: { lte: newEndedAt } }
            ]
          }
        ]
      }
    });

    if (conflictingReservation) {
      return NextResponse.json(
        { error: '연장하려는 시간대에 다른 예약이 있습니다.' },
        { status: 409 }
      );
    }

    // 24시를 넘어가는지 확인
    if (newEndedAt > 24) {
      return NextResponse.json(
        { error: '24시를 넘어서 연장할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 예약 연장
    console.log('- 업데이트 데이터:', {
      endedAt: newEndedAt,
      extendedAt: dayjs.tz().toDate(),
      extendedCount: reservation.extendedCount + 1,
    });
    
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        endedAt: newEndedAt,
        extendedAt: dayjs.tz().toDate(),
        extendedCount: reservation.extendedCount + 1,
      },
      include: {
        user: {
          select: {
            studentId: true
          }
        }
      }
    });
    
    console.log('- 업데이트 결과:', {
      id: updatedReservation.id,
      startedAt: updatedReservation.startedAt,
      endedAt: updatedReservation.endedAt,
      extendedAt: updatedReservation.extendedAt,
      extendedCount: updatedReservation.extendedCount
    });
    console.log('========================');

    return NextResponse.json({
      message: `성공적으로 ${extendHours}시간 연장되었습니다.`,
      reservation: {
        id: updatedReservation.id,
        seatId: updatedReservation.seat_id,
        startedAt: updatedReservation.startedAt,
        endedAt: updatedReservation.endedAt,
        extendedAt: updatedReservation.extendedAt,
        extendedCount: updatedReservation.extendedCount,
        studentId: updatedReservation.user.studentId
      }
    });

  } catch (error) {
    console.error('Extend error:', error);
    return NextResponse.json(
      { error: '연장 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
