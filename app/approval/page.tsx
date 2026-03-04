'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, AlertCircle, Check, X, Printer, FileText, ChevronDown, Trash2, Edit, User
} from 'lucide-react'

export default function ApprovalPage() {
  const [loading, setLoading] = useState(false)
  
  // --- [권한 및 유저 정보] ---
  const [userRole, setUserRole] = useState<string>('staff')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

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

  // --- [조회 데이터] ---
  const [history, setHistory] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 휴가 종료일 오류 검증
  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setDateError(true);
    } else {
      setDateError(false);
    }
  }, [startDate, endDate]);

  // 유저 초기화 및 권한 확인
  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email || '';
        setUserId(session.user.id);
        setUserEmail(email);
        
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        
        if (profile) {
          setUserRole(profile.role);
        } else {
          if (email === '대표님@이메일.com') setUserRole('admin'); 
        }
      }
    };
    initUser();
    fetchHistory();
  }, [])

  const fetchHistory = async () => {
    const { data, error } = await supabase.from('vacation_approvals').select('*').order('created_at', { ascending: false })
    if (!error) setHistory(data || [])
  }

  // 상신 로직
  const saveVacation = async () => {
    if (!targetName || !startDate || !endDate || !useDays || !vSite || !vRemarks) {
      return alert('대상자, 현장명, 사용 일수, 인수인계 등 모든 정보를 빠짐없이 입력해주세요.');
    }
    if (dateError) {
      return alert('종료일이 시작일보다 빠를 수 없습니다.');
    }

    setLoading(true);
    try {
      const initialStatus = (userRole === 'manager' || userRole === 'admin') ? '결재 중' : '결재 전';

      const payload = {
        user_id: userId,
        user_email: userEmail,
        user_name: targetName,
        vacation_type: vType,
        start_date: startDate,
        end_date: endDate,
        use_days: Number(useDays),
        site_name: vSite,
        remarks: vRemarks,
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
      fetchHistory();
      alert(editMode ? '수정 완료' : (initialStatus === '결재 중' ? '상신 및 현장승인 처리되었습니다.' : '상신 완료'));
    } catch (e: any) { alert('저장 실패: ' + e.message); } finally { setLoading(false); }
  }

  // 결재 처리
  const handleApproval = async (id: string, newStatus: string) => {
    if (!confirm(`${newStatus} 처리하시겠습니까?`)) return;
    const { error } = await supabase.from('vacation_approvals').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert(`[결재 실패] 상세 에러: ${error.message}`);
    } else {
      alert(`${newStatus} 처리 완료`);
      fetchHistory();
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('vacation_approvals').delete().eq('id', id);
    if (!error) { fetchHistory(); setSelectedId(null); }
  }

  const handleEdit = (item: any) => {
    setTargetName(item.user_name || '');
    setVType(item.vacation_type);
    setStartDate(item.start_date);
    setEndDate(item.end_date);
    setUseDays(item.use_days?.toString() || '');
    setVSite(item.site_name || '');
    setVRemarks(item.remarks || '');
    setEditMode(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      {/* ✅ [추가] 인쇄 시 사이드바 및 불필요한 영역을 완벽하게 숨기는 전용 CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .printable-document, .printable-document * { visibility: visible; }
          .printable-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            margin: 0;
            padding: 20px;
            background: white;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="max-w-6xl mx-auto space-y-8 p-6 pb-20 animate-in fade-in duration-700">
        {/* 상단: 권한 표시 바 */}
        <div className="flex items-center justify-between no-print bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex gap-2">
            <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-2">
              <User size={14}/> {userRole === 'admin' ? '본사 관리자' : userRole === 'manager' ? '현장 소장' : `현장 근로자`}
            </div>
          </div>
          <div className="text-right px-2">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">System Operator</p>
            <p className="text-xs font-black text-slate-500">{userEmail}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* [좌측] 신청 폼 */}
          <div className="lg:col-span-1 no-print">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6 sticky top-8">
              <h3 className="text-xl font-black flex items-center gap-2 text-slate-800">
                <Plus className="text-blue-600" size={22}/>{editMode ? '신청 수정' : '대리 휴가 상신'}
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
                <div><InputLabel label="비상연락망 및 인수인계 사항" /><textarea value={vRemarks} onChange={(e) => setVRemarks(e.target.value)} placeholder="비상 시 연락처 및 업무 인수인계 내용" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold h-24 resize-none text-sm" /></div>
                <button onClick={saveVacation} disabled={loading || dateError} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50">
                  {loading ? '처리 중...' : (editMode ? '수정하기' : (userRole === 'manager' || userRole === 'admin' ? '상신 및 현장승인' : '결재 상신'))}
                </button>
              </div>
            </div>
          </div>

          {/* [우측] 리스트 및 기안서 영역 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px] no-print">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">현장 신청 내역</h3>
              </div>
              
              <div className="divide-y divide-slate-50">
                {history.map((item) => (
                  <div key={item.id}>
                    <div onClick={() => setSelectedId(selectedId === item.id ? null : item.id)} className={`p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 ${selectedId === item.id ? 'bg-blue-50/20' : ''}`}>
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
                      <div className="p-8 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                        
                        {/* ✅ [수정] 기안서 UI - 기존 시스템과 동일하게 둥글고 부드러운 화이트 톤으로 변경 */}
                        <div className="printable-document max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm rounded-[2rem] p-10 space-y-8 relative">
                          <div className="text-center pb-4">
                            <h2 className="text-3xl font-black text-slate-800">휴가사용신청서</h2>
                            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Vacation Application Form</p>
                          </div>
                          
                          {/* ✅ [수정] 결재 도장 UI 부드럽게 변경 */}
                          <div className="absolute top-8 right-10 flex gap-3">
                            <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white w-16">
                              <div className="bg-slate-50 w-full text-center py-1.5 text-[10px] font-bold text-slate-500 border-b border-slate-200">현장소장</div>
                              <div className="h-16 flex items-center justify-center relative">
                                {(item.status !== '결재 전') && (
                                  <span className="text-red-500 font-black text-lg border-2 border-red-500 rounded-full w-12 h-12 flex items-center justify-center rotate-[-15deg] opacity-80">승인</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white w-16">
                              <div className="bg-slate-50 w-full text-center py-1.5 text-[10px] font-bold text-slate-500 border-b border-slate-200">본사</div>
                              <div className="h-16 flex items-center justify-center relative">
                                {(item.status === '승인완료') && (
                                  <span className="text-red-500 font-black text-lg border-2 border-red-500 rounded-full w-12 h-12 flex items-center justify-center rotate-[-15deg] opacity-80">승인</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ✅ [수정] 입력 정보 빠짐없이 표기 */}
                          <div className="mt-8 space-y-1">
                            <DetailRow label="대상자" value={`${item.user_name} 님`} />
                            <DetailRow label="소속 현장명" value={item.site_name} />
                            <DetailRow label="휴가 구분" value={item.vacation_type} />
                            <DetailRow label="휴가 기간" value={`${item.start_date} ~ ${item.end_date}`} />
                            <DetailRow label="총 사용 일수" value={`${item.use_days || 0} 일`} />
                            
                            <div className="p-5 bg-slate-50 rounded-2xl mt-4 border border-slate-100">
                              <p className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-tight">비상연락망 및 인수인계 사항</p>
                              <p className="font-bold text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{item.remarks}</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-6">
                            <div className="text-xs font-bold text-slate-400">작성일자: {new Date(item.created_at).toLocaleDateString()}</div>
                            <div className="text-xs font-bold text-slate-400">상신자: {item.user_email}</div>
                          </div>
                        </div>

                        {/* 버튼 영역 (인쇄에서는 제외) */}
                        <div className="mt-8 flex justify-center gap-3 no-print flex-wrap">
                          <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors"><Printer size={16}/> 인쇄</button>
                          
                          {userEmail === item.user_email && item.status !== '승인완료' && (
                            <>
                              <button onClick={() => handleEdit(item)} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black text-sm hover:bg-slate-50 transition-colors">기안 수정</button>
                              <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-black text-sm hover:bg-red-100 transition-colors">상신 취소</button>
                            </>
                          )}
                          
                          {(userRole === 'manager' || userRole === 'admin') && item.status === '결재 전' && (
                            <button onClick={() => handleApproval(item.id, '결재 중')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition-colors">소장 승인</button>
                          )}
                          {userRole === 'admin' && item.status === '결재 중' && (
                            <button onClick={() => handleApproval(item.id, '승인완료')} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-emerald-700 transition-colors">본사 최종승인</button>
                          )}
                          {(userRole === 'manager' || userRole === 'admin') && item.status !== '승인완료' && item.status !== '반려' && (
                            <button onClick={() => handleApproval(item.id, '반려')} className="bg-red-500 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-red-600 transition-colors">반려</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {history.length === 0 && <div className="p-20 text-center text-slate-300 font-bold">내역이 없습니다.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex border-b border-slate-100 py-2.5">
      <div className="w-28 bg-slate-50 rounded-xl p-3 font-bold text-[11px] flex items-center text-slate-500">{label}</div>
      <div className="flex-1 p-3 font-bold text-sm text-slate-700">{value}</div>
    </div>
  )
}

function InputLabel({ label }: { label: string }) {
  return <label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">{label}</label>
}