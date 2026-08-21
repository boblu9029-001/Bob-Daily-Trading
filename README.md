# Bob - Daily Trading

美股 × 加密貨幣量化交易控制面板，基於 **Martin Luk Master System 4.0 Pro**。

## 功能

1. **雙市場中期趨勢共振儀** — QQQ/SPY/SOXX/IWM + BTC/ETH，綜合多空 -100~+100
2. **雲端持倉與 R-Multiple** — 新增 / 改止損 / 一鍵平倉，RPT 0.3%
3. **今日動量目標** — 主線池掃描與五大型態標籤
4. **互動式 K 線** — 5m/1D、9/21/50 EMA、Anchored VWAP
5. **PWA** — 手機加到主畫面，免開電腦即可訪問

## 快速開始

```bash
cp .env.example .env.local
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

未設定 API Key 時，行情自動走 **Yahoo Finance**（美股）與 **Binance 公開 K 線**（BTC/ETH）。

## 環境變數

| 變數 | 說明 |
|------|------|
| `ALPACA_API_KEY` / `ALPACA_API_SECRET` | 可選，美股優先數據源 |
| `NEXT_PUBLIC_SUPABASE_URL` | 可選，雲端 Postgres |
| `SUPABASE_SERVICE_ROLE_KEY` | 可選，持倉 CRUD |

未設定 Supabase 時，持倉寫入專案內 `data/positions.json`（重啟不遺失）。

### 啟用 Supabase

1. 建立專案後執行 `supabase/schema.sql`
2. 填入 `.env.local` 中的 URL 與 Service Role Key
3. 重啟 `npm run dev`

## 部署（全天候手機訪問）

推薦 **Vercel**：

```bash
npx vercel
```

綁定自訂網域後，手機 Safari / Chrome「加入主畫面」即可 PWA 啟動。

記得在 Vercel 後台設定相同環境變數。

## 專案結構

```
src/
  app/                 # App Router 頁面與 API
  components/          # Scoreboard / Positions / Focus / Chart
  lib/                 # 指標、評分、行情、持久化
public/                # PWA manifest + service worker
supabase/schema.sql    # 雲端表結構
data/                  # 本地持倉 fallback
```

## 系統參數速查

- RPT：`0.3%`
- 禁追：偏離 9EMA `>15%`
- 減倉警報：`+3R`
- 交易時段標籤（台北）：`20:00–04:00` 每小時更新
