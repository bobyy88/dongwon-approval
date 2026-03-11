'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, CheckCircle, XCircle, Clock, Calendar, MessageSquare, ShieldAlert, User, Send, Check, Trash2, Printer } from 'lucide-react'

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true)
  
  // 로그인한 사용자 본인의 권한 및 정보
  const [userRole, setUserRole] = useState('staff')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userSite, setUserSite] = useState('')

  // 전체 데이터 목록
  const [sites, setSites] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  // 결재 데이터
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])

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

      if (email === 'bobyy88@naver.com') { currentRole = 'master'; currentSite = '본사'; }

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
    const { data: myData } = await supabase.from('vacation_approvals').select('*').eq('user_email', email).order('created_at', { ascending: false })
    if (myData) setMyRequests(myData)

    if (role !== 'staff') {
      let targetStatus = role === 'manager' ? '승인 대기' : '본사 승인 대기'
      let query = supabase.from('vacation_approvals').select('*').eq('status', targetStatus).order('created_at', { ascending: true })
      if (role === 'manager') query = query.eq('site_name', site)
      const { data: pendingData } = await query
      if (pendingData) setPendingApprovals(pendingData)
    }
  }

  // 🖨️ 인쇄 기능 (새 탭에서 동원전력개발 양식 생성)
  const handlePrint = (req: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `
      <html>
        <head>
          <title>동원전력개발 - 휴가 신청서</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body onload="window.print(); window.close();" class="p-10 text-slate-800">
          <div class="max-w-3xl mx-auto border-4 border-slate-900 p-12 rounded-[2.5rem]">
            <h1 class="text-4xl font-black text-center mb-10 underline decoration-slate-200 underline-offset-8">휴 가 신 청 서</h1>
            <div class="grid grid-cols-2 gap-6 mb-10">
              <div class="p-4 bg-slate-50 rounded-2xl"><p class="text-xs font-black text-slate-400">신청인</p><p class="text-xl font-black">${req.user_name}</p></div>
              <div class="p-4 bg-slate-50 rounded-2xl"><p class="text-xs font-black text-slate-400">소속 현장</p><p class="text-xl font-black">${req.site_name}</p></div>
            </div>
            <div class="space-y-6 text-lg">
              <div class="border-b pb-4"><span class="font-black w-32 inline-block">휴가 구분:</span> ${req.vacation_type}</div>
              <div class="border-b pb-4"><span class="font-black w-32 inline-block">기간:</span> ${req.start_date} ~ ${req.end_date} (${req.use_days}일)</div>
              <div class="min-h-[150px]"><p class="font-black mb-2">비고 및 업무 인수인계:</p><p class="text-slate-600">${req.remarks || '없음'}</p></div>
            </div>
            <div class="mt-20 text-center">
              <p class="text-xl font-bold mb-10">${new Date(req.created_at).toLocaleDateString()} 기안</p>
              <p class="text-3xl font-black">주식회사 동원전력개발 귀중</p>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSiteChange = (e: any) => { setSelectedSite(e.target.value); setSelectedApplicantEmail(''); }

  const handleSubmit = async () => {
    if (!selectedSite || !selectedApplicantEmail || !startDate || !endDate) return alert('필수 항목을 입력해주세요.')
    const applicant = profiles.find(p => p.email === selectedApplicantEmail)
    let initialStatus = userRole === 'manager' ? '본사 승인 대기' : (userRole === 'admin' || userRole === 'master' ? '승인완료' : '승인 대기')
    const { error } = await supabase.from('vacation_approvals').insert([{
      user_email: selectedApplicantEmail, user_name: applicant?.name || userName, site_name: selectedSite,
      vacation_type: vacationType, start_date: startDate, end_date: endDate, use_days: parseFloat(useDays), remarks: remarks, status: initialStatus
    }])
    if (error) alert(error.message)
    else { alert('신청 완료'); setStartDate(''); setEndDate(''); setRemarks(''); fetchData(userRole, userSite, userEmail); }
  }

  const handleApprove = async (id: string, currentStatus: string) => {
    if (!confirm('승인하시겠습니까?')) return
    let nextStatus = (userRole === 'manager' && currentStatus === '승인 대기') ? '본사 승인 대기' : '승인완료'
    await supabase.from('vacation_approvals').update({ status: nextStatus }).eq('id', id)
    fetchData(userRole, userSite, userEmail)
  }

  const handleReject = async (id: string) => {
    if (!confirm('반려하시겠습니까?')) return
    await supabase.from('vacation_approvals').update({ status: '반려' }).eq('id', id)
    fetchData(userRole, userSite, userEmail)
  }

  const deleteRequest = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
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

  if (loading) return <div className="flex items-center justify-center min-h-screen font-black text-slate-400">데이터 로딩 중...</div>

  // 🔒 승인 대기자 차단 화면
  if (userRole === 'pending') {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-20 flex items-center justify-center min-h-[80vh]">
        <div className="max-w-2xl w-full bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-16 text-center">
          <div className="w-28 h-28 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-8 mx-auto border border-orange-100"><ShieldAlert size={56} /></div>
          <h2 className="text-3xl font-black text-slate-800 mb-4">관리자 승인 대기 중</h2>
          <p className="text-base font-bold text-slate-500 mb-10 bg-slate-50 p-8 rounded-2xl">회원가입은 완료되었으나, 본사의 승인 및 현장 배정이 필요합니다.</p>
          <button onClick={() => window.location.reload()} className="bg-slate-800 text-white font-black text-lg px-10 py-5 rounded-2xl shadow-lg">승인 확인 새로고침</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] w-full mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-20 pt-6">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><FileText className="text-blue-600" size={28}/> 전자 결재 시스템</h2>
          <p className="text-base font-bold text-slate-400 mt-2">동원전력개발 휴가 신청 및 승인 프로세스</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-4">
          <p className="font-bold text-base text-slate-700 flex items-center gap-2">
            {userRole === 'master' ? '최고 관리자' : userRole === 'admin' ? '본사 관리자' : userRole === 'manager' ? '현장 소장' : '일반 근로자'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* 📝 신청 폼 */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col xl:col-span-1">
          <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-100">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Calendar size={24}/></div>
            <h3 className="text-xl font-black text-slate-800">휴가 신청서 작성</h3>
          </div>
          <div className="space-y-6 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[13px] font-black text-slate-400 uppercase mb-2 block">소속 현장</label>
                <select value={selectedSite} onChange={handleSiteChange} className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl px-4 py-4 text-base font-black text-blue-800 outline-none appearance-none cursor-pointer">
                  <option value="" disabled>현장 선택</option>
                  {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div><label className="text-[13px] font-black text-slate-400 uppercase mb-2 block">신청자 성명</label>
                <select value={selectedApplicantEmail} onChange={e => setSelectedApplicantEmail(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl px-4 py-4 text-base font-black text-blue-800 outline-none appearance-none cursor-pointer">
                  <option value="" disabled>직원 선택</option>
                  {profiles.filter(p => !selectedSite || p.site_name === selectedSite).map(p => (<option key={p.id} value={p.email}>{p.name}</option>))}
                </select>
              </div>
            </div>
            <div><label className="text-[13px] font-black text-slate-400 uppercase mb-2 block">휴가 구분</label>
              <select value={vacationType} onChange={e => setVacationType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base font-black text-slate-800 outline-none">
                <option value="연차 휴가">연차 휴가</option><option value="오전 반차">오전 반차</option><option value="오후 반차">오후 반차</option><option value="병가">병가</option><option value="공가 / 경조사">공가 / 경조사</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base font-black text-slate-800 outline-none" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base font-black text-slate-800 outline-none" />
            </div>
            <div><label className="text-[13px] font-black text-slate-400 uppercase mb-2 block">사용 일수</label>
              <input type="number" step="0.5" value={useDays} onChange={e => setUseDays(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base font-black text-slate-800 outline-none" />
            </div>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="비고 및 인수인계 사항" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base font-bold text-slate-700 h-32 resize-none" />
          </div>
          <button onClick={handleSubmit} className="w-full mt-8 bg-blue-600 text-white font-black text-lg py-5 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2"><Send size={20}/> 기안 올리기</button>
        </div>

        {/* 🗂️ 리스트 영역 */}
        <div className="xl:col-span-2 space-y-8">
          {userRole !== 'staff' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3"><CheckCircle size={24} className="text-orange-500"/> 결재 대기함 <span className="bg-orange-500 text-white text-[13px] px-2.5 py-1 rounded-lg">{pendingApprovals.length}</span></h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 border-y border-slate-100 text-[13px] uppercase text-slate-500">
                    <tr><th className="py-4 px-6 font-black w-40">신청자 (현장)</th><th className="py-4 px-6 font-black">휴가 내용</th><th className="py-4 px-6 font-black w-48 text-center">현재 상태</th><th className="py-4 px-6 font-black w-32 text-center">결재 액션</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingApprovals.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/50">
                        <td className="py-5 px-6"><p className="text-base font-black text-slate-800">{req.user_name}</p><p className="text-[13px] font-bold text-blue-500 mt-1">{req.site_name}</p></td>
                        <td className="py-5 px-6">
                          <p className="text-base font-black text-slate-800 flex items-center gap-2">{req.vacation_type} <span className="text-[13px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{req.use_days}일 차감</span></p>
                          <p className="text-[13px] font-bold text-slate-500 mt-1 flex items-center gap-1"><Calendar size={12}/> {req.start_date} ~ {req.end_date}</p>
                          {req.remarks && <p className="text-[13px] font-bold text-slate-400 mt-2 bg-slate-50 p-2 rounded-lg line-clamp-1 border border-slate-100">💬 {req.remarks}</p>}
                        </td>
                        <td className="py-5 px-6 text-center">{getStatusBadge(req.status)}</td>
                        <td className="py-5 px-6 text-center"><div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleApprove(req.id, req.status)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-colors"><Check size={20}/></button>
                          <button onClick={() => handleReject(req.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors"><XCircle size={20}/></button>
                        </div></td>
                      </tr>
                    ))}
                    {pendingApprovals.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold">대기 중인 문서가 없습니다.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3"><Clock size={24} className="text-slate-600"/> 나의 신청 내역</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-50 border-y border-slate-100 text-[13px] uppercase text-slate-500">
                  <tr><th className="py-4 px-6 font-black w-32">신청일</th><th className="py-4 px-6 font-black">휴가 내용</th><th className="py-4 px-6 font-black w-40 text-center">진행 상태</th><th className="py-4 px-6 font-black w-20 text-center">취소</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {myRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="py-5 px-6 text-[13px] font-bold text-slate-400">{new Date(req.created_at).toLocaleDateString()}</td>
                      <td className="py-5 px-6">
                        <p className="text-base font-black text-slate-800">{req.vacation_type} <span className="text-[13px] font-bold text-slate-400 ml-1">({req.use_days}일)</span></p>
                        <p className="text-[13px] font-bold text-slate-500 mt-1">{req.start_date} ~ {req.end_date}</p>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                          {getStatusBadge(req.status)}
                          {req.status === '승인완료' && (
                            <button onClick={() => handlePrint(req)} className="flex items-center gap-1 bg-slate-800 text-white px-3 py-1 rounded-lg text-[11px] font-black hover:bg-slate-700 transition-colors mt-1">
                              <Printer size={14}/> PDF 출력
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center"><button onClick={() => deleteRequest(req.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}