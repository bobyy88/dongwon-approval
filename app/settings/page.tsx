'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, MapPin, Search, Settings, Mail, Save, Plus, Trash2, Building2 } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set()) 
  
  // 🏗️ 현장 관리용 상태
  const [sites, setSites] = useState<any[]>([])
  const [newSiteName, setNewSiteName] = useState('')

  // 접속자 권한 확인용
  const [currentUserRole, setCurrentUserRole] = useState<string>('staff')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  const checkUserAndFetchData = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;

    const myEmail = session.user.email || '';
    const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    
    // 👑 대표님 이메일 고정 (Master 권한 부여)
    let myRole = myProfile?.role || 'staff'
    if (myEmail === 'bobyy88@naver.com') { 
      myRole = 'master'
      await supabase.from('profiles').upsert({ id: session.user.id, email: myEmail, role: 'master' })
    }
    setCurrentUserRole(myRole)

    // 관리자일 경우 전체 직원 목록 및 공식 현장 목록 불러오기
    if (myRole === 'admin' || myRole === 'master') {
      // 1. 직원 목록
      const { data: profileData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (profileData) setProfiles(profileData)
      
      // 2. 현장 목록
      const { data: siteData } = await supabase.from('sites').select('*').order('created_at', { ascending: true })
      if (siteData) setSites(siteData)
      
      setModifiedIds(new Set())
    }
    setLoading(false)
  }

  // --- 🏗️ 현장 관리 함수 ---
  const handleAddSite = async () => {
    if (!newSiteName.trim()) return alert('추가할 현장 이름을 입력해주세요.');
    
    // 중복 검사
    if (sites.some(site => site.name === newSiteName.trim())) {
      return alert('이미 등록된 현장 이름입니다.');
    }

    const { data, error } = await supabase.from('sites').insert([{ name: newSiteName.trim() }]).select()
    if (error) {
      alert(`현장 추가 실패: ${error.message}`)
    } else if (data) {
      setSites([...sites, data[0]])
      setNewSiteName('')
    }
  }

  const handleDeleteSite = async (id: string, name: string) => {
    if (!confirm(`'${name}' 현장을 공식 목록에서 삭제하시겠습니까?\n(기존에 배정된 직원의 소속 정보는 그대로 유지됩니다)`)) return;
    
    const { error } = await supabase.from('sites').delete().eq('id', id)
    if (error) {
      alert(`현장 삭제 실패: ${error.message}`)
    } else {
      setSites(sites.filter(site => site.id !== id))
    }
  }

  // --- 👥 직원 권한 관리 함수 ---
  const handleChange = (userId: string, field: 'role' | 'site_name' | 'name', value: string) => {
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, [field]: value } : p))
    setModifiedIds(prev => {
      const newSet = new Set(prev)
      newSet.add(userId)
      return newSet
    })
  }

  const handleSave = async (userId: string) => {
    if (!modifiedIds.has(userId)) return; 

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
      setModifiedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const filteredProfiles = profiles.filter(p => 
    (p.name && p.name.includes(searchQuery)) || 
    (p.email && p.email.includes(searchQuery)) ||
    (p.site_name && p.site_name.includes(searchQuery))
  )

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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* 상단 타이틀 */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Settings className="text-slate-800" size={28}/> 
            시스템 권한 및 현장 설정
          </h2>
          <p className="text-sm font-bold text-slate-400 mt-2">공식 현장을 개설/폐쇄하고, 직원의 시스템 권한을 통제합니다.</p>
        </div>
      </div>

      {/* 🏗️ 1. 공식 현장 관리 구역 (새로 추가됨!) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <Building2 className="text-blue-600" size={24}/>
          <h3 className="text-lg font-black text-slate-800">공식 현장 관리</h3>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* 새 현장 추가 폼 */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 md:w-96">
            <input 
              type="text" 
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
              placeholder="새로운 현장 이름 (예: 강남 A공구)" 
              className="bg-transparent border-none text-sm font-bold focus:outline-none w-full px-3 py-2"
            />
            <button 
              onClick={handleAddSite}
              className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* 등록된 현장 리스트 (배지 형태) */}
          <div className="flex-1 flex flex-wrap gap-3 items-center">
            {sites.map((site) => (
              <div key={site.id} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm group hover:border-blue-200 transition-all">
                <span className="text-sm font-black text-slate-700">{site.name}</span>
                <button 
                  onClick={() => handleDeleteSite(site.id, site.name)}
                  className="text-slate-300 hover:text-red-500 transition-colors p-1"
                  title="이 현장 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sites.length === 0 && (
              <p className="text-sm font-bold text-slate-400">등록된 현장이 없습니다. 현장을 추가해주세요!</p>
            )}
          </div>
        </div>
      </div>

      {/* 👥 2. 직원 권한 관리 테이블 */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Shield className="text-slate-800" size={20}/> 직원 계정 통제실
          </h3>
          <div className="flex items-center gap-2 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 w-full md:w-80">
            <Search size={20} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="이름, 이메일 검색" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-sm font-bold focus:outline-none w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold">시스템 데이터를 불러오는 중입니다...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-100 text-[11px] uppercase tracking-widest text-slate-400">
                  <th className="p-6 font-black pl-8">계정 정보 (이름/이메일)</th>
                  <th className="p-6 font-black w-40">시스템 권한 (등급)</th>
                  <th className="p-6 font-black w-56">소속 현장 배정</th>
                  <th className="p-6 font-black w-28 text-center">가입일자</th>
                  <th className="p-6 font-black w-32 text-center pr-8">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors group">
                    
                    {/* 1. 직원 정보 */}
                    <td className="p-6 pl-8">
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
                            onKeyDown={(e) => e.key === 'Enter' && handleSave(profile.id)} 
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

                    {/* 3. 소속 현장 (✅ 타자 입력 ➡️ 객관식 드롭다운으로 변경!) */}
                    <td className="p-6">
                      <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
                        <MapPin size={16} className="text-slate-400" />
                        <select
                          value={profile.site_name || ''}
                          onChange={(e) => handleChange(profile.id, 'site_name', e.target.value)}
                          className="w-full bg-transparent border-none focus:outline-none text-sm font-bold text-slate-700 cursor-pointer appearance-none"
                        >
                          <option value="" disabled>-- 현장 배정 --</option>
                          {sites.map((site) => (
                            <option key={site.id} value={site.name}>{site.name}</option>
                          ))}
                          {/* 💡 과거에 오타로 입력된 '미등록 현장'을 살려주는 안전장치 */}
                          {profile.site_name && !sites.find(s => s.name === profile.site_name) && (
                            <option value={profile.site_name}>{profile.site_name} (미등록)</option>
                          )}
                        </select>
                      </div>
                    </td>

                    {/* 4. 가입일자 */}
                    <td className="p-6 text-center text-xs font-bold text-slate-400">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>

                    {/* 5. 저장하기 버튼 */}
                    <td className="p-6 text-center pr-8">
                      <button 
                        onClick={() => handleSave(profile.id)}
                        disabled={!modifiedIds.has(profile.id)}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all ${
                          modifiedIds.has(profile.id) 
                            ? 'bg-slate-800 text-white shadow-lg shadow-slate-200 active:scale-95 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {modifiedIds.has(profile.id) ? <><Save size={14} /> 저장하기</> : '저장완료'}
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