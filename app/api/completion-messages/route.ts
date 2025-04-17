import { NextRequest, NextResponse } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'
import type { AxiosError } from 'axios'

export async function POST(request: NextRequest) {
  try {
    // ① リクエスト body を取得
    const { inputs, files } = await request.json()
    const { user } = getInfo(request)

    // ② 下流 API 呼び出し（まずは blocking モードで）
    const { data, status } = await client.createCompletionMessage(
      inputs,
      user,
      /* streaming = */ false,
      files,
    )

    // ③ そのまま転送
    return new NextResponse(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // ④ AxiosError ならレスポンスをそのまま転送
    if ((err as AxiosError).isAxiosError && (err as AxiosError).response) {
      const { data, status } = (err as AxiosError).response!
      return new NextResponse(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ⑤ それ以外は 500
    console.error(err)
    return new NextResponse(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500 },
    )
  }
}
