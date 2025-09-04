import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { authenticateAdmin } from '@/lib/adminAuth';

// 학번 추가 (POST)
export async function POST(request: NextRequest) {
  try {
    // 어드민 인증
    const authResult = await authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { studentId, password } = authResult.body;

    // 필수 필드 검증
    if (!studentId || !password) {
      return NextResponse.json(
        { error: '학번과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 학번 형식 검증 (숫자만 허용)
    if (!/^\d+$/.test(studentId)) {
      return NextResponse.json(
        { error: '학번은 숫자만 입력 가능합니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 길이 검증
    if (password.length < 4) {
      return NextResponse.json(
        { error: '비밀번호는 4자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 기존 학번 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { studentId }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 존재하는 학번입니다.' },
        { status: 409 }
      );
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 유저 생성
    const user = await prisma.user.create({
      data: {
        studentId,
        password: hashedPassword,
      },
      select: {
        id: true,
        studentId: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      message: '학번이 추가되었습니다.',
      user
    });

  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json(
      { error: '학번 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 학번 리스트 조회 (GET)
export async function GET(request: NextRequest) {
  try {
    // URL에서 어드민 인증 정보 확인 (Query parameters)
    const { searchParams } = new URL(request.url);
    const adminUsername = searchParams.get('adminUsername');
    const adminPassword = searchParams.get('adminPassword');

    if (!adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: '어드민 인증 정보가 필요합니다.' },
        { status: 401 }
      );
    }

    // 어드민 계정 조회 및 인증
    const admin = await prisma.admin.findUnique({
      where: { username: adminUsername }
    });

    if (!admin) {
      return NextResponse.json(
        { error: '존재하지 않는 어드민 계정입니다.' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(adminPassword, admin.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '어드민 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 모든 유저 조회 (예약 정보 포함)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        studentId: true,
        createdAt: true,
        _count: {
          select: {
            reservations: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      message: '학번 리스트를 조회했습니다.',
      users,
      totalUsers: users.length
    });

  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { error: '학번 리스트 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 학번 삭제 (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    // 어드민 인증
    const authResult = await authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { userId } = authResult.body;

    if (!userId) {
      return NextResponse.json(
        { error: '삭제할 유저 ID를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 유저 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        reservations: {
          where: {
            status: 'ACTIVE'
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: '존재하지 않는 유저입니다.' },
        { status: 404 }
      );
    }

    // 활성 예약이 있는 경우 삭제 방지
    if (user.reservations.length > 0) {
      return NextResponse.json(
        { error: '활성 예약이 있는 유저는 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 유저 삭제 (예약 기록은 CASCADE로 함께 삭제됨)
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({
      message: `학번 ${user.studentId}이(가) 삭제되었습니다.`
    });

  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json(
      { error: '학번 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
