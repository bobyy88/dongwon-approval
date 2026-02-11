'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Mail, Calendar, FileText, CheckSquare, 
  Bell, Settings, LogOut, MessageSquare, 
  User, LayoutGrid, Users, Home, ClipboardList
} from 'lucide-react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // 로그인 페이지에서는 레이아웃을 보이지 않게 처리
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session && !isLoginPage) {
      router.push('/login')
    } else if (session) {
      setUserName(session.user.email?.split('@')[0] || '관리자')
      setLoading(false)
    } else {
      setLoading(false)
    }
  }

  if (loading) return <html><body><div className="min-h-screen bg-[#e8f0f8]" /></body></html>
  if (isLoginPage) return <html><body>{children}</body></html>

  return (
    <html lang="ko">
      <body className="bg-[#e8f0f8] flex h-screen overflow-hidden text-slate-700">
        
        {/* 1. 왼쪽 사이드바 (고정) */}
        <aside className="w-64 bg-[#2c3e50] text-slate-300 flex flex-col shadow-xl">
          <div className="p-6 text-2xl font-black text-white tracking-tighter">
            DONGWON
          </div>
          
          <nav className="flex-1 px-4 space-y-1">
            <MenuLink href="/" icon={<Home size={20}/>} label="오피스 홈" active={pathname === '/'} />
            <MenuLink href="/mail" icon={<Mail size={20}/>} label="메일" />
            <MenuLink href="/approvals" icon={<CheckSquare size={20}/>} label="전자결재" active={pathname.includes('/approvals') || pathname.includes('/create')} />
            <MenuLink href="/calendar" icon={<Calendar size={20}/>} label="일정관리" />
            <MenuLink href="/contacts" icon={<Users size={20}/>} label="주소록" />
            <MenuLink href="/board" icon={<ClipboardList size={20}/>} label="게시판" />
          </nav>

          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors" onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}>
              <LogOut size={18} />
              <span className="text-sm font-medium">로그아웃</span>
            </div>
          </div>
        </aside>

        {/* 오른쪽 메인 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* 2. 상단바 (고정) */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              {pathname === '/' ? '오피스 홈' : pathname.includes('approvals') ? '전자결재' : '동원전력 그룹웨어'}
            </div>
            <div className="flex items-center gap-6">
              <div className="flex gap-4 text-slate-400">
                <Bell size={20} className="hover:text-blue-500 cursor-pointer" />
                <MessageSquare size={20} className="hover:text-blue-500 cursor-pointer" />
                <Settings size={20} className="hover:text-blue-500 cursor-pointer" />
              </div>
              <div className="flex items-center gap-3 border-l pl-6">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase">
                  {userName[0]}
                </div>
                <span className="text-sm font-bold text-slate-700">{userName} 대표님</span>
              </div>
            </div>
          </header>

          {/* 3. 중앙 본문 영역 (스크롤 가능) */}
          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

function MenuLink({ href, icon, label, active = false }: any) {
  return (
    <a href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </a>
  )
}