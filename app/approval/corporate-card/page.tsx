'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import * as XLSX from 'xlsx'
import Tesseract from 'tesseract.js'
import { supabase } from '@/lib/supabase'

export default function CorporateCardPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedCardId, setSelectedCardId] = useState('') 
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [cards, setCards] = useState<any[]>([]) 
  const [expenses, setExpenses] = useState<any[]>([]) 
  const [chartData, setChartData] = useState<any[]>([]) 
  const [totalExpense, setTotalExpense] = useState(0) 
  const [allTimeExpense, setAllTimeExpense] = useState(0) 
  const [cardBalance, setCardBalance] = useState(0) 

  const [userGrade, setUserGrade] = useState('')
  const [userSite, setUserSite] = useState('') 

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  
  const [expenseData, setExpenseData] = useState({
    expense_date: '',
    amount: '',
    category: '',
    remarks: '',
    receipt_url: '' 
  })

  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false)
  const [newBalanceInput, setNewBalanceInput] = useState('')
  
  const [isPageLoaded, setIsPageLoaded] = useState(false)

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF']

  useEffect(() => {
    const initializePage = async () => {
      const profile = await checkUserRole()
      if (profile) {
        await fetchCards(profile) 
      }
      setIsPageLoaded(true)
    }
    initializePage()
  }, [])

  useEffect(() => {
    if (selectedCardId && selectedMonth) {
      fetchExpenses()
      const card = cards.find(c => c.id === selectedCardId)
      if (card) setCardBalance(card.current_balance)
    } else {
      setExpenses([])
      setChartData([])
      setTotalExpense(0)
      setAllTimeExpense(0)
      setCardBalance(0)
    }
  }, [selectedCardId, selectedMonth, cards])

  const checkUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return null;
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) {
        setUserGrade((profile.grade || profile.role || '').toLowerCase());
        // 🌟 [수정됨] DB의 진짜 컬럼명인 'site_name'으로 변경!
        setUserSite(profile.site_name || ''); 
        return profile;
      }
      return null;
    } catch (error) {
      console.error('권한 확인 실패:', error);
      return null;
    }
  }

  const isManagerOrHigher = () => ['manager', 'admin', 'master', '매니저', '관리자', '최고 관리자'].includes(userGrade);
  const isAdminOrMaster = () => ['admin', 'master', '관리자', '최고 관리자'].includes(userGrade);

  const formatNumberWithComma = (value: string | number) => {
    if (!value) return '';
    const num = parseInt(value.toString().replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? '' : num.toLocaleString();
  }

  const fetchCards = async (profile: any) => {
    const grade = (profile.grade || profile.role || '').toLowerCase();
    const isAdmin = ['admin', 'master', '관리자', '최고 관리자'].includes(grade);

    let query = supabase.from('corporate_cards').select('*').neq('status', '해지').order('created_at', { ascending: true });

    // 🌟 [수정됨] DB의 진짜 컬럼명인 'site_name'으로 필터링!
    if (!isAdmin) {
      query = query.eq('department_or_site', profile.site_name || '미배정');
    }

    const { data } = await query;
    if (data && data.length > 0) {
      setCards(data);
      setSelectedCardId(data[0].id); 
    } else {
      setCards([]);
      setSelectedCardId(''); 
    }
  }

  const fetchExpenses = async () => {
    if (!selectedCardId) return;

    const [year, month] = selectedMonth.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate(); 
    const startDate = `${selectedMonth}-01`
    const endDate = `${selectedMonth}-${lastDay}` 

    const { data, error } = await supabase
      .from('card_expenses')
      .select('*')
      .eq('card_id', selectedCardId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false })

    if (error) return console.error('내역 불러오기 실패:', error);
    setExpenses(data || [])

    let thisMonthTotal = 0
    const categorySums: Record<string, number> = {
      '운영&유지비': 0, '업무활동비': 0, '복리후생비': 0, '감가자산비': 0, '기타': 0
    }

    data?.forEach(exp => {
      thisMonthTotal += Number(exp.amount)
      if (categorySums[exp.category] !== undefined) {
        categorySums[exp.category] += Number(exp.amount)
      } else {
        categorySums['기타'] += Number(exp.amount)
      }
    })

    setTotalExpense(thisMonthTotal)
    
    const newChartData = Object.keys(categorySums)
      .filter(key => categorySums[key] > 0)
      .map(key => ({ name: key, value: categorySums[key] }))
    setChartData(newChartData)

    const { data: allTimeData } = await supabase.from('card_expenses').select('amount').eq('card_id', selectedCardId);
    let totalAll = 0;
    allTimeData?.forEach(exp => totalAll += Number(exp.amount));
    setAllTimeExpense(totalAll);
  }

  const openBalanceModal = async () => {
    if (!isAdminOrMaster()) return alert('🚨 접근 거부: admin 또는 master 권한만 수정할 수 있습니다!');
    setNewBalanceInput(formatNumberWithComma(cardBalance)); 
    setIsBalanceModalOpen(true);
  }

  const submitBalanceUpdate = async () => {
    if (!selectedCardId) return;
    const newBalance = parseInt(newBalanceInput.replace(/,/g, ''), 10);
    if (isNaN(newBalance)) return alert('올바른 숫자를 입력해주세요!');

    setIsSaving(true);
    try {
      const { error } = await supabase.from('corporate_cards').update({ current_balance: newBalance }).eq('id', selectedCardId);
      if (error) throw error;

      setCardBalance(newBalance);
      setCards(cards.map(c => c.id === selectedCardId ? { ...c, current_balance: newBalance } : c));
      alert('성공적으로 수정되었습니다. 💳');
      setIsBalanceModalOpen(false);
    } catch (error: any) {
      alert(`수정에 실패했습니다: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  const downloadExcel = () => {
    if (expenses.length === 0) return alert('다운로드할 결제 내역이 없습니다!');
    const excelData = expenses.map((exp, index) => ({
      '연번': index + 1,
      '결제일': exp.expense_date,
      '카테고리': exp.category,
      '결제금액': Number(exp.amount).toLocaleString() + ' 원', 
      '비고(메모)': exp.remarks || '-',
      '영수증 링크': exp.receipt_url || '수기등록 (영수증 없음)'
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [ { wch: 6 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 40 }, { wch: 70 } ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '법인카드내역');
    XLSX.writeFile(workbook, `동원전력_법인카드내역_${selectedMonth}.xlsx`);
  }

  const openEditModal = (exp: any) => {
    setEditingExpenseId(exp.id);
    setExpenseData({
      expense_date: exp.expense_date,
      amount: formatNumberWithComma(exp.amount), 
      category: exp.category,
      remarks: exp.remarks || '',
      receipt_url: exp.receipt_url || ''
    });
    setReceiptFile(null); 
    setIsModalOpen(true);
  }

  const handleDelete = async (id: string) => {
    if (!isManagerOrHigher()) return alert('🚨 삭제 권한이 없습니다. (Manager 등급 이상 필요)');
    if (!confirm('정말 이 결제 내역을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    try {
      const { error } = await supabase.from('card_expenses').delete().eq('id', id);
      if (error) throw error;
      alert('내역이 성공적으로 삭제되었습니다. 🗑️');
      fetchExpenses(); 
    } catch (error: any) {
      alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  const openManualEntry = () => {
    setEditingExpenseId(null); 
    setExpenseData({ expense_date: new Date().toISOString().split('T')[0], amount: '', category: '', remarks: '', receipt_url: '' })
    setReceiptFile(null) 
    setIsModalOpen(true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    setIsScanning(true)
    
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'kor+eng')
      let parsedDate = new Date().toISOString().split('T')[0]; 
      const dateMatch = text.match(/(\d{4})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);
      if (dateMatch) parsedDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;

      let parsedAmount = '';
      const commaNumbers = text.match(/\d{1,3}(,\d{3})+/g); 
      if (commaNumbers) {
        parsedAmount = Math.max(...commaNumbers.map(n => parseInt(n.replace(/,/g, ''), 10))).toString();
      } else {
        const backupMatch = text.replace(/\s+/g, '').match(/(합계|금액|승인|결제|총액)[^\d]*(\d{3,7})/);
        if (backupMatch) parsedAmount = backupMatch[2];
      }

      setEditingExpenseId(null); 
      setExpenseData({ expense_date: parsedDate, amount: formatNumberWithComma(parsedAmount), category: '', remarks: '', receipt_url: '' })
      setIsModalOpen(true);
    } catch (error) {
      alert('영수증 스캔 중 오류가 발생했습니다.')
    } finally {
      setIsScanning(false)
    }
  }

  const saveExpenseToDB = async () => {
    if (!selectedCardId) return alert('사용하신 카드를 선택해 주세요!')
    if (!expenseData.expense_date || !expenseData.amount || !expenseData.category) return alert('필수 항목을 입력하세요!')

    setIsSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) throw new Error('인증 세션이 만료되었습니다.');
      
      let finalReceiptUrl = expenseData.receipt_url; 
      
      if (receiptFile) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${receiptFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, receiptFile);
        if (uploadError) throw uploadError;
        finalReceiptUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl;
      }

      const rawAmount = parseInt(expenseData.amount.replace(/,/g, ''), 10);
      const payload = {
        card_id: selectedCardId,
        expense_date: expenseData.expense_date,
        amount: rawAmount,
        category: expenseData.category,
        receipt_url: finalReceiptUrl, 
        remarks: expenseData.remarks,
        user_id: session.user.id 
      };

      if (editingExpenseId) {
        const { error } = await supabase.from('card_expenses').update(payload).eq('id', editingExpenseId);
        if (error) throw error;
        alert('내역이 성공적으로 수정되었습니다! ✏️');
      } else {
        const { error } = await supabase.from('card_expenses').insert([payload]);
        if (error) throw error;
        alert('내역이 성공적으로 등록되었습니다! 👍');
      }

      setIsModalOpen(false); 
      setReceiptFile(null); 
      setEditingExpenseId(null);
      fetchExpenses();
    } catch (error: any) {
      alert(`저장에 실패했습니다: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isPageLoaded) {
    return <div className="flex h-screen items-center justify-center text-gray-500 font-bold">시스템 정보를 불러오는 중입니다... 🛡️</div>
  }

  const currentCard = cards.find(c => c.id === selectedCardId);
  const isCreditCard = currentCard?.card_type === '신용' || !currentCard?.card_type; 
  const actualRemainingBalance = isCreditCard ? cardBalance - totalExpense : cardBalance - allTimeExpense;

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">💳 법인카드 사용내역 정산</h1>
        <div className="flex space-x-4">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border p-2 rounded-md shadow-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button 
            onClick={downloadExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold transition-all"
            disabled={cards.length === 0}
          >
            📥 엑셀 다운로드
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">카드 선택 <span className="text-sm font-normal text-gray-400 ml-2">(본인 현장 소속 카드만 표시)</span></h2>
          
          {cards.length > 0 ? (
            <div className="flex space-x-2 flex-wrap gap-y-2">
              {cards.map(card => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)} 
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCardId === card.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {card.card_name} <span className="text-xs opacity-75">({card.card_type || '신용'})</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-semibold border border-red-100">
              🚨 소속된 현장 ({userSite || '미배정'})에 배정된 법인카드가 없습니다. 관리자에게 문의하세요.
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-600 font-semibold">이번 달 총 지출액</p>
              <p className="text-3xl font-bold text-blue-900">{formatNumberWithComma(totalExpense)} 원</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 font-semibold">
                {isCreditCard ? '실제 잔여 한도 (이번 달)' : '통장 실제 잔액 (누적)'}
              </p>
              <p className="text-xl font-bold text-gray-800">
                {formatNumberWithComma(actualRemainingBalance)} 원 
                {isAdminOrMaster() && (
                  <span onClick={openBalanceModal} className="text-sm text-blue-500 cursor-pointer hover:underline ml-2">
                    (수정)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col items-center">
          <h2 className="text-lg font-bold mb-2 text-center w-full">지출 비율 (카테고리별)</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 15, right: 30, left: 30, bottom: 15 }}>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius="30%" 
                  outerRadius="55%" 
                  paddingAngle={3} 
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={true}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${Number(value || 0).toLocaleString()}원`} />
                <Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full w-full text-gray-400 font-medium">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">결제 내역 리스트</h2>
          <div className="flex space-x-2">
            <div className="relative overflow-hidden inline-block">
              <button 
                disabled={isScanning || cards.length === 0} 
                className={`px-4 py-2 rounded-md text-sm font-semibold text-white transition-all ${
                  isScanning || cards.length === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isScanning ? '🔍 분석 중...' : '+ 영수증 스캔 등록'}
              </button>
              {cards.length > 0 && (
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  disabled={isScanning}
                  className="absolute left-0 top-0 right-0 bottom-0 opacity-0 cursor-pointer"
                />
              )}
            </div>
            <button 
              onClick={openManualEntry}
              disabled={cards.length === 0}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                cards.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-slate-700'
              }`}
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
              <th className="p-3">영수증</th>
              <th className="p-3 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length > 0 ? (
              expenses.map(exp => (
                <tr key={exp.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-gray-500">{exp.expense_date}</td>
                  <td className="p-3">
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">{exp.category}</span>
                  </td>
                  <td className="p-3 font-bold">{Number(exp.amount).toLocaleString()}원</td>
                  <td className="p-3 text-gray-600">{exp.remarks || '-'}</td>
                  <td className="p-3">
                    {exp.receipt_url ? (
                      <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold text-sm">📄 보기</a>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => openEditModal(exp)} className="text-sm font-semibold text-blue-500 hover:underline mr-3">수정</button>
                    {isManagerOrHigher() && (
                      <button onClick={() => handleDelete(exp.id)} className="text-sm font-semibold text-red-500 hover:underline">삭제</button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium">이번 달 결제 내역이 없습니다. 영수증을 등록해 주세요!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              {editingExpenseId ? '결제 내역 수정' : (receiptFile ? '영수증 스캔 및 등록' : '직접 수기 등록')}
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">결제일</label>
                <input type="date" value={expenseData.expense_date} onChange={(e) => setExpenseData({...expenseData, expense_date: e.target.value})} className="w-full border p-3 rounded-lg outline-none"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">금액 (원)</label>
                <input 
                  type="text" 
                  placeholder="예: 50,000" 
                  value={expenseData.amount} 
                  onChange={(e) => setExpenseData({...expenseData, amount: formatNumberWithComma(e.target.value)})} 
                  className="w-full border p-3 rounded-lg text-lg font-bold outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">카테고리</label>
                <select value={expenseData.category} onChange={(e) => setExpenseData({...expenseData, category: e.target.value})} className="w-full border p-3 rounded-lg outline-none">
                  <option value="">카테고리 선택</option>
                  {['운영&유지비', '업무활동비', '복리후생비', '감가자산비', '기타'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">비고 (메모)</label>
                <input type="text" placeholder="예) 거래처 미팅, 소모품 구매 등" value={expenseData.remarks} onChange={(e) => setExpenseData({...expenseData, remarks: e.target.value})} className="w-full border p-3 rounded-lg outline-none"/>
              </div>
              
              {editingExpenseId && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">영수증 재업로드 (선택)</label>
                  <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="w-full border p-2 rounded-lg text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                  <p className="text-xs text-gray-400 mt-1">새 영수증을 올리면 기존 사진을 덮어씁니다.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-10 border-t pt-6">
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-slate-600 px-6 py-2.5 rounded-lg font-semibold">취소</button>
              <button onClick={saveExpenseToDB} disabled={isSaving} className={`px-8 py-2.5 rounded-lg font-semibold text-white ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isSaving ? '저장 중...' : (editingExpenseId ? '수정 완료' : '저장하기')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBalanceModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-800">
              {isCreditCard ? '월 기본 한도 수정' : '통장 초기 잔액(예치금) 수정'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {isCreditCard 
                ? '카드의 이번 달 기본 한도를 재설정합니다.' 
                : '통장에 들어있는 최초 예치금을 재설정합니다.'}
            </p>
            <div>
              <input 
                type="text" 
                value={newBalanceInput}
                onChange={(e) => setNewBalanceInput(formatNumberWithComma(e.target.value))}
                className="w-full border p-3 rounded-lg text-lg font-bold text-center outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="예: 1,500,000"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-8">
              <button onClick={() => setIsBalanceModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-slate-600 px-5 py-2 rounded-lg font-semibold">취소</button>
              <button onClick={submitBalanceUpdate} disabled={isSaving} className={`px-5 py-2 rounded-lg font-semibold text-white ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isSaving ? '수정 중...' : '수정하기'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}