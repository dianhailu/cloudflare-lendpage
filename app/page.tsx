import { VisitTracker } from "@/components/visit-tracker"

const APK_DOWNLOAD_URL = "https://dl.pingoapp.org/v3/PinGo.apk"

interface PageProps {
  searchParams: Promise<{ ref?: string; channel?: string }>
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const refCode = params.ref || null
  const channel = params.channel || null

  return (
    <div style={{ 
      margin: 0, 
      padding: 0,
      fontFamily: "Arial, Helvetica, sans-serif",
      backgroundColor: "#12873d",
      minHeight: "100vh",
      width: "100%",
    }}>
      <VisitTracker refCode={refCode} channel={channel} />
      
      {/* 自动下载脚本 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(function(){window.location.href="${APK_DOWNLOAD_URL}";},1000);`
        }}
      />

      {/* 主容器 - 居中 */}
      <div style={{ 
        width: "100%", 
        maxWidth: "420px", 
        margin: "0 auto",
        padding: "0",
      }}>
        
        {/* Logo 区域 - 完全居中 */}
        <div style={{ 
          padding: "24px 20px 16px 20px", 
          textAlign: "center",
          width: "100%",
          boxSizing: "border-box",
        }}>
          <div style={{ textAlign: "center", width: "100%" }}>
            <img
              src="/images/pingo-logo.jpg"
              alt="PinGo"
              width="72"
              height="72"
              style={{ 
                width: "72px", 
                height: "72px", 
                borderRadius: "16px",
                border: "3px solid rgba(255,255,255,0.3)",
              }}
            />
          </div>
          <div style={{ 
            color: "#ffffff", 
            fontSize: "28px", 
            fontWeight: "bold", 
            marginTop: "10px",
            textAlign: "center",
          }}>
            PinGo
          </div>
          <div style={{ 
            color: "rgba(255,255,255,0.85)", 
            fontSize: "14px", 
            marginTop: "4px",
            textAlign: "center",
          }}>
            Pinjaman Cepat &amp; Mudah
          </div>
        </div>

        {/* 下载卡片 */}
        <div style={{ padding: "0 16px" }}>
          <div style={{ 
            width: "100%", 
            backgroundColor: "#ffffff", 
            borderRadius: "20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}>
            {/* 下载状态提示 */}
            <div style={{ padding: "20px 20px 0 20px" }}>
              <div style={{ 
                width: "100%", 
                backgroundColor: "#d1fae5", 
                borderRadius: "12px",
                padding: "14px 16px",
                textAlign: "center",
                boxSizing: "border-box",
              }}>
                <span style={{ 
                  color: "#065f46", 
                  fontSize: "14px", 
                  fontWeight: "bold",
                }}>
                  Sedang mendownload aplikasi PinGo...
                </span>
              </div>
            </div>

            {/* 手动下载提示 */}
            <div style={{ 
              padding: "14px 20px 10px 20px", 
              textAlign: "center",
              color: "#666666",
              fontSize: "13px",
            }}>
              Jika tidak mulai otomatis:
            </div>

            {/* 下载按钮 */}
            <div style={{ padding: "0 20px 20px 20px" }}>
              <a
                href={APK_DOWNLOAD_URL}
                style={{
                  display: "block",
                  backgroundColor: "#facc15",
                  color: "#78350f",
                  fontSize: "18px",
                  fontWeight: "bold",
                  padding: "16px 20px",
                  borderRadius: "14px",
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                DOWNLOAD SEKARANG
              </a>
            </div>

            {/* 客服联系 */}
            <div style={{ 
              padding: "0 20px 20px 20px", 
              textAlign: "center",
              color: "#888888",
              fontSize: "12px",
            }}>
              Butuh bantuan? WA:{" "}
              <a 
                href="https://wa.me/message/PP2WMQXXNJ4UF1" 
                style={{ color: "#16a34a", fontWeight: "bold", textDecoration: "none" }}
              >
                08139810998
              </a>
            </div>
          </div>
        </div>

        {/* 信任标识 - 用 table 确保三列均分 */}
        <div style={{ padding: "20px 16px 12px 16px" }}>
          <table cellPadding={0} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ width: "33.33%", textAlign: "center", padding: "8px 4px", verticalAlign: "top" }}>
                  <div style={{ 
                    width: "36px", 
                    height: "36px", 
                    margin: "0 auto 6px auto",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                    lineHeight: "36px",
                    fontSize: "18px",
                    color: "#fbbf24",
                  }}>
                    &#128274;
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>Data Aman</div>
                </td>
                <td style={{ width: "33.33%", textAlign: "center", padding: "8px 4px", verticalAlign: "top" }}>
                  <div style={{ 
                    width: "36px", 
                    height: "36px", 
                    margin: "0 auto 6px auto",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                    lineHeight: "36px",
                    fontSize: "18px",
                    color: "#fbbf24",
                  }}>
                    &#127963;
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>Sesuai Regulasi</div>
                </td>
                <td style={{ width: "33.33%", textAlign: "center", padding: "8px 4px", verticalAlign: "top" }}>
                  <div style={{ 
                    width: "36px", 
                    height: "36px", 
                    margin: "0 auto 6px auto",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                    lineHeight: "36px",
                    fontSize: "18px",
                    color: "#a855f7",
                  }}>
                    &#128222;
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>Support 24/7</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 底部说明 */}
        <div style={{ 
          padding: "8px 24px 24px 24px", 
          textAlign: "center",
          color: "rgba(255,255,255,0.5)",
          fontSize: "10px",
          lineHeight: "1.5",
        }}>
          PinGo beroperasi sesuai peraturan dan standar keuangan yang berlaku.
        </div>
      </div>
    </div>
  )
}
