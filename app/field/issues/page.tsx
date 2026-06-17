'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// 대표님이 지정하신 취소 사유 데이터화 (원본 유지)
const ISSUE_CATEGORIES = {
  '당사 귀책': ['통고서 누락', '기타 당사 사유'],
  '발주처 귀책': ['임시열차 운행', '관리소 요청', '차량사업소 요청', '통고서 누락(발주처)', '고장열차입고', '연장급전', '누설전류 측정', '기타 발주처 사유'],
  '불가항력': ['우천', '강설', '폭염', '기타 천재지변'],
  '기타': ['민원 발생', '기타 사유']
}

// 대표님의 기존 현장 목록 (원본 유지)
const SITE_LIST = ['창동전기', '군자전기', '동작전기', '지축전기', '옥수전기', '수서전기', '신답전기', '3전기유치선']

export default function IssueLogPage() {
  const [issues, setIssues] = useState<any[]>([]) // 🔄 Supabase에서 가져올 실제 데이터 저장소
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    site: '',
    category: '발주처 귀책',
    detailReason: '',
    lossManpower: '',
    remarks: ''
  })

  // 🔄 페이지 접속 시 데이터베이스에서 기존 내역 최신순으로 가져오기
  useEffect(() => {
    fetchIssues()
  }, [])

  const fetchIssues = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('work_issues')
        .select('*')
        .order('issue_date', { ascending: false }) // 최신 날짜순 정렬

      if (error) throw error
      if (data) {
        // DB 필드명을 기존 코드 구조와 맞춰주기 위한 맵핑 변환
        const mappedData = data.map((item: any) => ({
          id: item.id,
          date: item.issue_date,
          site: item.site_name,
          category: item.category,
          detailReason: item.detail_reason,
          lossManpower: item.loss_manpower,
          remarks: item.remarks
        }))
        setIssues(mappedData)
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 카테고리 변경 시 상세 사유 초기화 (원본 유지)
  const handleCategoryChange = (e: any) => {
    setFormData({ ...formData, category: e.target.value, detailReason: '' })
  }

  // 💾 Supabase 실시간 연동 저장하기 로직으로 업그레이드
  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!formData.site || !formData.detailReason) {
      alert('현장명과 상세 사유를 반드시 선택하십시오.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const { error } = await supabase
        .from('work_issues')
        .insert([
          {
            issue_date: formData.date,
            site_name: formData.site,
            category: formData.category,
            detail_reason: formData.detailReason,
            loss_manpower: formData.lossManpower ? Number(formData.lossManpower) : null,
            remarks: formData.remarks || null,
            user_id: session?.user?.id || null
          }
        ])

      if (error) throw error

      alert('이슈가 데이터베이스에 성공적으로 저장되었습니다.')
      
      // 폼 초기화
      setFormData({ ...formData, detailReason: '', lossManpower: '', remarks: '' })
      
      // 실시간 리스트 갱신
      fetchIssues()
    } catch (error) {
      console.error('저장 실패:', error)
      alert('데이터 저장에 실패했습니다. DB 연결 상태를 확인해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">🚨 현장 작업 취소/이슈 관리</h1>
        <p className="text-gray-500 mt-2">작업 취소 이력 기록 및 귀책 사유 분석 (클레임 증빙용)</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 왼쪽: 이슈 입력 폼 */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-xl font-bold text-gray-700 mb-6">신규 이슈 등록</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">발생 일자</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">해당 현장</label>
              <select value={formData.site} onChange={(e) => setFormData({...formData, site: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">현장 선택</option>
                {SITE_LIST.map(site => <option key={site} value={site}>{site}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">귀책 분류 (대분류)</label>
              <select value={formData.category} onChange={handleCategoryChange} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500 font-bold text-red-700 bg-red-50" required>
                {Object.keys(ISSUE_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">상세 사유</label>
              <select value={formData.detailReason} onChange={(e) => setFormData({...formData, detailReason: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">상세 사유 선택</option>
                {/* @ts-ignore */}
                {ISSUE_CATEGORIES[formData.category].map(reason => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">투입 손실 인력 (명)</label>
              <input type="number" placeholder="예: 5 (대기 후 철수한 인원)" value={formData.lossManpower} onChange={(e) => setFormData({...formData, lossManpower: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">비고 (상세 내용)</label>
              <textarea placeholder="당시 상황, 감독관 지시 내용 등 상세 기록" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" />
            </div>

            {/* 🌟 대표님 지시 반영: 문구 변경 및 제출 중 상태 표시 */}
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full text-white font-bold py-3 rounded-lg transition-all mt-4 ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'}`}
            >
              {isSubmitting ? '저장 중...' : '💾 저장하기'}
            </button>
          </form>
        </div>

        {/* 오른쪽: 이슈 히스토리 리스트 */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-700">작업 취소/이슈 히스토리</h2>
            <button className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold transition-all">
              📥 엑셀(보고서) 다운로드
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-t border-slate-200">
                  <th className="p-3 font-semibold">발생일</th>
                  <th className="p-3 font-semibold">현장명</th>
                  <th className="p-3 font-semibold">귀책 분류</th>
                  <th className="p-3 font-semibold">상세 사유</th>
                  <th className="p-3 font-semibold text-right">손실 인력</th>
                  <th className="p-3 font-semibold">비고</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-medium animate-pulse">
                      데이터를 불러오는 중입니다... 🔄
                    </td>
                  </tr>
                ) : issues.length > 0 ? (
                  issues.map(issue => (
                    <tr key={issue.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-sm text-slate-600">{issue.date}</td>
                      <td className="p-3 font-bold text-slate-800">{issue.site}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          issue.category === '발주처 귀책' ? 'bg-red-100 text-red-700' :
                          issue.category === '당사 귀책' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {issue.category}
                        </span>
                      </td>
                      <td className="p-3 text-sm font-semibold text-slate-700">{issue.detailReason}</td>
                      <td className="p-3 text-sm text-right text-red-600 font-bold">{issue.lossManpower ? `${issue.lossManpower}명` : '-'}</td>
                      <td className="p-3 text-xs text-slate-500 max-w-xs truncate" title={issue.remarks}>{issue.remarks || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-medium">
                      등록된 작업 취소 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}