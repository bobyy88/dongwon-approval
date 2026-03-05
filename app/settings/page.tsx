'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, MapPin, Search, Settings, Mail, Save } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set()) // 수정한 항목 추적용
  
  // 접속자 권한 확인용
  const [currentUserRole, setCurrentUserRole] = useState<string>('staff')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    checkUserAndFetchProfiles()
  }, [])

  const checkUserAndFetchProfiles = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;

    const myEmail = session.user.email || '';
    const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    
    // 👑 [백도어] 대표님 이메일 확인 및 master 강제 부여
    let myRole = myProfile?.role || 'staff'
    if (myEmail === 'bobyy88@naver.com') { // 👈 실제 대표님 이메일로 꼭 수정하세요!
      myRole = 'master'
      await supabase.from('profiles').upsert({ id: session.user.id, email: myEmail, role: 'master' })
    }
    setCurrentUserRole(myRole)

    // 관리자일 경우 직원 목록 불러오기
    if (myRole === 'admin' || myRole === 'master') {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (!error && data) {
        setProfiles(data)
        setModifiedIds(new Set()) // 데이터 불러올 때 수정 기록 초기화
      }
    }
    setLoading(false)
  }

  // 1. 입력값이 변할 때: 화면에만 먼저 보여주고, '수정됨(modified)' 상태로 표시
  const handleChange = (userId: string, field: 'role' | 'site_name' | 'name', value: string) => {
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, [field]: value } : p))
    setModifiedIds(prev => {
      const newSet = new Set(prev)
      newSet.add(userId)
      return newSet
    })
  }

  // 2. 저장하기 버튼(또는 엔터)을 눌렀을 때: 실제 DB에 반영
  const handleSave = async (userId: string) => {
    if (!modifiedIds.has(userId)) return; // 수정된 게 없으면 작동 안 함

    const profileToSave = profiles.find(p => p.id === userId)
    if (!profileToSave) return;

    const { error } = await supabase.from('profiles').update({ 
      name: profileToSave.name,
      role: profileToSave.role,
      site_name: profileToSave.site_name
    }).eq('id', userId)
    
    if (error) {
      alert(`저장 실패: ${error.message}`)
    } else {
      // 저장 성공 시 '수정됨' 기록에서 삭제 (버튼이 '저장완료'로 바뀜)
      setModifiedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  // 검색 필터링
  const filteredProfiles = profiles.filter(p => 
    (p.name && p.name.includes(searchQuery)) || 
    (p.email && p.email.includes(searchQuery)) ||
    (p.site_name && p.site_name.includes(searchQuery))
  )

  // 일반 직원 튕겨냄
  if (!loading && currentUserRole !== 'admin' && currentUserRole !== 'master') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4 animate-in fade-in">
        <Shield size={64} className="text-red-200" />
        <h2 className="text-2xl font-black text-slate-700">접근 권한이 없습니다</h2>
        <p className="font-bold text-sm">시스템 설정은 최고 관리자(Master) 및 본사 관리자(Admin) 전용 메뉴입니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* 상단 타이틀 및 검색바 */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Settings className="text-slate-800" size={28}/> 
            시스템 권한 및 현장 설정
          </h2>
          <p className="text-sm font-bold text-slate-400 mt-2">사용자의 시스템 접근 등급(권한)과 소속 현장을 통제합니다.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 w-full md:w-80 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
          <Search size={20} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="이름, 이메일, 현장명 검색" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-sm font-bold focus:outline-none w-full"
          />
        </div>
      </div>

      {/* 권한 관리 테이블 */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold">시스템 데이터를 불러오는 중입니다...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-widest text-slate-400">
                  <th className="p-6 font-black rounded-tl-[2.5rem]">계정 정보 (이름/이메일)</th>
                  <th className="p-6 font-black w-40">시스템 권한 (등급)</th>
                  <th className="p-6 font-black w-48">소속 현장 배정</th>
                  <th className="p-6 font-black w-28 text-center">가입일자</th>
                  <th className="p-6 font-black w-32 text-center rounded-tr-[2.5rem]">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors group">
                    
                    {/* 1. 직원 정보 */}
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border border-slate-200">
                          {profile.name ? profile.name[0] : 'U'}
                        </div>
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={profile.name || ''} 
                            placeholder="실명 입력"
                            onChange={(e) => handleChange(profile.id, 'name', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave(profile.id)} // 엔터 치면 저장
                            className="font-black text-slate-800 bg-transparent border-none focus:ring-2 focus:ring-slate-200 rounded-lg px-2 py-1 w-full outline-none"
                          />
                          <div className="flex items-center gap-1.5 px-2 mt-1">
                            <Mail size={12} className="text-slate-400"/>
                            <span className="text-xs font-bold text-slate-400">{profile.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. 시스템 권한 */}
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <Shield size={16} className={
                          profile.role === 'master' ? 'text-purple-500' :
                          profile.role === 'admin' ? 'text-emerald-500' : 
                          profile.role === 'manager' ? 'text-blue-500' : 'text-slate-400'
                        } />
                        <select 
                          value={profile.role || 'staff'} 
                          onChange={(e) => handleChange(profile.id, 'role', e.target.value)}
                          disabled={currentUserRole !== 'master' && profile.role === 'master'} 
                          className={`font-black text-sm border-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-slate-200 ${
                            profile.role === 'master' ? 'text-purple-700 bg-purple-50 border-purple-200' : ''
                          }`}
                        >
                          <option value="staff">일반 근로자</option>
                          <option value="manager">현장 소장</option>
                          <option value="admin">본사 관리자</option>
                          {currentUserRole === 'master' && <option value="master">최고 관리자 👑</option>}
                        </select>
                      </div>
                    </td>

                    {/* 3. 소속 현장 */}
                    <td className="p-6">
                      <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
                        <MapPin size={16} className="text-slate-400" />
                        <input 
                          type="text" 
                          value={profile.site_name || ''} 
                          placeholder="소속 현장명"
                          onChange={(e) => handleChange(profile.id, 'site_name', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSave(profile.id)} // 엔터 치면 저장
                          className="w-full bg-transparent border-none focus:outline-none text-sm font-bold text-slate-700"
                        />
                      </div>
                    </td>

                    {/* 4. 가입일자 */}
                    <td className="p-6 text-center text-xs font-bold text-slate-400">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>

                    {/* 5. ✅ 저장하기 버튼 */}
                    <td className="p-6 text-center">
                      <button 
                        onClick={() => handleSave(profile.id)}
                        disabled={!modifiedIds.has(profile.id)} // 수정된 게 없으면 버튼 비활성화
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all ${
                          modifiedIds.has(profile.id) 
                            ? 'bg-slate-800 text-white shadow-lg shadow-slate-200 active:scale-95 hover:bg-slate-700' // 수정 중: 진한 활성화
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed' // 저장 완료: 옅은 비활성화
                        }`}
                      >
                        {modifiedIds.has(profile.id) ? (
                          <>
                            <Save size={14} /> 저장하기
                          </>
                        ) : (
                          '저장완료'
                        )}
                      </button>
                    </td>

                  </tr>
                ))}
                
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-20 text-center font-bold text-slate-400">
                      가입된 계정이 없거나 검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}