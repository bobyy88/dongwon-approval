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

// 🌟 구글 시트 설정 정보
const SHEET_ID = '1esatfRda5r-vWjzD-zrRYr1ieeIwHGOLshsAlDfdSQc';
const SHEET_NAME = 'S-curve 집계'; // 시트 탭 이름

export default function SchedulePage() {
  const [selectedSite, setSelectedSite] = useState('군자차량기지')
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalPlanned: 0,
    totalCompleted: 0,
    plannedRate: 0,
    actualRate: 0
  })

  // 현장별 데이터 시작 열 인덱스 (0부터 시작: A=0, B=1, C=2...)
  const siteColumnMap: Record<string, number> = {
    '군자차량기지': 0,  // A열부터 시작
    '신정차량기지': 6,  // G열부터 시작
    '수서차량기지': 12, // M열부터 시작
    '지축차량기지': 18, // S열부터 시작
    '창동차량기지': 24  // Y열부터 시작 (🌟 창동 추가 완!)
  }

  useEffect(() => {
    fetchSheetData()
  }, [selectedSite])

  const fetchSheetData = async () => {
    setIsLoading(true)
    try {
      // GViz API를 이용해 데이터를 JSON으로 가져옵니다.
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
      const response = await fetch(url);
      const text = await response.text();
      
      // 구글 응답 껍데기를 벗겨내고 순수 JSON만 추출합니다.
      const jsonData = JSON.parse(text.substring(47, text.length - 2));
      const rows = jsonData.table.rows;
      const startCol = siteColumnMap[selectedSite];

      // 데이터 가공 (행 단위 반복)
      const formattedData = rows
        .map((row: any) => {
          const cells = row.c;
          // 날짜값이 있는 행만 가져옵니다.
          if (!cells[startCol] || !cells[startCol].v) return null;

          return {
            date: cells[startCol].f || cells[startCol].v, // 날짜 (A, G, M...)
            plannedQty: cells[startCol + 1]?.v || 0,     // 계획물량 (B, H, N...)
            completedQty: cells[startCol + 2]?.v || null, // 완료물량 (C, I, O...)
            plannedRate: (cells[startCol + 3]?.v * 100).toFixed(2), // 계획율 (D, J, P...)
            actualRate: (cells[startCol + 4]?.v * 100).toFixed(2)   // 실적율 (E, K, Q...)
          };
        })
        .filter((item: any) => item !== null)
        .slice(1); // 첫 줄(헤더)은 제외

      setChartData(formattedData);

      // 최신 요약 데이터 추출 (데이터가 있는 마지막 행 기준)
      const latestData = formattedData.filter(d => d.completedQty !== null).pop() || formattedData[0];
      const maxPlanned = Math.max(...formattedData.map(d => d.plannedQty));

      setSummary({
        totalPlanned: maxPlanned,
        totalCompleted: latestData.completedQty || 0,
        plannedRate: parseFloat(latestData.plannedRate),
        actualRate: parseFloat(latestData.actualRate)
      });

    } catch (error) {
      console.error('구글 시트 연동 실패:', error);
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📅 현장 공정관리 (S-Curve)</h1>
          <p className="text-gray-500 mt-2 italic font-medium">⚡ 구글 시트 실시간 연동 중</p>
        </div>
        
        <div className="bg-white px-4 py-2 border rounded-lg shadow-sm flex items-center space-x-3">
          <span className="font-semibold text-gray-600 text-sm">조회 현장</span>
          <select 
            value={selectedSite} 
            onChange={(e) => setSelectedSite(e.target.value)}
            className="outline-none font-bold text-blue-600 bg-transparent cursor-pointer"
          >
            {Object.keys(siteColumnMap).map(site => (
              <option key={site} value={site}>{site}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center text-gray-400 font-bold animate-pulse">
          구글 시트에서 최신 데이터를 가져오는 중입니다... 🔄
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
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

          {/* S-Curve 차트 영역 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">{selectedSite} 공정 현황</h2>
              <button 
                onClick={fetchSheetData}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md font-semibold text-gray-600 transition-all"
              >
                🔄 데이터 새로고침
              </button>
            </div>
            
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                >
                  <CartesianGrid stroke="#f5f5f5" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 11, fill: '#888'}} 
                    tickMargin={10}
                  />
                  <YAxis 
                    tick={{fontSize: 12, fill: '#666'}} 
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any, name: string) => [
                      name.includes('Rate') ? `${value}%` : `${value}건`,
                      name === 'plannedQty' ? '계획물량' : 
                      name === 'completedQty' ? '완료물량' :
                      name === 'plannedRate' ? '계획공정률' : '실적달성률'
                    ]}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }} />
                  
                  <Bar dataKey="plannedQty" name="계획물량" barSize={15} fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.6} />
                  <Line type="monotone" dataKey="completedQty" name="완료물량" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
                  
                  {/* 퍼센트 라인을 추가하고 싶으시면 아래 주석을 해제하세요 */}
                  {/* <Line type="monotone" dataKey="actualRate" name="실적률(%)" stroke="#8b5cf6" strokeWidth={2} dot={false} /> */}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}