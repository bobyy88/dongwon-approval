'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
// ✅ Printer 아이콘 유지
import { FileText, CheckCircle, XCircle, Clock, Calendar, MessageSquare, ShieldAlert, User, Send, Check, Trash2, Printer } from 'lucide-react'

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true)
  
  // 로그인한 사용자 본인의 권한 및 정보
  const [userRole, setUserRole] = useState('staff')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userSite, setUserSite] = useState('')

  // 전체 데이터 목록 (대리 기안 - 드롭다운 선택용)
  const [sites, setSites] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  // 결재 데이터
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  // ✅ 승인 완료함 추가
  const [completedApprovals, setCompletedApprovals] = useState<any[]>([])

  // 📝 폼 입력 상태
  const [selectedSite, setSelectedSite] = useState('') 
  const [selectedApplicantEmail, setSelectedApplicantEmail] = useState('') 
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
      
      let currentRole = profile?.role || 'pending'
      let currentSite = profile?.site_name || '미배정'
      let currentName = profile?.name || '이름없음'

      if (email === 'bobyy88@naver.com') { 
        currentRole = 'master'
        currentSite = '본사'
      }

      setUserRole(currentRole)
      setUserSite(currentSite)
      setUserName(currentName)

      if (currentRole !== 'pending') {
        const { data: siteData } = await supabase.from('sites').select('*').order('name')
        if (siteData) setSites(siteData)

        const { data: profileData } = await supabase.from('profiles').select('*').order('name')
        if (profileData) setProfiles(profileData)

        setSelectedSite(currentSite)
        setSelectedApplicantEmail(email)

        fetchData(currentRole, currentSite, email)
      }
    }
    setLoading(false)
  }

  const fetchData = async (role: string, site: string, email: string) => {
    const { data: myData } = await supabase.from('vacation_approvals')
      .select('*').eq('user_email', email).order('created_at', { ascending: false })
    if (myData) setMyRequests(myData)

    if (role !== 'staff') {
      let targetStatus = role === 'manager' ? '승인 대기' : '본사 승인 대기'
      
      let pQuery = supabase.from('vacation_approvals').select('*').eq('status', targetStatus).order('created_at', { ascending: true })
      // ✅ 승인 완료함 쿼리
      let cQuery = supabase.from('vacation_approvals').select('*').eq('status', '승인완료').order('created_at', { ascending: false }).limit(30)
      
      if (role === 'manager') {
        pQuery = pQuery.eq('site_name', site)
        cQuery = cQuery.eq('site_name', site)
      }
      
      const { data: pendingData } = await pQuery
      if (pendingData) setPendingApprovals(pendingData)
      
      const { data: completedData } = await cQuery
      if (completedData) setCompletedApprovals(completedData)
    }
  }

  // ✅ 동원전력개발 UI 인쇄 양식 (날짜 줄바꿈 방지 적용)
  const handlePrint = (req: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printDate = new Date(req.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const html = `
      <html>
        <head>
          <title>동원전력개발 - 휴가 신청서</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print { 
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 20px; } 
            }
            body { font-family: 'Pretendard', 'Noto Sans KR', sans-serif; color: #1e293b; background-color: #ffffff; }
          </style>
        </head>
        <body>
          <div class="max-w-3xl mx-auto mt-8">
            <div class="flex justify-between items-end mb-12 border-b-2 border-slate-100 pb-6">
              <div>
                <p class="text-sm font-black text-blue-600 tracking-widest mb-2 uppercase">Dongwon Electric</p>
                <h1 class="text-4xl font-black text-slate-900">휴가 신청서</h1>
              </div>
              <div class="flex gap-2 text-center">
                <div class="border border-slate-200 rounded-xl overflow-hidden w-20 flex flex-col">
                  <div class="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 py-1.5">기안</div>
                  <div class="h-16 flex items-center justify-center text-sm font-bold text-slate-800">${req.user_name}</div>
                </div>
                <div class="border border-slate-200 rounded-xl overflow-hidden w-20 flex flex-col">
                  <div class="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 py-1.5">검토</div>
                  <div class="h-16 flex items-center justify-center text-sm font-bold text-slate-300"></div>
                </div>
                <div class="border border-slate-200 rounded-xl overflow-hidden w-20 flex flex-col">
                  <div class="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 py-1.5">승인</div>
                  <div class="h-16 flex items-center justify-center text-blue-600 font-black">승인완료</div>
                </div>
              </div>
            </div>
            
            <div class="bg-slate-50 rounded-[2rem] p-8 mb-8 border border-slate-100">
              <div class="grid grid-cols-2 gap-y-8 gap-x-8">
                <div>
                  <p class="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">신청자</p>
                  <p class="text-lg font-black text-slate-800 whitespace-nowrap">${req.user_name}</p>
                </div>
                <div>
                  <p class="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">소속 현장</p>
                  <p class="text-lg font-black text-blue-600 whitespace-nowrap">${req.site_name}</p>
                </div>
                <div>
                  <p class="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">휴가 구분</p>
                  <div class="inline-block bg-white border border-slate-200 px-4 py-2 rounded-xl text-base font-black text-slate-700 shadow-sm whitespace-nowrap">
                    ${req.vacation_type}
                  </div>
                </div>
                
                <div>
                  <p class="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">휴가 기간 (사용 일수)</p>
                  <div class="flex items-center flex-wrap gap-2">
                    <span class="text-lg font-black text-slate-800 whitespace-nowrap">${req.start_date}</span>
                    <span class="text-slate-400 font-normal">~</span> 
                    <span class="text-lg font-black text-slate-800 whitespace-nowrap">${req.end_date}</span>
                    <span class="text-sm font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg whitespace-nowrap shrink-0">총 ${req.use_days}일</span>
                  </div>
                </div>

                <div class="col-span-2 mt-4">
                  <p class="text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">비상연락처 및 인수인계 사항</p>
                  <div class="bg-white border border-slate-200 rounded-2xl p-6 min-h-[140px] text-base font-bold text-slate-600 leading-relaxed whitespace-pre-wrap shadow-sm">${req.remarks || '특이사항 없음'}</div>
                </div>
              </div>
            </div>

            <div class="text-center mt-16 pt-12 border-t border-slate-100">
              <p class="text-base font-bold text-slate-500 mb-4">위와 같이 휴가를 신청하오니 승인하여 주시기 바랍니다.</p>
              <p class="text-xl font-black text-slate-800 mb-16">${printDate}</p>
              <div class="flex items-center justify-center gap-3">
                <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">DW</div>
                <h2 class="text-3xl font-black text-slate-900 tracking-widest">동원전력개발 주식회사</h2>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); window.close(); }, 500); 
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSite(e.target.value)
    setSelectedApplicantEmail('') 
  }

  const handleSubmit = async () => {
    if (!selectedSite || !selectedApplicantEmail) return alert('현장과 신청자를 정확히 선택해주세요.')
    if (!startDate || !endDate || !useDays) return alert('필수 항목(기간, 일수)을 입력해주세요.')
    if (new Date(endDate) < new Date(startDate)) return alert('종료일이 시작일보다 빠를 수 없습니다.')

    const applicantProfile = profiles.find(p => p.email === selectedApplicantEmail)
    const applicantName = applicantProfile ? applicantProfile.name : userName

    let initialStatus = '승인 대기' 
    if (userRole === 'manager') initialStatus = '본사 승인 대기' 
    if (userRole === 'admin' || userRole === 'master') initialStatus = '승인완료' 

    const { error } = await supabase.from('vacation_approvals').insert([{
      user_email: selectedApplicantEmail, 
      user_name: applicantName,            
      site_name: selectedSite,             
      vacation_type: vacationType,
      start_date: startDate,
      end_date: endDate,
      use_days: parseFloat(useDays),
      remarks: remarks,
      status: initialStatus
    }])

    if (error) alert(`신청 실패: ${error.message}`)
    else {
      alert(`${applicantName}님의 휴가 신청서가 제출되었습니다.`)
      setStartDate(''); setEndDate(''); setUseDays('1'); setRemarks('');
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


  // =========================================================================
  // 🚨 렌더링 시작
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-20 text-center text-slate-400 font-bold text-lg">결재 시스템 데이터를 불러오는 중입니다...</div>
      </div>
    )
  }

  // 🔒 승인 대기자 원천 차단 화면
  if (userRole === 'pending') {
    return (
      <div className="max-w-[1600px] w-full mx-auto px-4 py-20 animate-in fade-in zoom-in-95 flex items-center justify-center min-h-[80vh]">
        <div className="max-w-2xl w-full bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-16 text-center flex flex-col items-center">
          <div className="w-28 h-28 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-8 shadow-inner border border-orange-100">
            <ShieldAlert size={56} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4">관리자 승인 대기 중입니다</h2>
          <p className="text-base font-bold text-slate-500 mb-10 leading-relaxed bg-slate-50 p-8 rounded-2xl border border-slate-100">
            성공적으로 회원가입이 완료되었습니다.<br/><br/>
            현재 회원님의 계정은 <span className="text-orange-600 bg-orange-100 px-2 py-1 rounded-md">승인 대기 (Pending)</span> 상태입니다.<br/>
            대표님 또는 본사 관리자의 <strong className="text-slate-700">승인 및 현장 배정</strong>이 완료된 후<br/>
            시스템의 모든 기능을 정상적으로 이용하실 수 있습니다.
          </p>
          <button onClick={() => window.location.reload()} className="bg-slate-800 text-white font-black text-lg px-10 py-5 rounded-2xl hover:bg-slate-700 transition-colors shadow-lg flex items-center gap-3">
            승인 확인 새로고침
          </button>
        </div>
      </div>
    )
  }

  // 정상 승인된 사용자의 업무결재 메인 화면
  return (
    <div className="max-w-[1600px] w-full mx-auto space-y-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-700 pb-20 pt-6">
      
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
        
        {/* 📝 1. 휴가 신청 폼 */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col xl:col-span-1">
          <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-100">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Calendar size={24}/></div>
            <h3 className="text-xl font-black text-slate-800">휴가 신청서 작성</h3>
          </div>

          <div className="space-y-6 flex-1">
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
            <Send size={20}/> 휴가신청서 제출
          </button>
        </div>

        {/* 🗂️ 2. 리스트 영역 */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* ✅ 결재 대기함 */}
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

          {/* ✅ [권한자 전용] 최근 승인 완료함 (인쇄 버튼) */}
          {(userRole !== 'staff') && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><FileText size={24}/></div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    최근 승인 완료함 <span className="bg-blue-100 text-blue-600 text-[13px] px-2.5 py-1 rounded-lg">출력 가능</span>
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 border-y border-slate-100 text-[13px] uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="py-4 px-6 font-black w-40">신청자 (현장)</th>
                      <th className="py-4 px-6 font-black">휴가 내용</th>
                      <th className="py-4 px-6 font-black w-32 text-center">결재 문서 출력</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {completedApprovals.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 px-6">
                          <p className="text-base font-black text-slate-800">{req.user_name}</p>
                          <p className="text-[13px] font-bold text-blue-500 mt-1">{req.site_name}</p>
                        </td>
                        <td className="py-5 px-6">
                          <p className="text-base font-black text-slate-800 flex items-center gap-2">
                            {req.vacation_type} <span className="text-[13px] font-bold text-slate-400">({req.use_days}일)</span>
                          </p>
                          <p className="text-[13px] font-bold text-slate-500 mt-1">{req.start_date} ~ {req.end_date}</p>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <button onClick={() => handlePrint(req)} className="px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 mx-auto font-black text-sm shadow-sm">
                            <Printer size={16}/> 출력하기
                          </button>
                        </td>
                      </tr>
                    ))}
                    {completedApprovals.length === 0 && (
                      <tr><td colSpan={3} className="py-12 text-center text-slate-400 font-bold text-base">최근 승인된 내역이 없습니다.</td></tr>
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
                    <th className="py-4 px-6 font-black w-40 text-center">상태/출력</th>
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
                      <td className="py-5 px-6 text-center flex flex-col items-center justify-center gap-2">
                        {getStatusBadge(req.status)}
                        {/* ✅ 내 문서가 승인 완료되면 인쇄 버튼 활성화 */}
                        {req.status === '승인완료' && (
                          <button onClick={() => handlePrint(req)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1 text-[11px] font-black">
                            <Printer size={14}/> 서류 출력
                          </button>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center">
                        <button onClick={() => deleteRequest(req.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="신청 취소">
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