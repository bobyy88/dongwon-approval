'use client'

import { useState } from 'react'
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

// 🌟 대표님 구글 시트의 '군자차량기지' 데이터를 그대로 가져온 샘플 데이터입니다.
const mockData = [
  { date: '2026. 1. 5', plannedQty: 18, completedQty: 18, plannedRate: 8.29, actualRate: 8.29 },
  { date: '2026. 1. 12', plannedQty: 35, completedQty: 35, plannedRate: 16.13, actualRate: 16.13 },
  { date: '2026. 1. 19', plannedQty: 53, completedQty: 53, plannedRate: 24.42, actualRate: 24.42 },
  { date: '2026. 1. 26', plannedQty: 65, completedQty: 65, plannedRate: 29.95, actualRate: 29.95 },
  { date: '2026. 2. 2', plannedQty: 77, completedQty: 77, plannedRate: 35.48, actualRate: 35.48 },
  { date: '2026. 2. 9', plannedQty: 88, completedQty: 88, plannedRate: 40.55, actualRate: 40.55 },
  { date: '2026. 2. 16', plannedQty: 88, completedQty: 88, plannedRate: 40.55, actualRate: 40.55 },
  { date: '2026. 2. 23', plannedQty: 88, completedQty: 88, plannedRate: 40.55, actualRate: 40.55 },
  { date: '2026. 3. 2', plannedQty: 88, completedQty: 88, plannedRate: 40.55, actualRate: 40.55 },
  { date: '2026. 3. 9', plannedQty: 94, completedQty: 94, plannedRate: 43.32, actualRate: 43.32 },
  { date: '2026. 3. 16', plannedQty: 104, completedQty: 104, plannedRate: 47.93, actualRate: 47.93 },
  { date: '2026. 3. 23', plannedQty: 104, completedQty: 104, plannedRate: 47.93, actualRate: 47.93 },
  { date: '2026. 3. 30', plannedQty: 114, completedQty: null, plannedRate: 52.53, actualRate: 0 },
  { date: '2026. 4. 6', plannedQty: 124, completedQty: null, plannedRate: 57.14, actualRate: 0 },
  { date: '2026. 4. 13', plannedQty: 136, completedQty: null, plannedRate: 62.67, actualRate: 0 },
  { date: '2026. 4. 20', plannedQty: 148, completedQty: null, plannedRate: 68.20, actualRate: 0 },
]

export default function SchedulePage() {
  const [selectedSite, setSelectedSite] = useState('군자차량기지')

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📅 현장 공정관리 (S-Curve)</h1>
          <p className="text-gray-500 mt-2">구글 시트의 실시간 집계 데이터를 시각화하여 보여줍니다.</p>
        </div>
        
        {/* 현장 선택 드롭다운 */}
        <div className="bg-white px-4 py-2 border rounded-lg shadow-sm flex items-center space-x-3">
          <span className="font-semibold text-gray-600 text-sm">조회 현장</span>
          <select 
            value={selectedSite} 
            onChange={(e) => setSelectedSite(e.target.value)}
            className="outline-none font-bold text-blue-600 bg-transparent cursor-pointer"
          >
            <option value="군자차량기지">군자차량기지</option>
            <option value="신정차량기지">신정차량기지</option>
            <option value="수서차량기지">수서차량기지</option>
            <option value="지축차량기지">지축차량기지</option>
          </select>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500 font-semibold">총 계획 물량</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">217 <span className="text-sm font-normal text-gray-400">건</span></p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-500 font-semibold">현재 완료 물량</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">104 <span className="text-sm font-normal text-gray-400">건</span></p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-500 font-semibold">계획 공정률</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">47.93 <span className="text-sm font-normal text-gray-400">%</span></p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-sm text-gray-500 font-semibold">실적 달성률</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">47.93 <span className="text-sm font-normal text-gray-400">%</span></p>
        </div>
      </div>

      {/* S-Curve 차트 영역 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">계획물량 vs 완료물량 현황</h2>
          <span className="text-xs text-gray-400">마우스를 올리면 상세 수치를 볼 수 있습니다.</span>
        </div>
        
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={mockData}
              margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
            >
              <CartesianGrid stroke="#f5f5f5" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 12, fill: '#666'}} 
                tickMargin={10}
              />
              <YAxis 
                tick={{fontSize: 12, fill: '#666'}} 
                domain={[0, 250]} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              
              {/* 엑셀처럼 막대그래프 = 계획물량 */}
              <Bar 
                dataKey="plannedQty" 
                name="계획물량" 
                barSize={20} 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]} 
              />
              
              {/* 엑셀처럼 꺾은선그래프 = 완료물량 */}
              <Line 
                type="monotone" 
                dataKey="completedQty" 
                name="완료물량" 
                stroke="#ef4444" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2 }} 
                activeDot={{ r: 6 }} 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}