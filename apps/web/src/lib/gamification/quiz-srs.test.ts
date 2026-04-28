import { describe, it, expect } from "vitest";
import { 
  computeNextSRSState, 
  createInitialSRSState, 
  SRS_CONFIG 
} from "./quiz-srs";

describe("Quiz SRS Logic", () => {
  it("should initialize a new question state correctly", () => {
    const initialState = createInitialSRSState("q1");
    expect(initialState.question_id).toBe("q1");
    expect(initialState.streak).toBe(0);
    expect(initialState.ease_factor).toBe(SRS_CONFIG.DEFAULT_EASE_FACTOR);
    expect(new Date(initialState.next_review_at).getTime()).toBeLessThanOrEqual(new Date().getTime() + 1000);
  });

  it("should handle a wrong answer (quality 0)", () => {
    const state = createInitialSRSState("q1");
    const nextState = computeNextSRSState(state, 0);
    
    expect(nextState.streak).toBe(0);
    expect(nextState.failure_count).toBe(1);
    expect(nextState.ease_factor).toBeLessThan(state.ease_factor);
    // Interval should be very short (10 mins)
    const diffMins = (new Date(nextState.next_review_at).getTime() - new Date().getTime()) / (1000 * 60);
    expect(diffMins).toBeGreaterThan(5);
    expect(diffMins).toBeLessThan(15);
  });

  it("should handle a correct easy answer (quality 5) for the first time", () => {
    const state = createInitialSRSState("q1");
    const nextState = computeNextSRSState(state, 5);
    
    expect(nextState.streak).toBe(1);
    expect(nextState.success_count).toBe(1);
    // 1st interval should be 1 day
    const diffDays = (new Date(nextState.next_review_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(1);
    expect(nextState.ease_factor).toBeGreaterThan(state.ease_factor);
  });

  it("should increase interval exponentially with success streak", () => {
    let state = createInitialSRSState("q1");
    
    // Day 1
    state = computeNextSRSState(state, 5);
    expect(state.streak).toBe(1);
    
    // Day 2 (Simulated)
    state = computeNextSRSState(state, 5);
    expect(state.streak).toBe(2);
    let diffDays = (new Date(state.next_review_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(6);

    // Day 8 (Simulated)
    state = computeNextSRSState(state, 5);
    expect(state.streak).toBe(3);
    diffDays = (new Date(state.next_review_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    // Previous interval was 6, EF is ~2.6, so 6 * 2.6 = ~15.6 -> 16
    expect(Math.round(diffDays)).toBeGreaterThanOrEqual(15);
  });

  it("should penalize ease factor on difficult answers", () => {
    const state = createInitialSRSState("q1");
    state.streak = 2;
    state.ease_factor = 2.5;
    
    const nextState = computeNextSRSState(state, 3); // Correct but hard
    expect(nextState.ease_factor).toBeLessThan(state.ease_factor);
  });
});
