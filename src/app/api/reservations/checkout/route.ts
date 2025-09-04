import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import dayjs from 'dayjs';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservationId, password, studentId } = body;

    // 필수 필드 검증
    if (!reservationId || !password || !studentId) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
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
        { error: '활성 상태가 아닌 예약은 퇴실할 수 없습니다.' },
        { status: 400 }
      );
    }

    if (reservation.user_id !== user.id) {
      return NextResponse.json(
        { error: '본인의 예약만 퇴실할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 현재 시간을 기준으로 endedAt 계산 (시간 단위로 올림)
    const now = dayjs();
    const timeOffset = parseInt(process.env.DEV_TIME_OFFSET || '0');
    const currentHour = now.hour() + timeOffset; // UTC+9 + 개발용 오프셋
    
    console.log('Current hour:', currentHour, 'Reservation startedAt:', reservation.startedAt, 'endedAt:', reservation.endedAt);

    // 미래 예약을 미리 퇴실하는지 확인
    const isFutureReservation = currentHour < reservation.startedAt;
    
    if (isFutureReservation) {
      // 미래 예약을 미리 퇴실하는 경우: CANCELLED로 변경하여 다른 사람이 예약할 수 있도록 함
      const updatedReservation = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          checkoutAt: now.toDate(),
          status: 'CANCELLED',
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
        message: '성공적으로 예약이 취소되었습니다.',
        reservation: {
          id: updatedReservation.id,
          seatId: updatedReservation.seat_id,
          startedAt: updatedReservation.startedAt,
          endedAt: updatedReservation.endedAt,
          checkoutAt: updatedReservation.checkoutAt,
          studentId: updatedReservation.user.studentId
        }
      });
    } else {
      // 현재 시간대나 과거 예약을 퇴실하는 경우: EXPIRED로 변경하고 실제 사용 시간만큼만 차지
      const checkoutEndedAt = currentHour;
      const updatedReservation = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          endedAt: checkoutEndedAt,
          checkoutAt: now.toDate(),
          status: 'EXPIRED',
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
        message: '성공적으로 퇴실되었습니다.',
        reservation: {
          id: updatedReservation.id,
          seatId: updatedReservation.seat_id,
          startedAt: updatedReservation.startedAt,
          endedAt: updatedReservation.endedAt,
          checkoutAt: updatedReservation.checkoutAt,
          studentId: updatedReservation.user.studentId
        }
      });
    }

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: '퇴실 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
