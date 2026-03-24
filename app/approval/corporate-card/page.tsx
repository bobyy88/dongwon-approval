'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import Tesseract from 'tesseract.js'
import { supabase } from '@/lib/supabase'

export default function CorporateCardPage() {
  // --- [상태 관리 중앙 통제실] ---
  const [selectedMonth, setSelectedMonth] = useState('2026-03')
  const [selectedCardId, setSelectedCardId] = useState('') // UUID 형식의 카드 ID
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // 🌟 입력 모달(팝업창) 제어 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expenseData, setExpenseData] = useState({
    expense_date: '',
    amount: '',
    category: '',
    receipt_url: '',
    remarks: ''
  })

  // 1차 테스트에서는 가짜 통계 데이터를 그대로 사용합니다.
  const mockChartData = [
    { name: '주차비', value: 50000 },
    { name: '유류비', value: 150000 },
    { name: '차량정비비', value: 0 },
    { name: '사무용품', value: 30000 },
    { name: '복리후생비', value: 120000 },
  ]
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF']

  // 엑셀 다운로드 함수
  const downloadExcel = () => {
    alert('나중에 DB 데이터가 연결되면 진짜 엑셀 파일이 다운로드 됩니다!')
  }

  // --- [데이터베이스 파이프라인 엔진] ---

  // 🌟 1. 모달 초기화 (수기 등록용)
  const openManualEntry = () => {
    setExpenseData({
      expense_date: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
      receipt_url: '', // 수기 등록 시 영수증 없음
      remarks: ''
    })
    setIsModalOpen(true)
  }

  // 🌟 2. OCR 영수증 스캔 후 모달 열기
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'kor+eng')
      
      const dateMatch = text.match(/\d{4}[-./]\d{2}[-./]\d{2}/)
      const amountMatch = text.match(/(합\s*계|금\s*액|승\s*인\s*금\s*액)[\s:₩]*([0-9,]+)/)
      
      const parsedDate = dateMatch ? dateMatch[0].replace(/[./]/g, '-') : new Date().toISOString().split('T')[0];
      const parsedAmount = amountMatch ? amountMatch[2].replace(/,/g, '') : '';

      setExpenseData({
        expense_date: parsedDate,
        amount: parsedAmount,
        category: '', 
        receipt_url: '임시 영수증 주소', 
        remarks: ''
      })
      setIsModalOpen(true);

    } catch (error) {
      console.error(error)
      alert('영수증 스캔 중 오류가 발생했습니다.')
    } finally {
      setIsScanning(false)
    }
  }

  // 🌟 3. 최종 저장 함수 (대표님 요구사항 반영)
  const saveExpenseToDB = async () => {
    if (!selectedCardId) return alert('사용하신 카드를 선택해 주세요!')
    if (!expenseData.expense_date || !expenseData.amount || !expenseData.category) {
      return alert('결제일, 금액, 카테고리는 필수 입력 항목입니다!')
    }

    setIsSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('인증 세션이 만료되었습니다.')

      const { error } = await supabase
        .from('card_expenses')
        .insert([{
          card_id: selectedCardId,
          expense_date: expenseData.expense_date,
          amount: parseInt(expenseData.amount),
          category: expenseData.category,
          receipt_url: expenseData.receipt_url,
          remarks: expenseData.remarks,
          user_id: session.user.id 
        }]);

      if (error) throw error;

      alert('내역이 성공적으로 저장되었습니다! 👍')
      setIsModalOpen(false); 

    } catch (error: any) {
      console.error(error)
      alert(`저장에 실패했습니다: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      
      {/* 1. 상단 헤더 및 월 선택 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">💳 법인카드 사용내역 정산</h1>
        <div className="flex space-x-4">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border p-2 rounded-md shadow-sm"
          />
          <button 
            onClick={downloadExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold transition-all"
          >
            📥 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* 2. 카드 선택 탭 & 요약 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">카드 선택</h2>
          <div className="flex space-x-2">
            {['국민카드(본사)', '신한카드(현장A)', '현대카드(임원용)'].map(card => (
              <button
                key={card}
                onClick={() => setSelectedCardId(card)} // 임시로 이름 넣기 (나중에 ID로 교체)
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCardId === card ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {card}
              </button>
            ))}
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-600 font-semibold">이번 달 총 지출액</p>
              <p className="text-3xl font-bold text-blue-900">350,000 원</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 font-semibold">카드 누적 잔액</p>
              <p className="text-xl font-bold text-gray-800">1,650,000 원 <span className="text-sm text-blue-500 cursor-pointer hover:underline">(수정)</span></p>
            </div>
          </div>
        </div>

        {/* 3. 카테고리별 원형 통계 그래프 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64">
          <h2 className="text-lg font-bold mb-2 text-center">지출 비율 (카테고리별)</h2>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={mockChartData}
                cx="50%" cy="40%"
                innerRadius={50} outerRadius={70}
                paddingAngle={5} dataKey="value"
              >
                {mockChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}원`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. 내역 테이블 영역 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">결제 내역 리스트</h2>
          
          <div className="flex space-x-2">
            {/* 버튼 1: 영수증 스캔 및 자동 입력 */}
            <div className="relative overflow-hidden inline-block">
              <button className={`px-4 py-2 rounded-md text-sm font-semibold text-white transition-all ${isScanning ? 'bg-slate-400' : 'bg-green-600 hover:bg-green-700'}`}>
                {isScanning ? '🔍 분석 중...' : '+ 영수증 스캔 등록'}
              </button>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                disabled={isScanning}
                className="absolute left-0 top-0 right-0 bottom-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* 버튼 2: 수기 등록 */}
            <button 
              onClick={openManualEntry}
              className="bg-gray-100 hover:bg-gray-200 text-slate-700 px-4 py-2 rounded-md text-sm font-semibold"
            >
              + 직접 수기 등록
            </button>
          </div>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 border-b">
              <th className="p-3">결제일</th>
              <th className="p-3">카테고리</th>
              <th className="p-3">금액</th>
              <th className="p-3">비고 (메모)</th>
              <th className="p-3">작성자</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-gray-50">
              <td className="p-3 text-gray-500">2026-03-24</td>
              <td className="p-3"><span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">유류비</span></td>
              <td className="p-3 font-bold">50,000원</td>
              <td className="p-3 text-gray-600">포터 주유 (강남현장)</td>
              <td className="p-3 text-gray-500">임대표</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 🌟 결제 내역 입력/수정 모달 (팝업창) 🌟 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              {expenseData.receipt_url ? '영수증 스캔 및 편집' : '직접 수기 등록'}
            </h2>
            
            <div className="space-y-5">
              {/* 날짜 입력 */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">결제일</label>
                <input 
                  type="date" 
                  value={expenseData.expense_date}
                  onChange={(e) => setExpenseData({...expenseData, expense_date: e.target.value})}
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                />
              </div>

              {/* 금액 입력 */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">금액 (원)</label>
                <input 
                  type="number" 
                  placeholder="금액을 입력해 주세요"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})}
                  className="w-full border p-3 rounded-lg text-lg font-bold"
                />
              </div>

              {/* 카테고리 선택 */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">카테고리</label>
                <select 
                  value={expenseData.category}
                  onChange={(e) => setExpenseData({...expenseData, category: e.target.value})}
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                >
                  <option value="">카테고리 선택</option>
                  {['주차비', '유류비', '차량정비비', '사무용품', '복리후생비'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* 비고 입력 */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">비고 (메모)</label>
                <input 
                  type="text" 
                  placeholder="예) 포터 주유, 거래처 미팅 등"
                  value={expenseData.remarks}
                  onChange={(e) => setExpenseData({...expenseData, remarks: e.target.value})}
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* 하단 버튼 영역 */}
            <div className="flex justify-end space-x-3 mt-10 border-t pt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-slate-600 px-6 py-2.5 rounded-lg font-semibold"
              >
                취소
              </button>
              <button 
                onClick={saveExpenseToDB}
                disabled={isSaving}
                className={`px-8 py-2.5 rounded-lg font-semibold text-white ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSaving ? '저장 중...' : '저장하기'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}