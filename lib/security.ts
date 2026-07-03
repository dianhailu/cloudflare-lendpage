import { createClient } from '@/lib/supabase/server'

// 安全配置
export const SECURITY_CONFIG = {
  // IP 限制
  IP_DAILY_SEND_OTP_LIMIT: 20,      // 每个IP每天最多发送20次OTP
  IP_DAILY_VERIFY_OTP_LIMIT: 50,    // 每个IP每天最多验证50次OTP
  IP_HOURLY_SEND_OTP_LIMIT: 5,      // 每个IP每小时最多发送5次OTP
  
  // 手机号限制 (已在其他地方实现)
  PHONE_DAILY_FAIL_LIMIT: 5,        // 每个手机号每天最多失败5次
  PHONE_CONSECUTIVE_BAN_DAYS: 3,    // 连续3天失败则禁止
  
  // 请求签名
  SIGNATURE_EXPIRY_MS: 60 * 1000,   // 签名60秒过期
  
  // 自动封禁阈值
  AUTO_BAN_THRESHOLD: 100,          // 每天超过100次请求自动封禁
  AUTO_BAN_DURATION_HOURS: 24,      // 封禁24小时
}

// 获取客户端IP
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfIP = request.headers.get('cf-connecting-ip')
  
  if (cfIP) return cfIP
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIP) return realIP
  
  return 'unknown'
}

// 检查IP是否在黑名单
export async function isIPBlacklisted(ip: string): Promise<{ blocked: boolean; reason?: string }> {
  if (ip === 'unknown') return { blocked: false }
  
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('ip_blacklist')
    .select('reason, blocked_until')
    .eq('ip_address', ip)
    .single()
  
  if (!data) return { blocked: false }
  
  // 检查是否是临时封禁且已过期
  if (data.blocked_until && new Date(data.blocked_until) < new Date()) {
    // 封禁已过期，删除记录
    await supabase.from('ip_blacklist').delete().eq('ip_address', ip)
    return { blocked: false }
  }
  
  return { blocked: true, reason: data.reason || 'IP blocked' }
}

// 检查IP限流
export async function checkIPRateLimit(
  ip: string, 
  requestType: 'send_otp' | 'verify_otp'
): Promise<{ allowed: boolean; remaining: number; error?: string }> {
  if (ip === 'unknown') return { allowed: true, remaining: 999 }
  
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  
  // 获取今天的请求计数
  const { data: existing } = await supabase
    .from('ip_rate_limits')
    .select('request_count, first_request_at')
    .eq('ip_address', ip)
    .eq('request_type', requestType)
    .eq('request_date', today)
    .single()
  
  const dailyLimit = requestType === 'send_otp' 
    ? SECURITY_CONFIG.IP_DAILY_SEND_OTP_LIMIT 
    : SECURITY_CONFIG.IP_DAILY_VERIFY_OTP_LIMIT
  
  const currentCount = existing?.request_count || 0
  
  // 检查是否超过日限制
  if (currentCount >= dailyLimit) {
    return { 
      allowed: false, 
      remaining: 0,
      error: 'Terlalu banyak permintaan. Silakan coba lagi besok.'
    }
  }
  
  // 检查小时限制 (仅对 send_otp)
  if (requestType === 'send_otp' && existing?.first_request_at) {
    const firstRequest = new Date(existing.first_request_at)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    if (firstRequest > hourAgo && currentCount >= SECURITY_CONFIG.IP_HOURLY_SEND_OTP_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
        error: 'Terlalu banyak permintaan OTP. Tunggu 1 jam dan coba lagi.'
      }
    }
  }
  
  // 检查是否需要自动封禁
  if (currentCount >= SECURITY_CONFIG.AUTO_BAN_THRESHOLD) {
    await addToBlacklist(ip, 'Auto-banned: exceeded daily request threshold', SECURITY_CONFIG.AUTO_BAN_DURATION_HOURS)
    await logSecurityEvent('auto_banned', ip, undefined, { request_count: currentCount, request_type: requestType })
    return {
      allowed: false,
      remaining: 0,
      error: 'IP diblokir karena aktivitas mencurigakan.'
    }
  }
  
  return { allowed: true, remaining: dailyLimit - currentCount - 1 }
}

