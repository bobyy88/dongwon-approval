'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, AlertCircle, Check, X, Printer, FileText, ChevronDown, Trash2, Edit, Calendar, User
} from 'lucide-react'

export default function ApprovalPage() {
  const [loading, setLoading] = useState(false)
  
  // --- [권한 및 유저 정보] ---
  const [userRole, setUserRole] = useState<string>('staff')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userName, setUserName] = useState<string>('') // 실제 이름
  const [userId, setUserId] = useState<string>('')

  // --- [입력 데이터] ---
  const [vType, setVType] = useState('연차 휴가')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [vRemarks, setVRemarks] = useState('')
  const [vSite, setVSite] = useState('') 
  const [editMode, setEditMode] = useState<string | null>(null)

  // --- [조회 데이터] ---
  const [history, setHistory] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // ✅ [업데이트] 주말을 제외한 평일 일수만 계산하는 로직
  const calculateWorkDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    let count = 0;
    const curDate = new Date(start);
    const lastDate = new Date(end);
    
    while (curDate <= lastDate) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0: 일요일, 6: 토요일 제외
        count++;
      }
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  }

  // 유저 초기화 및 권한 확인 (실명 포함)
  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email || '';
        setUserId(session.user.id);
        setUserEmail(email);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUserRole(profile.role);
          setUserName(profile.name || email.split('@')[0]);
        } else {
          // 비상구 설정
          if (email === 'bobyy88@naver.com') { // <-- 실제 이메일로 수정
            setUserRole('admin');
            setUserName('본사관리자');
          }
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

  const saveVacation = async () => {
    if (!startDate || !endDate || !vSite) return alert('정보를 모두 입력해주세요.');
    setLoading(true);
    try {
      const payload = {
        user_id: userId,
        user_email: userEmail,
        user_name: userName, // 실명 저장
        vacation_type: vType,
        start_date: startDate,
        end_date: endDate,
        site_name: vSite,
        remarks: vRemarks,
      };

      if (editMode) {
        await supabase.from('vacation_approvals').update(payload).eq('id', editMode);
        setEditMode(null);
      } else {
        await supabase.from('vacation_approvals').insert([{ ...payload, status: '결재 전' }]);
      }
      setStartDate(''); setEndDate(''); setVRemarks(''); setVSite('');
      fetchHistory();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  }

  const handleApproval = async (id: string, newStatus: string) => {
    if (!confirm(`${newStatus} 처리하시겠습니까?`)) return;
    const { error } = await supabase.from('vacation_approvals').update({ status: newStatus }).eq('id', id)
    if (!error) fetchHistory();
  }

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from('vacation_approvals').delete().eq('id', id);
    fetchHistory();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 pb-20 animate-in fade-in duration-700">
      {/* 상단: 깔끔한 권한 바 */}
      <div className="flex items-center justify-between no-print bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-2">
            <User size={14}/> {userRole === 'admin' ? '본사 관리자' : userRole === 'manager' ? '현장 소장' : `${userName} 님`}
          </div>
        </div>
        <div className="text-right px-2">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">System Operator</p>
          <p className="text-xs font-black text-slate-500">{userEmail}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* [좌측] 신청 폼 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6 sticky top-8">
            <h3 className="text-xl font-black flex items-center gap-2 text-slate-800">
              <Plus className="text-blue-600" size={22}/>{editMode ? '신청 수정' : '새 휴가 신청'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <InputLabel label="현장명" />
                <input type="text" value={vSite} onChange={(e) => setVSite(e.target.value)} placeholder="현장 입력" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm" />
              </div>

              <div>
                <InputLabel label="휴가 구분" />
                <select value={vType} onChange={(e) => setVType(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold">
                  <option>연차 휴가</option><option>반차</option><option>특별휴가</option><option>병가</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><InputLabel label="시작" /><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-xs" /></div>
                <div><InputLabel label="종료" /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-xs" /></div>
              </div>

              {/* 평일 계산 결과 노출 */}
              {startDate && endDate && (
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-xs font-bold text-blue-600">평일 기준 <span className="text-lg font-black">{calculateWorkDays(startDate, endDate)}</span>일 차감됩니다.</p>
                </div>
              )}

              <textarea value={vRemarks} onChange={(e) => setVRemarks(e.target.value)} placeholder="인수인계 사항" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold h-24 resize-none text-sm" />
              <button onClick={saveVacation} disabled={loading} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all">
                {editMode ? '수정하기' : '결재 상신'}
              </button>
            </div>
          </div>
        </div>

        {/* [우측] 리스트 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between no-print">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">신청 관리 목록</h3>
            </div>
            
            <div className="divide-y divide-slate-50">
              {history.map((item) => (
                <div key={item.id}>
                  <div onClick={() => setSelectedId(selectedId === item.id ? null : item.id)} className={`p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 no-print ${selectedId === item.id ? 'bg-blue-50/20' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"><FileText size={20}/></div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{item.vacation_type} <span className="text-blue-500">@{item.site_name}</span></p>
                        <p className="text-[10px] font-bold text-slate-400">{item.user_name || '기안자'} | {item.start_date} ~ {item.end_date}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] px-3 py-1 rounded-full font-black text-white ${item.status === '승인완료' ? 'bg-emerald-500' : item.status === '반려' ? 'bg-red-500' : 'bg-blue-500'}`}>{item.status}</span>
                  </div>

                  {selectedId === item.id && (
                    <div className="p-8 bg-white border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                      {/* 기안서 양식 */}
                      <div className="max-w-xl mx-auto border-2 border-slate-800 p-10 space-y-6 relative bg-white">
                        <div className="text-center"><h2 className="text-3xl font-black tracking-widest underline decoration-4 underline-offset-8">휴가사용신청서</h2></div>
                        
                        {/* 결재란 */}
                        <div className="absolute top-10 right-10 flex border border-slate-800 text-[10px] text-center">
                          <div className="w-6 py-4 bg-slate-50 border-r border-slate-800 font-bold">결재</div>
                          <div className="w-14 border-r border-slate-800"><div className="border-b border-slate-800 p-1">소장</div><div className="h-10 flex items-center justify-center font-bold text-red-500">{(item.status !== '결재 전') && '승인'}</div></div>
                          <div className="w-14"><div className="border-b border-slate-800 p-1">본사</div><div className="h-10 flex items-center justify-center font-bold text-red-500">{(item.status === '승인완료') && '승인'}</div></div>
                        </div>

                        <div className="mt-16 border-t-2 border-slate-800">
                          <DetailRow label="성 명" value={`${item.user_name || '기안자'} 님`} />
                          <DetailRow label="현장명" value={item.site_name} />
                          <DetailRow label="기간" value={`${item.start_date} ~ ${item.end_date} (평일 ${calculateWorkDays(item.start_date, item.end_date)}일)`} />
                          <div className="p-4 border-b border-slate-800 min-h-[100px]"><p className="text-[10px] font-bold text-slate-400 mb-2">비상연락처 및 사유</p><p className="font-bold text-sm">{item.remarks}</p></div>
                        </div>
                      </div>

                      <div className="mt-8 flex justify-center gap-4 no-print">
                        <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2"><Printer size={16}/> 인쇄</button>
                        
                        {/* 권한별 액션 */}
                        {userEmail === item.user_email && item.status === '결재 전' && (
                          <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-black text-sm">삭제</button>
                        )}
                        {(userRole === 'manager' || userRole === 'admin') && item.status === '결재 전' && (
                          <button onClick={() => handleApproval(item.id, '결재 중')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm">소장 승인</button>
                        )}
                        {userRole === 'admin' && item.status === '결재 중' && (
                          <button onClick={() => handleApproval(item.id, '승인완료')} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-sm">본사 최종승인</button>
                        )}
                        {(userRole === 'manager' || userRole === 'admin') && item.status !== '승인완료' && (
                          <button onClick={() => handleApproval(item.id, '반려')} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-sm">반려</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex border-b border-slate-800">
      <div className="w-20 bg-slate-50 p-3 font-bold text-[10px] border-r border-slate-800 flex items-center text-slate-500">{label}</div>
      <div className="flex-1 p-3 font-bold text-sm">{value}</div>
    </div>
  )
}

function InputLabel({ label }: { label: string }) {
  return <label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">{label}</label>
}