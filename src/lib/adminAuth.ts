import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function authenticateAdmin(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminUsername, adminPassword } = body;

    if (!adminUsername || !adminPassword) {
      return {
        success: false,
        error: '어드민 아이디와 비밀번호를 입력해주세요.',
        status: 400
      };
    }

    // 어드민 계정 조회
    const admin = await prisma.admin.findUnique({
      where: { username: adminUsername }
    });

    if (!admin) {
      return {
        success: false,
        error: '존재하지 않는 어드민 계정입니다.',
        status: 401
      };
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(adminPassword, admin.password);

    if (!isValidPassword) {
      return {
        success: false,
        error: '어드민 비밀번호가 일치하지 않습니다.',
        status: 401
      };
    }

    return {
      success: true,
      admin: {
        id: admin.id,
        username: admin.username
      },
      body // 원본 body도 함께 반환 (다른 필드들 사용을 위해)
    };

  } catch (error) {
    console.error('Admin authentication error:', error);
    return {
      success: false,
      error: '어드민 인증 중 오류가 발생했습니다.',
      status: 500
    };
  }
}
