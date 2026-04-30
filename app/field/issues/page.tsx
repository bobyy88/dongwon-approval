'use client'

import { useState } from 'react'

// 대표님이 지정하신 취소 사유 데이터화
const ISSUE_CATEGORIES = {
  '당사 귀책': ['통고서 누락', '기타 당사 사유'],
  '발주처 귀책': ['임시열차 운행', '관리소 요청', '차량사업소 요청', '통고서 누락(발주처)', '고장열차입고', '연장급전', '누설전류 측정', '기타 발주처 사유'],
  '불가항력': ['우천', '강설', '폭염', '기타 천재지변'],
  '기타': ['민원 발생', '기타 사유']
}

const SITE_LIST = ['창동전기', '군자전기', '동작전기', '지축전기', '옥수전기', '수서전기', '신답전기', '3전기유치선']

export default function IssueLogPage() {
  const [issues, setIssues] = useState<any[]>([]) // 임시 데이터 저장소 (추후 DB 연동)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    site: '',
    category: '발주처 귀책',
    detailReason: '',
    lossManpower: '',
    remarks: ''
  })

  // 카테고리 변경 시 상세 사유 초기화
  const handleCategoryChange = (e: any) => {
    setFormData({ ...formData, category: e.target.value, detailReason: '' })
  }

  const handleSubmit = (e: any) => {
    e.preventDefault()
    if (!formData.site || !formData.detailReason) {
      alert('현장명과 상세 사유를 반드시 선택하십시오.')
      return
    }
    // 새로운 이슈 리스트에 추가 (최신순 정렬)
    setIssues([{ id: Date.now(), ...formData }, ...issues])
    alert('이슈가 성공적으로 기록되었습니다. (현재는 화면 임시 저장)')
    
    // 폼 초기화
    setFormData({ ...formData, detailReason: '', lossManpower: '', remarks: '' })
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

            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg transition-all mt-4">
              이슈 기록하기
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
                {issues.length > 0 ? (
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