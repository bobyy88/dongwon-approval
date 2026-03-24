'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  HardHat, 
  FileCheck2, 
  Users2, 
  Settings2, 
  LogOut, 
  ChevronRight,
  Bell,
  Search
} from 'lucide-react' // Menu 아이콘 제거됨

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState('')
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

  if (pathname === '/login') return <html lang="ko"><body>{children}</body></html>

  return (
    <html lang="ko">
      {/* print:h-auto print:overflow-visible 을 추가하여 인쇄 시 페이지가 잘리는 현상 방지 */}
      <body className="bg-[#f3f4f6] flex h-screen overflow-hidden font-sans text-slate-900 print:h-auto print:overflow-visible print:bg-white">
        
        {/* 🟩 [왼쪽] 확정된 5대 메뉴 사이드바 (완전 고정형, 인쇄 시 숨김) */}
        <aside className="w-72 flex-shrink-0 h-full bg-white border-r border-slate-200 flex flex-col z-20 print:hidden">
          <div className="h-20 flex items-center px-10 border-b border-slate-50 flex-shrink-0">
            <span className="text-2xl font-black text-blue-600 tracking-tighter italic">DONGWON</span>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-6 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">Main Menu</p>
            
            <MenuLink href="/" icon={<LayoutDashboard size={22}/>} label="대시보드" active={pathname === '/'} />
            <MenuLink href="/field" icon={<HardHat size={22}/>} label="현장관제" active={pathname.includes('field')} />
            <MenuLink href="/approval" icon={<FileCheck2 size={22}/>} label="업무결재" active={pathname.includes('approval')} />
            {/* 🌟🌟🌟 여기에 새로운 서브메뉴 코드를 껴넣습니다 🌟🌟🌟 */}
            {pathname.includes('approval') && (
              <div className="pl-14 pr-2 py-1 space-y-1">
                <button 
                  onClick={() => router.push('/approval/corporate-card')}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                    pathname.includes('corporate-card') 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  💳 법인카드 사용내역서
                </button>
              </div>
            )}
            {/* 🌟🌟🌟 서브메뉴 코드 끝 🌟🌟🌟 */}
            <MenuLink href="/hr" icon={<Users2 size={22}/>} label="인사관리" active={pathname.includes('hr')} />
            
            <div className="pt-10 space-y-2">
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4">Admin</p>
               <MenuLink href="/settings" icon={<Settings2 size={22}/>} label="시스템 설정" active={pathname.includes('settings')} />
            </div>
          </nav>

          <div className="p-6 bg-slate-50 border-t border-slate-100 mt-auto">
            <button 
              onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-500 transition-colors font-bold text-sm"
            >
              <LogOut size={18} /> 로그아웃
            </button>
          </div>
        </aside>

        {/* ⬜ [오른쪽] 메인 영역 */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] print:block print:bg-white">
          
          {/* 통합 헤더 (인쇄 시 숨김) */}
          <header className="h-20 flex items-center justify-between px-8 bg-white border-b border-slate-200 flex-shrink-0 z-10 print:hidden">
            <div className="flex items-center gap-6">
              {/* 햄버거 메뉴 버튼 삭제됨 */}
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                {pathname === '/' ? '대시보드' : 
                 pathname.includes('field') ? '현장관제 시스템' : 
                 pathname.includes('approval') ? '업무결재 센터' : 
                 pathname.includes('hr') ? '인사 정보 관리' : '시스템 설정'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200/50">
                <Search size={16} className="text-slate-400" />
                <input type="text" placeholder="빠른 검색..." className="bg-transparent border-none text-sm focus:outline-none w-48" />
              </div>
              
              <div className="flex items-center gap-4 pl-4 border-l border-slate-100 ml-2">
                <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  <Bell size={22} />
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                </button>
                <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-[11px] text-white font-bold shadow-md shadow-blue-200">
                    {userName[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-slate-700 hidden sm:inline">{userName} 님</span>
                </div>
              </div>
            </div>
          </header>

          {/* 본문 콘텐츠 */}
          <main className="flex-1 overflow-y-auto p-8 lg:p-12 print:p-0 print:overflow-visible">
            <div className="w-full max-w-[1600px] mx-auto print:max-w-none">
              {children}
            </div>
          </main>
        </div>
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
        ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
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