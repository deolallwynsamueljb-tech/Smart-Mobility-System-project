/**
 * AI-Powered ETA Prediction Service
 * Connects to Flask backend ML model for accurate travel time predictions
 */

const FLASK_API_URL = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000';

interface ETAPrediction {
  eta_seconds: number;
  eta_minutes: number;
  prediction_type: 'ai_model' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}

interface ETAPredictionRequest {
  distance_km: number;
  mode: 'metro' | 'train' | 'bus';
  headway_minutes?: number;
  current_time?: string;
}

interface ModelInfo {
  feature_names?: string[];
  trained_date?: string;
  mae_minutes?: number;
  r2_score?: number;
  status?: string;
  message?: string;
}

/**
 * Predict ETA using AI model
 */
export async function predictETA(
  distanceKm: number,
  mode: 'metro' | 'train' | 'bus',
  headwayMinutes: number = 10,
  currentTime?: Date
): Promise<ETAPrediction> {
  try {
    const requestBody: ETAPredictionRequest = {
      distance_km: distanceKm,
      mode: mode,
      headway_minutes: headwayMinutes,
    };

    if (currentTime) {
      requestBody.current_time = currentTime.toISOString();
    }

    const response = await fetch(`${FLASK_API_URL}/api/predict_eta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.warn(`AI ETA prediction failed with status ${response.status}`);
      return fallbackCalculation(distanceKm, mode, headwayMinutes);
    }

    const data = await response.json();
    
    if (data.success && data.prediction) {
      return data.prediction as ETAPrediction;
    }

    return fallbackCalculation(distanceKm, mode, headwayMinutes);
  } catch (error) {
    console.error('AI ETA prediction error:', error);
    return fallbackCalculation(distanceKm, mode, headwayMinutes);
  }
}

/**
 * Get AI model information
 */
export async function getModelInfo(): Promise<ModelInfo> {
  try {
    const response = await fetch(`${FLASK_API_URL}/api/model_info`);

    if (!response.ok) {
      return {
        status: 'error',
        message: 'Failed to fetch model info',
      };
    }

    const data = await response.json();
    return data.model_info as ModelInfo;
  } catch (error) {
    console.error('Failed to get model info:', error);
    return {
      status: 'error',
      message: String(error),
    };
  }
}

/**
 * Fallback calculation when AI model is unavailable
 */
function fallbackCalculation(
  distanceKm: number,
  mode: 'metro' | 'train' | 'bus',
  headwayMinutes: number = 10
): ETAPrediction {
  // Simple speed-based calculation
  const speeds: Record<string, number> = {
    metro: 35, // km/h
    train: 40,
    bus: 20,
  };

  const speed = speeds[mode] || 25;
  const travelTimeMinutes = (distanceKm / speed) * 60;
  const waitTimeMinutes = headwayMinutes * 0.5; // Average wait

  const totalMinutes = travelTimeMinutes + waitTimeMinutes;

  return {
    eta_seconds: totalMinutes * 60,
    eta_minutes: totalMinutes,
    prediction_type: 'fallback',
    confidence: 'low',
  };
}

/**
 * Batch predict ETAs for multiple segments
 */
export async function batchPredictETA(
  segments: Array<{
    distance_km: number;
    mode: 'metro' | 'train' | 'bus';
    headway_minutes?: number;
  }>
): Promise<ETAPrediction[]> {
  const predictions = await Promise.all(
    segments.map((segment) =>
      predictETA(
        segment.distance_km,
        segment.mode,
        segment.headway_minutes || 10
      )
    )
  );

  return predictions;
}

/**
 * Check if AI backend is available
 */
export async function checkAIBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${FLASK_API_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
