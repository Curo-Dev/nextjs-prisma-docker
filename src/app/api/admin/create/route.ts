import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 필수 필드 검증
    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 아이디 길이 검증
    if (username.length < 3) {
      return NextResponse.json(
        { error: '아이디는 3자 이상이어야 합니다.' },
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

    // 기존 어드민 아이디 중복 확인
    const existingAdmin = await prisma.admin.findUnique({
      where: { username }
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: '이미 존재하는 아이디입니다.' },
        { status: 409 }
      );
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 어드민 생성
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      message: '어드민 계정이 생성되었습니다.',
      admin
    });

  } catch (error) {
    console.error('Admin creation error:', error);
    return NextResponse.json(
      { error: '어드민 계정 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
