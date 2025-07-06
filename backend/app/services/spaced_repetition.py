"""
Spaced repetition algorithm implementation
Based on SM-2 algorithm
"""

from datetime import datetime, timedelta
from typing import Tuple


def calculate_next_review(
    easiness_factor: float,
    interval_days: int,
    quality: int
) -> Tuple[float, int, datetime]:
    """
    Calculate next review date using SM-2 algorithm
    
    Args:
        easiness_factor: Current easiness factor (min 1.3)
        interval_days: Current interval in days
        quality: Quality of response (0-5 scale)
            0 - complete blackout
            1 - incorrect response; the correct one remembered
            2 - incorrect response; where the correct one seemed easy to recall
            3 - correct response recalled with serious difficulty
            4 - correct response after a hesitation
            5 - perfect response
    
    Returns:
        Tuple of (new_easiness_factor, new_interval_days, next_review_date)
    """
    
    # Calculate new easiness factor
    new_easiness_factor = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    
    # Ensure easiness factor doesn't go below 1.3
    new_easiness_factor = max(1.3, new_easiness_factor)
    
    # Calculate new interval
    if quality < 3:
        # If quality is less than 3, reset interval
        new_interval_days = 1
    else:
        if interval_days == 0:
            # First review
            new_interval_days = 1
        elif interval_days == 1:
            # Second review
            new_interval_days = 6
        else:
            # Subsequent reviews
            new_interval_days = round(interval_days * new_easiness_factor)
    
    # Calculate next review date
    next_review_date = datetime.utcnow() + timedelta(days=new_interval_days)
    
    return new_easiness_factor, new_interval_days, next_review_date


def get_initial_interval(quality: int) -> int:
    """
    Get initial interval based on first review quality
    
    Args:
        quality: Quality of first review (0-5)
    
    Returns:
        Initial interval in days
    """
    if quality < 3:
        return 1
    elif quality == 3:
        return 2
    elif quality == 4:
        return 3
    else:  # quality == 5
        return 4


def calculate_retention_score(
    review_count: int,
    correct_count: int,
    last_reviewed_at: datetime = None
) -> float:
    """
    Calculate retention score for a vocabulary item
    
    Args:
        review_count: Total number of reviews
        correct_count: Number of correct reviews
        last_reviewed_at: Last review timestamp
    
    Returns:
        Retention score (0-1)
    """
    if review_count == 0:
        return 0.0
    
    # Base score from accuracy
    accuracy = correct_count / review_count
    
    # Apply time decay if last review was provided
    if last_reviewed_at:
        days_since_review = (datetime.utcnow() - last_reviewed_at).days
        # Decay factor: loses 10% per week without review
        time_factor = max(0.3, 1 - (days_since_review * 0.1 / 7))
        return accuracy * time_factor
    
    return accuracy