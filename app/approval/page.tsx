import { redirect } from 'next/navigation'

export default function ApprovalMainPage() {
  // 업무결재 탭을 누르면 자동으로 휴가신청서 화면으로 이동시킵니다.
  redirect('/approval/leave')
}