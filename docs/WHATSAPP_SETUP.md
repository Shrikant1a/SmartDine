# WhatsApp Business Cloud API Setup Guide

SmartDine integrates with Meta's **WhatsApp Business Cloud API** strictly from server-side modules (`src/lib/whatsapp/client.ts` and `src/services/notifications.ts`). When `WHATSAPP_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` is unset, dispatches are safely logged as `skipped` in `notification_logs` without fabricating delivery.

## 1. Environment Variables (`.env.local` & Vercel)
```env
WHATSAPP_TOKEN=<Meta Permanent System User Access Token>
WHATSAPP_PHONE_NUMBER_ID=<Meta WhatsApp Phone Number ID>
CRON_SECRET=<Random 32+ char secret for scheduled daily summary>
```

## 2. Required Approved Meta Templates
Create and submit these templates (Language: `en`) in Meta Business Manager:

1. **`smartdine_new_order`** (Utility)
   - Body: `New order {{1}} received at {{2}}. Total: {{3}}.`
2. **`smartdine_low_stock`** (Utility)
   - Body: `Low stock alert: {{1}} has only {{2}} remaining.`
3. **`smartdine_order_ready`** (Utility)
   - Body: `Good news! Your order {{1}} for {{2}} is ready and being served shortly.`
4. **`smartdine_daily_summary`** (Utility)
   - Body: `SmartDine Daily Summary — Orders: {{1}}, Revenue: {{2}}, Top items: {{3}}.`

## 3. Daily Summary Cron Schedule
Schedule a daily HTTP `POST` at 11:00 PM IST (`17:30 UTC`) to `/api/notifications/daily-summary` with header:
`Authorization: Bearer <CRON_SECRET>`
