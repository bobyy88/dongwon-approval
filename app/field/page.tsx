'use client'

import { useState, useEffect } from 'react'
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const TEAM_CONFIG = {
  'B조(주간)': {
    sheetId: '1esatfRda5r-vWjzD-zrRYr1ieeIwHGOLshsAlDfdSQc',
    sheetName: 'S-curve 집계',
    sites: ['군자차량기지', '신정차량기지', '수서차량기지', '지축차량기지', '창동차량기지'],
    startCols: [0, 6, 12, 18, 24],
    color: '#3b82f6'
  },
  'C조(야간)': {
    sheetId: '1XcgnpQ61R1AlFgT0-4r0OHoyuQx-kXvmzzepHKQ_gpc',
    sheetName: 'C조 S-Curve 집계데이터',
    sites: ['신정관리소', '대림관리소', '종운관리소', '군자관리소'],
    startCols: [0, 6, 12, 18],
    color: '#6366f1'
  },
  'D조(야간)': {
    sheetId: '1DLvnkSnZdByTcMPaChmSuGww3CpAyTDRZyTtp6RINrQ',
    sheetName: 'D조 S-Curve 집계데이터',
    sites: ['창동전기', '군자전기', '동작전기', '지축전기', '옥수전기', '수서전기', '신답전기', '3전기유치선'],
    startCols: [0, 6, 12, 18, 24, 30, 36, 42],
    color: '#10b981'
  }
}

// 🌟 신규 재무/금액 기준 설정
const FINANCE_CONFIG: Record<string, { sheetId: string, sheetName: string, range: string }> = {
  '안성지역 도로시설물 연간 단가 공사': { 
    sheetId: '1R1M6MHtA7E5YiyBe0daKCATUD2sni8H6dDHN5i4Zarc',
    sheetName: '금액 집계',
    range: 'B2:D100' // 👈 A열을 무시하고, 데이터가 있는 B열~D열만 정확하게 조준 타격!
  }
}

const extractNumber = (val: any) => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    if (cleaned !== '' && !isNaN(Number(cleaned))) return Number(cleaned);
  }
  return 0;
}

