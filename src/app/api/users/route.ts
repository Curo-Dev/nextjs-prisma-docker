import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, password } = body;

    // 필수 필드 검증
    if (!studentId || !password) {
      return NextResponse.json(
        { error: '학번과 비밀번호를 모두 입력해주세요.' },
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
        { error: '비밀번호는 최소 4자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 중복 학번 확인
    const existingUser = await prisma.user.findUnique({
      where: { studentId }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 등록된 학번입니다.' },
        { status: 409 }
      );
    }

    // 비밀번호 해시화
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 유저 생성
    const user = await prisma.user.create({
      data: {
        studentId,
        password: hashedPassword,
      },
      select: {
        id: true,
        studentId: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      message: '유저가 성공적으로 생성되었습니다.',
      user: {
        id: user.id,
        studentId: user.studentId,
        createdAt: user.createdAt,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json(
      { error: '유저 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET 요청으로 모든 유저 조회 (개발용)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        studentId: true,
        createdAt: true,
        updatedAt: true,
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
      users,
      total: users.length
    });

  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { error: '유저 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