// 记录IP请求
export async function recordIPRequest(ip: string, requestType: 'send_otp' | 'verify_otp'): Promise<void> {
  if (ip === 'unknown') return
  
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()
  
  // 尝试更新现有记录
  const { data: existing } = await supabase
    .from('ip_rate_limits')
    .select('id, request_count')
    .eq('ip_address', ip)
    .eq('request_type', requestType)
    .eq('request_date', today)
    .single()
  
  if (existing) {
    await supabase
      .from('ip_rate_limits')
      .update({ 
        request_count: existing.request_count + 1,
        last_request_at: now
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('ip_rate_limits')
      .insert({
        ip_address: ip,
        request_type: requestType,
        request_date: today,
        request_count: 1,
        first_request_at: now,
        last_request_at: now
      })
  }
}

// 添加IP到黑名单
export async function addToBlacklist(ip: string, reason: string, durationHours?: number): Promise<void> {
  const supabase = await createClient()
  
  const blockedUntil = durationHours 
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
    : null
  
  await supabase
    .from('ip_blacklist')
    .upsert({
      ip_address: ip,
      reason,
      blocked_until: blockedUntil
    }, {
      onConflict: 'ip_address'
    })
}

// 记录安全事件
export async function logSecurityEvent(
  eventType: string,
  ip?: string,
  phoneNumber?: string,
  details?: Record<string, unknown>,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('security_logs')
    .insert({
      event_type: eventType,
      ip_address: ip,
      phone_number: phoneNumber,
      user_agent: userAgent,
      details: details || {}
    })
}

// 验证请求签名 (前端需要生成对应的签名)
export function verifyRequestSignature(
  timestamp: number,
  signature: string,
  phoneNumber: string
): boolean {
  const now = Date.now()
  
  // 检查时间戳是否在有效范围内
  if (Math.abs(now - timestamp) > SECURITY_CONFIG.SIGNATURE_EXPIRY_MS) {
    return false
  }
  
  // 简单的签名验证：使用时间戳和手机号生成签名
  // 在生产环境应使用更强的加密方式
  const secret = process.env.OTP_SIGNATURE_SECRET || 'pingo-otp-secret-2026'
  const expectedSignature = generateSignature(timestamp, phoneNumber, secret)
  
  return signature === expectedSignature
}

// 生成签名 (前端也需要相同的逻辑)
export function generateSignature(timestamp: number, phoneNumber: string, secret: string): string {
  const data = `${timestamp}:${phoneNumber}:${secret}`
  // 简单的哈希，生产环境应使用 crypto
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// 检测可疑模式
export async function detectSuspiciousPattern(
  ip: string,
  phoneNumber: string,
  userAgent?: string
): Promise<{ suspicious: boolean; reason?: string }> {
  const supabase = await createClient()
  
  // 检查1：同一IP在短时间内尝试多个不同手机号
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  
  const { data: recentPhones } = await supabase
    .from('registrations')
    .select('phone_number')
    .eq('ip_address', ip)
    .gte('created_at', fiveMinutesAgo)
  
  if (recentPhones && recentPhones.length >= 3) {
    const uniquePhones = new Set(recentPhones.map(r => r.phone_number))
    if (uniquePhones.size >= 3) {
      await logSecurityEvent('suspicious_pattern', ip, phoneNumber, {
        pattern: 'multiple_phones_same_ip',
        unique_phones: uniquePhones.size,
        time_window: '5_minutes'
      }, userAgent)
      
      return {
        suspicious: true,
        reason: 'Aktivitas mencurigakan terdeteksi. Silakan coba lagi nanti.'
      }
    }
  }
  
  // 检查2：可疑的 User-Agent
  if (userAgent) {
    const suspiciousAgents = ['curl', 'wget', 'python', 'httpie', 'postman', 'insomnia']
    const lowerAgent = userAgent.toLowerCase()
    
    if (suspiciousAgents.some(agent => lowerAgent.includes(agent))) {
      await logSecurityEvent('suspicious_user_agent', ip, phoneNumber, {
        user_agent: userAgent
      })
      
      // 不直接拒绝，但记录日志
    }
  }
  
  return { suspicious: false }
}

// 蜜罐检测 (检测隐藏字段是否被填写)
export function checkHoneypot(honeypotValue?: string): boolean {
  // 如果蜜罐字段有值，说明是机器人
  return !honeypotValue || honeypotValue === ''
}
