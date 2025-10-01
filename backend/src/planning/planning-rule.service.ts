import { Injectable } from '@nestjs/common';

@Injectable()
export class PlanningRuleService {
  resolveNextWeekdayTime(dayNameTr: string, hhmm: string): Date {
    const mapping: Record<string, number> = { 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6, 'Pazar': 0 };
    const targetDow = mapping[dayNameTr] ?? 1;
    const now = new Date();
    const curDow = now.getDay();
    const [hh, mm] = hhmm.split(':').map((x) => parseInt(x, 10));
    const diff = (targetDow - curDow + 7) % 7;
    const d = new Date(now);
    d.setDate(now.getDate() + diff);
    d.setHours(hh, mm, 0, 0);
    return d;
  }
}


