"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeetingFeedbackProps {
  participantName: string;
  onSubmit: (rating: number, comment: string) => void;
}

export default function MeetingFeedback({
  participantName,
  onSubmit,
}: MeetingFeedbackProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      return; // Require at least 1 star
    }

    setIsSubmitting(true);
    
    // Call the parent's submit handler
    await onSubmit(rating, comment);
  };

  const handleSkip = () => {
    // Submit with 0 rating to indicate skip
    onSubmit(0, "");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-4">
          <div className="mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <span className="text-4xl">👋</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Thank you for the lesson!
          </CardTitle>
          <p className="text-gray-600 mt-2">
            How was your experience today, {participantName}?
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 block text-center">
              Rate your lesson
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
                  disabled={isSubmitting}
                >
                  <Star
                    className={cn(
                      "w-10 h-10 transition-all duration-200",
                      (hoveredRating >= star || rating >= star)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-gray-600">
                {rating === 5 && "⭐ Excellent!"}
                {rating === 4 && "😊 Great!"}
                {rating === 3 && "👍 Good!"}
                {rating === 2 && "🙂 Okay"}
                {rating === 1 && "😐 Needs improvement"}
              </p>
            )}
          </div>

          {/* Optional Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">
              Share your thoughts (optional)
            </label>
            <Textarea
              placeholder="What did you learn today? Any suggestions?"
              value={comment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isSubmitting}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
            
            <Button
              onClick={handleSkip}
              disabled={isSubmitting}
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-800"
            >
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
