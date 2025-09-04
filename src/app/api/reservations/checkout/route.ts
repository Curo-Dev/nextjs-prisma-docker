import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import dayjs from 'dayjs';

import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);

import timezone from "dayjs/plugin/timezone";
dayjs.extend(timezone);

import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Seoul");

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

    const now = dayjs(); // 실제 서버 시간 (로그/저장용)
    const timeOffset = parseInt(process.env.DEV_TIME_OFFSET || '0'); // 개발 편의용
    const currentTime = dayjs().add(timeOffset, 'hour'); // 비교/판단용 "현재 시간"

    const checkoutHour = currentTime.hour();

    // 새로운 로직: 예약 시작 시간 기준으로 판단

    // 12 >= 12 && 12 <= 15

    console.log(checkoutHour, reservation.startedAt, reservation.endedAt);
    if (checkoutHour >= reservation.startedAt && checkoutHour <= reservation.endedAt) {
      // 케이스 1: 예약 시간 내에 퇴실 (예: 9시-11시 예약, 9시 20분 퇴실)
      // → endedAt을 현재 시간(9)으로 변경, 나머지 시간(10시, 11시) 해제
      const updated = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          endedAt: checkoutHour,
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
          endedAt: updated.endedAt,    // 현재 시간으로 변경됨
          checkoutAt: updated.checkoutAt,
          studentId: updated.user.studentId
        }
      });
    } else {
      // 케이스 2: 예약 시간 외에 퇴실 (예: 12시-14시 예약, 9시 20분 퇴실)
      // → 전체 예약 취소 처리
      const updated = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          checkoutAt: now.toDate(),
          status: 'CANCELLED',
        },
        include: { user: { select: { studentId: true } } }
      });

      return NextResponse.json({
        message: '예약 시간과 다른 시간에 퇴실하여 예약이 취소되었습니다.',
        reservation: {
          id: updated.id,
          seatId: updated.seat_id,
          startedAt: updated.startedAt,
          endedAt: updated.endedAt,    // 원래 종료 시간 유지
          checkoutAt: updated.checkoutAt,
          studentId: updated.user.studentId
        }
      });
    }

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: '퇴실 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
