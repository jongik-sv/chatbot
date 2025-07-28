// components/feedback/FeedbackButton.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  XCircle, 
  Star,
  MessageSquare,
  X
} from 'lucide-react';

interface FeedbackButtonProps {
  mentorId: string;
  sessionId: string;
  messageId: string;
  onFeedbackSubmitted?: () => void;
}

interface FeedbackOption {
  type: 'helpful' | 'unhelpful' | 'inappropriate' | 'inaccurate' | 'excellent';
  label: string;
  icon: React.ReactNode;
  color: string;
}

const feedbackOptions: FeedbackOption[] = [
  {
    type: 'excellent',
    label: '우수함',
    icon: <Star className="w-4 h-4" />,
    color: 'bg-yellow-500'
  },
  {
    type: 'helpful',
    label: '도움됨',
    icon: <ThumbsUp className="w-4 h-4" />,
    color: 'bg-green-500'
  },
  {
    type: 'unhelpful',
    label: '도움안됨',
    icon: <ThumbsDown className="w-4 h-4" />,
    color: 'bg-gray-500'
  },
  {
    type: 'inaccurate',
    label: '부정확함',
    icon: <XCircle className="w-4 h-4" />,
    color: 'bg-orange-500'
  },
  {
    type: 'inappropriate',
    label: '부적절함',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'bg-red-500'
  }
];

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  mentorId,
  sessionId,
  messageId,
  onFeedbackSubmitted
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!selectedType || rating === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/mentors/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mentorId,
          sessionId,
          messageId,
          rating,
          feedbackType: selectedType,
          comment: comment.trim() || undefined
        }),
      });

      if (response.ok) {
        setShowFeedback(false);
        setSelectedType('');
        setRating(0);
        setComment('');
        onFeedbackSubmitted?.();
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingColor = (ratingValue: number) => {
    if (ratingValue <= 2) return 'text-red-500';
    if (ratingValue <= 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowFeedback(!showFeedback)}
        className="text-gray-500 hover:text-gray-700"
      >
        <MessageSquare className="w-4 h-4" />
      </Button>

      {showFeedback && (
        <Card className="absolute bottom-full right-0 mb-2 w-80 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">피드백 제공</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFeedback(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* 피드백 타입 선택 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                피드백 유형
              </label>
              <div className="grid grid-cols-2 gap-2">
                {feedbackOptions.map((option) => (
                  <Button
                    key={option.type}
                    variant={selectedType === option.type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(option.type)}
                    className="justify-start"
                  >
                    <span className={`w-2 h-2 rounded-full mr-2 ${option.color}`} />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 평점 선택 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                평점 (1-5)
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    variant={rating >= value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRating(value)}
                    className={`w-8 h-8 p-0 ${getRatingColor(value)}`}
                  >
                    <Star 
                      className="w-4 h-4" 
                      fill={rating >= value ? "currentColor" : "none"}
                    />
                  </Button>
                ))}
              </div>
            </div>

            {/* 코멘트 입력 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                추가 의견 (선택사항)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="구체적인 피드백을 남겨주세요..."
                className="min-h-[60px]"
              />
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFeedback(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitFeedback}
                disabled={!selectedType || rating === 0 || isSubmitting}
              >
                {isSubmitting ? '제출 중...' : '피드백 제출'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};