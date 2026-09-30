export type InsightConfidence = "faible" | "moyenne" | "élevée";

export type Insight = {
  confidence: InsightConfidence;
  description: string;
  id: string;
  title: string;
};

export type InsightsResult = {
  availableDays: number;
  insights: Insight[];
  requiredDays: number;
};
