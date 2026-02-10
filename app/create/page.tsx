'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CreateApproval() {
  const [formData, setFormData] = useState({
    dept: '', 
    name: '', 
    position: '', 
    startDate: '', 
    endDate: '', 
    type: '연차휴가', // 기본값 변경
    workProgress: '', 
    phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      alert('⚠️ 휴가 종료일은 시작일보다 빠를 수 없습니다.');
      return;
    }
    
    const { error } = await supabase
      .from('approvals')
      .insert([{ 
        dept: formData.dept,
        name: formData.name,
        position: formData.position,
        start_date: formData.startDate,
        end_date: formData.endDate,
        type: formData.type,
        work_progress: formData.workProgress,
        phone: formData.phone,
        status: 'pending',
        title: `${formData.name} - ${formData.type} 신청` 
      }])

    if (error) {
      alert('제출 실패: ' + error.message)
    } else {
      alert('휴가 신청서가 정식으로 접수되었습니다.')
      window.location.href = '/'
    }
  }

  const inputStyle = { width: '100%', border: 'none', padding: '10px', outline: 'none' }
  const labelStyle = { backgroundColor: '#f4f4f4', width: '120px', padding: '10px', borderRight: '1px solid #ccc', fontWeight: 'bold' as const }
  const tdStyle = { borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc' }

  return (
    <div style={{ maxWidth: '700px', margin: '50px auto', padding: '40px', backgroundColor: '#fff', border: '1px solid #000' }}>
      <h1 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '40px', letterSpacing: '10px' }}>휴 가 신 청 서</h1>
      <form onSubmit={handleSubmit}>
        <table style={{ width: '100%', borderTop: '2px solid #000', borderLeft: '1px solid #ccc', borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td style={labelStyle}>소 속</td><td style={tdStyle}><input style={inputStyle} value={formData.dept} onChange={(e) => setFormData({...formData, dept: e.target.value})} required /></td></tr>
            <tr><td style={labelStyle}>성 명</td><td style={tdStyle}><input style={inputStyle} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required /></td></tr>
            <tr><td style={labelStyle}>직 위</td><td style={tdStyle}><input style={inputStyle} value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} required /></td></tr>
            <tr>
              <td style={labelStyle}>휴가 기간</td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '5px' }}>
                  <input type="date" style={{ padding: '5px' }} value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} required />
                  <span style={{ margin: '0 10px' }}>부터</span>
                  <input type="date" style={{ padding: '5px' }} value={formData.endDate} min={formData.startDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} required />
                  <span style={{ margin: '0 10px' }}>까지</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style={labelStyle}>휴가 종류</td>
              <td style={tdStyle}>
                <div style={{ padding: '10px' }}>
                  {/* 대표님이 요청하신 순서와 명칭으로 수정 */}
                  {['연차휴가', '특별휴가', '경조휴가', '병가'].map(t => (
                    <label key={t} style={{ marginRight: '15px', cursor: 'pointer' }}>
                      <input type="radio" name="type" checked={formData.type === t} onChange={() => setFormData({...formData, type: t})} /> {t}
                    </label>
                  ))}
                </div>
              </td>
            </tr>
            <tr><td style={labelStyle}>업무 진행</td><td style={tdStyle}><textarea style={{ ...inputStyle, height: '80px', resize: 'none' }} value={formData.workProgress} onChange={(e) => setFormData({...formData, workProgress: e.target.value})} /></td></tr>
            <tr><td style={{ ...labelStyle, borderBottom: '1px solid #ccc' }}>비상연락처</td><td style={{ ...tdStyle, borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}><input style={inputStyle} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></td></tr>
          </tbody>
        </table>
        <p style={{ textAlign: 'center', marginTop: '30px', color: '#666' }}>위와 같이 휴가를 신청하오니 허락하여 주시기 바랍니다.</p>
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button type="submit" style={{ padding: '15px 60px', backgroundColor: '#0070c0', color: '#fff', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>신청서 전송</button>
        </div>
      </form>
    </div>
  )
}