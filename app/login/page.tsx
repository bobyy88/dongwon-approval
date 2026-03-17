'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Building2, Mail, Lock, User, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert('로그인 실패: 이메일이나 비밀번호를 확인해주세요.')
      else router.push('/')
    } 
    
    else if (mode === 'signup') {
      if (!name.trim()) { alert('이름을 입력해주세요.'); setLoading(false); return; }
      
      // 1. 회원가입 시 이름(name) 데이터를 아예 계정 정보에 강제로 묶어서 전송
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { name: name }
        }
      })
      
      if (error) {
        alert('회원가입 실패: ' + error.message)
      } else {
        if (data.user) {
          // 2. 가입 직후 profiles 테이블에 이름과 'pending(승인대기)' 권한을 무조건 덮어쓰기(upsert)
          const { error: profileError } = await supabase.from('profiles').upsert([
            { id: data.user.id, email: email, name: name, role: 'pending' }
          ])
          
          if (profileError) {
            alert('가입은 되었으나 프로필 생성에 오류가 있습니다. 대표님께 문의해주세요.')
          } else {
            alert('사원 등록이 완료되었습니다! 관리자 승인 후 이용 가능합니다.')
            setMode('login')
          }
        }
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-10 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <Building2 size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">동원전력개발</h1>
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">
            Dongwon Electric Development
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" placeholder="실명 입력" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-base font-bold focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="email" placeholder="이메일 주소" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-base font-bold focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="password" placeholder="비밀번호" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-base font-bold focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
          </div>
          
          <button 
            type="submit" disabled={loading}
            className="w-full mt-4 bg-slate-800 text-white font-black text-lg py-5 rounded-2xl hover:bg-slate-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '사원 등록 완료'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          {mode === 'login' ? (
            <p className="text-sm font-bold text-slate-500">
              계정이 없으신가요? <button onClick={() => setMode('signup')} className="text-blue-600 hover:underline ml-1">사원 등록하기</button>
            </p>
          ) : (
            <p className="text-sm font-bold text-slate-500">
              <button onClick={() => setMode('login')} className="text-slate-400 hover:text-slate-800 transition-colors">← 로그인 화면으로 돌아가기</button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}