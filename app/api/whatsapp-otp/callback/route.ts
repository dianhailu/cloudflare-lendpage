import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * nxcloud SMS/WhatsApp DR (Delivery Receipt) 回调接口
 * 文档: https://www.nxcloud.com/document/sms/receipt-callback
 * 
 * nxcloud 回调参数格式 (application/x-www-form-urlencoded):
 * - msgid: 系统消息ID
 * - phone: 接收号码
 * - status: 发送状态 (DELIVRD=成功, 其他=失败)
 * - receiveTime: 回执时间
 * - userMsgId: 用户自定义消息ID (如果发送时有传)
 * - errorCode: 错误码
 * - ext: 透传字段
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    let data: Record<string, string> = {}
    
    // nxcloud 使用 form-urlencoded 格式
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      formData.forEach((value, key) => {
        data[key] = value.toString()
      })
    } else if (contentType.includes('application/json')) {
      data = await request.json()
    } else {
      // 尝试解析 URL 参数
      const text = await request.text()
      const params = new URLSearchParams(text)
      params.forEach((value, key) => {
        data[key] = value
      })
    }

    console.log('[nxcloud Callback] Received data:', data)

    const { 
      msgid,      // nxcloud 消息ID
      phone,      // 接收号码 (62xxxxxxxxxx)
      status,     // DELIVRD=成功
      receiveTime,
      errorCode,
      ext,
    } = data
    
    if (!phone) {
      console.log('[nxcloud Callback] Missing phone number')
      return NextResponse.json({ error: 'Missing phone' }, { status: 400 })
    }

    // 解析手机号: 移除国码 62
    let normalizedPhone = phone.replace(/\D/g, '')
    if (normalizedPhone.startsWith('62')) {
      normalizedPhone = normalizedPhone.substring(2)
    } else if (normalizedPhone.startsWith('08')) {
      normalizedPhone = normalizedPhone.substring(1)
    }

    // 映射状态
    const deliveryStatus = status === 'DELIVRD' ? 'delivered' : 'failed'
    
    const supabase = await createClient()
    
    // 更新发送状态
    const { error: updateError } = await supabase
      .from('download_registrations')
      .update({
        otp_delivery_status: deliveryStatus,
        otp_delivery_updated_at: receiveTime || new Date().toISOString(),
        nxcloud_error_code: errorCode || null,
      })
      .eq('phone_number', normalizedPhone)

    if (updateError) {
      console.error('[nxcloud Callback] Database update error:', updateError)
      // 返回成功以避免 nxcloud 重试
    }

    console.log(`[nxcloud Callback] Phone: ${normalizedPhone}, Status: ${deliveryStatus}, MsgId: ${msgid}`)

    // nxcloud 期望返回 success
    return NextResponse.json({
      success: true,
      message: 'Callback received'
    })

  } catch (error) {
    console.error('[nxcloud Callback] Error:', error)
    // 返回成功以避免重试
    return NextResponse.json({
      success: true,
      message: 'Callback processed with error'
    })
  }
}

// GET 方法用于 webhook 验证或健康检查
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  // 如果是验证请求
  const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge')
  if (challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  
  // 健康检查
  return NextResponse.json({ 
    status: 'ok',
    service: 'PinGo nxcloud SMS Callback',
    timestamp: new Date().toISOString()
  })
}
