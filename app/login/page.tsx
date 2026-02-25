'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false) // 가입/로그인 모드 전환
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('') // 가입 시 이름 추가
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      // --- [회원 가입 로직] ---
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name } // 추가 정보를 메타데이터에 저장
        }
      })

      if (error) {
        alert('가입 실패: ' + error.message)
      } else {
        // [중요] 가입 성공 시 profiles 테이블에 기본 정보 수동 입력
        // (트리거 설정을 안 했을 경우를 대비한 안전 장치)
        if (data.user) {
          await supabase.from('profiles').insert([
            { id: data.user.id, email: email, name: name, role: 'staff' }
          ])
        }
        alert('회원가입 성공! 이제 로그인해주세요.')
        setIsSignUp(false)
      }
    } else {
      // --- [로그인 로직] ---
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert('로그인 실패: ' + error.message)
      else window.location.href = '/' // 성공 시 메인으로 이동
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-800 mb-2">
            {isSignUp ? '계정 생성' : '환영합니다'}
          </h2>
          <p className="text-slate-400 font-bold">소규모 현장 그룹웨어 시스템 v1.0</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold"
              required
            />
          )}
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold"
            required
          />
          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95"
          >
            {loading ? '처리 중...' : isSignUp ? '가입하기' : '로그인'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold text-blue-500 hover:underline"
          >
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 계정 생성'}
          </button>
        </div>
      </div>
    </div>
  )
}