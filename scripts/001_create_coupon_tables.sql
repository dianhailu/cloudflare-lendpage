-- 优惠券领取记录表
CREATE TABLE IF NOT EXISTS coupon_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  ref_code VARCHAR(50),
  channel VARCHAR(100),
  source_url TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 页面访问统计表（按天、按来源URL统计UV和PV）
CREATE TABLE IF NOT EXISTS page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_url TEXT NOT NULL,
  ref_code VARCHAR(50),
  channel VARCHAR(100),
  visitor_id VARCHAR(100) NOT NULL, -- 用于去重计算UV
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_coupon_claims_phone ON coupon_claims(phone_number);
CREATE INDEX IF NOT EXISTS idx_coupon_claims_created_at ON coupon_claims(created_at);
CREATE INDEX IF NOT EXISTS idx_coupon_claims_ref_code ON coupon_claims(ref_code);

CREATE INDEX IF NOT EXISTS idx_page_visits_date ON page_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_page_visits_source_url ON page_visits(source_url);
CREATE INDEX IF NOT EXISTS idx_page_visits_visitor_id ON page_visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_date_source ON page_visits(visit_date, source_url);

-- 每日访问统计视图（按来源URL分组）
CREATE OR REPLACE VIEW daily_visit_stats AS
SELECT 
  visit_date,
  source_url,
  ref_code,
  channel,
  COUNT(*) as pv,
  COUNT(DISTINCT visitor_id) as uv
FROM page_visits
GROUP BY visit_date, source_url, ref_code, channel
ORDER BY visit_date DESC, pv DESC;

-- 总体统计视图
CREATE OR REPLACE VIEW overall_stats AS
SELECT 
  source_url,
  ref_code,
  channel,
  COUNT(*) as total_pv,
  COUNT(DISTINCT visitor_id) as total_uv,
  MIN(visit_date) as first_visit,
  MAX(visit_date) as last_visit
FROM page_visits
GROUP BY source_url, ref_code, channel
ORDER BY total_pv DESC;
