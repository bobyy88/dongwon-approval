'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { 
  Mail, Calendar, FileText, CheckSquare, 
  ChevronRight, Bell, Settings, LogOut, MessageSquare, X
} from 'lucide-react'

export default function Home() {
  const [list, setList] = useState<any[]>([])
  const [filteredList, setFilteredList] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<any | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [currentDate] = useState(new Date())

  const fetchList = async () => {
    const { data } = await supabase.from('approvals').select('*').order('created_at', { ascending: false })
    if (data) {
      setList(data)
      setFilteredList(data)
    }
  }

  useEffect(() => { fetchList() }, [])

  useEffect(() => {
    if (statusFilter === 'all') setFilteredList(list)
    else setFilteredList(list.filter(item => item.status === statusFilter))
  }, [statusFilter, list])

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const sDate = new Date(start);
    const eDate = new Date(end);
    const diffTime = eDate.getTime() - sDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  }

  const handleDelete = async (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await supabase.from('approvals').delete().eq('id', id);
      fetchList(); setSelected(null);
    }
  }

  const handleUpdate = async () => {
    if (new Date(selected.start_date) > new Date(selected.end_date)) {
      alert('⚠️ 종료일이 시작일보다 빠를 수 없습니다.'); return;
    }
    const { error } = await supabase.from('approvals').update({
      dept: selected.dept, name: selected.name, position: selected.position,
      start_date: selected.start_date, end_date: selected.end_date,
      type: selected.type, work_progress: selected.work_progress, phone: selected.phone,
      title: `[${selected.dept}] ${selected.name} - ${selected.type}`
    }).eq('id', selected.id);
    
    if(!error) { alert('수정되었습니다.'); setIsEditing(false); fetchList(); }
  }

  // 지시사항 반영: 도장 스타일 (승인-동그라미 / 반려-글자만)
  const Stamp = ({ text }: { text: '승인' | '반려' }) => {
    if (text === '승인') {
      return (
        <div style={{
          color: '#d9534f', border: '2px solid #d9534f', borderRadius: '50%',
          width: '50px', height: '50px', lineHeight: '46px', margin: '0 auto',
          fontSize: '14px', fontWeight: 'bold', textAlign: 'center'
        }}>승인</div>
      );
    } else {
      return (
        <div style={{ color: '#d9534f', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
          반려됨
        </div>
      );
    }
  };

  const cardStyle = { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }
  const labelStyle = { backgroundColor: '#f4f4f4', width: '130px', padding: '15px', border: '1px solid #000', fontWeight: 'bold' as const, textAlign: 'center' as const };
  const tdStyle = { padding: '15px', border: '1px solid #000', backgroundColor: '#fff', textAlign: 'center' as const };
  const filterBtnStyle = (active: boolean) => ({
    padding: '6px 14px', marginRight: '8px', cursor: 'pointer', border: '1px solid #eee', borderRadius: '15px',
    backgroundColor: active ? '#0070c0' : '#fff', color: active ? '#fff' : '#666', fontSize: '12px', fontWeight: 'bold' as const
  });

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div style={{ backgroundColor: '#e9f1f7', minHeight: '100vh', padding: '20px', fontFamily: "'Pretendard', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#0070c0' }}>The Sola 전자결재 시스템</div>
        <div style={{ display: 'flex', gap: '15px' }}><Bell size={20}/><Settings size={20}/><LogOut size={20}/></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: '20px' }}>
        {/* 좌측 패널 */}
        <div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#0070c0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>임</div>
              <div><div style={{ fontWeight: 'bold' }}>임석환 대표님</div><div style={{ fontSize: '11px', color: '#888' }}>그랑베이 관리단</div></div>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center', fontSize: '11px' }}>
              {[{n:'메일', i:<Mail size={18}/>}, {n:'게시판', i:<FileText size={18}/>}, {n:'캘린더', i:<Calendar size={18}/>}, {n:'전자결재', i:<CheckSquare size={18}/>}, {n:'메신저', i:<MessageSquare size={18}/>}, {n:'설정', i:<Settings size={18}/>}].map(m=>(
                <div key={m.n} style={{ cursor: 'pointer', padding: '10px 0' }}>
                  <div style={{ backgroundColor: '#f0f4f8', width: '35px', height: '35px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px' }}>{m.i}</div>
                  {m.n}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 중앙 리스트 */}
        <div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>📋 결재 문서 현황</h3>
              <Link href="/create"><button style={{ padding: '8px 16px', backgroundColor: '#0070c0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>+ 새 신청</button></Link>
            </div>
            <div style={{ marginBottom: '20px', display: 'flex' }}>
              <button onClick={() => setStatusFilter('all')} style={filterBtnStyle(statusFilter === 'all')}>전체 {list.length}</button>
              <button onClick={() => setStatusFilter('pending')} style={filterBtnStyle(statusFilter === 'pending')}>⏳ 대기 {list.filter(i=>i.status==='pending').length}</button>
              <button onClick={() => setStatusFilter('approved')} style={filterBtnStyle(statusFilter === 'approved')}>✅ 승인 {list.filter(i=>i.status==='approved').length}</button>
              <button onClick={() => setStatusFilter('rejected')} style={filterBtnStyle(statusFilter === 'rejected')}>❌ 반려 {list.filter(i=>i.status==='rejected').length}</button>
            </div>
            <div style={{ minHeight: '400px' }}>
              {filteredList.map(item => (
                <div key={item.id} onClick={() => {setSelected(item); setIsEditing(false);}} style={{ display: 'flex', alignItems: 'center', padding: '15px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>[{item.dept}] {item.name} - {item.type}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{item.start_date} ~ {item.end_date}</div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: item.status==='pending' ? '#f0ad4e' : item.status==='approved' ? '#5cb85c' : '#d9534f' }}>
                    {item.status==='pending' ? '대기중' : item.status==='approved' ? '승인완료' : '반려됨'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 우측 캘린더 */}
        <div>
          <div style={{ ...cardStyle, padding: '15px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>📅 {currentDate.getMonth() + 1}월</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '11px', gap: '2px' }}>
              {['일','월','화','수','목','금','토'].map(d=><div key={d} style={{color:'#999'}}>{d}</div>)}
              {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={i}></div>)}
              {days.map(d => (
                <div key={d} style={{ padding: '6px 0', borderRadius: '4px', backgroundColor: d === new Date().getDate() ? '#0070c0' : 'transparent', color: d === new Date().getDate() ? '#fff' : '#333' }}>{d}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 결재 상세 모달 */}
      {selected && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '40px', width: '750px', borderRadius: '8px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setSelected(null)} style={{ position: 'absolute', right: '20px', top: '20px', cursor: 'pointer', border: 'none', background: 'none' }}><X /></button>
            <h1 style={{ textAlign: 'center', letterSpacing: '10px', fontSize: '32px', marginBottom: '30px' }}>휴 가 신 청 서</h1>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <table style={{ borderCollapse: 'collapse', textAlign: 'center' }}>
                <tbody>
                  <tr><td rowSpan={2} style={{ border: '1px solid #000', padding: '5px', width: '30px', fontSize: '12px' }}>결<br/>재</td><td style={{ border: '1px solid #000', padding: '5px', width: '80px', fontSize: '12px' }}>현장소장</td><td style={{ border: '1px solid #000', padding: '5px', width: '80px', fontSize: '12px' }}>본사</td></tr>
                  <tr style={{ height: '70px' }}>
                    <td style={{ border: '1px solid #000', verticalAlign: 'middle' }}><Stamp text="승인" /></td>
                    <td style={{ border: '1px solid #000', verticalAlign: 'middle' }}>
                      {selected.status === 'approved' && <Stamp text="승인" />}
                      {selected.status === 'rejected' && <Stamp text="반려" />}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>
              <tbody>
                <tr><td style={labelStyle}>소 속</td><td style={tdStyle}>{isEditing ? <input style={{width:'100%'}} value={selected.dept} onChange={e=>setSelected({...selected, dept:e.target.value})}/> : selected.dept}</td></tr>
                <tr><td style={labelStyle}>성 명</td><td style={tdStyle}>{isEditing ? <input style={{width:'100%'}} value={selected.name} onChange={e=>setSelected({...selected, name:e.target.value})}/> : selected.name}</td></tr>
                <tr><td style={labelStyle}>직 위</td><td style={tdStyle}>{isEditing ? <input style={{width:'100%'}} value={selected.position} onChange={e=>setSelected({...selected, position:e.target.value})}/> : selected.position}</td></tr>
                <tr>
                  <td style={labelStyle}>휴가 기간</td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <div style={{display:'flex', gap:'5px', justifyContent:'center'}}>
                        <input type="date" value={selected.start_date} onChange={e=>setSelected({...selected, start_date:e.target.value})}/> ~ 
                        <input type="date" value={selected.end_date} min={selected.start_date} onChange={e=>setSelected({...selected, end_date:e.target.value})}/>
                      </div>
                    ) : (
                      <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:'10px'}}>
                        <span>{selected.start_date} ~ {selected.end_date}</span>
                        {/* 지시사항 반영: 빨간색 볼드체 일수 */}
                        <span style={{ color: '#d9534f', fontWeight: 'bold' }}>
                          ({calculateDays(selected.start_date, selected.end_date)}일)
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
                <tr><td style={labelStyle}>휴가 종류</td><td style={tdStyle}>{isEditing ? <select value={selected.type} onChange={e=>setSelected({...selected, type:e.target.value})}>{['연차휴가','특별휴가','경조휴가','병가'].map(t=><option key={t} value={t}>{t}</option>)}</select> : selected.type}</td></tr>
                <tr><td style={labelStyle}>업무 진행</td><td style={tdStyle}>{isEditing ? <textarea style={{width:'100%', height:'60px'}} value={selected.work_progress} onChange={e=>setSelected({...selected, work_progress:e.target.value})}/> : selected.work_progress}</td></tr>
                <tr><td style={labelStyle}>비상연락처</td><td style={tdStyle}>{isEditing ? <input style={{width:'100%'}} value={selected.phone} onChange={e=>setSelected({...selected, phone:e.target.value})}/> : selected.phone}</td></tr>
              </tbody>
            </table>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {isEditing ? (
                <><button onClick={handleUpdate} style={{ padding: '10px 30px', backgroundColor: '#0070c0', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>저장하기</button>
                <button onClick={()=>setIsEditing(false)} style={{ padding: '10px 30px', backgroundColor: '#666', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>취소</button></>
              ) : (
                <>
                  {/* 지시사항 반영: 승인 시 수정 버튼 숨김 로직 */}
                  {selected.status === 'pending' && (
                    <>
                      <button onClick={async () => { await supabase.from('approvals').update({status:'approved'}).eq('id', selected.id); alert('승인되었습니다.'); fetchList(); setSelected(null); }} style={{ padding: '10px 30px', backgroundColor: '#0070c0', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>승인하기</button>
                      <button onClick={async () => { await supabase.from('approvals').update({status:'rejected'}).eq('id', selected.id); alert('반려되었습니다.'); fetchList(); setSelected(null); }} style={{ padding: '10px 30px', backgroundColor: '#d9534f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>반려하기</button>
                      <button onClick={()=>setIsEditing(true)} style={{ padding: '10px 25px', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }}>수정</button>
                    </>
                  )}
                  {/* 승인/반려된 문서도 삭제는 항상 가능 */}
                  <button onClick={()=>handleDelete(selected.id)} style={{ padding: '10px 25px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }}>삭제</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}