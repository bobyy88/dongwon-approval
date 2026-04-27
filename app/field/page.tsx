'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

// 기존에 사용하던 시트 정보 그대로 활용
const CONFIG = {
  'B조(주간)': {
    sheetId: '1esatfRda5r-vWjzD-zrRYr1ieeIwHGOLshsAlDfdSQc',
    sheetName: 'S-curve 집계',
    sites: ['군자차량기지', '신정차량기지', '수서차량기지', '지축차량기지', '창동차량기지'],
    startCols: [0, 6, 12, 18, 24],
    color: '#3b82f6' // 파란색
  },
  'C조(야간)': {
    sheetId: '1XcgnpQ61R1AlFgT0-4r0OHoyuQx-kXvmzzepHKQ_gpc',
    sheetName: 'C조 S-Curve 집계데이터',
    sites: ['신정관리소', '대림관리소', '종운관리소', '군자관리소'],
    startCols: [0, 6, 12, 18],
    color: '#6366f1' // 보라색
  },
  'D조(야간)': {
    sheetId: '1DLvnkSnZdByTcMPaChmSuGww3CpAyTDRZyTtp6RINrQ',
    sheetName: 'D조 집계데이터',
    sites: ['창동전기', '군자전기', '동작전기', '지축전기', '옥수전기', '수서전기', '신답전기', '3전기유치선'],
    startCols: [0, 6, 12, 18, 24, 30, 36, 42],
    color: '#10b981' // 초록색
  }
}

export default function FieldMainPage() {
  const [teamStats, setTeamStats] = useState<any>({
    'B조(주간)': { rate: 0, completed: 0, total: 0 },
    'C조(야간)': { rate: 0, completed: 0, total: 0 },
    'D조(야간)': { rate: 0, completed: 0, total: 0 }
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAllTeamData()
  }, [])

  const fetchAllTeamData = async () => {
    setIsLoading(true)
    const newStats: any = {}

    try {
      for (const [teamName, info] of Object.entries(CONFIG)) {
        const url = `https://docs.google.com/spreadsheets/d/${info.sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(info.sheetName)}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonData = JSON.parse(text.substring(47, text.length - 2));
        const rows = jsonData.table.rows;

        let teamTotalPlanned = 0;
        let teamTotalCompleted = 0;

        info.startCols.forEach((startCol) => {
          // 1. 날짜가 존재하는 행만 추출 (첫 줄 헤더 제외)
          const validRows = rows.slice(1).filter((r: any) => r.c && r.c[startCol] && r.c[startCol].v);

          if (validRows.length > 0) {
            // 🌟 수정: 계획물량 (해당 현장의 척추가 되는 전체 계획 최대값 추출)
            const maxPlanned = Math.max(...validRows.map((r: any) => Number(r.c[startCol + 1]?.v) || 0));
            teamTotalPlanned += maxPlanned;

            // 🌟 수정: 완료물량 (텍스트 무시하고 순수 숫자가 입력된 가장 마지막 줄 찾기)
            const completedRows = validRows.filter((r: any) => {
              const val = r.c[startCol + 2]?.v;
              return val !== null && val !== undefined && val !== '' && !isNaN(Number(val));
            });

            if (completedRows.length > 0) {
              const latestCompleted = Number(completedRows[completedRows.length - 1].c[startCol + 2]?.v) || 0;
              teamTotalCompleted += latestCompleted;
            }
          }
        });

        const rate = teamTotalPlanned > 0 ? (teamTotalCompleted / teamTotalPlanned * 100).toFixed(1) : 0;
        newStats[teamName] = { rate, completed: teamTotalCompleted, total: teamTotalPlanned };
      }
      setTeamStats(newStats)
    } catch (e) {
      console.error("데이터 로드 실패", e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800">🏗️ 동원전력 통합 현장관제</h1>
        <p className="text-gray-500 mt-2">각 조별 실시간 공정 현황 및 종합 대시보드</p>
      </header>

      {/* 1번 섹션: 조별 공정률 (도넛 차트) */}
      <section className="mb-12">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-bold text-gray-700">조별 종합 공정률</h2>
          <button onClick={fetchAllTeamData} className="text-sm text-blue-600 font-semibold hover:underline">🔄 데이터 새로고침</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.entries(CONFIG).map(([teamName, info]) => {
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
                      <Pie
                        data={data}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
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
      </section>

      {/* 2번 섹션: 미래 확장 공간 (플레이스홀더) */}
      <section>
        <h2 className="text-xl font-bold text-gray-700 mb-6">추가 관리 항목 (준비 중)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl h-40 flex items-center justify-center text-gray-400 font-medium">
            👷 안전 관리 현황 예정
          </div>
          <div className="bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl h-40 flex items-center justify-center text-gray-400 font-medium">
            🚛 자재/장비 수급 예정
          </div>
          <div className="bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl h-40 flex items-center justify-center text-gray-400 font-medium">
            👥 투입 인력 현황 예정
          </div>
          <div className="bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl h-40 flex items-center justify-center text-gray-400 font-medium">
            📸 현장 실시간 사진 예정
          </div>
        </div>
      </section>
    </div>
  )
}