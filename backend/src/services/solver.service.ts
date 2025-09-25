import { Injectable } from '@nestjs/common';

export interface Constraint {
  type: string; // e.g., min_hours_per_week, avoid_back_to_back_hard
  subject?: string;
  value?: number | string | boolean;
  days?: string[];
  afterHour?: number;
}

@Injectable()
export class SolverService {
  // Placeholder: OR-Tools/CP-SAT entegrasyonu için arayüz
  async optimizeSchedule(sessions: any[], constraints: Constraint[]): Promise<any[]> {
    // TODO: Burada OR-Tools entegrasyonu yapılabilir.
    // Şimdilik basit bir no-op dönüş yapıyoruz.
    return sessions;
  }
}


