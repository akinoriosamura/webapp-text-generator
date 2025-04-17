import { NextRequest, NextResponse } from 'next/server'
import { workflowClient, getInfo } from '@/app/api/utils/common'
import type { AxiosError } from 'axios'

/**
 * Edge Function – run‑workflow
 *
 * ワークフローアプリ用に /v1/workflows/run を叩く。
 * 1. POST body から inputs / files を取得
 * 2. Dify Workflow API へ転送（blocking モード）
 * 3. ステータスとレスポンスをそのままクライアントに返却
 */
export async function POST(request: NextRequest) {
  try {
    // ① リクエスト body
    const { inputs, files } = await request.json()
    const { user } = getInfo(request)

    // ② ワークフロー実行（blocking）
    const { data, status } = await workflowClient.run(
      inputs,
      user,
      stream = true,
      files,
    )

    // ③ そのまま転送
    return new NextResponse(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // ④ Dify からの 4xx / 5xx をそのまま透過
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
