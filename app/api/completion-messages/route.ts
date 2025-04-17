import { NextRequest, NextResponse } from 'next/server'
import { getInfo } from '@/app/api/utils/common'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { Readable } from 'node:stream'

/**
 * POST /api/completion-messages  ─ Workflow 版 (streaming)
 *
 * フロントから受け取った入力を Dify Workflow API `/v1/workflows/run` に
 * ストリーミング (SSE) でフォワードし、そのままクライアントへ転送する。
 *
 * ## 必須環境変数
 * - `NEXT_PUBLIC_APP_KEY`   : Dify App Secret Key
 * - `NEXT_PUBLIC_API_URL`   : Dify SaaS or self‑host base URL
 */
export async function POST(request: NextRequest) {
  try {
    /* ① リクエスト body */
    const { inputs, files } = await request.json()
    const { user } = getInfo(request)

    /* ② 環境変数（公開プレフィクス付き） */
    const apiKey  = process.env.NEXT_PUBLIC_APP_KEY
    const baseURL = process.env.NEXT_PUBLIC_API_URL

    /* ③ Dify Workflow API へ転送（streaming ／ SSE） */
    const response = await axios.post(
      `${baseURL}/v1/workflows/run`,
      {
        inputs,
        files: files ?? null,
        response_mode: 'streaming', // <- ここを blocking から変更
        user,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        responseType: 'stream', // Node.js ReadableStream が返る
      },
    )

    /* ④ Node Readable → Web ReadableStream に変換して転送 */
    const webReadable = Readable.toWeb(response.data as any) as ReadableStream

    return new NextResponse(webReadable, {
      status: response.status,
      headers: {
        'Content-Type': 'text/event-stream',
        // CORS 等が必要ならここで付与
      },
    })
  } catch (err) {
    /* ⑤ AxiosError ならレスポンスをそのまま透過 */
    if ((err as AxiosError).isAxiosError && (err as AxiosError).response) {
      const { data, status } = (err as AxiosError).response!
      return new NextResponse(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    /* ⑥ それ以外は 500 */
    console.error(err)
    return new NextResponse(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500 },
    )
  }
}
