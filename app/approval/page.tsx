'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, AlertCircle, Check, X, Printer, FileText, ChevronDown, Trash2, Edit, User, ShieldAlert, ChevronLeft, ChevronRight
} from 'lucide-react'

export default function ApprovalPage() {
  const [loading, setLoading] = useState(false)
  
  // --- [권한 및 유저 정보] ---
  const [userRole, setUserRole] = useState<string>('staff')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [userSite, setUserSite] = useState<string>('')

  // --- [입력 데이터] ---
  const [targetName, setTargetName] = useState('') 
  const [vType, setVType] = useState('연차 휴가')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [useDays, setUseDays] = useState('') 
  const [vRemarks, setVRemarks] = useState('')
  const [vSite, setVSite] = useState('') 
  const [dateError, setDateError] = useState(false) 
  const [editMode, setEditMode] = useState<string | null>(null)

  // --- [조회 데이터 및 필터/페이징] ---
  const [history, setHistory] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  // 📅 필터 상태 (기본값: 현재 연도, 이번 달)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString())
  
  // 📖 페이징 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 // 한 페이지당 보여줄 개수

  // 휴가 종료일 오류 검증
  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setDateError(true);
    } else {
      setDateError(false);
    }
  }, [startDate, endDate]);

  // 필터가 바뀌면 무조건 1페이지로 돌아가기
  useEffect(() => {
    setCurrentPage(1);
    setSelectedId(null);
  }, [filterYear, filterMonth]);

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email || '';
        setUserId(session.user.id);
        setUserEmail(email);
        
        const { data: profile } = await supabase.from('profiles').select('role, site_name').eq('id', session.user.id).single();
        
        let currentRole = profile?.role || 'staff';
        let currentSite = profile?.site_name || '';

        // 👑 대표님(master) 고정 이메일 적용
        if (email === 'bobyy88@naver.com') { 
          currentRole = 'master';
        }

        setUserRole(currentRole);
        setUserSite(currentSite);
        fetchHistory(currentRole, currentSite, session.user.id);
      }
    };
    initUser();
  }, [])

  const fetchHistory = async (role: string, site: string, uid: string) => {
    let query = supabase.from('vacation_approvals').select('*').order('created_at', { ascending: false });

    if (role === 'staff') {
      query = query.eq('user_id', uid);
    } else if (role === 'manager') {
      query = query.eq('site_name', site);
    }

    const { data, error } = await query;
    if (!error) setHistory(data || [])
  }

  const refreshData = () => {
    fetchHistory(userRole, userSite, userId);
  }

  const saveVacation = async () => {
    if (!targetName || !startDate || !endDate || !useDays || !vSite || !vRemarks) {
      return alert('대상자, 현장명, 사용 일수, 인수인계 등 모든 정보를 빠짐없이 입력해주세요.');
    }
    if (dateError) return alert('종료일이 시작일보다 빠를 수 없습니다.');

    setLoading(true);
    try {
      // ✅ 상태값 용어 변경 적용
      const initialStatus = (userRole === 'manager' || userRole === 'admin' || userRole === 'master') ? '본사 승인 대기' : '승인 대기';
      const payload = {
        user_id: userId, user_email: userEmail, user_name: targetName, vacation_type: vType,
        start_date: startDate, end_date: endDate, use_days: Number(useDays), site_name: vSite, remarks: vRemarks,
      };

      if (editMode) {
        const { error } = await supabase.from('vacation_approvals').update(payload).eq('id', editMode);
        if (error) throw error;
        setEditMode(null);
      } else {
        const { error } = await supabase.from('vacation_approvals').insert([{ ...payload, status: initialStatus }]);
        if (error) throw error;
      }
      
      setTargetName(''); setStartDate(''); setEndDate(''); setUseDays(''); setVRemarks(''); setVSite('');
      refreshData();
      // ✅ 완료 메시지 용어 변경 적용
      alert(editMode ? '수정 완료' : (initialStatus === '본사 승인 대기' ? '결재 요청 (현장승인 완료) 처리되었습니다.' : '결재 요청 완료'));
    } catch (e: any) { alert('저장 실패: ' + e.message); } finally { setLoading(false); }
  }

  const handleApproval = async (id: string, newStatus: string) => {
    if (!confirm(`${newStatus} 처리하시겠습니까?`)) return;
    const { error } = await supabase.from('vacation_approvals').update({ status: newStatus }).eq('id', id);
    if (error) alert(`[처리 실패] 상세 에러: ${error.message}`);
    else { alert(`${newStatus} 처리 완료`); refreshData(); }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('vacation_approvals').delete().eq('id', id);
    if (!error) { refreshData(); setSelectedId(null); }
  }

  const handleEdit = (item: any) => {
    setTargetName(item.user_name || ''); setVType(item.vacation_type); setStartDate(item.start_date);
    setEndDate(item.end_date); setUseDays(item.use_days?.toString() || ''); setVSite(item.site_name || '');
    setVRemarks(item.remarks || ''); setEditMode(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filteredHistory = history.filter(item => {
    if (!item.start_date) return true;
    const itemDate = new Date(item.start_date);
    const itemYear = itemDate.getFullYear().toString();
    const itemMonth = (itemDate.getMonth() + 1).toString();

    const matchYear = filterYear === 'all' || itemYear === filterYear;
    const matchMonth = filterMonth === 'all' || itemMonth === filterMonth;

    return matchYear && matchMonth;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
          ::-webkit-scrollbar { display: none; }
        }
      `}} />

      <div className="max-w-6xl mx-auto space-y-8 p-6 pb-20 animate-in fade-in duration-700 print:p-0 print:m-0 print:max-w-none print:w-full">
        {/* 상단 권한 표시 바 */}
        <div className="flex items-center justify-between print:hidden bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex gap-2">
            <div className={`px-4 py-2 text-white rounded-xl text-xs font-black flex items-center gap-2 ${userRole === 'master' ? 'bg-purple-600' : 'bg-slate-900'}`}>
              <User size={14}/> 
              {userRole === 'master' ? '최고 관리자 👑' : userRole === 'admin' ? '본사 관리자' : userRole === 'manager' ? `${userSite} 현장 소장` : `현장 근로자`}
            </div>
          </div>
          <div className="text-right px-2">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">System Operator</p>
            <p className="text-xs font-black text-slate-500">{userEmail}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block print:gap-0">
          
          {/* [좌측] 신청 폼 */}
          <div className="lg:col-span-1 print:hidden">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6 sticky top-8">
              <h3 className="text-xl font-black flex items-center gap-2 text-slate-800">
                {/* ✅ 용어 변경 적용 */}
                <Plus className="text-blue-600" size={22}/>{editMode ? '신청서 수정' : '휴가신청서 작성'}
              </h3>
              <div className="space-y-4">
                <div><InputLabel label="직원 성명 (휴가자)" /><input type="text" value={targetName} onChange={(e) => setTargetName(e.target.value)} placeholder="예: 홍길동 반장" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm" /></div>
                <div><InputLabel label="소속 현장명" /><input type="text" value={vSite} onChange={(e) => setVSite(e.target.value)} placeholder="현장명 입력" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm" /></div>
                <div><InputLabel label="휴가 구분" /><select value={vType} onChange={(e) => setVType(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700"><option>연차 휴가</option><option>오전 반차</option><option>오후 반차</option><option>특별휴가</option><option>병가</option></select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><InputLabel label="시작일" /><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-xs" /></div>
                  <div><InputLabel label="종료일" /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-xs ${dateError ? 'ring-2 ring-red-500 text-red-600' : ''}`} /></div>
                </div>
                {dateError && <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl"><AlertCircle size={16}/><p className="text-xs font-bold">종료일이 빠릅니다!</p></div>}
                <div><InputLabel label="총 사용 일수" /><input type="number" step="0.5" value={useDays} onChange={(e) => setUseDays(e.target.value)} placeholder="예: 1.5" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm text-blue-600 focus:ring-2 focus:ring-blue-500/20" /></div>
                <div><InputLabel label="비상연락망 및 인수인계 사항" /><textarea value={vRemarks} onChange={(e) => setVRemarks(e.target.value)} placeholder="비상 연락처 및 업무 인수인계 내용" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold h-24 resize-none text-sm" /></div>
                {/* ✅ 버튼 용어 변경 적용 */}
                <button onClick={saveVacation} disabled={loading || dateError} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50">
                  {loading ? '처리 중...' : (editMode ? '내용 수정' : (userRole === 'manager' || userRole === 'admin' || userRole === 'master' ? '결재 요청 (현장승인 완료)' : '결재 요청'))}
                </button>
              </div>
            </div>
          </div>

          {/* [우측] 리스트 및 기안서 영역 */}
          <div className="lg:col-span-2 print:w-full print:block">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px] print:border-none print:shadow-none print:rounded-none print:min-h-0 flex flex-col">
              
              <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">현장 신청 내역</h3>
                
                <div className="flex items-center gap-2">
                  <select 
                    value={filterYear} 
                    onChange={e => setFilterYear(e.target.value)} 
                    className="bg-slate-50 border border-slate-100 text-sm font-bold rounded-xl px-4 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="all">전체 연도</option>
                    <option value="2026">2026년</option>
                    <option value="2025">2025년</option>
                    <option value="2024">2024년</option>
                  </select>
                  <select 
                    value={filterMonth} 
                    onChange={e => setFilterMonth(e.target.value)} 
                    className="bg-slate-50 border border-slate-100 text-sm font-bold rounded-xl px-4 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="all">전체 월</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={String(i+1)}>{i+1}월</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* 리스트 본문 */}
              <div className="divide-y divide-slate-50 print:divide-none flex-1">
                {paginatedHistory.map((item) => (
                  <div key={item.id} className="print:block">
                    
                    <div onClick={() => setSelectedId(selectedId === item.id ? null : item.id)} className={`p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 print:hidden ${selectedId === item.id ? 'bg-blue-50/20' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"><FileText size={20}/></div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{item.vacation_type} <span className="text-blue-500">@{item.site_name}</span></p>
                          <p className="text-[10px] font-bold text-slate-400">대상: {item.user_name} | {item.start_date} ~ {item.end_date} (총 {item.use_days}일)</p>
                        </div>
                      </div>
                      <span className={`text-[9px] px-3 py-1 rounded-full font-black text-white ${item.status === '승인완료' ? 'bg-emerald-500' : item.status === '반려' ? 'bg-red-500' : 'bg-blue-500'}`}>{item.status}</span>
                    </div>

                    {selectedId === item.id && (
                      <div className="p-8 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300 print:p-0 print:border-none print:bg-white print:block">
                        
                        <div className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm rounded-[2rem] p-10 print:max-w-none print:w-full print:border-slate-300 print:shadow-none print:p-12 print:h-[260mm] print:flex print:flex-col print:rounded-[2rem]">
                          
                          <div className="text-left pb-4 flex justify-between items-start">
                            <div>
                              <h2 className="text-3xl font-black text-slate-800 print:text-[2.5rem] print:text-slate-900">휴가사용신청서</h2>
                              <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest print:text-[12px]">Vacation Application Form</p>
                            </div>
                            
                            <div className="flex gap-3 print:gap-4">
                              <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white w-16 print:w-20 print:border-slate-300">
                                <div className="bg-slate-50 w-full text-center py-1.5 text-[10px] font-bold text-slate-500 border-b border-slate-200 print:py-2 print:text-[11px]">현장소장</div>
                                <div className="h-16 flex items-center justify-center relative print:h-20">
                                  {/* ✅ 상태값 로직 변경 반영 */}
                                  {(item.status !== '승인 대기') && (
                                    <span className="text-red-500 font-black text-lg border-2 border-red-500 rounded-full w-12 h-12 flex items-center justify-center rotate-[-15deg] opacity-80 print:w-14 print:h-14 print:text-xl">승인</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white w-16 print:w-20 print:border-slate-300">
                                <div className="bg-slate-50 w-full text-center py-1.5 text-[10px] font-bold text-slate-500 border-b border-slate-200 print:py-2 print:text-[11px]">본사</div>
                                <div className="h-16 flex items-center justify-center relative print:h-20">
                                  {(item.status === '승인완료') && (
                                    <span className="text-red-500 font-black text-lg border-2 border-red-500 rounded-full w-12 h-12 flex items-center justify-center rotate-[-15deg] opacity-80 print:w-14 print:h-14 print:text-xl">승인</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-8 space-y-2 print:mt-10">
                            <DetailRow label="대상자" value={`${item.user_name} 님`} />
                            <DetailRow label="소속 현장명" value={item.site_name} />
                            <DetailRow label="휴가 구분" value={item.vacation_type} />
                            <DetailRow label="휴가 기간" value={`${item.start_date} ~ ${item.end_date}`} />
                            <DetailRow label="총 사용 일수" value={`${item.use_days || 0} 일`} />
                          </div>

                          <div className="flex-1 mt-6 p-8 bg-slate-50 rounded-3xl border border-slate-100 print:bg-slate-50 print:border-slate-200 print:rounded-3xl print:flex print:flex-col">
                            <p className="text-[12px] font-black text-slate-400 mb-4 uppercase tracking-widest print:text-slate-500">비상연락망 및 인수인계 사항</p>
                            <p className="font-bold text-base text-slate-700 whitespace-pre-wrap leading-relaxed print:text-[16px] print:text-slate-800 flex-1">
                              {item.remarks}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center pt-6 mt-6 print:mt-8 print:pt-4 border-t border-slate-100 print:border-slate-200">
                            <div className="text-xs font-bold text-slate-400 print:text-slate-500 print:text-sm">작성일자: {new Date(item.created_at).toLocaleDateString()}</div>
                            {/* ✅ 용어 변경 적용 */}
                            <div className="text-xs font-bold text-slate-400 print:text-slate-500 print:text-sm">신청자: {item.user_email}</div>
                          </div>
                        </div>

                        {/* 하단 버튼 영역 */}
                        <div className="mt-8 flex justify-center gap-3 print:hidden flex-wrap">
                          <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors"><Printer size={16}/> 인쇄</button>
                          
                          {/* ✅ 용어 및 상태값 로직 변경 적용 */}
                          {userEmail === item.user_email && item.status === '승인 대기' && (
                            <>
                              <button onClick={() => handleEdit(item)} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black text-sm hover:bg-slate-50 transition-colors">내용 수정</button>
                              <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-black text-sm hover:bg-red-100 transition-colors">신청 취소</button>
                            </>
                          )}
                          
                          {(userRole === 'manager' || userRole === 'admin' || userRole === 'master') && item.status === '승인 대기' && (
                            <button onClick={() => handleApproval(item.id, '본사 승인 대기')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition-colors">소장 승인</button>
                          )}
                          
                          {(userRole === 'admin' || userRole === 'master') && item.status === '본사 승인 대기' && (
                            <button onClick={() => handleApproval(item.id, '승인완료')} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-emerald-700 transition-colors">본사 최종승인</button>
                          )}
                          
                          {(userRole === 'manager' || userRole === 'admin' || userRole === 'master') && item.status !== '승인완료' && item.status !== '반려' && (
                            <button onClick={() => handleApproval(item.id, '반려')} className="bg-red-500 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-red-600 transition-colors">반려</button>
                          )}

                          {userRole === 'master' && (
                            <>
                              <div className="w-px bg-slate-200 mx-2"></div>
                              {item.status !== '승인완료' && (
                                <button onClick={() => handleApproval(item.id, '승인완료')} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-purple-700 transition-colors flex items-center gap-1">
                                  <ShieldAlert size={16} /> 마스터 강제 승인
                                </button>
                              )}
                              <button onClick={() => handleDelete(item.id)} className="bg-slate-100 text-slate-500 border border-slate-200 px-6 py-3 rounded-xl font-black text-sm hover:bg-slate-200 transition-colors">
                                강제 삭제
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* 데이터가 없을 때 */}
                {filteredHistory.length === 0 && (
                  <div className="p-20 flex flex-col items-center justify-center text-slate-400 print:hidden">
                    <AlertCircle size={48} className="text-slate-200 mb-4" />
                    <p className="font-bold text-lg text-slate-500">조회된 신청 내역이 없습니다.</p>
                    <p className="text-sm mt-1">다른 연도나 월을 선택해 보세요.</p>
                  </div>
                )}
              </div>

              {/* 하단 페이지네이션 */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-slate-50 flex items-center justify-center gap-4 print:hidden bg-white mt-auto">
                  <button
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      setSelectedId(null);
                    }}
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-30 transition-colors border border-slate-200"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-black text-slate-600 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100">
                    {currentPage} <span className="text-slate-400 mx-1">/</span> {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                      setSelectedId(null);
                    }}
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-30 transition-colors border border-slate-200"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex border-b border-slate-100 py-2.5 print:border-slate-100 print:py-3">
      <div className="w-28 bg-slate-50 rounded-xl p-3 font-bold text-[11px] flex items-center text-slate-500 print:bg-slate-50 print:text-slate-600 print:rounded-xl print:w-32 print:text-[13px] print:p-4">{label}</div>
      <div className="flex-1 p-3 font-bold text-sm text-slate-700 print:text-slate-800 print:text-base print:p-4 print:flex print:items-center">{value}</div>
    </div>
  )
}

function InputLabel({ label }: { label: string }) {
  return <label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">{label}</label>
}