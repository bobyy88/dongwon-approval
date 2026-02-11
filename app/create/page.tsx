'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { FileText, Send, ArrowLeft, Calendar, User, AlignLeft } from 'lucide-react'

export default function CreateApproval() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    } else {
      setUserEmail(session.user.email || '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const { error } = await supabase.from('approvals').insert([
      {
        title,
        content,
        author: userEmail.split('@')[0],
        status: '대기'
      }
    ])

    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      alert('결재가 성공적으로 기안되었습니다.')
      router.push('/')
      router.refresh()
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#e8f0f8] p-6 font-sans text-slate-700">
      <div className="max-w-3xl mx-auto">
        {/* 상단 바 */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">뒤로가기</span>
          </button>
          <h1 className="text-xl font-bold text-slate-800">새 결재 기안하기</h1>
          <div className="w-20"></div> {/* 밸런스용 */}
        </div>

        {/* 작성 폼 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8 space-y-8">
            {/* 기본 정보 라벨 */}
            <div className="grid grid-cols-2 gap-6 pb-8 border-b border-slate-50">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">기안자</p>
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <User size={16} className="text-blue-500" /> {userEmail.split('@')[0]}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">기안일자</p>
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Calendar size={16} className="text-blue-500" /> {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* 제목 입력 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                <FileText size={16} className="text-blue-500" /> 결재 제목
              </label>
              <input 
                type="text" 
                required
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg font-medium"
                placeholder="예: 연차 신청서, 지출 결의서"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* 내용 입력 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                <AlignLeft size={16} className="text-blue-500" /> 상세 내용
              </label>
              <textarea 
                required
                rows={10}
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                placeholder="결재 내용을 상세히 입력하세요."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="p-6 bg-slate-50 flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:bg-slate-300"
            >
              {isSubmitting ? '기안 중...' : <><Send size={18} /> 결재 요청</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}