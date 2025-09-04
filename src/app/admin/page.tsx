'use client';

import { useState } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  studentId: string;
  createdAt: string;
  _count: {
    reservations: number;
  };
}

export default function AdminPage() {
  // 어드민 로그인 상태
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({
    username: '',
    password: ''
  });
  
  // 로그인 폼 상태
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // 학번 관리 상태
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // 학번 추가 폼 상태
  const [addUserForm, setAddUserForm] = useState({
    studentId: '',
    password: ''
  });
  const [addUserError, setAddUserError] = useState('');
  const [addUserLoading, setAddUserLoading] = useState(false);
  
  // 삭제 로딩 상태
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // 어드민 로그인
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      // 실제로는 어드민 로그인 API가 없으므로, 학번 리스트 조회로 인증 확인
      const response = await fetch(`/api/admin/users?adminUsername=${encodeURIComponent(loginForm.username)}&adminPassword=${encodeURIComponent(loginForm.password)}`);
      
      if (!response.ok) {
        const data = await response.json();
        setLoginError(data.error || '로그인에 실패했습니다.');
        return;
      }

      // 로그인 성공
      setAdminCredentials({
        username: loginForm.username,
        password: loginForm.password
      });
      setIsAdminLoggedIn(true);
      
      // 바로 사용자 목록 로드
      const data = await response.json();
      setUsers(data.users || []);
      
    } catch {
      setLoginError('서버 오류가 발생했습니다.');
    } finally {
      setLoginLoading(false);
    }
  };

  // 로그아웃
  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminCredentials({ username: '', password: '' });
    setLoginForm({ username: '', password: '' });
    setUsers([]);
  };

  // 학번 리스트 새로고침
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch(`/api/admin/users?adminUsername=${encodeURIComponent(adminCredentials.username)}&adminPassword=${encodeURIComponent(adminCredentials.password)}`);
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch(err) {
      console.error('사용자 목록 조회 실패:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // 학번 추가
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    setAddUserLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminUsername: adminCredentials.username,
          adminPassword: adminCredentials.password,
          studentId: addUserForm.studentId,
          password: addUserForm.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAddUserError(data.error || '학번 추가에 실패했습니다.');
        return;
      }

      // 성공시 폼 초기화 및 목록 새로고침
      setAddUserForm({ studentId: '', password: '' });
      alert('학번이 추가되었습니다.');
      await fetchUsers();
      
    } catch {
      setAddUserError('서버 오류가 발생했습니다.');
    } finally {
      setAddUserLoading(false);
    }
  };

  // 학번 삭제
  const handleDeleteUser = async (userId: string, studentId: string) => {
    if (!confirm(`학번 ${studentId}을(를) 정말 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingUserId(userId);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminUsername: adminCredentials.username,
          adminPassword: adminCredentials.password,
          userId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || '학번 삭제에 실패했습니다.');
        return;
      }

      alert('학번이 삭제되었습니다.');
      await fetchUsers();
      
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setDeletingUserId(null);
    }
  };

  // 로그인 화면
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              어드민 로그인
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              관리자 권한이 필요합니다
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleAdminLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">
                  아이디
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="아이디"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="비밀번호"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>

            {loginError && (
              <div className="text-red-600 text-sm text-center">
                {loginError}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loginLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? '로그인 중...' : '로그인'}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                메인 페이지로 돌아가기
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 관리자 대시보드
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
                <p className="text-sm text-gray-600">어드민: {adminCredentials.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 학번 추가 섹션 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">학번 추가</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                    학번
                  </label>
                  <input
                    id="studentId"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="숫자만 입력"
                    value={addUserForm.studentId}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, studentId: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="userPassword" className="block text-sm font-medium text-gray-700">
                    비밀번호
                  </label>
                  <input
                    id="userPassword"
                    type="password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="4자 이상"
                    value={addUserForm.password}
                    onChange={(e) => setAddUserForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                {addUserError && (
                  <div className="text-red-600 text-sm">
                    {addUserError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={addUserLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addUserLoading ? '추가 중...' : '학번 추가'}
                </button>
              </form>
            </div>
          </div>

          {/* 학번 목록 섹션 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  학번 목록 ({users.length}개)
                </h2>
                <button
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                >
                  {usersLoading ? '로딩...' : '새로고침'}
                </button>
              </div>
            </div>
            <div className="p-6">
              {users.length === 0 ? (
                <p className="text-gray-500 text-center py-4">등록된 학번이 없습니다.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {users.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                      <div>
                        <div className="font-medium text-gray-900">{user.studentId}</div>
                        {/* <div className="text-sm text-gray-500">
                          예약 {user._count.reservations}회 | {new Date(user.createdAt).toLocaleDateString()}
                        </div> */}
                      </div>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.studentId)}
                        disabled={deletingUserId === user.id}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingUserId === user.id ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
