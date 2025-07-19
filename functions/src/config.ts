// src/config.ts
export const ACADEMIC_HOLIDAYS = {
    officialHolidays: [
        { date: "01-01", name: "Yılbaşı Tatili" },
        { date: "04-23", name: "Ulusal Egemenlik ve Çocuk Bayramı" },
        { date: "05-01", name: "Emek ve Dayanışma Günü" },
        { date: "05-19", name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
        { date: "07-15", name: "Demokrasi ve Milli Birlik Günü" },
        { date: "08-30", name: "Zafer Bayramı" },
        { date: "10-29", name: "Cumhuriyet Bayramı" },
    ],
    semesterBreak: { start: "01-22", end: "02-05", name: "Yarıyıl Tatili" },
    summerBreak: { start: "06-15", end: "09-15", name: "Yaz Tatili" }
};

export const ACADEMIC_TRACK_SUBJECTS: { [key: string]: string[] } = {
    'Sayısal': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türk Dili ve Edebiyatı'],
    'Eşit Ağırlık': ['Matematik', 'Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya'],
    'Sözel': ['Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü ve Ahlak Bilgisi'],
    'Dil': ['Yabancı Dil', 'Türk Dili ve Edebiyatı'],
};

export const BADGE_CRITERIA: { [badge: string]: (profile: any, stats: any, planData: any) => boolean } = {
    'hafta1_fatihi': (profile, stats) => stats.streak >= 7,
    'matematik_canavari': (profile, stats, planData) => {
        let count = 0;
        for (const week of planData.weeks) {
            for (const day of week.days) {
                for (const task of (day.dailyTasks || [])) {
                    if (task.subject?.toLowerCase().includes('matematik') && task.isCompleted) {
                        count++;
                    }
                }
            }
        }
        return count >= 20;
    },
    'gece_kusu': (profile, stats, planData) => {
        let count = 0;
        for (const week of planData.weeks) {
            for (const day of week.days) {
                for (const task of (day.dailyTasks || [])) {
                    if (task.isCompleted && task.completedAt) {
                        const hour = new Date(task.completedAt).getHours();
                        if (hour >= 22) count++;
                    }
                }
            }
        }
        return count >= 10;
    }
}; 