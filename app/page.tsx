'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, MessageSquare, Calendar as CalendarIcon, Send, Trash2, ShieldAlert, User, MapPin, ChevronLeft, ChevronRight, Clock, Building2, CalendarCheck, X, FileText } from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  
  // --- [사용자 정보] ---
  const [userRole, setUserRole] = useState<string>('staff')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userSite, setUserSite] = useState<string>('')

  // --- [데이터 상태] ---
  const [notices, setNotices] = useState<any[]>([])
  const [memos, setMemos] = useState<any[]>([])
  const [approvedVacations, setApprovedVacations] = useState<any[]>([])
  const [siteEvents, setSiteEvents] = useState<any[]>([]) 
  const [pendingCount, setPendingCount] = useState(0)

  // --- [입력 상태] ---
  const [newNoticeTitle, setNewNoticeTitle] = useState('')
  const [newNoticeContent, setNewNoticeContent] = useState('')
  const [newMemoContent, setNewMemoContent] = useState('')

  // --- [캘린더 상태 & 모달] ---
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // 🚧 수기 일정 (초록색) 모달 상태
  const [showEventModal, setShowEventModal] = useState(false)
  const [editEventId, setEditEventId] = useState<string | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [eventStart, setEventStart] = useState('')
  const [eventEnd, setEventEnd] = useState('')

  // 🏝️ 휴가 상세 (파란색) 모달 상태
  const [showVacationModal, setShowVacationModal] = useState(false)
  const [selectedVacation, setSelectedVacation] = useState<any>(null)

  // 📢 공지사항 모달 상태
  const [showNoticeModal, setShowNoticeModal] = useState(false)
  const [noticeViewMode, setNoticeViewMode] = useState<boolean>(false) 
  const [selectedNotice, setSelectedNotice] = useState<any>(null)

  useEffect(() => {
    initDashboard()
  }, [])

  useEffect(() => {
    if (userEmail) {
      fetchVacations(userRole, userSite, currentDate)
      fetchEvents(userRole, userSite, currentDate)
    }
  }, [currentDate])

  const initDashboard = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      const email = session.user.email || ''
      setUserEmail(email)
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      
      let currentRole = profile?.role || 'staff'
      let currentSite = profile?.site_name || '미배정'
      let currentName = profile?.name || '이름없음'

      if (email === 'bobyy88@naver.com') { 
        currentRole = 'master'
        currentSite = '본사'
      }

      setUserRole(currentRole)
      setUserSite(currentSite)
      setUserName(currentName)

      fetchNotices()
      fetchMemos(currentRole, currentSite)
      fetchVacations(currentRole, currentSite, new Date())
      fetchEvents(currentRole, currentSite, new Date())
      fetchPendingCount(currentRole, currentSite, email)
    }
    setLoading(false)
  }

  // --- [데이터 패치 함수들] ---
  const fetchNotices = async () => {
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(10)
    if (data) setNotices(data)
  }

  const fetchMemos = async (role: string, site: string) => {
    let query = supabase.from('field_memos').select('*').order('created_at', { ascending: false }).limit(20)
    if (role !== 'admin' && role !== 'master') query = query.eq('site_name', site)
    const { data } = await query
    if (data) setMemos(data)
  }

  const fetchVacations = async (role: string, site: string, targetDate: Date) => {
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    let query = supabase.from('vacation_approvals')
      .select('*').eq('status', '승인완료').lte('start_date', endDate).gte('end_date', startDate)
    if (role !== 'admin' && role !== 'master') query = query.eq('site_name', site)
    const { data } = await query
    if (data) setApprovedVacations(data)
  }

  const fetchEvents = async (role: string, site: string, targetDate: Date) => {
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    let query = supabase.from('site_events')
      .select('*').lte('start_date', endDate).gte('end_date', startDate)
    if (role !== 'admin' && role !== 'master') query = query.eq('site_name', site)
    const { data } = await query
    if (data) setSiteEvents(data)
  }

  const fetchPendingCount = async (role: string, site: string, email: string) => {
    let targetStatus = (role === 'manager') ? '승인 대기' : '본사 승인 대기'
    let query = supabase.from('vacation_approvals').select('*', { count: 'exact' })
    if (role === 'staff') query = query.eq('user_email', email).in('status', ['승인 대기', '본사 승인 대기'])
    else {
      query = query.eq('status', targetStatus)
      if (role === 'manager') query = query.eq('site_name', site)
    }
    const { count } = await query
    setPendingCount(count || 0)
  }

  // --- [액션 함수] ---
  const handleAddNotice = async () => {
    if (!newNoticeTitle || !newNoticeContent) return alert('제목과 내용을 모두 입력해주세요.')
    const { error } = await supabase.from('notices').insert([{ title: newNoticeTitle, content: newNoticeContent, author_name: userName, author_email: userEmail }])
    if (!error) { 
      setNewNoticeTitle(''); setNewNoticeContent(''); 
      setShowNoticeModal(false); 
      fetchNotices(); 
    }
  }

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return
    await supabase.from('notices').delete().eq('id', id)
    setShowNoticeModal(false) 
    fetchNotices()
  }

  const handleAddMemo = async () => {
    if (!newMemoContent) return alert('메모 내용을 입력해주세요.')
    if (userSite === '미배정') return alert('소속 현장이 배정되지 않아 메모를 작성할 수 없습니다.')
    const { error } = await supabase.from('field_memos').insert([{ site_name: userSite, content: newMemoContent, author_name: userName, author_email: userEmail }])
    if (!error) { setNewMemoContent(''); fetchMemos(userRole, userSite); }
  }

  const handleDeleteMemo = async (id: string, authorEmail: string) => {
    if (userRole !== 'master' && userRole !== 'admin' && userEmail !== authorEmail) return alert('본인이 작성한 메모만 삭제할 수 있습니다.')
    if (!confirm('이 메모를 삭제하시겠습니까?')) return
    await supabase.from('field_memos').delete().eq('id', id)
    fetchMemos(userRole, userSite)
  }

  // ✅ [수기 일정] 클릭 액션
  const openNewEventModal = (dateStr: string) => {
    if (!(userRole === 'manager' || userRole === 'admin' || userRole === 'master')) return;
    setEditEventId(null)
    setEventTitle('')
    setEventStart(dateStr)
    setEventEnd(dateStr)
    setShowEventModal(true)
  }

  const openEditEventModal = (e: React.MouseEvent, ev: any) => {
    e.stopPropagation();
    setEditEventId(ev.id)
    setEventTitle(ev.title)
    setEventStart(ev.start_date)
    setEventEnd(ev.end_date || ev.start_date)
    setShowEventModal(true) 
  }

  const saveEvent = async () => {
    if (!eventTitle || !eventStart || !eventEnd) return alert('내용과 기간을 모두 입력해주세요.')
    if (new Date(eventEnd) < new Date(eventStart)) return alert('종료일이 시작일보다 빠를 수 없습니다.')

    if (editEventId) {
      await supabase.from('site_events').update({ title: eventTitle, start_date: eventStart, end_date: eventEnd }).eq('id', editEventId)
    } else {
      await supabase.from('site_events').insert([{ site_name: userSite, title: eventTitle, start_date: eventStart, end_date: eventEnd, author_name: userName, author_email: userEmail }])
    }
    setShowEventModal(false)
    fetchEvents(userRole, userSite, currentDate)
  }

  const deleteEvent = async () => {
    if (!editEventId) return;
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;
    await supabase.from('site_events').delete().eq('id', editEventId)
    setShowEventModal(false)
    fetchEvents(userRole, userSite, currentDate)
  }

  // ✅ [휴가 일정] 클릭 액션
  const openVacationModal = (e: React.MouseEvent, vac: any) => {
    e.stopPropagation();
    setSelectedVacation(vac);
    setShowVacationModal(true);
  }

  // [공지사항] 팝업 제어
  const openWriteNotice = () => {
    setNoticeViewMode(false)
    setNewNoticeTitle('')
    setNewNoticeContent('')
    setShowNoticeModal(true)
  }

  const openReadNotice = (notice: any) => {
    setSelectedNotice(notice)
    setNoticeViewMode(true)
    setShowNoticeModal(true)
  }

  // --- [달력 렌더링용 로직] ---
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  
  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const blanks = Array(firstDay).fill(null)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
  }

  const canEditEvent = userRole === 'master' || userRole === 'admin' || userRole === 'manager';

  return (
    <div className="max-w-[1600px] w-full mx-auto space-y-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-700 pb-20 pt-6 relative">
      
      {/* 🚀 상단 배너 (글씨 크기 및 여백 시원하게!) */}
      <div className="bg-blue-50 rounded-[2rem] border border-blue-100 shadow-sm py-6 px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-white text-blue-600 rounded-full flex items-center justify-center font-black text-2xl border border-blue-200 shadow-sm">
            {userName ? userName[0] : 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 mb-1">환영합니다, {userName} 님! 👋</h2>
            <p className="text-blue-600/80 font-bold text-sm flex items-center gap-1.5">
              <MapPin size={14} className="text-blue-400" /> {userSite} 현장 소속
            </p>
          </div>
        </div>
        <div className="bg-white border border-blue-100 px-6 py-3 rounded-2xl flex items-center gap-4">
          <p className="text-xs text-blue-300 font-black uppercase tracking-widest border-r border-blue-100 pr-4">System Role</p>
          <p className="font-bold text-base text-slate-700 flex items-center gap-2">
            {userRole === 'master' ? <><ShieldAlert size={16} className="text-purple-500"/> 최고 관리자</> : 
             userRole === 'admin' ? <><User size={16} className="text-emerald-500"/> 본사 관리자</> : 
             userRole === 'manager' ? <><User size={16} className="text-blue-500"/> 현장 소장</> : '현장 근로자'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center text-slate-400 font-bold text-lg">대시보드 데이터를 불러오는 중입니다...</div>
      ) : (
        <>
          {/* 🚀 4개의 핵심 요약 카드 (숫자는 더 크고 시원하게!) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <p className="text-[13px] font-bold text-slate-400 mb-2">나의 결재 대기 건수</p>
                <p className="text-4xl font-black text-orange-500">{pendingCount} <span className="text-base font-bold text-slate-500">건</span></p>
              </div>
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-orange-400"><Clock size={24}/></div>
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <p className="text-[13px] font-bold text-slate-400 mb-2">현재 소속 현장</p>
                <p className="text-3xl font-black text-blue-600 truncate max-w-[150px]">{userSite}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-400"><Building2 size={24}/></div>
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <p className="text-[13px] font-bold text-slate-400 mb-2">등록된 전체 메모</p>
                <p className="text-4xl font-black text-emerald-500">{memos.length} <span className="text-base font-bold text-slate-500">건</span></p>
              </div>
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-400"><MessageSquare size={24}/></div>
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <p className="text-[13px] font-bold text-slate-400 mb-2">이달의 승인 휴가</p>
                <p className="text-4xl font-black text-purple-500">{approvedVacations.length} <span className="text-base font-bold text-slate-500">건</span></p>
              </div>
              <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-purple-400"><CalendarCheck size={24}/></div>
            </div>
          </div>

          {/* 🚀 중앙: 공지사항 / 현장 메모 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 📢 좌측: 본사 공지사항 */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col h-[420px]">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"><Bell size={20} className="fill-red-500/20"/></div>
                  <h3 className="text-xl font-black text-slate-800">본사 공지사항</h3>
                </div>
                {(userRole === 'master' || userRole === 'admin') && (
                  <button onClick={openWriteNotice} className="text-[13px] bg-slate-800 text-white font-black px-5 py-2.5 rounded-xl hover:bg-slate-700 transition-colors shadow-sm">
                    + 새 공지 작성
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl bg-white">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-[13px] text-slate-500 uppercase tracking-widest border-b border-slate-100">
                      <th className="py-3 px-5 font-black">공지 제목</th>
                      <th className="py-3 px-4 font-black w-24 text-center">작성자</th>
                      <th className="py-3 px-4 font-black w-28 text-center">등록일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-base">
                    {notices.map((notice) => (
                      <tr key={notice.id} onClick={() => openReadNotice(notice)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                        <td className="py-4 px-5 font-bold text-slate-700 flex items-center">
                          <span className="text-red-500 text-[11px] bg-red-50 px-2 py-1 rounded-md mr-3 border border-red-100 flex-shrink-0">공지</span>
                          <span className="truncate max-w-[250px] group-hover:text-blue-600 transition-colors">{notice.title}</span>
                          {(userRole === 'master' || userRole === 'admin') && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteNotice(notice.id); }} className="ml-3 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center text-[13px] font-bold text-slate-500">{notice.author_name}</td>
                        <td className="py-4 px-4 text-center text-[13px] font-bold text-slate-400">{new Date(notice.created_at).toLocaleDateString().slice(2)}</td>
                      </tr>
                    ))}
                    {notices.length === 0 && <tr><td colSpan={3} className="py-10 text-center text-slate-400 text-sm font-bold">공지사항이 없습니다.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 📝 우측: 현장 메모 & 인수인계 Feed */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col h-[420px]">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><MessageSquare size={20} className="fill-emerald-500/20"/></div>
                  <h3 className="text-xl font-black text-slate-800">현장 메모 & 소통</h3>
                </div>
                {(userRole === 'master' || userRole === 'admin') && <span className="text-[11px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg">전체 현장 열람</span>}
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-3 mb-4 custom-scrollbar">
                {memos.map(memo => (
                  <div key={memo.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors relative group shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600 shadow-sm">{memo.site_name}</span>
                        <span className="text-[13px] font-black text-slate-800">{memo.author_name}</span>
                      </div>
                      {(userRole === 'master' || userRole === 'admin' || userEmail === memo.author_email) && (
                        <button onClick={() => handleDeleteMemo(memo.id, memo.author_email)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                      )}
                    </div>
                    {/* ✅ 메모 내용 글씨 크기 text-base(16px) 로 시원하게 확대! */}
                    <p className="text-base font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">{memo.content}</p>
                  </div>
                ))}
                {memos.length === 0 && <p className="w-full text-center text-slate-400 text-sm font-bold py-10">첫 현장 메모를 남겨보세요!</p>}
              </div>

              <div className="flex gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-inner mt-auto flex-shrink-0">
                <input type="text" value={newMemoContent} onChange={e => setNewMemoContent(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMemo()} placeholder="메모 남기기 (엔터 전송)" className="flex-1 bg-transparent border-none px-4 text-base font-bold focus:outline-none text-slate-700" />
                <button onClick={handleAddMemo} className="bg-emerald-500 text-white px-5 py-3 rounded-xl font-black hover:bg-emerald-600 transition-colors shadow-md flex items-center gap-2">
                  <Send size={18}/>
                </button>
              </div>
            </div>
          </div>

          {/* 🗓️ 하단: 대형 캘린더 (가로 100% 전체 사용) */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col min-h-[750px] w-full relative">
            <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><CalendarIcon size={24}/></div>
                <h3 className="text-2xl font-black text-slate-800">현장 휴가 & 주요 일정 캘린더</h3>
                {(userRole === 'master' || userRole === 'admin') && <span className="text-[11px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg ml-2">전체 현장</span>}
                {canEditEvent && <span className="text-[13px] font-bold text-emerald-600 ml-3 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">💡 빈 날짜를 클릭해 일정을 추가하세요</span>}
              </div>
              
              <div className="flex items-center gap-5 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><ChevronLeft size={24}/></button>
                <span className="text-lg font-black text-slate-700 w-32 text-center">
                  {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><ChevronRight size={24}/></button>
              </div>
            </div>

            <div className="flex-1 bg-slate-50/50 rounded-3xl border border-slate-100 p-6">
              <div className="grid grid-cols-7 gap-4 mb-4">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                  <div key={day} className={`text-center text-lg font-black py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-4">
                {blanks.map((_, i) => <div key={`blank-${i}`} className="min-h-[140px] xl:min-h-[160px] rounded-2xl bg-transparent"></div>)}
                {days.map(day => {
                  const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  
                  const daysVacations = approvedVacations.filter(vac => vac.start_date <= currentDateStr && vac.end_date >= currentDateStr)
                  const daysEvents = siteEvents.filter(ev => ev.start_date <= currentDateStr && (ev.end_date || ev.start_date) >= currentDateStr)
                  const isToday = new Date().toISOString().split('T')[0] === currentDateStr

                  return (
                    <div 
                      key={day} 
                      onClick={() => openNewEventModal(currentDateStr)}
                      className={`min-h-[140px] xl:min-h-[160px] rounded-2xl border p-4 transition-colors flex flex-col 
                        ${isToday ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-blue-300'}
                        ${canEditEvent ? 'cursor-pointer' : ''}
                      `}
                    >
                      <p className={`text-lg font-black mb-3 ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{day}</p>
                      <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                        
                        {/* 🚧 수기 일정 배지 (글씨 text-sm으로 상향!) */}
                        {daysEvents.map((ev, idx) => (
                          <div 
                            key={`ev-${idx}`} 
                            onClick={(e) => openEditEventModal(e, ev)}
                            className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-2 rounded-lg truncate border border-emerald-200/50 shadow-sm cursor-pointer hover:bg-emerald-200 transition-colors"
                          >
                            🚧 {ev.title}
                          </div>
                        ))}

                        {/* 🏝️ 휴가자 배지 (글씨 text-sm으로 상향!) */}
                        {daysVacations.map((vac, idx) => (
                          <div 
                            key={`vac-${idx}`} 
                            onClick={(e) => openVacationModal(e, vac)}
                            className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-2 rounded-lg truncate border border-blue-200/50 shadow-sm cursor-pointer hover:bg-blue-200 transition-colors"
                            title={`${vac.user_name} (${vac.vacation_type}) - ${vac.site_name}`}
                          >
                            🏝️ {vac.user_name} <span className="font-normal opacity-70 ml-1">{vac.vacation_type.replace('휴가', '')}</span>
                          </div>
                        ))}
                        
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================================
          ✅ 팝업 모달 구역 (일정 / 휴가 / 공지)
          ========================================= */}

      {/* 1. 🚧 수기 일정 (추가/수정/읽기) 팝업 */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={()=>setShowEventModal(false)}></div>
          <div className="relative bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-8 w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black text-slate-800 flex items-center gap-2 text-xl">
                <CalendarCheck size={24} className="text-emerald-600" /> {editEventId ? (canEditEvent ? '일정 상세/수정' : '일정 상세') : '새 일정 추가'}
              </h4>
              <button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-5 mb-8">
              <div>
                <label className="text-[13px] font-black text-slate-400 uppercase mb-2 block">일정 내용</label>
                <textarea 
                  value={eventTitle} onChange={e => setEventTitle(e.target.value)} 
                  disabled={!canEditEvent}
                  placeholder="예: 콘크리트 타설, 안전점검" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-base font-bold focus:ring-2 focus:ring-emerald-200 outline-none resize-none min-h-[100px]" 
                  autoFocus={canEditEvent}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-black text-slate-400 uppercase mb-2 block">시작일</label>
                  <input type="date" value={eventStart} onChange={e => setEventStart(e.target.value)} disabled={!canEditEvent} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                </div>
                <div>
                  <label className="text-[13px] font-black text-slate-400 uppercase mb-2 block">종료일</label>
                  <input type="date" value={eventEnd} onChange={e => setEventEnd(e.target.value)} disabled={!canEditEvent} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                </div>
              </div>
            </div>

            {canEditEvent && (
              <div className="flex gap-3">
                {editEventId && (
                  <button onClick={deleteEvent} className="bg-red-50 text-red-600 font-black py-4 px-5 rounded-xl hover:bg-red-100 transition-colors flex-shrink-0">
                    <Trash2 size={20} />
                  </button>
                )}
                <button onClick={saveEvent} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-xl text-base hover:bg-emerald-700 transition-colors">
                  {editEventId ? '수정 완료' : '저장하기'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. 🏝️ 휴가 상세정보 (읽기 전용) 팝업 */}
      {showVacationModal && selectedVacation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={()=>setShowVacationModal(false)}></div>
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-10 w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h4 className="font-black text-slate-800 flex items-center gap-3 text-xl">
                <CalendarIcon size={24} className="text-blue-600" /> 휴가 상세 정보
              </h4>
              <button onClick={() => setShowVacationModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-5 bg-blue-50 p-6 rounded-3xl border border-blue-100">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center font-black text-blue-600 shadow-sm text-2xl border border-blue-100">
                  {selectedVacation.user_name[0]}
                </div>
                <div>
                  <p className="font-black text-slate-800 text-xl mb-1">{selectedVacation.user_name}</p>
                  <p className="text-sm font-bold text-blue-600">{selectedVacation.site_name} 현장</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-5 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-1.5">휴가 구분</p>
                  <p className="text-base font-black text-slate-700">{selectedVacation.vacation_type}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-1.5">사용 일수</p>
                  <p className="text-base font-black text-slate-700">{selectedVacation.use_days}일</p>
                </div>
                <div className="col-span-2 pt-4 border-t border-slate-200">
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-1.5">일정 기간</p>
                  <p className="text-base font-black text-slate-700">{selectedVacation.start_date} <span className="text-slate-400 font-normal mx-2">~</span> {selectedVacation.end_date}</p>
                </div>
              </div>

              {selectedVacation.remarks && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mt-6">
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-3 flex items-center gap-1.5">
                    <MessageSquare size={14}/> 비상연락 및 인수인계
                  </p>
                  <p className="text-base font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedVacation.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. 📢 공지사항 읽기/쓰기 팝업 */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={()=>setShowNoticeModal(false)}></div>
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-10 w-full max-w-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-8 pb-5 border-b border-slate-100">
              <h4 className="font-black text-slate-800 flex items-center gap-3 text-2xl">
                <FileText size={24} className={noticeViewMode ? "text-slate-600" : "text-red-500"} /> 
                {noticeViewMode ? '본사 공지사항' : '새 공지 작성'}
              </h4>
              <button onClick={() => setShowNoticeModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2.5 rounded-full"><X size={20}/></button>
            </div>
            
            {!noticeViewMode ? (
              <div className="space-y-6">
                <div>
                  <label className="text-[13px] font-black text-slate-400 uppercase mb-2 block">공지 제목</label>
                  <input type="text" value={newNoticeTitle} onChange={e => setNewNoticeTitle(e.target.value)} placeholder="제목을 입력하세요" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-base font-bold focus:ring-2 focus:ring-red-200 outline-none" autoFocus />
                </div>
                <div>
                  <label className="text-[13px] font-black text-slate-400 uppercase mb-2 block">본문 내용</label>
                  <textarea value={newNoticeContent} onChange={e => setNewNoticeContent(e.target.value)} placeholder="직원들에게 전달할 내용을 상세히 적어주세요." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base font-bold focus:ring-2 focus:ring-red-200 outline-none h-64 resize-none custom-scrollbar" />
                </div>
                <button onClick={handleAddNotice} className="w-full mt-6 bg-slate-800 text-white font-black text-lg py-5 rounded-2xl hover:bg-slate-700 transition-colors shadow-lg">
                  공지 등록하기
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-black text-slate-800 mb-4 leading-snug">{selectedNotice?.title}</h2>
                <div className="flex items-center gap-4 text-[13px] font-bold text-slate-500 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5"><User size={16}/> {selectedNotice?.author_name}</div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                  <div className="flex items-center gap-1.5"><CalendarIcon size={16}/> {new Date(selectedNotice?.created_at).toLocaleDateString()}</div>
                </div>
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 min-h-[250px]">
                  <p className="text-base font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedNotice?.content}
                  </p>
                </div>
                {(userRole === 'master' || userRole === 'admin') && (
                  <button onClick={() => handleDeleteNotice(selectedNotice?.id)} className="w-full mt-8 bg-red-50 text-red-600 font-black text-base py-4 rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                    <Trash2 size={20}/> 이 공지 삭제하기
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}