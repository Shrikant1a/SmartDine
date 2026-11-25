"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Loader2, Star } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Review } from "@/types/database";
import { toast } from "sonner";

export function ReviewFormClient({
  orderId,
  orderNumber,
  tableNumber,
  googleReviewUrl,
  existingReview,
}: {
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  googleReviewUrl: string | null;
  existingReview: Review | null;
}) {
  const [rating, setRating] = useState<number>(existingReview?.rating ?? 5);
  const [comment, setComment] = useState<string>(existingReview?.comment ?? "");
  const [submitted, setSubmitted] = useState<Review | null>(
    existingReview && !existingReview.allow_edit ? existingReview : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not submit review");
        return;
      }
      setSubmitted(data.review);
      toast.success("Thank you for your feedback!");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoogleReviewClick() {
    void fetch("/api/reviews/google-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    }).catch(() => {});
  }

  if (submitted) {
    return (
      <Card className="border-emerald-500/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle>Thank You for Your Review!</CardTitle>
          <CardDescription>
            Your {submitted.rating}-star rating for Order {orderNumber} has been saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {submitted.comment ? (
            <p className="rounded-lg bg-muted p-3 text-sm italic text-muted-foreground">
              &ldquo;{submitted.comment}&rdquo;
            </p>
          ) : null}

          {googleReviewUrl ? (
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Would you also like to share your experience publicly on Google?
              </p>
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleGoogleReviewClick}
                className={buttonVariants({
                  className: "bg-amber-600 text-white hover:bg-amber-700",
                })}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Leave a Google Review
              </a>
            </div>
          ) : null}

          <div className="pt-2">
            <Link href={`/order/${orderId}`} className={buttonVariants({ variant: "outline" })}>
              Back to Order Summary
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Rate Your Meal</CardTitle>
          <Badge variant="outline">
            {orderNumber} • Table {tableNumber}
          </Badge>
        </div>
        <CardDescription>
          Tell us how your food and table service were today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Your Rating (1 to 5 Stars)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} stars`}
                  className="rounded-lg border p-2.5 transition hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= rating
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="revComment">Comments (Optional)</Label>
            <Textarea
              id="revComment"
              rows={3}
              maxLength={600}
              placeholder="What did you enjoy or what can we improve?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {googleReviewUrl ? (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleGoogleReviewClick}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Google Review Page
              </a>
            ) : (
              <span />
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Submit Review
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
