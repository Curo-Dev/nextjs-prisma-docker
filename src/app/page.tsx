'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/Tabs"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/Dialog";

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from "react";
import dayjs from 'dayjs';
import Link from 'next/link';

export default function Home() {
  const [modal, setModal] = useState({
    seatId: -1,
    isOpen: false,
    type: 'reserve' as 'reserve' | 'checkout' | 'extend',
    reservationId: '',
  })
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [seatReservations, setSeatReservations] = useState<{
    id: string;
    startedAt: number;
    endedAt: number;
    extendedAt?: string;
    extendedCount?: number;
    checkoutAt?: string;
    user: { studentId: string };
  }[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<number[]>([]);
  const [reservationForm, setReservationForm] = useState({
    studentId: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservedTimeSlots, setReservedTimeSlots] = useState<number[]>([]);
  const [reservationDetails, setReservationDetails] = useState<{[key: number]: string}>({});
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [allSeatsStatus, setAllSeatsStatus] = useState<{[key: number]: 'available' | 'occupied' | 'fixed'}>({});
  const [seatRemainingTime, setSeatRemainingTime] = useState<{[key: number]: number}>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');
  const { loading } = useAuth();

  // 번역 데이터
  const translations = {
    ko: {
      // 메인 제목
      systemTitle: 'SCLab 자리 예약 시스템',
      selectSeat: '좌석을 선택해주세요.',
      
      // 탭
      room901: '901호',
      room907: '907호',
      
      // 좌석 상태
      fixed: '고정석',
      inUse: '사용 중',
      checkoutComplete: '퇴실 완료',
      
      // 시간 관련
      hours: '시간',
      minutes: '분',
      
      // 설명 텍스트
      reservationInfo: '자리 예약 시 4시간 동안 사용 가능합니다.',
      reservationExample: '(ex : 09:00 선택 시, 12:59 자동 퇴실)',
      extensionInfo: '다음 예약자가 없는 경우 3시간 연장 사용이 가능합니다.',
      
      // 버튼
      reserve: '예약하기',
      checkoutCancel: '퇴실/취소하기',
      extend: '연장하기',
      admin: '관리자',
      
      // 모달 제목
      makeReservation: '좌석 예약하기',
      checkoutReservation: '퇴실/취소하기',
      extendReservation: '연장하기',
      cancel: '취소',
      processing: '처리 중...',
      extending: '연장 중...',
      reserving: '예약 중...',
      
      // 모달 설명
      currentSeat: '현재 선택한 좌석은',
      seatNumber: '번입니다',
      checkoutConfirm: '번 좌석 예약을 퇴실/취소하시겠습니까?',
      extendConfirm: '번 좌석 사용을 연장하시겠습니까?',
      
      // 폼 라벨
      studentId: '학번',
      password: '비밀번호',
      studentIdPlaceholder: '학번을 입력하세요',
      passwordPlaceholder: '비밀번호를 입력하세요',
      
      // 연장 옵션
      extend1Hour: '1시간 연장',
      extend2Hours: '2시간 연장',
      extend3Hours: '3시간 연장',
      extensionSelected: '시간 연장이 선택되었습니다.',
      
      // 예약 현황
      reservationStatus: '번 좌석 예약 현황',
      loadingReservations: '예약 정보를 불러오는 중...',
      noReservations: '예약이 없습니다.',
      selectedTime: '선택된 시간:',
      currentReservation: '현재 예약:',
      extension: '연장:',
      
      // 시간 제한 메시지
      cannotReserveBefore8: '8시 이전은 예약할 수 없습니다',
      cannotReservePastTime: '지난 시간대는 예약할 수 없습니다',
      alreadyReserved: '이미 예약된 시간입니다',
      selectExtensionTime: '연장 시간 선택'
    },
    en: {
      // 메인 제목
      systemTitle: 'SCLab Seat Reservation System',
      selectSeat: 'Please select a seat.',
      
      // 탭
      room901: 'Room 901',
      room907: 'Room 907',
      
      // 좌석 상태
      fixed: 'Fixed',
      inUse: 'In Use',
      checkoutComplete: 'Checked Out',
      
      // 시간 관련
      hours: 'hours',
      minutes: 'minutes',
      
      // 설명 텍스트
      reservationInfo: 'You can use the seat for 4 hours when making a reservation.',
      reservationExample: '(ex: If you select 09:00, automatic checkout at 12:59)',
      extensionInfo: 'You can extend up to 3 hours if there are no next reservations.',
      
      // 버튼
      reserve: 'Reserve',
      checkoutCancel: 'Checkout/Cancel',
      extend: 'Extend',
      admin: 'Admin',
      
      // 모달 제목
      makeReservation: 'Make Reservation',
      checkoutReservation: 'Checkout/Cancel',
      extendReservation: 'Extend Reservation',
      cancel: 'Cancel',
      processing: 'Processing...',
      extending: 'Extending...',
      reserving: 'Reserving...',
      
      // 모달 설명
      currentSeat: 'Currently selected seat is',
      seatNumber: '',
      checkoutConfirm: 'Do you want to checkout/cancel the reservation for seat',
      extendConfirm: 'Do you want to extend the usage of seat',
      
      // 폼 라벨
      studentId: 'Student ID',
      password: 'Password',
      studentIdPlaceholder: 'Enter your student ID',
      passwordPlaceholder: 'Enter your password',
      
      // 연장 옵션
      extend1Hour: 'Extend 1 Hour',
      extend2Hours: 'Extend 2 Hours',
      extend3Hours: 'Extend 3 Hours',
      extensionSelected: 'hour extension selected.',
      
      // 예약 현황
      reservationStatus: 'Reservation Status for Seat',
      loadingReservations: 'Loading reservation information...',
      noReservations: 'No reservations.',
      selectedTime: 'Selected time:',
      currentReservation: 'Current reservation:',
      extension: 'Extension:',
      
      // 시간 제한 메시지
      cannotReserveBefore8: 'Cannot reserve before 8 AM',
      cannotReservePastTime: 'Cannot reserve past time slots',
      alreadyReserved: 'Already reserved',
      selectExtensionTime: 'Select Extension Time'
    }
  };

  // 현재 언어의 번역 가져오기
  const t = translations[language];

  // 컴포넌트 로드 시 모든 좌석 상태 가져오기
  useEffect(() => {
    fetchAllSeatsStatus();
    // 30초마다 상태 업데이트
    const interval = setInterval(fetchAllSeatsStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // 모바일 사이드바 상태 변화 추적
  useEffect(() => {
    console.log('=== 모바일 사이드바 상태 변화 ===');
    console.log('- isMobileSidebarOpen:', isMobileSidebarOpen);
    console.log('- selectedSeat:', selectedSeat);
    console.log('===============================');
  }, [isMobileSidebarOpen, selectedSeat]);

  // 모든 좌석 상태 가져오기
  const fetchAllSeatsStatus = async () => {
    try {
      const response = await fetch('/api/reservations');
      const data = await response.json();
      
      if (response.ok) {
        const now = dayjs();
        const timeOffset = parseInt(process.env.NEXT_PUBLIC_DEV_TIME_OFFSET || '0');
        const currentHour = now.hour() + timeOffset;
        
        const seatsStatus: {[key: number]: 'available' | 'occupied' | 'fixed'} = {};
        const remainingTime: {[key: number]: number} = {};
        
        // 고정석 정의
        const fixedSeats = [6, 12, 13]; // 901호 6번 좌석, 901호 12번 좌석, 907호 13번 좌석
        
        // 모든 좌석을 먼저 available로 초기화
        for (let i = 1; i <= 17; i++) {
          if (fixedSeats.includes(i)) {
            seatsStatus[i] = 'fixed';
          } else {
            seatsStatus[i] = 'available';
          }
        }
        
        // 현재 사용중인 좌석 확인 및 남은 시간 계산
        if (data.allReservations) {
          data.allReservations.forEach((reservation: {
            seat_id: number;
            startedAt: number;
            endedAt: number;
            checkoutAt: string | null;
          }) => {
            const isCurrentlyUsed = !reservation.checkoutAt && 
              currentHour >= reservation.startedAt && 
              currentHour <= reservation.endedAt;
            
            if (isCurrentlyUsed && !fixedSeats.includes(reservation.seat_id)) {
              seatsStatus[reservation.seat_id] = 'occupied';
              // 남은 시간 계산 (분 단위)
              const currentMinute = now.minute();
              const endTimeInMinutes = (reservation.endedAt + 1) * 60; // 예: 12시 예약이면 12:59까지
              const currentTimeInMinutes = currentHour * 60 + currentMinute;
              const remainingMinutes = endTimeInMinutes - currentTimeInMinutes;
              remainingTime[reservation.seat_id] = Math.max(0, remainingMinutes);
            }
          });
        }
        
        setAllSeatsStatus(seatsStatus);
        setSeatRemainingTime(remainingTime);
      }
    } catch (error) {
      console.error('Error fetching all seats status:', error);
    }
  };

  // 좌석 예약 정보 가져오기
  const fetchSeatReservations = async (seatId: number) => {
    setIsLoadingReservations(true);
    try {
      const response = await fetch(`/api/reservations?seatId=${seatId}`);
      const data = await response.json();
      
      if (response.ok) {
        setReservedTimeSlots(data.reservedTimeSlots || []);
        setSeatReservations(data.reservations || []);
        
        // 예약 세부 정보 매핑 (시간대별 학번)
        const details: {[key: number]: string} = {};
        data.reservations?.forEach((reservation: {
          startedAt: number;
          endedAt: number;
          user: { studentId: string };
        }) => {
          for (let i = reservation.startedAt - 9; i < reservation.endedAt - 9; i++) {
            if (i >= 0 && i < 16) {
              details[i] = reservation.user.studentId;
            }
          }
        });
        setReservationDetails(details);
      } else {
        console.error('Failed to fetch seat reservations:', data.error);
        setReservedTimeSlots([]);
        setReservationDetails({});
      }
    } catch (error) {
      console.error('Error fetching seat reservations:', error);
      setReservedTimeSlots([]);
      setReservationDetails({});
    } finally {
      setIsLoadingReservations(false);
    }
  };

  // 시간 선택 핸들러
  const handleTimeClick = (timeIndex: number) => {
    // 예약된 시간대는 선택 불가
    if (reservedTimeSlots.includes(timeIndex)) {
      return;
    }
    
    // 지난 시간대는 선택 불가 (8시 이전은 예약 불가)
    const now = dayjs()
    const timeOffset = parseInt(process.env.NEXT_PUBLIC_DEV_TIME_OFFSET || '0');
    const currentHour = now.hour() + timeOffset;
    const timeSlotHour = timeIndex + 9;
    
    // 8시 이전은 예약 불가
    if (timeSlotHour < 8) {
      return;
    }
    
    // 현재 시간보다 이전 시간대는 선택 불가 (단, 8시 이후만)
    if (timeSlotHour >= 8 && timeSlotHour < currentHour) {
      return;
    }

    const currentSelected = [...selectedTimes];
    
    // 이미 선택된 시간인지 확인
    const isAlreadySelected = currentSelected.includes(timeIndex);
    
    if (isAlreadySelected) {
      // 이미 선택된 시간이면 제거
      setSelectedTimes(currentSelected.filter(time => time !== timeIndex));
      return;
    }
    
    // 새로운 시간 추가
    const newSelected = [...currentSelected, timeIndex].sort((a, b) => a - b);
    
    // 연속된 범위인지 확인하고 최대 4시간 체크
    if (newSelected.length > 4) {
      // 4시간 초과하면 전체 초기화
      setSelectedTimes([]);
      return;
    }
    
    if (newSelected.length > 1) {
      // 연속된 범위인지 확인
      const min = Math.min(...newSelected);
      const max = Math.max(...newSelected);
      const expectedLength = max - min + 1;
      
      if (expectedLength !== newSelected.length || expectedLength > 4) {
        // 연속되지 않거나 4시간 초과하면 전체 초기화
        setSelectedTimes([]);
        return;
      }
    }
    
    setSelectedTimes(newSelected);
  };

  // 예약 제출 핸들러
  const handleReservationSubmit = async () => {
    if (selectedTimes.length === 0) {
      alert('시간을 선택해주세요.');
      return;
    }

    if (!reservationForm.studentId || !reservationForm.password) {
      alert('학번과 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const startedAt = Math.min(...selectedTimes) + 9;
      const endedAt = Math.max(...selectedTimes) + 9;

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seatId: modal.seatId,
          startedAt,
          endedAt,
          password: reservationForm.password,
          studentId: reservationForm.studentId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('예약이 성공적으로 완료되었습니다!');
        // 폼 초기화
        setModal({ seatId: -1, isOpen: false, type: 'reserve', reservationId: '' });
        setSelectedTimes([]);
        setReservationForm({ studentId: '', password: '' });
        setReservedTimeSlots([]);
        setReservationDetails({});
        // 사이드바 정보 업데이트
        if (selectedSeat) {
          fetchSeatReservations(selectedSeat);
        }
      } else {
        alert(data.error || '예약 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Reservation error:', error);
      alert('예약 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 퇴실 핸들러
  const handleCheckout = async () => {
    if (!reservationForm.studentId || !reservationForm.password) {
      alert('학번과 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reservations/checkout', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId: modal.reservationId,
          password: reservationForm.password,
          studentId: reservationForm.studentId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('성공적으로 퇴실되었습니다!');
        // 폼 초기화
        setModal({ seatId: -1, isOpen: false, type: 'reserve', reservationId: '' });
        setSelectedTimes([]);
        setReservationForm({ studentId: '', password: '' });
        setReservedTimeSlots([]);
        setReservationDetails({});
        // 사이드바 정보 업데이트
        if (selectedSeat) {
          fetchSeatReservations(selectedSeat);
        }
      } else {
        alert(data.error || '퇴실 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('퇴실 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 연장 핸들러
  const handleExtend = async () => {
    if (selectedTimes.length === 0) {
      alert('연장 시간을 선택해주세요.');
      return;
    }

    if (!reservationForm.studentId || !reservationForm.password) {
      alert('학번과 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reservations/extend', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId: modal.reservationId,
          password: reservationForm.password,
          studentId: reservationForm.studentId,
          extendHours: selectedTimes[0],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        // 폼 초기화
        setModal({ seatId: -1, isOpen: false, type: 'reserve', reservationId: '' });
        setSelectedTimes([]);
        setReservationForm({ studentId: '', password: '' });
        setReservedTimeSlots([]);
        setReservationDetails({});
        // 사이드바 정보 업데이트
        if (selectedSeat) {
          fetchSeatReservations(selectedSeat);
        }
      } else {
        alert(data.error || '연장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Extend error:', error);
      alert('연장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 사이드바 컨텐츠 컴포넌트
  const SidebarContent = () => (
    <>
      {selectedSeat ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-semibold">{t.systemTitle}</h1>
            {/* 모바일에서만 닫기 버튼 표시 */}
            <button 
              className="md:hidden p-2 hover:bg-gray-200 rounded-full"
              onClick={() => {
                console.log('=== 사이드바 닫기 버튼 클릭 ===');
                setIsMobileSidebarOpen(false);
                console.log('- 사이드바 닫기 실행');
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {t.reservationInfo} <br/>
            {t.reservationExample}<br/>
            <br/>
            {t.extensionInfo}
          </p>
          <h2 className="text-lg font-semibold mb-4 mt-4">
            {t.reservationStatus.replace('번 좌석', ` ${selectedSeat}`)}
          </h2>
          
          {isLoadingReservations ? (
            <div className="text-center py-8 text-gray-500">
              {t.loadingReservations}
            </div>
          ) : seatReservations.length > 0 ? (
            <div className="space-y-3 mb-6">
              {seatReservations.map((reservation) => {
                const now = dayjs()
                const timeOffset = parseInt(process.env.NEXT_PUBLIC_DEV_TIME_OFFSET || '0');
                const currentHour = now.hour() + timeOffset;
                // 퇴실하지 않은 예약만 "사용 중"으로 표시
                const isCurrentReservation = !reservation.checkoutAt && 
                  currentHour >= reservation.startedAt && 
                  currentHour <= reservation.endedAt;
                
                return (
                  <div key={reservation.id} className={`bg-white p-3 rounded-lg border ${isCurrentReservation ? 'border-green-300 bg-green-50' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">
                        {reservation.startedAt}:00 - {reservation.endedAt}:59
                        {isCurrentReservation && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {t.inUse}
                          </span>
                        )}
                        {reservation.checkoutAt && (
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {t.checkoutComplete}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        {reservation.user.studentId}
                      </span>
                    </div>
                    {reservation.extendedAt && (
                      <div className="text-xs text-orange-600 mt-1">
                        {t.extension}: {dayjs(reservation.extendedAt).add(timeOffset, 'hour').format(language === 'ko' ? 'HH시 mm분' : 'HH:mm')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t.noReservations}
            </div>
          )}
          
          <div className="mt-8">
            <button
              onClick={() => {
                setModal({ 
                  isOpen: true, 
                  seatId: selectedSeat!, 
                  type: 'reserve',
                  reservationId: ''
                });
                if (selectedSeat) {
                  fetchSeatReservations(selectedSeat);
                }
                setIsMobileSidebarOpen(false); // 모바일에서 모달 열 때 사이드바 닫기
              }}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {t.reserve}
            </button>
          </div>
          
          <div className="space-y-2 mt-6">
            <button
              onClick={async () => {
                // 최신 예약 정보를 가져온 후 현재 사용 중인 예약 찾기
                if (selectedSeat) {
                  await fetchSeatReservations(selectedSeat);
                }
                
                // 약간의 지연 후 최신 데이터로 현재 예약 찾기
                setTimeout(() => {
                  const now = dayjs();
                  const timeOffset = parseInt(process.env.NEXT_PUBLIC_DEV_TIME_OFFSET || '0');
                  const currentHour = now.hour() + timeOffset;
                  
                  console.log('=== 퇴실 버튼 클릭 디버깅 ===');
                  console.log('- 현재 시간:', now.format('YYYY-MM-DD HH:mm:ss'));
                  console.log('- 시간 오프셋:', timeOffset);
                  console.log('- 계산된 현재 시간:', currentHour);
                  console.log('- 좌석 예약 목록:', seatReservations);
                  
                  // 활성 상태인 예약 중에서 선택 (현재 사용중 또는 미래 예약)
                  const activeReservations = seatReservations.filter(reservation => 
                    !reservation.checkoutAt
                  );
                  
                  console.log('- 활성 예약 목록:', activeReservations);
                  
                  if (activeReservations.length === 0) {
                    console.log('- 활성 예약 없음');
                    console.log('================================');
                    alert('퇴실/취소할 수 있는 예약을 찾을 수 없습니다.');
                    return;
                  }
                  
                  // 활성 예약이 있으면 첫 번째 예약을 선택 (패스워드로 권한 확인)
                  const targetReservation = activeReservations[0];
                  console.log('- 선택된 예약:', targetReservation);
                  console.log('- 예약 시간:', `${targetReservation.startedAt}:00 - ${targetReservation.endedAt}:59`);
                  console.log('- 현재 시간과 비교:', currentHour >= targetReservation.startedAt && currentHour <= targetReservation.endedAt ? '사용중' : '미래/과거 예약');
                  console.log('================================');
                  
                  setModal({ 
                    isOpen: true, 
                    seatId: selectedSeat!, 
                    type: 'checkout',
                    reservationId: targetReservation.id
                  });
                  setIsMobileSidebarOpen(false); // 모바일에서 모달 열 때 사이드바 닫기
                }, 100);
              }}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              {t.checkoutCancel}
            </button>
            <button
              onClick={async () => {
                // 최신 예약 정보를 가져온 후 현재 사용 중인 예약 찾기
                if (selectedSeat) {
                  await fetchSeatReservations(selectedSeat);
                }
                
                // 약간의 지연 후 최신 데이터로 현재 예약 찾기
                setTimeout(() => {
                  const now = dayjs()
                  const timeOffset = parseInt(process.env.NEXT_PUBLIC_DEV_TIME_OFFSET || '0');
                  const currentHour = now.hour() + timeOffset;
                  const currentMinute = now.minute();
                  const currentReservation = seatReservations.find(reservation => 
                    !reservation.checkoutAt && 
                    currentHour >= reservation.startedAt && currentHour <= reservation.endedAt
                  );
                  
                  if (currentReservation) {
                    // 연장 가능 시간 체크
                    const endTime = currentReservation.endedAt * 60;
                    const currentTimeInMinutes = currentHour * 60 + currentMinute;
                    const canExtend = endTime - currentTimeInMinutes <= 20;
                    
                    if (canExtend) {
                      setModal({ 
                        isOpen: true, 
                        seatId: selectedSeat!, 
                        type: 'extend',
                        reservationId: currentReservation.id
                      });
                      setIsMobileSidebarOpen(false); // 모바일에서 모달 열 때 사이드바 닫기
                    } else {
                      const remainingMinutes = endTime - currentTimeInMinutes;
                      const remainingHours = Math.floor(remainingMinutes / 60);
                      const remainingMins = remainingMinutes % 60;
                      alert(`연장은 끝나기 20분 전부터 가능합니다. (${remainingHours}시간 ${remainingMins}분 후 가능)`);
                    }
                  } else {
                    alert('현재 사용 중인 예약을 찾을 수 없습니다.');
                  }
                }, 100);
              }}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              {t.extend}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          {t.selectSeat}
        </div>
      )}
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }


  return (
    <>
    {/* 언어 토글 버튼 - 상단 고정 */}
    <div className="fixed top-4 left-4 z-30">
      <button
        onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
        className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white transition-colors shadow-sm"
      >
        <span className="text-lg">{language === 'ko' ? '🇰🇷' : '🇺🇸'}</span>
        <span>{language === 'ko' ? '한국어' : 'English'}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>
    </div>
    
    <Dialog open={modal.isOpen} onOpenChange={((opened) => setModal({ seatId: -1, isOpen: opened, type: 'reserve', reservationId: '' })) }>
  
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>
        {modal.type === 'reserve' && t.makeReservation}
        {modal.type === 'checkout' && t.checkoutReservation}
        {modal.type === 'extend' && t.extendReservation}
      </DialogTitle>
      <DialogDescription className="mt-1 text-sm leading-6">
        {modal.type === 'reserve' && `${t.currentSeat} ${modal.seatId}${t.seatNumber}`}
        {modal.type === 'checkout' && `${t.checkoutConfirm} ${modal.seatId}?`}
        {modal.type === 'extend' && `${t.extendConfirm} ${modal.seatId}?`}
      </DialogDescription>
    </DialogHeader>
    {modal.type === 'reserve' && (
    <div className="grid grid-cols-6 grid-rows-3 gap-1">
        {isLoadingReservations ? (
          <div className="col-span-6 text-center py-4 text-gray-500">
            {t.loadingReservations}
          </div>
        ) : (
          Array.from({length: 16}).map((x, i) =>{
            const isSelected = selectedTimes.includes(i);
            const isReserved = reservedTimeSlots.includes(i);
            
            // 현재 시간 확인 (지난 시간대는 예약 불가, 8시 이전 예약 불가)
            const now = dayjs()
            const timeOffset = parseInt(process.env.NEXT_PUBLIC_DEV_TIME_OFFSET || '0');
            const currentHour = now.hour() + timeOffset;
            const timeSlotHour = i + 9; // 시간 슬롯의 실제 시간 (9시부터 시작)
            const isBeforeEightAM = timeSlotHour < 8;
            const isPastTime = timeSlotHour >= 8 && timeSlotHour < currentHour;
            
            const isDisabled = isReserved || isPastTime || isBeforeEightAM;
            
      return (
              <button 
                key={i} 
                onClick={() => handleTimeClick(i)}
                disabled={isDisabled}
                className={`border-1 border-gray-200 rounded-xs py-1 px-2 transition-colors flex flex-col items-center justify-center min-h-[60px] ${
                  isReserved
                    ? 'bg-red-100 text-red-400 border-red-200 cursor-not-allowed'
                    : isPastTime
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : isBeforeEightAM
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : isSelected 
                          ? 'bg-blue-500 text-white border-blue-500' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title={
                  isReserved 
                    ? `${t.alreadyReserved} (${reservationDetails[i]})` 
                    : isPastTime 
                      ? t.cannotReservePastTime
                      : isBeforeEightAM
                        ? t.cannotReserveBefore8
                        : ''
                }
              >
                <div className="text-sm font-medium">
                  {i + 9}:00
                </div>
                {isReserved && reservationDetails[i] && (
                  <div className="text-xs mt-1 opacity-75">
                    {reservationDetails[i]}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    )}

    {modal.type === 'extend' && (
      <div className="space-y-3">
        {/* 현재 예약 시간 표시 */}
        {(() => {
          const currentReservation = seatReservations.find(reservation => 
            reservation.id === modal.reservationId
          );
          
          return currentReservation ? (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-900">
                현재 예약: {currentReservation.startedAt}:00 - {currentReservation.endedAt}:59
              </p>
              <p className="text-xs text-green-700 mt-1">
                학번: {currentReservation.user.studentId}
              </p>
            </div>
          ) : null;
        })()}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.selectExtensionTime}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedTimes([1])}
              className={`py-3 px-3 rounded-lg border transition-colors ${
                selectedTimes.includes(1)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.extend1Hour}
            </button>
            <button
              onClick={() => setSelectedTimes([2])}
              className={`py-3 px-3 rounded-lg border transition-colors ${
                selectedTimes.includes(2)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.extend2Hours}
            </button>
            <button
              onClick={() => setSelectedTimes([3])}
              className={`py-3 px-3 rounded-lg border transition-colors ${
                selectedTimes.includes(3)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.extend3Hours}
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* 선택된 시간 표시 */}
    {selectedTimes.length > 0 && modal.type === 'reserve' && (
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm font-medium text-blue-900">
          {t.selectedTime} {Math.min(...selectedTimes) + 9}:00 - {Math.max(...selectedTimes) + 9}:59
        </p>
      </div>
    )}

    {selectedTimes.length > 0 && modal.type === 'extend' && (
      <div className="mt-4 p-3 bg-orange-50 rounded-lg">
        <p className="text-sm font-medium text-orange-900">
          {selectedTimes[0]}{t.extensionSelected}
        </p>
      </div>
    )}

    {/* 폼 */}
    <div className="mt-4 space-y-3">
      <div>
        <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
          {t.studentId}
        </label>
        <input
          type="text"
          id="studentId"
          value={reservationForm.studentId}
          onChange={(e) => setReservationForm(prev => ({ ...prev, studentId: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t.studentIdPlaceholder}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          {t.password}
        </label>
        <input
          type="password"
          id="password"
          value={reservationForm.password}
          onChange={(e) => setReservationForm(prev => ({ ...prev, password: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t.passwordPlaceholder}
        />
      </div>
    </div>

    <DialogFooter className="mt-6">
      <DialogClose asChild>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
          {t.cancel}
        </button>
      </DialogClose>
      <button
        onClick={() => {
          if (modal.type === 'reserve') {
            handleReservationSubmit();
          } else if (modal.type === 'checkout') {
            handleCheckout();
          } else if (modal.type === 'extend') {
            handleExtend();
          }
        }}
        disabled={isSubmitting || (modal.type !== 'checkout' && selectedTimes.length === 0)}
        className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          modal.type === 'checkout' 
            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            : modal.type === 'extend'
            ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        }`}
      >
        {isSubmitting 
          ? (modal.type === 'checkout' ? t.processing : modal.type === 'extend' ? t.extending : t.reserving)
          : (modal.type === 'checkout' ? t.checkoutCancel : modal.type === 'extend' ? t.extend : t.reserve)
        }
      </button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    <main className="flex">
      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 md:flex-1 w-full">
      <Tabs defaultValue="tab1">
          <TabsList className="fixed right-0 left-0 w-min mx-auto top-8 z-10" variant="solid">
          <TabsTrigger value="tab1">{t.room901}</TabsTrigger>
          <TabsTrigger value="tab2">{t.room907}</TabsTrigger>
        </TabsList>
    <div className="ml-2 mt-28">
    
      <TabsContent
        value="tab1"
        className=""
      >
        <div className="grid grid-cols-5 grid-rows-5 max-w-lg mx-auto gap-2">
          {Array.from({length: 4}).map((x, i) =>{
            const seatNumber = i + 1;
            const seatStatus = allSeatsStatus[seatNumber] || 'available';
            const remainingMinutes = seatRemainingTime[seatNumber] || 0;
            const getSeatColor = () => {
              if (selectedSeat === seatNumber) return 'bg-blue-100 border-2 border-blue-500';
              switch (seatStatus) {
                case 'occupied': return 'bg-green-500 text-white hover:bg-green-600';
                case 'fixed': return 'bg-gray-700 text-white cursor-not-allowed';
                default: return 'bg-gray-400 text-white hover:bg-gray-500';
              }
            };
            
            const formatRemainingTime = (minutes: number) => {
              const hours = Math.floor(minutes / 60);
              const mins = minutes % 60;
              if (hours > 0) {
                return `${hours}h ${mins}m`;
              }
              return `${mins}m`;
            };
            
            return (
            <button key={i} className={`aspect-square flex flex-col justify-center items-center transition-colors text-xs ${i > 1 && "row-start-2"} ${getSeatColor()}`}
            onClick={() => {
              if (seatStatus === 'fixed') return;
              console.log('=== 좌석 클릭 ===');
              console.log('- 좌석 번호:', seatNumber);
              console.log('- 현재 선택된 좌석:', selectedSeat);
              console.log('- 모바일 사이드바 상태:', isMobileSidebarOpen);
              
              setSelectedSeat(seatNumber);
              setSelectedTimes([]);
              setReservationForm({ studentId: '', password: '' });
              setReservedTimeSlots([]);
              setReservationDetails({});
              setSeatReservations([]);
              fetchSeatReservations(seatNumber);
              setIsMobileSidebarOpen(true); // 모바일에서 사이드바 열기
              
              console.log('- 사이드바 열기 실행');
              console.log('================');
            }}
            >
              <div className="font-medium">{seatNumber}</div>
              {seatStatus === 'occupied' && remainingMinutes > 0 && (
                <div className="text-xs opacity-90">{formatRemainingTime(remainingMinutes)}</div>
              )}
            </button>
          )})}
          {Array.from({length: 4}).map((x, i) =>{
            const seatNumber = i + 5;
            const 고정석 = [2]; // 6번 좌석이 고정석
            const isFixed = 고정석.includes(i + 1);
            const text = isFixed ? t.fixed : seatNumber;
            const seatStatus = allSeatsStatus[seatNumber] || 'available';
            const remainingMinutes = seatRemainingTime[seatNumber] || 0;
            
            const getSeatColor = () => {
              if (selectedSeat === seatNumber) return 'bg-blue-100 border-2 border-blue-500';
              if (isFixed) return 'bg-gray-700 text-white cursor-not-allowed';
              switch (seatStatus) {
                case 'occupied': return 'bg-green-500 text-white hover:bg-green-600';
                default: return 'bg-gray-400 text-white hover:bg-gray-500';
              }
            };
            
            const formatRemainingTime = (minutes: number) => {
              const hours = Math.floor(minutes / 60);
              const mins = minutes % 60;
              if (hours > 0) {
                return `${hours}h ${mins}m`;
              }
              return `${mins}m`;
            };
            
            return (
            <button key={i} className={`aspect-square flex flex-col justify-center items-center text-xs col-start-4 ${((i + 1) % 2) == 0 && "col-start-5"} ${getSeatColor()}`}
            onClick={() => {
              if(isFixed) {
                return;
              }
              console.log('=== 좌석 클릭 ===');
              console.log('- 좌석 번호:', seatNumber);
              console.log('- 현재 선택된 좌석:', selectedSeat);
              console.log('- 모바일 사이드바 상태:', isMobileSidebarOpen);
              
              setSelectedSeat(seatNumber);
              setSelectedTimes([]);
              setReservationForm({ studentId: '', password: '' });
              setReservedTimeSlots([]);
              setReservationDetails({});
              setSeatReservations([]);
              fetchSeatReservations(seatNumber);
              setIsMobileSidebarOpen(true); // 모바일에서 사이드바 열기
              
              console.log('- 사이드바 열기 실행');
              console.log('================');
            }}>
              <div className="font-medium">{text}</div>
              {seatStatus === 'occupied' && remainingMinutes > 0 && !isFixed && (
                <div className="text-xs opacity-90">{formatRemainingTime(remainingMinutes)}</div>
              )}
            </button>
          )})}
           {Array.from({length: 5}).map((x, i) =>{
             const seatNumber = i + 9;
             const 고정석 = [4]; // 12번 좌석이 고정석
             const isFixed = 고정석.includes(i + 1);
             const text = isFixed ? t.fixed : seatNumber;
             const seatStatus = allSeatsStatus[seatNumber] || 'available';
             const remainingMinutes = seatRemainingTime[seatNumber] || 0;
             
             const getSeatColor = () => {
               if (selectedSeat === seatNumber) return 'bg-blue-100 border-2 border-blue-500';
               if (isFixed) return 'bg-gray-700 text-white cursor-not-allowed';
               switch (seatStatus) {
                 case 'occupied': return 'bg-green-500 text-white hover:bg-green-600';
                 default: return 'bg-gray-400 text-white hover:bg-gray-500';
               }
             };
             
             const formatRemainingTime = (minutes: number) => {
               const hours = Math.floor(minutes / 60);
               const mins = minutes % 60;
               if (hours > 0) {
                 return `${hours}h ${mins}m`;
               }
               return `${mins}m`;
             };
             
            return (
            <button key={i} className={`aspect-square flex flex-col justify-center items-center text-xs row-start-4 ${getSeatColor()}`} onClick={() => {
              if(isFixed) {
                return;
              }
              console.log('=== 좌석 클릭 (9-13번) ===');
              console.log('- 좌석 번호:', seatNumber);
              console.log('- 현재 선택된 좌석:', selectedSeat);
              console.log('- 모바일 사이드바 상태:', isMobileSidebarOpen);
              
              setSelectedSeat(seatNumber);
              setSelectedTimes([]);
              setReservationForm({ studentId: '', password: '' });
              setReservedTimeSlots([]);
              setReservationDetails({});
              setSeatReservations([]);
              fetchSeatReservations(seatNumber);
              setIsMobileSidebarOpen(true); // 모바일에서 사이드바 열기
              
              console.log('- 사이드바 열기 실행');
              console.log('========================');
            }}>
              <div className="font-medium">{text}</div>
              {seatStatus === 'occupied' && remainingMinutes > 0 && !isFixed && (
                <div className="text-xs opacity-90">{formatRemainingTime(remainingMinutes)}</div>
              )}
            </button>
          )})}
        </div>
      </TabsContent>
      <TabsContent
        value="tab2"
        className=""
      >
        <div className="grid grid-cols-2 grid-rows-3 max-w-sm mx-auto gap-2">
          {Array.from({length: 5}).map((x, i) =>{
              const seatNumber = i + 13;
              const 고정석 = [1]; // 13번 좌석이 고정석
              const isFixed = 고정석.includes(i + 1);
              const text = isFixed ? t.fixed : seatNumber;
              const seatStatus = allSeatsStatus[seatNumber] || 'available';
              const remainingMinutes = seatRemainingTime[seatNumber] || 0;
              
              const getSeatColor = () => {
                if (selectedSeat === seatNumber) return 'bg-blue-100 border-2 border-blue-500';
                if (isFixed) return 'bg-gray-700 text-white cursor-not-allowed';
                switch (seatStatus) {
                  case 'occupied': return 'bg-green-500 text-white hover:bg-green-600';
                  default: return 'bg-gray-400 text-white hover:bg-gray-500';
                }
              };
              
              const formatRemainingTime = (minutes: number) => {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                if (hours > 0) {
                  return `${hours}h ${mins}m`;
                }
                return `${mins}m`;
              };
              
            return (
            <button key={i} className={`aspect-square flex flex-col justify-center items-center text-xs transition-colors ${getSeatColor()}`}
            onClick={() => {
              if(isFixed) {
                return;
              }
              console.log('=== 좌석 클릭 ===');
              console.log('- 좌석 번호:', seatNumber);
              console.log('- 현재 선택된 좌석:', selectedSeat);
              console.log('- 모바일 사이드바 상태:', isMobileSidebarOpen);
              
              setSelectedSeat(seatNumber);
              setSelectedTimes([]);
              setReservationForm({ studentId: '', password: '' });
              setReservedTimeSlots([]);
              setReservationDetails({});
              setSeatReservations([]);
              fetchSeatReservations(seatNumber);
              setIsMobileSidebarOpen(true); // 모바일에서 사이드바 열기
              
              console.log('- 사이드바 열기 실행');
              console.log('================');
            }}
            >
              <div className="font-medium">{text}</div>
              {seatStatus === 'occupied' && remainingMinutes > 0 && !isFixed && (
                <div className="text-xs opacity-90">{formatRemainingTime(remainingMinutes)}</div>
              )}
            </button>
          )})}
        </div>
      </TabsContent>
    </div>
  </Tabs>
      </div>

      {/* 데스크톱 사이드바 */}
      <div className="hidden md:block w-80 bg-gray-50 border-l border-gray-200 p-4 min-h-screen">
        <SidebarContent />
      </div>

      {/* 모바일 오버레이 */}
      {isMobileSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => {
            console.log('=== 오버레이 클릭 ===');
            setIsMobileSidebarOpen(false);
            console.log('- 사이드바 닫기 실행');
          }}
        />
      )}

      {/* 모바일 슬라이드 사이드바 */}
      <div className={`md:hidden fixed top-0 right-0 h-full w-80 bg-gray-50 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* 디버깅용 표시 */}

        <div className="p-4 h-full overflow-y-auto">
          <SidebarContent />
        </div>
      </div>
    </main>
    
    {/* 관리자 버튼 - 우하단 고정 */}
    <Link 
      href="/admin"
      className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors shadow-lg z-20"
    >
      {t.admin}
    </Link>
    </>

  );
}
