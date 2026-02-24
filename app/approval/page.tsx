'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, AlertCircle, Calendar, Check, X, Printer, FileText, ChevronDown
} from 'lucide-react'

export default function ApprovalPage() {
  const [activeTab, setActiveTab] = useState('vacation')
  const [loading, setLoading] = useState(false)
  
  // --- [상태 관리: 입력 데이터] ---
  const [vType, setVType] = useState('연차 휴가')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [vRemarks, setVRemarks] = useState('')
  const [vSite, setVSite] = useState('') 
  const [dateError, setDateError] = useState(false)

  // --- [상태 관리: 조회 데이터] ---
  const [history, setHistory] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 1. 휴가 일수 계산 로직
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (e < s) return 0;
    const diff = e.getTime() - s.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  // 2. 날짜 유효성 체크
  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setDateError(true);
    } else {
      setDateError(false);
    }
  }, [startDate, endDate])

  // 3. 데이터 불러오기
  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('vacation_approvals')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setHistory(data || [])
  }

  useEffect(() => { fetchHistory() }, [])

  // 4. 결재 상신
  const saveVacation = async () => {
    if (!startDate || !endDate || !vSite || dateError) {
      alert('모든 정보를 올바르게 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.from('vacation_approvals').insert([{
        user_id: session?.user.id,
        user_email: session?.user.email,
        vacation_type: vType,
        start_date: startDate,
        end_date: endDate,
        site_name: vSite,
        remarks: vRemarks,
        status: '결재중'
      }]);

      if (error) throw error;

      alert('휴가 신청이 성공적으로 완료되었습니다.');
      setStartDate(''); setEndDate(''); setVRemarks(''); setVSite('');
      fetchHistory(); 
    } catch (error: any) {
      alert('저장 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleApproval = async (id: string, newStatus: '승인완료' | '반려') => {
    if (!confirm(`${newStatus} 처리하시겠습니까?`)) return;
    const { error } = await supabase.from('vacation_approvals').update({ status: newStatus }).eq('id', id)
    if (!error) { fetchHistory(); setSelectedId(null); }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, .no-print, .input-section { display: none !important; }
          .print-area { display: block !important; width: 100% !important; margin: 0 !important; }
          .print-card { border: 1px solid #000 !important; box-shadow: none !important; border-radius: 0 !important; }
        }
      `}} />

      <div className="flex gap-2 p-1.5 bg-slate-100 w-fit rounded-2xl border border-slate-200 no-print">
        <button className="px-8 py-3 rounded-xl text-sm font-black bg-white text-blue-600 shadow-sm">휴가신청 관리</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* [좌측] 신청 폼 */}
        <div className="lg:col-span-1 input-section">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6 sticky top-8">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Plus className="text-blue-600" size={20}/>새 휴가 신청</h3>
            
            <div className="space-y-4">
              <div>
                <InputLabel label="현장명" />
                <input type="text" value={vSite} onChange={(e) => setVSite(e.target.value)} placeholder="현장명을 입력하세요" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>

              <div>
                <InputLabel label="휴가 종류" />
                <select value={vType} onChange={(e) => setVType(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-700 appearance-none">
                  <option>연차 휴가</option>
                  <option>오전 반차</option>
                  <option>오후 반차</option>
                  <option>특별 휴가</option>
                  <option>병가</option>
                  <option>경조 휴가</option>
                  <option>기타</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <InputLabel label="시작일" />
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm text-slate-700" />
                </div>
                <div>
                  <InputLabel label="종료일" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm ${dateError ? 'ring-2 ring-red-500 bg-red-50 text-red-600' : 'text-slate-700'}`} />
                </div>
              </div>

              {dateError && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl animate-pulse">
                  <AlertCircle size={16}/><p className="text-xs font-bold">종료일이 시작일보다 빠릅니다!</p>
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-xl text-center">
                <p className="text-xs font-black text-blue-600 font-mono">신청 기간: {calculateDays(startDate, endDate)}일</p>
              </div>

              <div>
                <InputLabel label="인수인계자 / 비상연락망(관계)" />
                <textarea value={vRemarks} onChange={(e) => setVRemarks(e.target.value)} placeholder="연락처 및 내용을 입력하세요" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold h-24 resize-none text-slate-700" />
              </div>

              <button 
                onClick={saveVacation} 
                disabled={loading || dateError || !startDate || !vSite} 
                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:bg-slate-200 disabled:text-slate-400"
              >
                {loading ? '처리 중...' : '결재 상신'}
              </button>
            </div>
          </div>
        </div>

        {/* [우측] 리스트 및 기안서 */}
        <div className="lg:col-span-2 print-area">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px] print-card">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 no-print">
              <h3 className="text-xl font-black text-slate-800">휴가 신청 내역</h3>
              <button onClick={fetchHistory} className="text-xs font-bold text-blue-600">새로고침</button>
            </div>
            
            <div className="divide-y divide-slate-50">
              {history.length > 0 ? history.map((item) => (
                <div key={item.id} className="transition-all">
                  <div 
                    onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                    className={`p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 no-print ${selectedId === item.id ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === '승인완료' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                        <FileText size={20}/>
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{item.vacation_type} <span className="text-slate-400 ml-1 font-bold">[{item.site_name || '현장미지정'}]</span></p>
                        <p className="text-xs font-bold text-slate-400">{item.start_date} ~ {item.end_date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${item.status === '승인완료' ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'}`}>{item.status}</span>
                      <ChevronDown size={18} className={`text-slate-300 transition-transform ${selectedId === item.id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {selectedId === item.id && (
                    <div className="p-8 bg-white border-t border-slate-100">
                      <div className="max-w-2xl mx-auto border-2 border-slate-800 p-10 space-y-8 relative">
                        <div className="text-center space-y-2">
                          <h2 className="text-3xl font-black tracking-[0.5em] underline decoration-4 underline-offset-8">휴가기안서</h2>
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Dongwon Construction</p>
                        </div>

                        <div className="absolute top-10 right-10 flex border border-slate-800 text-center text-[10px]">
                          <div className="w-8 border-r border-slate-800 py-4 flex items-center justify-center font-bold bg-slate-50">결재</div>
                          <div className="w-16 border-r border-slate-800"><div className="p-1 border-b border-slate-800">담당</div><div className="h-12 flex items-center justify-center">인</div></div>
                          <div className="w-16"><div className="p-1 border-b border-slate-800">대표</div><div className="h-12 flex items-center justify-center font-black text-blue-600 text-lg">{item.status === '승인완료' ? '承' : ''}</div></div>
                        </div>

                        <div className="mt-20 border-t-2 border-slate-800">
                          <DetailRow label="성 명" value={item.user_email?.split('@')[0] || '기안자'} />
                          {/* 에러 발생 부분 (day: 'numeric'으로 수정 완료) */}
                          <DetailRow label="작성 일자" value={new Date(item.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'})} />
                          <DetailRow label="소속 현장" value={item.site_name || '본사'} />
                          <DetailRow label="휴가 구분" value={item.vacation_type} />
                          <DetailRow label="휴가 기간" value={`${item.start_date} ~ ${item.end_date} (총 ${calculateDays(item.start_date, item.end_date)}일)`} />
                          <div className="p-4 border-b border-slate-800">
                            <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">신청 사유 및 연락처</p>
                            <p className="text-md font-bold text-slate-800 min-h-[100px] leading-relaxed">{item.remarks}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex justify-center gap-4 no-print">
                        <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl font-black hover:bg-black transition-all shadow-lg"><Printer size={18}/> 인쇄</button>
                        {item.status === '결재중' && (
                          <>
                            <button onClick={() => handleApproval(item.id, '승인완료')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black shadow-lg flex items-center gap-2"><Check size={18}/> 승인</button>
                            <button onClick={() => handleApproval(item.id, '반려')} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black shadow-lg flex items-center gap-2"><X size={18}/> 반려</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                <div className="p-32 text-center text-slate-300 font-bold italic">내역이 없습니다.</div>
              )}
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
      <div className="w-24 bg-slate-50 p-4 font-black text-xs border-r border-slate-800 text-slate-500 flex items-center">{label}</div>
      <div className="flex-1 p-4 font-bold text-slate-800 text-sm">{value}</div>
    </div>
  )
}

function InputLabel({ label }: { label: string }) {
  return <label className="text-[11px] font-bold text-slate-400 ml-1 mb-2 block uppercase tracking-tight">{label}</label>
}