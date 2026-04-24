'use client'

import { useState, useEffect } from 'react'
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

// 🌟 B, C, D조 모두 동일한 5칸 구조로 설정

const CONFIG = {

  'B조(주간)': {

    sheetId: '1esatfRda5r-vWjzD-zrRYr1ieeIwHGOLshsAlDfdSQc',

    sheetName: 'S-curve 집계',

    sites: {

      '군자차량기지': { startCol: 0 },

      '신정차량기지': { startCol: 6 },

      '수서차량기지': { startCol: 12 },

      '지축차량기지': { startCol: 18 },

      '창동차량기지': { startCol: 24 }

    }

  },

  'C조(야간)': {

    sheetId: '1XcgnpQ61R1AlFgT0-4r0OHoyuQx-kXvmzzepHKQ_gpc',

    sheetName: 'C조 S-Curve 집계데이터',

    sites: {

      '신정관리소': { startCol: 0 },

      '대림관리소': { startCol: 6 },

      '종운관리소': { startCol: 12 },

      '군자관리소': { startCol: 18 }

    }

  },

  // 🌟 새롭게 추가된 D조 설정

  'D조(야간)': {

    sheetId: '1DLvnkSnZdByTcMPaChmSuGww3CpAyTDRZyTtp6RINrQ',

    sheetName: 'D조 S-Curve 집계데이터', // 💡 구글 시트 탭 이름과 동일해야 함

    sites: {

      '창동전기': { startCol: 0 },

      '군자전기': { startCol: 6 },

      '동작전기': { startCol: 12 },

      '지축전기': { startCol: 18 },

      '옥수전기': { startCol: 24 },

      '수서전기': { startCol: 30 },

      '신답전기': { startCol: 36 },

      '3전기유치선': { startCol: 42 }

    }

  }

}; // 🚨 이 닫는 괄호 `};` 가 지워졌었기 때문에 발생한 에러입니다!



// 🌟 TeamType에 D조 추가

type TeamType = 'B조(주간)' | 'C조(야간)' | 'D조(야간)';

export default function SchedulePage() {
  const [selectedTeam, setSelectedTeam] = useState<TeamType>('B조(주간)')
  const [selectedSite, setSelectedSite] = useState('군자차량기지')
  
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalPlanned: 0,
    totalCompleted: 0,
    plannedRate: 0,
    actualRate: 0
  })

  useEffect(() => {
    const firstSite = Object.keys(CONFIG[selectedTeam].sites)[0];
    setSelectedSite(firstSite);
  }, [selectedTeam])

  useEffect(() => {
    if (selectedSite) {
      fetchSheetData()
    }
  }, [selectedSite, selectedTeam])

  const fetchSheetData = async () => {
    setIsLoading(true)
    try {
      const currentConfig = CONFIG[selectedTeam];
      // 💡 Vercel 에러 방지용 타입 지정 유지
      const siteInfo = (currentConfig.sites as Record<string, { startCol: number }>)[selectedSite];
      if (!siteInfo) return;

      const url = `https://docs.google.com/spreadsheets/d/${currentConfig.sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(currentConfig.sheetName)}`;
      const response = await fetch(url);
      const text = await response.text();
      
      const jsonData = JSON.parse(text.substring(47, text.length - 2));
      const rows = jsonData.table.rows;
      const startCol = siteInfo.startCol;

      const formattedData = rows
        .map((row: any) => {
          const cells = row.c;
          if (!cells || !cells[startCol] || !cells[startCol].v) return null;

          return {
            date: cells[startCol].f || cells[startCol].v,
            plannedQty: cells[startCol + 1]?.v || 0,
            completedQty: cells[startCol + 2]?.v || null,
            plannedRate: Number((cells[startCol + 3]?.v * 100).toFixed(2)) || 0,
            actualRate: Number((cells[startCol + 4]?.v * 100).toFixed(2)) || 0
          };
        })
        .filter((item: any) => item !== null)
        .slice(1);

      const validData = formattedData.filter((d: any) => d.completedQty !== null && d.completedQty > 0);
      const latestData = validData.length > 0 ? validData[validData.length - 1] : formattedData[0];
      const maxPlanned = Math.max(...formattedData.map((d: any) => d.plannedQty));

      setChartData(formattedData);
      setSummary({
        totalPlanned: maxPlanned,
        totalCompleted: latestData?.completedQty || 0,
        plannedRate: latestData?.plannedRate || 0,
        actualRate: latestData?.actualRate || 0
      });

    } catch (error) {
      console.error('구글 시트 연동 실패:', error);
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📊 통합 공정관리 (S-Curve)</h1>
          <p className="text-gray-500 mt-2 italic font-medium">⚡ 구글 시트 다중 채널 연동 중</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button 
              onClick={() => setSelectedTeam('B조(주간)')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${selectedTeam === 'B조(주간)' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ☀️ B조(주간)
            </button>
            <button 
              onClick={() => setSelectedTeam('C조(야간)')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${selectedTeam === 'C조(야간)' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              🌙 C조(야간)
            </button>
            {/* 🌟 D조 버튼 추가 */}
            <button 
              onClick={() => setSelectedTeam('D조(야간)')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${selectedTeam === 'D조(야간)' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              🌙 D조(야간)
            </button>
          </div>

          <div className="bg-white px-4 py-2 border rounded-lg shadow-sm flex items-center space-x-3">
            <span className="font-semibold text-gray-600 text-sm">조회 현장</span>
            <select 
              value={selectedSite} 
              onChange={(e) => setSelectedSite(e.target.value)}
              className="outline-none font-bold text-slate-800 bg-transparent cursor-pointer"
            >
              {Object.keys(CONFIG[selectedTeam].sites).map(site => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center text-gray-400 font-bold animate-pulse">
          {selectedTeam} 데이터를 가져오는 중... 🔄
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
              <p className="text-sm text-gray-500 font-semibold">총 계획 물량</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{summary.totalPlanned.toLocaleString()} <span className="text-sm font-normal text-gray-400">건</span></p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
              <p className="text-sm text-gray-500 font-semibold">현재 완료 물량</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{summary.totalCompleted.toLocaleString()} <span className="text-sm font-normal text-gray-400">건</span></p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
              <p className="text-sm text-gray-500 font-semibold">계획 공정률</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{summary.plannedRate}%</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
              <p className="text-sm text-gray-500 font-semibold">실적 달성률</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{summary.actualRate}%</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedSite} 공정 현황 <span className="text-sm font-normal text-gray-500 ml-2">({selectedTeam})</span>
              </h2>
              <button onClick={fetchSheetData} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md font-semibold text-gray-600">
                🔄 새로고침
              </button>
            </div>
            
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 11, fill: '#888'}} tickMargin={10} />
                  <YAxis tick={{fontSize: 12, fill: '#666'}} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any, name: any) => [
                      String(name).includes('Rate') || String(name).includes('율') ? `${value}%` : `${value}건`,
                      name === 'plannedQty' ? '계획물량' : name === 'completedQty' ? '완료물량' : name === 'plannedRate' ? '계획공정률' : '실적달성률'
                    ]}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar dataKey="plannedQty" name="계획물량" barSize={15} fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.6} />
                  <Line type="monotone" dataKey="completedQty" name="완료물량" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}