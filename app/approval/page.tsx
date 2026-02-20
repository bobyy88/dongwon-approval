'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, AlertCircle, Receipt, Utensils, 
  ShoppingBag, Car, MoreHorizontal, Calendar, Camera, Wrench, Info, ChevronRight
} from 'lucide-react'

export default function ApprovalPage() {
  const [activeTab, setActiveTab] = useState('vacation')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]

  // --- [상태 관리: 휴가] ---
  const [vType, setVType] = useState('연차 휴가')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [vRemarks, setVRemarks] = useState('')
  const [dateError, setDateError] = useState(false)

  // --- [상태 관리: 카드] ---
  const [cDate, setCDate] = useState(today)
  const [cAmount, setCAmount] = useState('')
  const [cCategory, setCCategory] = useState('식비')
  const [cVendor, setCVendor] = useState('')
  const [cRemarks, setCRemarks] = useState('')

  // 날짜 유효성 체크 로직
  useEffect(() => {
    if (startDate && endDate && endDate < startDate) setDateError(true)
    else setDateError(false)
  }, [startDate, endDate])

  // --- [백엔드 저장 함수] ---
  const saveVacation = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('vacation_approvals').insert([{
      user_id: session?.user.id,
      user_email: session?.user.email,
      vacation_type: vType,
      start_date: startDate,
      end_date: endDate,
      remarks: vRemarks
    }])
    if (error) alert('오류: ' + error.message)
    else { alert('휴가 신청 완료!'); setStartDate(''); setEndDate(''); setVRemarks('') }
    setLoading(false)
  }

  const saveCard = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('card_usages').insert([{
      user_id: session?.user.id,
      user_email: session?.user.email,
      usage_date: cDate,
      amount: Number(cAmount),
      category: cCategory,
      vendor: cVendor,
      remarks: cRemarks
    }])
    if (error) alert('오류: ' + error.message)
    else { alert('카드 사용 내역 제출 완료!'); setCAmount(''); setCVendor(''); setCRemarks('') }
    setLoading(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* 1. 상단 탭 컨트롤 */}
      <div className="flex gap-2 p-1.5 bg-slate-100 w-fit rounded-2xl border border-slate-200">
        <button onClick={() => setActiveTab('vacation')} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'vacation' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>휴가신청서</button>
        <button onClick={() => setActiveTab('card')} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'card' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>법인카드</button>
        <button className="px-8 py-3 rounded-xl text-sm font-bold text-slate-300 cursor-not-allowed uppercase">차량관리 (준비중)</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* [왼쪽] 입력 섹션 */}
        <div className="lg:col-span-1">
          {activeTab === 'vacation' ? (
            /* --- 휴가 신청서 --- */
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Plus size={20} /></div>
                <h3 className="text-xl font-bold text-slate-800">새 휴가 신청</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 ml-1 mb-2 block uppercase">휴가 종류</label>
                  <select value={vType} onChange={(e) => setVType(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500/20 appearance-none">
                    <option>연차 휴가</option><option>오전 반차</option><option>오후 반차</option><option>특별 휴가</option><option>병가</option><option>경조 휴가</option><option>기타</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 ml-1 mb-2 block uppercase">시작일</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-slate-700 font-bold text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 ml-1 mb-2 block uppercase">종료일</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-slate-700 font-bold text-sm ${dateError ? 'ring-2 ring-red-500 bg-red-50 text-red-600' : ''}`} />
                  </div>
                </div>
                {dateError && (
                  <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl animate-pulse border border-red-100">
                    <AlertCircle size={18}/><p className="text-xs font-black">종료일이 시작일보다 빠릅니다. 확인해주세요!</p>
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 ml-1 mb-2 block uppercase">인수인계자 / 비상연락망(관계)</label>
                  <textarea value={vRemarks} onChange={(e) => setVRemarks(e.target.value)} placeholder="휴가 중 연락 가능한 정보를 적어주세요" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-700 font-bold h-24 resize-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <button onClick={saveVacation} disabled={loading || dateError || !startDate || !endDate} className="w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all transform active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none bg-blue-600 hover:bg-blue-700 shadow-blue-100">
                  {loading ? '처리 중...' : '결재 상신하기'}
                </button>
              </div>
            </div>
          ) : (
            /* --- 법인카드 사용보고 --- */
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Receipt size={20} /></div>
                  <h3 className="text-xl font-bold text-slate-800">영수증 보고</h3>
                </div>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md tracking-tighter">AI OCR READY</span>
              </div>
              <div className="space-y-5">
                <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 group-hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer overflow-hidden">
                  <Camera size={24} className="text-slate-400 group-hover:text-emerald-500" />
                  <p className="text-[11px] font-black text-slate-500">영수증 사진 첨부 (클릭)</p>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 ml-1 mb-2 block uppercase">지출 카테고리</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[ {id:'식비', icon:<Utensils size={18}/>}, {id:'자재', icon:<ShoppingBag size={18}/>}, {id:'정비', icon:<Wrench size={18}/>}, {id:'기타', icon:<MoreHorizontal size={18}/>} ].map((item) => (
                      <button key={item.id} onClick={() => setCCategory(item.id)} className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${cCategory === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                        {item.icon}<span className="text-[10px] font-black">{item.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 ml-1 mb-2 block uppercase">결제일</label>
                    <input type="date" max={today} value={cDate} onChange={(e) => setCDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-slate-700 font-bold text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 ml-1 mb-2 block uppercase">결제 금액</label>
                    <input type="number" value={cAmount} onChange={(e) => setCAmount(e.target.value)} placeholder="0" className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-emerald-600 font-black text-right text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 ml-1 mb-2 block uppercase">사용처 및 추가 비고</label>
                  <input type="text" value={cVendor} onChange={(e) => setCVendor(e.target.value)} placeholder="가맹점명 입력" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-slate-700 font-bold mb-2 text-sm" />
                  <textarea value={cRemarks} onChange={(e) => setCRemarks(e.target.value)} placeholder="메모할 사항이 있으면 입력하세요" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-700 font-bold h-20 resize-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <button onClick={saveCard} disabled={loading || !cAmount || !cVendor} className="w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all transform active:scale-[0.98] disabled:bg-slate-200 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100">
                  {loading ? '제출 중...' : '사용 내역 제출'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* [오른쪽] 현황 영역 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[12px] font-bold text-slate-400 mb-1.5 uppercase tracking-tighter">현황 통계</p>
              <div className="flex items-baseline gap-1 overflow-hidden">
                <span className="text-2xl font-black text-slate-800">준비중</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm" />
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm" />
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Info size={32} />
              </div>
              <p className="text-slate-400 font-bold italic tracking-tight uppercase">History List Coming Soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}