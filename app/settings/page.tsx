'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, MapPin, Search, Settings, Mail, Save, Plus, Trash2, Building2, KeyRound } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set()) 
  
  const [sites, setSites] = useState<any[]>([])
  const [newSiteName, setNewSiteName] = useState('')

  const [currentUserRole, setCurrentUserRole] = useState<string>('pending')
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
    
    let myRole = myProfile?.role || 'pending'
    if (myEmail === 'bobyy88@naver.com') { 
      myRole = 'master'
      await supabase.from('profiles').upsert({ id: session.user.id, email: myEmail, role: 'master' })
    }
    setCurrentUserRole(myRole)

    if (myRole === 'admin' || myRole === 'master') {
      const { data: profileData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (profileData) setProfiles(profileData)
      
      const { data: siteData } = await supabase.from('sites').select('*').order('created_at', { ascending: true })
      if (siteData) setSites(siteData)
      
      setModifiedIds(new Set())
    }
    setLoading(false)
  }

  const handleAddSite = async () => {
    if (!newSiteName.trim()) return alert('추가할 현장 이름을 입력해주세요.');
    if (sites.some(site => site.name === newSiteName.trim())) return alert('이미 등록된 현장 이름입니다.');

    const { data, error } = await supabase.from('sites').insert([{ name: newSiteName.trim() }]).select()
    if (error) {
      alert(`현장 추가 실패: ${error.message}`)
    } else if (data) {
      setSites([...sites, data[0]])
      setNewSiteName('')
    }
  }

  const handleDeleteSite = async (id: string, name: string) => {
    if (!confirm(`'${name}' 현장을 공식 목록에서 삭제하시겠습니까?\n(기존 배정된 직원의 소속 정보는 유지됩니다)`)) return;
    const { error } = await supabase.from('sites').delete().eq('id', id)
    if (error) alert(`현장 삭제 실패: ${error.message}`)
    else setSites(sites.filter(site => site.id !== id))
  }

  const handleChange = (userId: string, field: 'role' | 'site_name' | 'name', value: string) => {
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, [field]: value } : p))
    setModifiedIds(prev => new Set(prev).add(userId))
  }

  const handleSave = async (userId: string) => {
    if (!modifiedIds.has(userId)) return; 
    const profileToSave = profiles.find(p => p.id === userId)
    if (!profileToSave) return;

    const { error } = await supabase.from('profiles').update({ 
      name: profileToSave.name, role: profileToSave.role, site_name: profileToSave.site_name
    }).eq('id', userId)
    
    if (error) alert(`저장 실패: ${error.message}`)
    else {
      alert('권한 및 정보가 정상적으로 저장되었습니다.')
      setModifiedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  // 🔑 [새 기능] 비밀번호 강제 초기화 함수
  const handleResetPassword = async (userId: string, userName: string) => {
    const isConfirm = confirm(`[경고] ${userName} 님의 비밀번호를 강제로 초기화 하시겠습니까?\n초기화된 비밀번호는 'dongwon123!' 입니다.`)
    if (!isConfirm) return;

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ ${userName} 님의 비밀번호가 'dongwon123!' 으로 초기화되었습니다.\n해당 직원에게 임시 비밀번호를 전달해 주세요.`);
      } else {
        alert(`초기화 실패: ${data.error}`);
      }
    } catch (err) {
      alert('서버와의 통신에 실패했습니다.');
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
        <p className="font-bold text-base">시스템 설정은 최고 관리자(Master) 및 본사 관리자(Admin) 전용 메뉴입니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] w-full mx-auto space-y-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-700 pb-20 pt-6 relative">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Settings className="text-slate-800" size={28}/> 
            시스템 권한 및 현장 설정
          </h2>
          <p className="text-base font-bold text-slate-400 mt-2">공식 현장을 개설/폐쇄하고, 직원의 시스템 권한을 통제합니다.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <Building2 className="text-blue-600" size={24}/>
          <h3 className="text-xl font-black text-slate-800">공식 현장 관리</h3>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 md:w-[450px]">
            <input 
              type="text" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
              placeholder="새로운 현장 이름 (예: 강남 A공구)" 
              className="bg-transparent border-none text-base font-bold focus:outline-none w-full px-4 py-2"
            />
            <button onClick={handleAddSite} className="bg-blue-600 text-white p-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
              <Plus size={20} />
            </button>
          </div>
          <div className="flex-1 flex flex-wrap gap-3 items-center">
            {sites.map((site) => (
              <div key={site.id} className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-3 rounded-xl shadow-sm group hover:border-blue-300 transition-all">
                <span className="text-base font-black text-slate-700">{site.name}</span>
                <button onClick={() => handleDeleteSite(site.id, site.name)} className="text-slate-300 hover:text-red-500 transition-colors p-1 ml-1" title="이 현장 삭제">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {sites.length === 0 && <p className="text-base font-bold text-slate-400">등록된 현장이 없습니다. 현장을 추가해주세요!</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <Shield className="text-slate-800" size={24}/> 직원 가입 승인 및 계정 통제실
          </h3>
          <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 w-full md:w-96">
            <Search size={20} className="text-slate-400" />
            <input 
              type="text" placeholder="이름, 이메일, 현장명 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-base font-bold focus:outline-none w-full text-slate-700"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold text-lg">시스템 데이터를 불러오는 중입니다...</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-100 text-[13px] uppercase tracking-widest text-slate-500">
                  <th className="py-5 px-8 font-black">계정 정보 (이름/이메일)</th>
                  <th className="py-5 px-6 font-black w-48">시스템 권한 (등급)</th>
                  <th className="py-5 px-6 font-black w-64">소속 현장 배정</th>
                  <th className="py-5 px-6 font-black w-32 text-center">가입일자</th>
                  <th className="py-5 px-8 font-black w-40 text-center">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProfiles.map((profile) => (
                  <tr key={profile.id} className={`transition-colors group ${profile.role === 'pending' ? 'bg-amber-50/50 hover:bg-amber-100/50' : 'hover:bg-slate-50/50'}`}>
                    
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border flex-shrink-0 ${profile.role === 'pending' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-white text-blue-600 border-slate-200'}`}>
                          {profile.name ? profile.name[0] : 'U'}
                        </div>
                        <div className="flex-1">
                          <input 
                            type="text" value={profile.name || ''} placeholder="실명 입력"
                            onChange={(e) => handleChange(profile.id, 'name', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave(profile.id)} 
                            className={`font-black text-lg text-slate-800 bg-transparent border-none focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-1.5 w-full outline-none transition-all ${profile.role === 'pending' && 'text-amber-900'}`}
                          />
                          <div className="flex items-center gap-1.5 px-3 mt-1">
                            <Mail size={14} className={profile.role === 'pending' ? 'text-amber-500' : 'text-slate-400'}/>
                            <span className={`text-[13px] font-bold ${profile.role === 'pending' ? 'text-amber-600' : 'text-slate-500'}`}>{profile.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <Shield size={18} className={
                          profile.role === 'master' ? 'text-purple-500' :
                          profile.role === 'admin' ? 'text-emerald-500' : 
                          profile.role === 'manager' ? 'text-blue-500' : 
                          profile.role === 'pending' ? 'text-orange-500' : 'text-slate-400'
                        } />
                        <select 
                          value={profile.role || 'pending'} 
                          onChange={(e) => handleChange(profile.id, 'role', e.target.value)}
                          disabled={currentUserRole !== 'master' && profile.role === 'master'} 
                          className={`font-black text-base border-none rounded-xl px-4 py-2.5 cursor-pointer outline-none transition-all 
                            ${profile.role === 'master' ? 'text-purple-700 bg-purple-50 border border-purple-200' : 
                              profile.role === 'pending' ? 'text-orange-600 bg-orange-100 border border-orange-200 ring-2 ring-orange-400/20' : 
                              'bg-slate-50 border border-slate-200 text-slate-700 focus:ring-2 focus:ring-blue-100'}`}
                        >
                          <option value="pending">승인 대기 🔒</option>
                          <option value="staff">일반 근로자</option>
                          <option value="manager">현장 소장</option>
                          <option value="admin">본사 관리자</option>
                          {currentUserRole === 'master' && <option value="master">최고 관리자 👑</option>}
                        </select>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border transition-all ${profile.role === 'pending' ? 'bg-amber-100/50 border-amber-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100' : 'bg-slate-50 border-slate-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-50'}`}>
                        <MapPin size={18} className={profile.role === 'pending' ? 'text-amber-500' : 'text-blue-400'} />
                        <select
                          value={profile.site_name || ''}
                          onChange={(e) => handleChange(profile.id, 'site_name', e.target.value)}
                          className="w-full bg-transparent border-none focus:outline-none text-base font-bold text-slate-700 cursor-pointer appearance-none"
                        >
                          <option value="" disabled>-- 현장 배정 --</option>
                          {sites.map((site) => (
                            <option key={site.id} value={site.name}>{site.name}</option>
                          ))}
                          {profile.site_name && !sites.find(s => s.name === profile.site_name) && (
                            <option value={profile.site_name}>{profile.site_name} (미등록)</option>
                          )}
                        </select>
                      </div>
                    </td>

                    <td className={`py-5 px-6 text-center text-[13px] font-bold ${profile.role === 'pending' ? 'text-amber-500' : 'text-slate-400'}`}>
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>

                    {/* ✅ 비밀번호 초기화 버튼 추가 */}
                    <td className="py-5 px-8 text-center space-y-2">
                      <button 
                        onClick={() => handleSave(profile.id)}
                        disabled={!modifiedIds.has(profile.id)}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all ${
                          modifiedIds.has(profile.id) 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-95 hover:bg-blue-700'
                            : profile.role === 'pending' ? 'bg-amber-100 text-amber-400 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {modifiedIds.has(profile.id) ? <><Save size={16} /> 저장(승인)</> : '저장완료'}
                      </button>
                      
                      {/* 마스터/어드민만 남의 비밀번호 초기화 가능 */}
                      <button
                        onClick={() => handleResetPassword(profile.id, profile.name)}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[12px] bg-slate-50 border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
                      >
                        <KeyRound size={14} /> 비밀번호 초기화
                      </button>
                    </td>

                  </tr>
                ))}
                
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-20 text-center font-bold text-slate-400 text-base">
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