export default function FieldMainPage() {
  const [viewMode, setViewMode] = useState<'volume' | 'finance'>('volume')

  const [teamStats, setTeamStats] = useState<any>({
    'B조(주간)': { rate: 0, completed: 0, total: 0 },
    'C조(야간)': { rate: 0, completed: 0, total: 0 },
    'D조(야간)': { rate: 0, completed: 0, total: 0 }
  })
  const [isLoadingTeams, setIsLoadingTeams] = useState(true)

  const [selectedFinanceSite, setSelectedFinanceSite] = useState(Object.keys(FINANCE_CONFIG)[0])
  const [financeTotal, setFinanceTotal] = useState({ planned: 0, actual: 0, rate: 0 })
  const [financeCategory, setFinanceCategory] = useState<any[]>([])
  const [isLoadingFinance, setIsLoadingFinance] = useState(true)

  useEffect(() => {
    fetchAllTeamData()
  }, [])

  useEffect(() => {
    if (selectedFinanceSite) fetchFinanceData(selectedFinanceSite)
  }, [selectedFinanceSite])

  const fetchAllTeamData = async () => {
    setIsLoadingTeams(true)
    const newStats: any = {}
    try {
      for (const [teamName, info] of Object.entries(TEAM_CONFIG)) {
        const url = `https://docs.google.com/spreadsheets/d/${info.sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(info.sheetName)}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonData = JSON.parse(text.substring(47, text.length - 2));
        const rows = jsonData.table.rows;

        let teamTotalPlanned = 0;
        let teamTotalCompleted = 0;

        info.startCols.forEach((startCol) => {
          let localMaxPlanned = 0;
          let localLatestCompleted = 0;

          rows.forEach((row: any) => {
            if (!row || !row.c) return;
            const pVal = extractNumber(row.c[startCol + 1]?.v);
            if (pVal > localMaxPlanned) localMaxPlanned = pVal;

            const cVal = extractNumber(row.c[startCol + 2]?.v);
            if (cVal > 0) localLatestCompleted = cVal;
          });
          teamTotalPlanned += localMaxPlanned;
          teamTotalCompleted += localLatestCompleted;
        });

        const rate = teamTotalPlanned > 0 ? (teamTotalCompleted / teamTotalPlanned * 100).toFixed(1) : 0;
        newStats[teamName] = { rate, completed: teamTotalCompleted, total: teamTotalPlanned };
      }
      setTeamStats(newStats)
    } catch (e) {
      console.error("조별 데이터 로드 실패", e)
    } finally {
      setIsLoadingTeams(false)
    }
  }

  const fetchFinanceData = async (siteName: string) => {
    setIsLoadingFinance(true)
    try {
      const config = FINANCE_CONFIG[siteName];
      // 🌟 URL에 range 파라미터를 추가하여 엉뚱한 빈칸(A열)을 아예 가져오지 못하게 차단
      const url = `https://docs.google.com/spreadsheets/d/${config.sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(config.sheetName)}&range=${config.range}`;
      const response = await fetch(url);
      const text = await response.text();

      // 🌟 구글 사내 보안에 막혀 로그인 HTML 화면이 날아오면 즉각 경고를 띄움
      if (text.trim().startsWith('<')) {
        console.error("구글 보안 로그인 에러 감지됨");
        alert("🚨 구글 시트가 사내 보안에 막혀있습니다. 구글 시트의 [파일] -> [공유] -> [웹에 게시]를 눌러주세요!");
        return;
      }

      const jsonData = JSON.parse(text.substring(47, text.length - 2));
      const rows = jsonData.table.rows;

      let tempCat: any[] = [];
      let tempTotal = { planned: 0, actual: 0, rate: 0 };

      // B열이 c[0], C열이 c[1], D열이 c[2]가 됨. 0번째 줄은 헤더이므로 slice(1)로 스킵.
      rows.slice(1).forEach((row: any) => {
        if (!row || !row.c || !row.c[0]) return;
        const name = row.c[0]?.v || '';
        const planned = extractNumber(row.c[1]?.v);
        const actual = extractNumber(row.c[2]?.v);
        const rate = planned > 0 ? Number(((actual / planned) * 100).toFixed(1)) : 0;

        if (name.includes('총계') || name.includes('총액')) {
          tempTotal = { planned, actual, rate };
        } else if (name !== '') {
          tempCat.push({ name, planned, actual, rate });
        }
      });
      setFinanceTotal(tempTotal);
      setFinanceCategory(tempCat);
    } catch (error) {
      console.error("재무 데이터 파싱 실패:", error);
    } finally {
      setIsLoadingFinance(false)
    }
  }

  const financePieData = [
    { name: '시공 금액', value: financeTotal.actual },
    { name: '잔여 금액', value: Math.max(0, financeTotal.planned - financeTotal.actual) }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🏗️ 동원전력 통합 현장관제</h1>
          <p className="text-gray-500 mt-2">선택한 프로젝트의 실시간 공정 현황 및 데이터 모니터링</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm min-w-[320px]">
          <span className="text-sm font-bold text-slate-500">메인 현장 선택</span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'volume' | 'finance')}
            className="outline-none font-black text-[15px] text-slate-800 bg-transparent cursor-pointer flex-1"
          >
            <option value="volume">⚡ 지상부 급전선 점검,보수</option>
            <option value="finance">💰 안성지역 도로시설물 공사</option>
          </select>
        </div>
      </header>

      {/* 1번 뷰: 조별 물량 (생략된 부분 없이 모두 보존) */}
      {viewMode === 'volume' && (
        <section className="mb-12 animate-fadeIn">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-bold text-gray-700">⚡ 지상부 급전선 점검·보수 종합 공정률 (조별)</h2>
            <button onClick={fetchAllTeamData} className="text-sm text-blue-600 font-semibold hover:underline">🔄 데이터 새로고침</button>
          </div>
          {isLoadingTeams ? (
            <div className="h-48 flex items-center justify-center text-gray-400 font-bold animate-pulse bg-white rounded-2xl border">데이터를 불러오는 중입니다...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Object.entries(TEAM_CONFIG).map(([teamName, info]) => {
                const data = [
                  { name: '완료', value: Number(teamStats[teamName].completed) },
                  { name: '잔여', value: Math.max(0, teamStats[teamName].total - teamStats[teamName].completed) }
                ];
                return (
                  <div key={teamName} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                    <h3 className="text-lg font-bold text-gray-600 mb-4">{teamName}</h3>
                    <div className="h-48 w-48 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            <Cell fill={info.color} />
                            <Cell fill="#f1f5f9" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-gray-800">{teamStats[teamName].rate}%</span>
                        <span className="text-xs text-gray-400 font-bold">전체 달성률</span>
                      </div>
                    </div>
                    <div className="mt-6 text-center">
                      <p className="text-sm text-gray-500">누적 완료: <span className="font-bold text-gray-800">{teamStats[teamName].completed.toLocaleString()}</span> / {teamStats[teamName].total.toLocaleString()} 건</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* 2번 뷰: 안성 재무 (오류 방어막 적용 완료) */}
      {viewMode === 'finance' && (
        <section className="mb-12 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-gray-700">💰 안성지역 도로시설물 연간 단가 공사 재무 현황</h2>
          </div>

          {isLoadingFinance ? (
            <div className="h-64 flex items-center justify-center text-gray-400 font-bold animate-pulse bg-white rounded-2xl border">
              구글 시트 금액 데이터를 파싱하는 중입니다... 🔄
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <h3 className="text-lg font-bold text-gray-600 mb-6 w-full text-left">총계 대비 기성률</h3>
                <div className="h-48 w-48 relative mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={financePieData} innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                        <Cell fill="#ef4444" />
                        <Cell fill="#f1f5f9" />
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} 원`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-black ${financeTotal.rate >= 100 ? 'text-red-600' : 'text-gray-800'}`}>
                      {financeTotal.rate}%
                    </span>
                  </div>
                </div>
                <div className="w-full space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold text-gray-500">계약총액</span>
                    <span className="font-bold text-gray-800">{financeTotal.planned.toLocaleString()} 원</span>
                  </div>
                  <div className="flex justify-between p-2 bg-red-50 rounded">
                    <span className="font-semibold text-red-600">기성시공액</span>
                    <span className="font-bold text-red-700">{financeTotal.actual.toLocaleString()} 원</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-600 mb-4">대공종별 기성 집계 상세</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financeCategory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(val) => `${(val / 10000).toLocaleString()}만`} tick={{fill: '#94a3b8', fontSize: 11}} axisLine={false} tickLine={false} width={60} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        formatter={(value: number, name: string) => [`${value.toLocaleString()} 원`, name]}
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      />
                      <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                      <Bar dataKey="planned" name="계약금액" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={25} />
                      <Bar dataKey="actual" name="시공금액" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="border-t pt-8">
        <h2 className="text-xl font-bold text-gray-700 mb-6">추가 관리 항목 (준비 중)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl h-40 flex items-center justify-center text-gray-400 font-medium">👷 안전 관리 현황 예정</div>
          <div className="bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl h-40 flex items-center justify-center text-gray-400 font-medium">🚛 자재/장비 수급 예정</div>
          <div className="bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl h-40 flex items-center justify-center text-gray-400 font-medium">👥 투입 인력 현황 예정</div>
          <div className="bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl h-40 flex items-center justify-center text-gray-400 font-medium">📸 현장 실시간 사진 예정</div>
        </div>
      </section>
    </div>
  )
}