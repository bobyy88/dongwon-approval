import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 🚨 절대 프론트엔드 화면에 노출되면 안 되는 '마스터 키'로 DB 접속
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    // 🛠️ Supabase 마스터 권한으로 특정 직원의 비밀번호를 강제 변경
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: 'dongwon123!' } // 초기화 비밀번호 설정
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}