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
    const { password, studentId } = body;

    // 필수 필드 검증 (reservationId 제거)
    if (!password || !studentId) {
      return NextResponse.json({ error: '학번과 비밀번호를 입력해주세요.' }, { status: 400 });
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

    // 해당 사용자의 활성 예약 찾기 (하루에 하나만 있음)
    const reservation = await prisma.reservation.findFirst({
      where: { 
        user_id: user.id,
        status: 'ACTIVE'
      },
      include: { user: true }
    });
    
    if (!reservation) {
      return NextResponse.json({ error: '퇴실/취소할 수 있는 활성 예약을 찾을 수 없습니다.' }, { status: 404 });
    }

    const now = dayjs.tz(); // 한국 시간 (로그/저장용)
    const timeOffset = parseInt(process.env.DEV_TIME_OFFSET || '0'); // 개발 편의용
    const currentTime = dayjs.tz().add(timeOffset, 'hour'); // 비교/판단용 "현재 시간"

    const checkoutHour = currentTime.hour();

    // 디버깅용 로그 추가
    console.log('=== 퇴실 요청 디버깅 ===');
    console.log('- 요청한 studentId:', studentId);
    console.log('- 찾은 user.id:', user.id);
    console.log('- 찾은 예약 ID:', reservation.id);
    console.log('- 예약의 user_id:', reservation.user_id);
    console.log('- 예약 소유자 학번:', reservation.user.studentId);
    console.log('- 좌석 번호:', reservation.seat_id);
    console.log('- 패스워드 인증 완료 - 본인 예약 확인됨');
    console.log('현재 시간 정보:');
    console.log('- 실제 서버 시간 (now):', now.format('YYYY-MM-DD HH:mm:ss'));
    console.log('- DEV_TIME_OFFSET:', timeOffset);
    console.log('- 계산된 현재 시간 (currentTime):', currentTime.format('YYYY-MM-DD HH:mm:ss'));
    console.log('- checkoutHour:', checkoutHour);
    console.log('- reservation.startedAt:', reservation.startedAt);
    console.log('- reservation.endedAt:', reservation.endedAt);
    console.log('========================');

    // 예약 시간 기준으로 퇴실/취소 판단
    if (checkoutHour >= reservation.startedAt && checkoutHour <= reservation.endedAt) {
      // 케이스 1: 예약 시간 내에 퇴실
      // 연장된 예약의 경우 endedAt을 변경하지 않고 그대로 유지
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          // endedAt은 변경하지 않음 (연장된 시간 유지)
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
          endedAt: updated.endedAt, // 원래 endedAt 유지 (연장된 시간)
          checkoutAt: updated.checkoutAt,
          studentId: updated.user.studentId
        }
      });
    } else if (checkoutHour < reservation.startedAt) {
      // 케이스 2: 예약 시간 전에 취소 (예: 14시-16시 예약을 11시에 취소)
      // → 미리 예약 취소
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          checkoutAt: now.toDate(),
          status: 'CANCELLED',
        },
        include: { user: { select: { studentId: true } } }
      });

      return NextResponse.json({
        message: '예약이 성공적으로 취소되었습니다.',
        reservation: {
          id: updated.id,
          seatId: updated.seat_id,
          startedAt: updated.startedAt,
          endedAt: updated.endedAt,
          checkoutAt: updated.checkoutAt,
          studentId: updated.user.studentId
        }
      });
    } else {
      // 케이스 3: 예약 시간이 지난 후 처리 (예: 9시-11시 예약을 14시에 처리)
      // → 늦은 취소/정리
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          checkoutAt: now.toDate(),
          status: 'EXPIRED',
        },
        include: { user: { select: { studentId: true } } }
      });

      return NextResponse.json({
        message: '예약 시간이 지나 자동으로 만료 처리되었습니다.',
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

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: '퇴실 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
