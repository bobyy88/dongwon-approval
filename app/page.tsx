'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation' // 문지기용 배달원
import {
  Mail, Calendar, FileText, CheckSquare,
  ChevronRight, Bell, Settings, LogOut, 
  MessageSquare, User, Clock, ShieldAlert,
  LayoutGrid, Users
} from 'lucide-react'

export default function Home() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true) // 로딩 중인지 확인
  const [userName, setUserName] = useState('') // 로그인한 사람 이름
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  // [문지기] 로그인 안 했으면 로그인 페이지로 쫓아내는 함수
  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      // 로그인 안 되어 있으면 로그인 페이지로 강제 이동
      router.push('/login')
    } else {
      // 로그인 되어 있으면 데이터 가져오기
      setUserName(session.user.email?.split('@')[0] || '사용자') // 이메일 앞부분을 임시 이름으로 사용
      setLoading(false)
      fetchData()
    }
  }

  async function fetchData() {
    const { data } = await supabase
      .from('approvals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) setList(data)
  }

  // 로그아웃 함수
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // 로딩 중일 때는 빈 화면 보여주기
  if (loading) {
    return <div className="min-h-screen bg-[#e8f0f8]" />
  }

  return (
    <div className="min-h-screen bg-[#e8f0f8] p-6 font-sans text-slate-700">
      {/* 상단 네비게이션 */}
      <nav className="mb-6 flex items-center justify-between bg-white px-6 py-3 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-blue-600">DONGWON</span>
          <span className="text-slate-400">|</span>
          <span className="font-medium text-slate-600">오피스 홈</span>
        </div>
        <div className="flex items-center gap-5 text-slate-500">
          <Bell size={20} className="cursor-pointer hover:text-blue-500" />
          <Settings size={20} className="cursor-pointer hover:text-blue-500" />
          <div className="flex items-center gap-2 border-l pl-5">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
              {userName.substring(0, 1).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-slate-700">{userName} 대표님</span>
            <button onClick={handleLogout} className="hover:text-red-500 ml-2">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* 메인 대시보드 그리드 */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* 왼쪽: 프로필 및 요약 */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                <User size={40} className="text-slate-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{userName}</h2>
                <p className="text-blue-600 font-medium">동원전력 대표이사</p>
                <p className="text-sm text-slate-400">관리자 계정</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                  <Calendar size={14} className="text-red-400" /> 오늘의 일정
                </div>
                <div className="text-2xl font-bold">0 <span className="text-sm font-normal text-slate-400">건</span></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                  <Mail size={14} className="text-blue-400" /> 안 읽은 메일
                </div>
                <div className="text-2xl font-bold">0 <span className="text-sm font-normal text-slate-400">건</span></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                  <FileText size={14} className="text-teal-400" /> 대기 문서함
                </div>
                <div className="text-2xl font-bold">{list.length} <span className="text-sm font-normal text-slate-400">건</span></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                  <ShieldAlert size={14} className="text-orange-400" /> 보안 이벤트
                </div>
                <div className="text-2xl font-bold text-orange-500">0 <span className="text-sm font-normal text-slate-400">건</span></div>
              </div>
            </div>
          </div>

          {/* 하단 바로가기 메뉴 */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-3 gap-y-6 text-center">
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                <Mail size={24} />
              </div>
              <span className="text-xs font-medium">메일</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
                <MessageSquare size={24} />
              </div>
              <span className="text-xs font-medium">메시징</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <Link href="/create" className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <CheckSquare size={24} />
                </div>
                <span className="text-xs font-medium">전자결재</span>
              </Link>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                <Calendar size={24} />
              </div>
              <span className="text-xs font-medium">일정</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-all">
                <Users size={24} />
              </div>
              <span className="text-xs font-medium">주소록</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <LayoutGrid size={24} />
              </div>
              <span className="text-xs font-medium">플러스앱</span>
            </div>
          </div>
        </div>

        {/* 오른쪽: 전자결재 섹션 */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 min-h-[400px]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CheckSquare className="text-blue-500" size={20} /> 전자결재
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold cursor-pointer">대기 {list.length}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold cursor-pointer">확인 0</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold cursor-pointer">예정 0</span>
              </div>
            </div>
            
            <div className="p-0">
              {list.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {list.map((item) => (
                    <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{item.title}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Clock size={12} /> {new Date(item.created_at).toLocaleDateString()} · 기안자: {item.author || '임석환'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p>기안된 문서가 없습니다.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 rounded-b-3xl text-center">
              <Link href="/create" className="text-sm font-bold text-blue-600 hover:underline">
                + 새 결재 기안하기
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}