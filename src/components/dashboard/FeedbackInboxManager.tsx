"use client";

import { useState } from "react";
import { Bell, Loader2, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NotificationLog, Review } from "@/types/database";
import { toast } from "sonner";

type ReviewRow = Review & { order_number: string };

export function FeedbackInboxManager({
  initialReviews,
  initialNotifications,
  isOwner,
  whatsappConfigured,
}: {
  initialReviews: ReviewRow[];
  initialNotifications: NotificationLog[];
  isOwner: boolean;
  whatsappConfigured: boolean;
}) {
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews);
  const [sendingSummary, setSendingSummary] = useState(false);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "—";

  async function toggleAllowEdit(review: ReviewRow) {
    const res = await fetch(`/api/admin/feedback/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowEdit: !review.allow_edit }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Could not update review edit permission");
      return;
    }
    setReviews((prev) =>
      prev.map((r) =>
        r.id === review.id ? { ...r, allow_edit: data.review.allow_edit } : r,
      ),
    );
    toast.success(
      data.review.allow_edit ? "Guest can now edit this review" : "Review edit locked",
    );
  }

  async function triggerDailySummary() {
    setSendingSummary(true);
    try {
      const res = await fetch("/api/notifications/daily-summary", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send daily summary");
        return;
      }
      if (data.status === "skipped") {
        toast.info(data.message);
      } else {
        toast.success("Daily summary processed and logged.");
      }
    } finally {
      setSendingSummary(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Customer Feedback &amp; WhatsApp Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Average rating: <strong>{avgRating}</strong> ({reviews.length} reviews) •{" "}
            WhatsApp API:{" "}
            <strong>{whatsappConfigured ? "Configured" : "Not configured (logging skipped)"}</strong>
          </p>
        </div>

        {isOwner ? (
          <Button
            type="button"
            variant="outline"
            disabled={sendingSummary}
            onClick={() => void triggerDailySummary()}
          >
            {sendingSummary ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Daily WhatsApp Summary
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">
            Customer Reviews ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="notifications">
            WhatsApp Logs ({initialNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="mt-4">
          <Card>
            <CardContent className="divide-y p-0">
              {reviews.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No customer reviews submitted yet.
                </p>
              ) : (
                reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{rev.order_number}</span>
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-800">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {rev.rating}/5
                        </span>
                        {rev.clicked_google_review ? (
                          <Badge variant="outline">Google Link Clicked</Badge>
                        ) : null}
                      </div>
                      {rev.comment ? (
                        <p className="text-sm text-foreground">{rev.comment}</p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">
                          No written comment
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(rev.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>

                    {isOwner ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={rev.allow_edit ? "default" : "outline"}
                        onClick={() => void toggleAllowEdit(rev)}
                      >
                        {rev.allow_edit ? "Edit Allowed" : "Allow Edit"}
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Notification Delivery Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {initialNotifications.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No WhatsApp notification attempts recorded yet.
                </p>
              ) : (
                initialNotifications.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">
                          {log.event_type}
                        </span>
                        <Badge
                          variant={
                            log.status === "sent"
                              ? "default"
                              : log.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                          className="capitalize"
                        >
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        To: {log.recipient} • Template: {log.template_name ?? "—"}
                      </p>
                      {log.error_message ? (
                        <p className="text-rose-600">{log.error_message}</p>
                      ) : null}
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
