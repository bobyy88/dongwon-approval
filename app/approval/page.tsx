'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
// 🚨 에러 원인 해결: Trash2 아이콘 추가 완료!
import { FileText, CheckCircle, XCircle, Clock, Calendar, MessageSquare, ShieldAlert, User, Send, Check, Trash2 } from 'lucide-react'

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true)
  
  // 로그인한 사용자 본인의 권한 및 정보
  const [userRole, setUserRole] = useState('staff')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userSite, setUserSite] = useState('')

  // 전체 데이터 목록 (드롭다운 선택용)
  const [sites, setSites] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  // 결재 데이터
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])

  // 📝 폼 입력 상태
  const [selectedSite, setSelectedSite] = useState('') // 선택된 현장
  const [selectedApplicantEmail, setSelectedApplicantEmail] = useState('') // 선택된 신청자
  const [vacationType, setVacationType] = useState('연차 휴가')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [useDays, setUseDays] = useState('1')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    initPage()
  }, [])

  const initPage = async () => {
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

      // 1. 공식 현장 목록 가져오기
      const { data: siteData } = await supabase.from('sites').select('*').order('name')
      if (siteData) setSites(siteData)

      // 2. 전체 직원 목록 가져오기
      const { data: profileData } = await supabase.from('profiles').select('*').order('name')
      if (profileData) setProfiles(profileData)

      // 3. 내 정보로 드롭다운 기본값 세팅 (본인 휴가는 본인이 바로 띄우도록)
      setSelectedSite(currentSite)
      setSelectedApplicantEmail(email)

      fetchData(currentRole, currentSite, email)
    }
    setLoading(false)
  }

  const fetchData = async (role: string, site: string, email: string) => {
    // 1. 나의 신청 내역
    const { data: myData } = await supabase.from('vacation_approvals')
      .select('*').eq('user_email', email).order('created_at', { ascending: false })
    if (myData) setMyRequests(myData)

    // 2. 결재 대기함 (권한별 필터링)
    if (role !== 'staff') {
      let targetStatus = role === 'manager' ? '승인 대기' : '본사 승인 대기'
      let query = supabase.from('vacation_approvals')
        .select('*').eq('status', targetStatus).order('created_at', { ascending: true })
      
      // 소장님은 자기 현장 것만 봄
      if (role === 'manager') query = query.eq('site_name', site)
      
      const { data: pendingData } = await query
      if (pendingData) setPendingApprovals(pendingData)
    }
  }

  // 현장이 바뀌면 소속 직원 필터링을 위해 신청자 이메일을 초기화
  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSite(e.target.value)
    setSelectedApplicantEmail('') 
  }

  const handleSubmit = async () => {
    if (!selectedSite || !selectedApplicantEmail) return alert('현장과 신청자를 정확히 선택해주세요.')
    if (!startDate || !endDate || !useDays) return alert('필수 항목(기간, 일수)을 입력해주세요.')
    if (new Date(endDate) < new Date(startDate)) return alert('종료일이 시작일보다 빠를 수 없습니다.')

    // 선택된 신청자의 이름 찾아오기
    const applicantProfile = profiles.find(p => p.email === selectedApplicantEmail)
    const applicantName = applicantProfile ? applicantProfile.name : userName

    // 💡 4단계 권한별 초기 결재선 자동 세팅 (신청하는 사람의 권한 기준)
    let initialStatus = '승인 대기' 
    if (userRole === 'manager') initialStatus = '본사 승인 대기' 
    if (userRole === 'admin' || userRole === 'master') initialStatus = '승인완료' 

    const { error } = await supabase.from('vacation_approvals').insert([{
      user_email: selectedApplicantEmail, // 💡 실제 휴가를 가는 사람의 이메일
      user_name: applicantName,           // 💡 실제 휴가를 가는 사람의 이름
      site_name: selectedSite,            // 💡 선택된 현장
      vacation_type: vacationType,
      start_date: startDate,
      end_date: endDate,
      use_days: parseFloat(useDays),
      remarks: remarks,
      status: initialStatus
    }])

    if (error) alert(`신청 실패: ${error.message}`)
    else {
      alert(`${applicantName}님의 휴가 신청이 성공적으로 기안되었습니다.`)
      setStartDate(''); setEndDate(''); setUseDays('1'); setRemarks('');
      // 성공 후 현재 로그인한 사람(본인) 기준으로 리스트 갱신
      fetchData(userRole, userSite, userEmail)
    }
  }

  const handleApprove = async (id: string, currentStatus: string) => {
    if (!confirm('이 휴가를 승인하시겠습니까?')) return
    let nextStatus = '승인완료'
    if (userRole === 'manager' && currentStatus === '승인 대기') {
      nextStatus = '본사 승인 대기'
    }
    await supabase.from('vacation_approvals').update({ status: nextStatus }).eq('id', id)
    fetchData(userRole, userSite, userEmail)
  }

  const handleReject = async (id: string) => {
    if (!confirm('이 휴가를 반려 처리하시겠습니까?')) return
    await supabase.from('vacation_approvals').update({ status: '반려' }).eq('id', id)
    fetchData(userRole, userSite, userEmail)
  }

  const deleteRequest = async (id: string) => {
    if (!confirm('신청 내역을 삭제하시겠습니까?')) return
    await supabase.from('vacation_approvals').delete().eq('id', id)
    fetchData(userRole, userSite, userEmail)
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case '승인 대기': return <span className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-[13px] font-black border border-orange-200">소장 승인 대기</span>
      case '본사 승인 대기': return <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-[13px] font-black border border-purple-200">본사 승인 대기</span>
      case '승인완료': return <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[13px] font-black border border-blue-200">승인 완료</span>
      case '반려': return <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-[13px] font-black border border-red-200">반려됨</span>
      default: return <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-[13px] font-black">{status}</span>
    }
  }

  if (loading) return <div className="p-20 text-center text-slate-400 font-bold text-lg">결재 시스템 데이터를 불러오는 중입니다...</div>

  return (
    <div className="max-w-[1600px] w-full mx-auto space-y-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-700 pb-20 pt-6">
      
      {/* 🚀 상단 타이틀 배너 */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <FileText className="text-blue-600" size={28}/> 
            전자 결재 시스템
          </h2>
          <p className="text-base font-bold text-slate-400 mt-2">휴가를 신청하고 결재 진행 상황을 실시간으로 확인합니다.</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-4">
          <p className="text-xs text-slate-400 font-black uppercase tracking-widest border-r border-slate-200 pr-4">나의 권한</p>
          <p className="font-bold text-base text-slate-700 flex items-center gap-2">
            {userRole === 'master' ? <><ShieldAlert size={18} className="text-purple-500"/> 최고 관리자</> : 
             userRole === 'admin' ? <><User size={18} className="text-emerald-500"/> 본사 관리자</> : 
             userRole === 'manager' ? <><User size={18} className="text-blue-500"/> 현장 소장</> : '일반 근로자'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* 📝 1. 휴가 신청 폼 (좌측 1칸) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col xl:col-span-1">
          <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-100">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Calendar size={24}/></div>
            <h3 className="text-xl font-black text-slate-800">휴가 신청서 작성</h3>
          </div>

          <div className="space-y-6 flex-1">
            
            {/* ✅ 추가됨: 소속 현장 및 신청자 선택 (대리 기안 가능) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-2 block">소속 현장</label>
                <select value={selectedSite} onChange={handleSiteChange} className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl px-4 py-4 text-base font-black text-blue-800 focus:ring-2 focus:ring-blue-200 outline-none appearance-none cursor-pointer">
                  <option value="" disabled>현장 선택</option>
                  {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-2 block">신청자 성명</label>
                <select value={selectedApplicantEmail} onChange={e => setSelectedApplicantEmail(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl px-4 py-4 text-base font-black text-blue-800 focus:ring-2 focus:ring-blue-200 outline-none appearance-none cursor-pointer">
                  <option value="" disabled>직원 선택</option>
                  {/* 선택한 현장의 직원들만 보여주도록 필터링! */}
                  {profiles
                    .filter(p => !selectedSite || p.site_name === selectedSite)
                    .map(p => (
                      <option key={p.id} value={p.email}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-2 block">휴가 구분</label>
              <select value={vacationType} onChange={e => setVacationType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base font-black text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none appearance-none cursor-pointer">
                <option value="연차 휴가">연차 휴가</option>
                <option value="오전 반차">오전 반차</option>
                <option value="오후 반차">오후 반차</option>
                <option value="병가">병가</option>
                <option value="공가 / 경조사">공가 / 경조사</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-2 block">시작일</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base font-black text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none" />
              </div>
              <div>
                <label className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-2 block">종료일</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base font-black text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none" />
              </div>
            </div>

            <div>
              <label className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-2 block">사용 일수 (차감일)</label>
              <div className="flex items-center gap-3">
                <input type="number" step="0.5" min="0.5" value={useDays} onChange={e => setUseDays(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base font-black text-slate-800 focus:ring-2 focus:ring-blue-200 outline-none" />
                <span className="text-base font-black text-slate-500">일</span>
              </div>
            </div>

            <div>
              <label className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-2 block">비상연락처 및 인수인계 (선택)</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="휴가 중 긴급 연락처나 업무 대직자를 적어주세요." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base font-bold text-slate-700 focus:ring-2 focus:ring-blue-200 outline-none h-32 resize-none custom-scrollbar" />
            </div>
          </div>

          <button onClick={handleSubmit} className="w-full mt-8 bg-blue-600 text-white font-black text-lg py-5 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2">
            <Send size={20}/> 기안 올리기
          </button>
        </div>

        {/* 🗂️ 2. 리스트 영역 (결재 대기함 & 내 신청 내역) */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* ✅ [권한자 전용] 결재 대기함 */}
          {(userRole !== 'staff') && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center"><CheckCircle size={24}/></div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    결재 대기함 <span className="bg-orange-500 text-white text-[13px] px-2.5 py-1 rounded-lg">{pendingApprovals.length}</span>
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 border-y border-slate-100 text-[13px] uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="py-4 px-6 font-black w-40">신청자 (현장)</th>
                      <th className="py-4 px-6 font-black">휴가 내용</th>
                      <th className="py-4 px-6 font-black w-48 text-center">현재 상태</th>
                      <th className="py-4 px-6 font-black w-32 text-center">결재 액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingApprovals.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 px-6">
                          <p className="text-base font-black text-slate-800">{req.user_name}</p>
                          <p className="text-[13px] font-bold text-blue-500 mt-1">{req.site_name}</p>
                        </td>
                        <td className="py-5 px-6">
                          <p className="text-base font-black text-slate-800 flex items-center gap-2">
                            {req.vacation_type} <span className="text-[13px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{req.use_days}일 차감</span>
                          </p>
                          <p className="text-[13px] font-bold text-slate-500 mt-1 flex items-center gap-1"><Calendar size={12}/> {req.start_date} ~ {req.end_date}</p>
                          {req.remarks && <p className="text-[13px] font-bold text-slate-400 mt-2 bg-slate-50 p-2 rounded-lg line-clamp-1 border border-slate-100">💬 {req.remarks}</p>}
                        </td>
                        <td className="py-5 px-6 text-center">{getStatusBadge(req.status)}</td>
                        <td className="py-5 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleApprove(req.id, req.status)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-colors" title="승인하기">
                              <Check size={20}/>
                            </button>
                            <button onClick={() => handleReject(req.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors" title="반려하기">
                              <XCircle size={20}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pendingApprovals.length === 0 && (
                      <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold text-base">결재를 대기 중인 문서가 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 📂 3. 나의 신청 내역 */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
            <div className="flex items-center mb-6 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center"><Clock size={24}/></div>
                <h3 className="text-xl font-black text-slate-800">나의 신청 내역</h3>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-50 border-y border-slate-100 text-[13px] uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="py-4 px-6 font-black w-32">신청일</th>
                    <th className="py-4 px-6 font-black">휴가 내용</th>
                    <th className="py-4 px-6 font-black w-40 text-center">진행 상태</th>
                    <th className="py-4 px-6 font-black w-20 text-center">취소</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {myRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-5 px-6 text-[13px] font-bold text-slate-400">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-5 px-6">
                        <p className="text-base font-black text-slate-800">{req.vacation_type} <span className="text-[13px] font-bold text-slate-400 ml-1">({req.use_days}일)</span></p>
                        <p className="text-[13px] font-bold text-slate-500 mt-1">{req.start_date} ~ {req.end_date}</p>
                      </td>
                      <td className="py-5 px-6 text-center">{getStatusBadge(req.status)}</td>
                      <td className="py-5 px-6 text-center">
                        <button onClick={() => deleteRequest(req.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="신청 취소">
                          {/* 🚨 복구된 Trash2 아이콘! */}
                          <Trash2 size={20}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {myRequests.length === 0 && (
                    <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold text-base">신청한 휴가 내역이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}