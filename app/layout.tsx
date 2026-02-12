'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { 
  LayoutDashboard, FileCheck, Calendar, 
  MessageSquare, Users, Settings, LogOut, 
  Search, Bell, Menu, X, ChevronRight
} from 'lucide-react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session && pathname !== '/login') {
        router.push('/login')
      } else if (session) {
        setUserName(session.user.email?.split('@')[0] || '관리자')
      }
      setLoading(false)
    }
    checkUser()
  }, [pathname, router])

  // 모바일에서 페이지 이동 시 사이드바 닫기
  useEffect(() => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false)
  }, [pathname])

  if (pathname === '/login') return <html lang="ko"><body>{children}</body></html>

  return (
    <html lang="ko">
      <body className="bg-[#f3f4f6] flex h-screen overflow-hidden font-sans text-slate-900">
        
        {/* [왼쪽] 소프트 레이어드 사이드바 */}
        <aside className={`
          ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:w-0'} 
          fixed lg:relative z-50 h-full bg-[#f8fafc] border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col
        `}>
          <div className="h-20 flex items-center px-8 border-b border-slate-100 flex-shrink-0">
            <span className="text-2xl font-black text-slate-800 tracking-tighter">DONGWON</span>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-6 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">Workspace</p>
            <MenuLink href="/" icon={<LayoutDashboard size={22}/>} label="대시보드" active={pathname === '/'} />
            <MenuLink href="/approvals" icon={<FileCheck size={22}/>} label="전자결재" active={pathname.includes('approvals')} />
            <MenuLink href="/calendar" icon={<Calendar size={22}/>} label="일정관리" />
            <MenuLink href="/board" icon={<MessageSquare size={22}/>} label="전사게시판" />
            
            <div className="pt-8 space-y-2">
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">Organization</p>
               <MenuLink href="/members" icon={<Users size={22}/>} label="임직원 관리" />
               <MenuLink href="/settings" icon={<Settings size={22}/>} label="시스템 설정" />
            </div>
          </nav>

          <div className="p-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center font-bold text-slate-600">
                {userName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate">{userName} 대표님</p>
                <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-xs text-slate-400 hover:text-red-500 font-medium">로그아웃</button>
              </div>
            </div>
          </div>
        </aside>

        {/* [오른쪽] 메인 영역 */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* 상단 헤더 */}
          <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 flex-shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Menu size={24} className="text-slate-600" />
              </button>
              <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden sm:block" />
              <h2 className="text-lg font-bold text-slate-800 hidden sm:block">
                {pathname === '/' ? '오피스 홈' : '전자결재 시스템'}
              </h2>
            </div>
            
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="relative hidden md:block group">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="검색..." className="bg-slate-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 w-48 lg:w-64" />
              </div>
              <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
                <Bell size={24} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </header>

          {/* [핵심] 본문 콘텐츠 - 꽉 차게 설정 */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div className="w-full h-full">
              {children}
            </div>
          </main>
        </div>

        {/* 모바일에서 사이드바 열렸을 때 배경 어둡게 */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}
      </body>
    </html>
  )
}

function MenuLink({ href, icon, label, active }: any) {
  const router = useRouter()
  return (
    <button 
      onClick={() => router.push(href)}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${
        active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
        : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-slate-400'}`}>{icon}</span>
      <span className={`text-[17px] font-bold tracking-tight`}>
        {label}
      </span>
      {active && <ChevronRight size={18} className="ml-auto opacity-50" />}
    </button>
  )
}