-- Create download_registrations table for WhatsApp/SMS OTP verification
-- 用于 PinGo 下载页面的用户注册和 OTP 验证

CREATE TABLE IF NOT EXISTS download_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  otp_code VARCHAR(6),
  otp_expires_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  coupon_amount INTEGER DEFAULT 10000,
  ip_address VARCHAR(100),
  user_agent TEXT,
  -- nxcloud 相关字段
  nxcloud_message_id VARCHAR(100),
  otp_delivery_status VARCHAR(20),
  otp_delivery_updated_at TIMESTAMPTZ,
  nxcloud_error_code VARCHAR(50),
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_download_registrations_phone ON download_registrations(phone_number);

-- Create index on is_verified for analytics
CREATE INDEX IF NOT EXISTS idx_download_registrations_verified ON download_registrations(is_verified);

-- Create index on nxcloud_message_id for callback lookups
CREATE INDEX IF NOT EXISTS idx_download_registrations_msgid ON download_registrations(nxcloud_message_id);
