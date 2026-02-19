'use client'

import { 
  BellRing, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft,
  Circle,
  Clock,
  MessageSquareQuote,
  Pin
} from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* 1. 최상단 상태 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard title="결재 대기" count="5" unit="건" color="text-orange-500" />
        <StatusCard title="진행 공사" count="12" unit="개" color="text-blue-500" />
        <StatusCard title="미확인 메시지" count="3" unit="건" color="text-red-500" />
        <StatusCard title="목표 달성률" count="85" unit="%" color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* [왼쪽] 전사 공지 & 현장별 메모/인수인계 */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 전사 공지사항 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                  <BellRing size={16} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">전사 공지사항</h3>
              </div>
              <button className="text-sm font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1">
                전체보기 <ChevronRight size={14} />
              </button>
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                <NoticeItem category="안전" title="2024년 1분기 현장 안전 점검 실시 안내" date="03.20" important />
                <NoticeItem category="인사" title="신규 입사자 교육 및 웰컴 키트 배부 안내" date="03.18" />
              </div>
            </div>
          </div>

          {/* [핵심] 현장별 공지/인수인계/메모 피드 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <MessageSquareQuote size={16} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">현장 실시간 메모 & 인수인계</h3>
              </div>
              <button className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-full transition-colors">
                + 메모 작성
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <FieldMemoCard 
                site="여주 현장" 
                type="인수인계" 
                content="금일 자재 입고 완료되었습니다. 내일 오전 크레인 작업 시 안전 요원 추가 배치 바랍니다."
                author="김철수 소장" 
                time="방금 전"
              />
              <FieldMemoCard 
                site="이천 물류센터" 
                type="현장메모" 
                content="특이사항 없음. 야간 경계등 교체 작업 예정입니다."
                author="이영희 대리" 
                time="12분 전"
              />
              <FieldMemoCard 
                site="용인 수지" 
                type="긴급공지" 
                content="우천으로 인해 금일 실외 작업 중단합니다. 실내 배선 작업으로 전환 바랍니다."
                author="박민수 과장" 
                time="1시간 전"
                urgent
              />
            </div>
          </div>
        </div>

        {/* [오른쪽] 미니 캘린더 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <CalendarIcon size={16} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">일정 캘린더</h3>
          </div>
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 px-1">
              <span className="text-sm font-black text-slate-800 tracking-tighter uppercase">March 2024</span>
              <div className="flex gap-1">
                <button className="p-1 hover:bg-slate-100 rounded-md"><ChevronLeft size={16}/></button>
                <button className="p-1 hover:bg-slate-100 rounded-md"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-3 text-center mb-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <span key={`day-header-${idx}`} className="text-[10px] font-bold text-slate-400">{day}</span>
              ))}
              {Array.from({ length: 31 }, (_, i) => (
                <div key={`date-${i}`} className="relative flex items-center justify-center py-1">
                  <span className={`text-xs font-bold transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl
                    ${i + 1 === 20 ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-600 hover:bg-slate-50'}
                  `}>
                    {i + 1}
                  </span>
                  {[5, 12, 25].includes(i + 1) && (
                    <Circle size={4} fill="currentColor" className="absolute bottom-1 text-blue-400" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Today's Focus</p>
               <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-1 h-6 bg-blue-500 rounded-full" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">전기안전공사 정기 미팅</p>
                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock size={10} /> 오후 2:00 · 대회의실
                    </p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NoticeItem({ category, title, date, important }: any) {
  return (
    <div className="flex items-center justify-between p-4 px-6 hover:bg-slate-50 transition-colors cursor-pointer group">
      <div className="flex items-center gap-4 overflow-hidden">
        <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${important ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
          {category}
        </span>
        <span className="font-bold text-slate-700 text-sm truncate group-hover:text-blue-600 transition-colors">{title}</span>
      </div>
      <span className="text-[11px] text-slate-300 font-bold ml-4">{date}</span>
    </div>
  )
}

function FieldMemoCard({ site, type, content, author, time, urgent }: any) {
  return (
    <div className={`p-5 bg-white border ${urgent ? 'border-red-100 bg-red-50/10' : 'border-slate-100'} rounded-[1.8rem] hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{site}</span>
          <span className={`text-[11px] font-bold ${urgent ? 'text-red-600' : 'text-blue-500'}`}>{type}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-300">{time}</span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed font-medium mb-3">
        {content}
      </p>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-bold">
          {author[0]}
        </div>
        <span className="text-[11px] font-bold text-slate-500">{author}</span>
      </div>
    </div>
  )
}

function StatusCard({ title, count, unit, color }: any) {
  return (
    <div className="bg-white p-5 rounded-[1.8rem] border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
      <div>
        <p className="text-[12px] font-bold text-slate-400 mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-black ${color} tracking-tight`}>{count}</span>
          <span className="text-[10px] font-bold text-slate-400">{unit}</span>
        </div>
      </div>
      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200">
        <ChevronRight size={18} />
      </div>
    </div>
  )
}