// app/api/mentors/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MentorImprovementService } from '@/services/MentorImprovementService';

const improvementService = new MentorImprovementService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mentorId, sessionId, messageId, rating, feedbackType, comment } = body;

    if (!mentorId || !sessionId || !messageId || !rating || !feedbackType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const validFeedbackTypes = ['helpful', 'unhelpful', 'inappropriate', 'inaccurate', 'excellent'];
    if (!validFeedbackTypes.includes(feedbackType)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    await improvementService.collectFeedback({
      mentorId,
      sessionId,
      messageId,
      rating,
      feedbackType,
      comment,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error collecting feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get('mentorId');

    if (!mentorId) {
      return NextResponse.json(
        { error: 'Mentor ID is required' },
        { status: 400 }
      );
    }

    const metrics = await improvementService.calculatePerformanceMetrics(mentorId);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}