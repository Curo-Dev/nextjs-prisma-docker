import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import dayjs from 'dayjs';

import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservationId, password, studentId } = body;

    // 필수 필드 검증
    if (!reservationId || !password || !studentId) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 유저 인증
    const user = await prisma.user.findUnique({ where: { studentId } });
    if (!user) {
      return NextResponse.json({ error: '존재하지 않는 학번입니다.' }, { status: 401 });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    // 예약 조회
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { user: true }
    });
    if (!reservation) {
      return NextResponse.json({ error: '예약 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (reservation.status !== 'ACTIVE') {
      return NextResponse.json({ error: '활성 상태가 아닌 예약은 퇴실할 수 없습니다.' }, { status: 400 });
    }
    if (reservation.user_id !== user.id) {
      return NextResponse.json({ error: '본인의 예약만 퇴실할 수 있습니다.' }, { status: 403 });
    }

    // 시간 계산 (모든 비교는 currentTime 사용)
    const now = dayjs(); // 실제 서버 시간 (로그/저장용)
    const timeOffset = parseInt(process.env.DEV_TIME_OFFSET || '0'); // 개발 편의용
    const currentTime = dayjs().add(timeOffset, 'hour'); // 비교/판단용 "현재 시간"

    const reservationDate = dayjs(reservation.refDate);
    const reservationStart = reservationDate.hour(reservation.startedAt).startOf('hour');
    const reservationEnd   = reservationDate.hour(reservation.endedAt).endOf('hour');

    const isFutureReservation  = currentTime.isBefore(reservationStart);
    const isExpiredReservation = currentTime.isAfter(reservationEnd);
    const isCurrentReservation = currentTime.isSameOrAfter(reservationStart) && currentTime.isBefore(reservationEnd);

    // 1) 미래 예약 → 취소
    if (isFutureReservation) {
      const updated = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          checkoutAt: now.toDate(),
          status: 'CANCELLED',
        },
        include: { user: { select: { studentId: true } } }
      });

      return NextResponse.json({
        message: '성공적으로 예약이 취소되었습니다.',
        reservation: {
          id: updated.id,
          seatId: updated.seat_id,
          startedAt: updated.startedAt,
          endedAt: updated.endedAt,   // 원래 값 유지
          checkoutAt: updated.checkoutAt,
          studentId: updated.user.studentId
        }
      });
    }

    // 2) 이미 종료된 예약 → EXPIRED (endedAt은 원래 종료 시간 유지)
    if (isExpiredReservation) {
      const updated = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          checkoutAt: now.toDate(),
          status: 'EXPIRED',
          // endedAt 수정 없음 (이미 끝난 예약)
        },
        include: { user: { select: { studentId: true } } }
      });

      return NextResponse.json({
        message: '성공적으로 퇴실되었습니다.',
        reservation: {
          id: updated.id,
          seatId: updated.seat_id,
          startedAt: updated.startedAt,
          endedAt: updated.endedAt,
          checkoutAt: updated.checkoutAt,
          studentId: updated.user.studentId
        }
      });
    }

    // 3) 현재 진행 중인 예약 → EXPIRED + endedAt을 "현재 시(hour)로 내림"
    if (isCurrentReservation) {
      // 예: 09:20에 퇴실하면 endedAt=9 → 10·11시는 해제
      const checkoutHour = currentTime.hour();
      const clippedEndedAt = Math.max(reservation.startedAt, Math.min(checkoutHour, reservation.endedAt));

      const updated = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          endedAt: clippedEndedAt,
          checkoutAt: now.toDate(),
          status: 'EXPIRED',
        },
        include: { user: { select: { studentId: true } } }
      });

      return NextResponse.json({
        message: '성공적으로 퇴실되었습니다.',
        reservation: {
          id: updated.id,
          seatId: updated.seat_id,
          startedAt: updated.startedAt,
          endedAt: updated.endedAt,    // ex) 9로 저장
          checkoutAt: updated.checkoutAt,
          studentId: updated.user.studentId
        }
      });
    }

    // 이외(이론상 도달 X) 안전망: EXPIRED 처리
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        checkoutAt: now.toDate(),
        status: 'EXPIRED',
      },
      include: { user: { select: { studentId: true } } }
    });

    return NextResponse.json({
      message: '성공적으로 퇴실되었습니다.',
      reservation: {
        id: updated.id,
        seatId: updated.seat_id,
        startedAt: updated.startedAt,
        endedAt: updated.endedAt,
        checkoutAt: updated.checkoutAt,
        studentId: updated.user.studentId
      }
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: '퇴실 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
