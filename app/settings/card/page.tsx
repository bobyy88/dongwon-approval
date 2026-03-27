'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminCardsPage() {
  const [cards, setCards] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([]) // 🌟 [추가] 현장 목록을 담을 상태 변수
  const [isLoading, setIsLoading] = useState(true)
  const [userGrade, setUserGrade] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  
  const [cardForm, setCardForm] = useState({
    card_name: '',
    card_type: '신용',
    bank_name: '',
    card_number_last4: '',
    owner_name: '',
    department_or_site: '',
    current_balance: '', 
    status: '사용중'
  })

  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const initializePage = async () => {
      const hasPermission = await checkAdminRole()
      if (hasPermission) {
        setIsAuthorized(true)
        fetchCards()
        fetchSites() // 🌟 [추가] 권한이 확인되면 현장 목록도 같이 불러옵니다!
      }
    }
    
    initializePage()
  }, [])

  const checkAdminRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login';
        return false;
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) {
        const grade = (profile.grade || profile.role || '').toLowerCase();
        setUserGrade(grade);
        
        if (!['admin', 'master', '관리자', '최고 관리자'].includes(grade)) {
          alert('🚨 접근 거부: 관리자 전용 페이지입니다.');
          window.location.href = '/'; 
          return false;
        }
        return true; 
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  const fetchCards = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('corporate_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setCards(data);
    setIsLoading(false);
  }

  // 🌟 [추가] DB에서 공식 현장 목록을 가져오는 함수
  const fetchSites = async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (!error && data) {
      setSites(data);
    }
  }

  const formatNumberWithComma = (value: string | number) => {
    if (!value) return '';
    const num = parseInt(value.toString().replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? '' : num.toLocaleString();
  }

  const openCardModal = (card: any = null) => {
    if (card) {
      setEditingCardId(card.id);
      setCardForm({
        card_name: card.card_name,
        card_type: card.card_type || '신용',
        bank_name: card.bank_name || '',
        card_number_last4: card.card_number_last4 || '',
        owner_name: card.owner_name || '',
        department_or_site: card.department_or_site || '',
        current_balance: formatNumberWithComma(card.current_balance),
        status: card.status || '사용중'
      });
    } else {
      setEditingCardId(null);
      setCardForm({
        card_name: '', card_type: '신용', bank_name: '', card_number_last4: '',
        owner_name: '', department_or_site: '', current_balance: '', status: '사용중'
      });
    }
    setIsModalOpen(true);
  }

  const saveCardToDB = async () => {
    if (!cardForm.card_name || !cardForm.current_balance) {
      return alert('카드 이름과 초기 한도(잔고)는 필수 항목입니다!');
    }

    setIsSaving(true);
    try {
      const rawBalance = parseInt(cardForm.current_balance.replace(/,/g, ''), 10);
      
      const payload = {
        card_name: cardForm.card_name,
        card_type: cardForm.card_type,
        bank_name: cardForm.bank_name,
        card_number_last4: cardForm.card_number_last4,
        owner_name: cardForm.owner_name,
        department_or_site: cardForm.department_or_site,
        current_balance: rawBalance,
        status: cardForm.status
      };

      if (editingCardId) {
        const { error } = await supabase.from('corporate_cards').update(payload).eq('id', editingCardId);
        if (error) throw error;
        alert('카드 정보가 성공적으로 수정되었습니다! ✏️');
      } else {
        const { error } = await supabase.from('corporate_cards').insert([payload]);
        if (error) throw error;
        alert('새로운 법인카드가 등록되었습니다! 💳');
      }

      setIsModalOpen(false);
      fetchCards(); 
    } catch (error: any) {
      alert(`저장 중 오류 발생: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthorized) {
    return <div className="flex h-screen items-center justify-center text-gray-500 font-bold">권한을 확인하는 중입니다... 🛡️</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">⚙️ 법인카드 관리 (마스터)</h1>
          <p className="text-gray-500 mt-2">사내 법인카드의 생성, 배정, 한도 및 상태를 관리합니다.</p>
        </div>
        <button 
          onClick={() => openCardModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md transition-all"
        >
          + 새 법인카드 등록
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-sm border-b">
              <th className="p-4">카드 별칭</th>
              <th className="p-4">종류</th>
              <th className="p-4">카드사/번호</th>
              <th className="p-4">담당자 / 사용처</th>
              <th className="p-4 text-right">기본 한도 (잔액)</th>
              <th className="p-4 text-center">상태</th>
              <th className="p-4 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">데이터를 불러오는 중입니다...</td></tr>
            ) : cards.length > 0 ? (
              cards.map((card) => (
                <tr key={card.id} className={`border-b hover:bg-slate-50 transition-colors ${card.status !== '사용중' ? 'opacity-60 bg-gray-50' : ''}`}>
                  <td className="p-4 font-bold text-gray-800">{card.card_name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${card.card_type === '신용' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {card.card_type || '신용'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    <p className="font-semibold text-gray-700">{card.bank_name || '-'}</p>
                    <p className="text-xs tracking-widest mt-1">****-{card.card_number_last4 || '0000'}</p>
                  </td>
                  <td className="p-4 text-sm">
                    <p className="font-semibold text-blue-700">{card.owner_name || '미배정'}</p>
                    <p className="text-gray-500 text-xs mt-1">{card.department_or_site || '-'}</p>
                  </td>
                  <td className="p-4 text-right font-bold text-slate-700">
                    {Number(card.current_balance).toLocaleString()} 원
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      card.status === '사용중' ? 'bg-green-100 text-green-700 border border-green-200' : 
                      card.status === '정지' ? 'bg-red-100 text-red-700 border border-red-200' : 
                      'bg-gray-200 text-gray-700 border border-gray-300'
                    }`}>
                      {card.status || '사용중'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => openCardModal(card)}
                      className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm font-semibold transition-all"
                    >
                      설정
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400 font-medium">등록된 법인카드가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              {editingCardId ? '카드 정보 수정' : '신규 법인카드 등록'}
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">카드 별칭 (이름) <span className="text-red-500">*</span></label>
                <input type="text" placeholder="예: 공용 포터 주유용" value={cardForm.card_name} onChange={(e) => setCardForm({...cardForm, card_name: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">종류 구분 <span className="text-red-500">*</span></label>
                <div className="flex space-x-4 h-[50px] items-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="card_type" value="신용" checked={cardForm.card_type === '신용'} onChange={(e) => setCardForm({...cardForm, card_type: e.target.value})} className="w-5 h-5 text-blue-600"/>
                    <span className="font-semibold text-gray-700">신용카드 (월 한도)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="card_type" value="체크" checked={cardForm.card_type === '체크'} onChange={(e) => setCardForm({...cardForm, card_type: e.target.value})} className="w-5 h-5 text-blue-600"/>
                    <span className="font-semibold text-gray-700">체크카드 (누적 차감)</span>
                  </label>
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">카드사 / 은행</label>
                <input type="text" placeholder="예: 신한카드, 기업은행" value={cardForm.bank_name} onChange={(e) => setCardForm({...cardForm, bank_name: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">카드 끝 4자리 (식별용)</label>
                <input type="text" maxLength={4} placeholder="예: 1234" value={cardForm.card_number_last4} onChange={(e) => setCardForm({...cardForm, card_number_last4: e.target.value.replace(/[^0-9]/g, '')})} className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 tracking-widest"/>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">담당자 (소유자)</label>
                <input type="text" placeholder="예: 홍길동 대리" value={cardForm.owner_name} onChange={(e) => setCardForm({...cardForm, owner_name: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">사용처 (현장/부서)</label>
                {/* 🌟 [수정됨] 일반 텍스트 입력창에서 현장 목록 드롭다운으로 변경! */}
                <select 
                  value={cardForm.department_or_site} 
                  onChange={(e) => setCardForm({...cardForm, department_or_site: e.target.value})} 
                  className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 font-semibold text-slate-700 bg-white"
                >
                  <option value="">선택 안 함 (미배정)</option>
                  <option value="동원전력개발 본사">동원전력개발 본사</option> {/* 본사는 항상 포함 */}
                  {sites.map(site => (
                    <option key={site.id} value={site.name}>{site.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                  {cardForm.card_type === '신용' ? '월 기본 한도 (원)' : '초기 예치금 (원)'} <span className="text-red-500">*</span>
                </label>
                <input type="text" placeholder="예: 1,500,000" value={cardForm.current_balance} onChange={(e) => setCardForm({...cardForm, current_balance: formatNumberWithComma(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 font-bold text-lg"/>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">카드 상태</label>
                <select value={cardForm.status} onChange={(e) => setCardForm({...cardForm, status: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 font-semibold text-slate-700">
                  <option value="사용중">🟢 정상 사용중</option>
                  <option value="정지">🔴 정지 (분실 등)</option>
                  <option value="해지">⚫ 해지 (폐기됨)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">* 정지/해지 시 정산 화면에서 숨겨집니다.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-10 border-t pt-6">
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-slate-700 px-6 py-2.5 rounded-lg font-semibold">취소</button>
              <button onClick={saveCardToDB} disabled={isSaving} className={`px-8 py-2.5 rounded-lg font-semibold text-white ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isSaving ? '저장 중...' : (editingCardId ? '수정 완료' : '카드 등록')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}