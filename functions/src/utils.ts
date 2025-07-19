// src/utils.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { defineString } from "firebase-functions/params";
import * as admin from 'firebase-admin';
import { ACADEMIC_HOLIDAYS } from './config';
import { XPCalculationResult } from './types';

if (admin.apps.length === 0) {
    admin.initializeApp();
}
export const db = admin.firestore();

const googleApiKey = defineString('GOOGLE_API_KEY');

export const getGenAI = () => {
    const apiKey = googleApiKey.value();
    if (!apiKey) {
        console.error("Google API anahtarı bulunamadı.");
        throw new Error("API anahtarı bulunamadı");
    }
    return new GoogleGenerativeAI(apiKey);
};

/**
 * Mevcut tarihin tatil olup olmadığını kontrol eden yardımcı fonksiyon
 */
export function checkCurrentHolidayStatus(): { isHoliday: boolean, reason?: string, type?: string } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const todayMonthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 1. Resmi tatilleri kontrol et
    const officialHoliday = ACADEMIC_HOLIDAYS.officialHolidays.find(h => h.date === todayMonthDay);
    if (officialHoliday) {
        return { isHoliday: true, reason: officialHoliday.name, type: 'OFFICIAL' };
    }

    // 2. Yaz tatilini kontrol et
    const summerStart = new Date(`${year}-${ACADEMIC_HOLIDAYS.summerBreak.start.replace('-', '-')}`);
    const summerEnd = new Date(`${year}-${ACADEMIC_HOLIDAYS.summerBreak.end.replace('-', '-')}`);
    if (today >= summerStart && today <= summerEnd) {
        return { isHoliday: true, reason: ACADEMIC_HOLIDAYS.summerBreak.name, type: 'LONG_BREAK' };
    }
    
    // 3. Yarıyıl tatilini kontrol et
    const semesterStart = new Date(`${year}-${ACADEMIC_HOLIDAYS.semesterBreak.start.replace('-', '-')}`);
    const semesterEnd = new Date(`${year}-${ACADEMIC_HOLIDAYS.semesterBreak.end.replace('-', '-')}`);
    if (today >= semesterStart && today <= semesterEnd) {
        return { isHoliday: true, reason: ACADEMIC_HOLIDAYS.semesterBreak.name, type: 'LONG_BREAK' };
    }

    // Tatil değilse
    return { isHoliday: false };
} 

/**
 * Çalışma süresine göre XP hesaplayan fonksiyon
 * Otomatik zamanlayıcı: 1.5x multiplier
 * Manuel giriş: 0.75x multiplier
 */
export function calculateXP(durationInMinutes: number, isManualEntry: boolean): XPCalculationResult {
    const baseXP = durationInMinutes;
    const multiplier = isManualEntry ? 0.75 : 1.5;
    const xpToAdd = Math.floor(baseXP * multiplier);
    
    return {
        xpToAdd,
        multiplier,
        baseXP
    };
}

/**
 * XP'ye göre level hesaplayan fonksiyon
 * Her level için gereken XP: level * 100
 */
export function calculateLevelFromXP(totalXP: number): number {
    return Math.floor(totalXP / 100) + 1;
}

/**
 * Belirli bir level için gereken minimum XP'yi hesaplayan fonksiyon
 */
export function getXPRequiredForLevel(level: number): number {
    return (level - 1) * 100;
}

/**
 * Level atlayıp atlamadığını kontrol eden fonksiyon
 */
export function checkLevelUp(oldXP: number, newXP: number): { leveledUp: boolean, oldLevel: number, newLevel: number } {
    const oldLevel = calculateLevelFromXP(oldXP);
    const newLevel = calculateLevelFromXP(newXP);
    
    return {
        leveledUp: newLevel > oldLevel,
        oldLevel,
        newLevel
    };
}

/**
 * Tarihi YYYY-MM-DD formatında doğrulayan fonksiyon
 */
export function validateDateFormat(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Gemini API çağrısı yapan yardımcı fonksiyon
 */
export async function callGeminiAPI(prompt: string): Promise<string> {
    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return text;
    } catch (error) {
        console.error('Gemini API hatası:', error);
        throw new Error('AI servisi kullanılamıyor');
    }
} 

// =================================================================
// FIRESTORE OPTİMİZASYON UTILITIES
// =================================================================

/**
 * Sadece belirtilen field'ları çeken optimize edilmiş Firestore query helper
 * NOT: Firestore'da DocumentReference'da select() yok, full document çekip filter ediyoruz
 */
export const getDocumentFields = async (
    docPath: string, 
    fields: string[]
): Promise<any> => {
    try {
        const docRef = db.doc(docPath);
        const snapshot = await docRef.get();
        
        if (!snapshot.exists) return null;
        
        const data = snapshot.data();
        if (!data) return null;
        
        // Sadece istenen field'ları filtrele
        const filteredData: any = {};
        for (const field of fields) {
            if (data.hasOwnProperty(field)) {
                filteredData[field] = data[field];
            }
        }
        
        return filteredData;
    } catch (error) {
        console.error(`Error fetching fields ${fields} from ${docPath}:`, error);
        return null;
    }
};

/**
 * Birden fazla document'i paralel olarak belirtilen field'larla çeken function
 */
export const getMultipleDocumentsFields = async (
    docPaths: string[], 
    fields: string[]
): Promise<Array<{ path: string; data: any; exists: boolean }>> => {
    try {
        const promises = docPaths.map(async (path) => {
            const docRef = db.doc(path);
            const snapshot = await docRef.get();
            
            if (!snapshot.exists) {
                return { path, data: null, exists: false };
            }
            
            const data = snapshot.data();
            if (!data) {
                return { path, data: null, exists: false };
            }
            
            // Sadece istenen field'ları filtrele
            const filteredData: any = {};
            for (const field of fields) {
                if (data.hasOwnProperty(field)) {
                    filteredData[field] = data[field];
                }
            }
            
            return {
                path,
                data: filteredData,
                exists: true
            };
        });
        
        return await Promise.all(promises);
    } catch (error) {
        console.error(`Error fetching multiple documents:`, error);
        return [];
    }
};

/**
 * Batch write operations için helper - birden fazla write'ı tek transaction'da yapar
 */
export const batchWriteOperations = async (
    operations: Array<{
        type: 'set' | 'update' | 'delete';
        path: string;
        data?: any;
        merge?: boolean;
    }>
): Promise<void> => {
    if (operations.length === 0) return;
    
    // Firestore batch size limit: 500 operations
    const BATCH_SIZE = 500;
    
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const batchOps = operations.slice(i, i + BATCH_SIZE);
        
        for (const op of batchOps) {
            const docRef = db.doc(op.path);
            
            switch (op.type) {
                case 'set':
                    batch.set(docRef, op.data, { merge: op.merge || false });
                    break;
                case 'update':
                    batch.update(docRef, op.data);
                    break;
                case 'delete':
                    batch.delete(docRef);
                    break;
            }
        }
        
        await batch.commit();
        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} committed with ${batchOps.length} operations`);
    }
};

/**
 * Collection query'leri için optimize edilmiş helper - sadece gerekli field'ları çeker
 */
export const queryCollectionFields = async (
    collectionPath: string,
    fields: string[],
    whereConditions?: Array<{ field: string; operator: any; value: any }>,
    orderBy?: { field: string; direction: 'asc' | 'desc' },
    limit?: number
): Promise<Array<{ id: string; data: any }>> => {
    try {
        let query: any = db.collection(collectionPath);
        
        // Where conditions ekle
        if (whereConditions) {
            for (const condition of whereConditions) {
                query = query.where(condition.field, condition.operator, condition.value);
            }
        }
        
        // Order by ekle
        if (orderBy) {
            query = query.orderBy(orderBy.field, orderBy.direction);
        }
        
        // Limit ekle
        if (limit) {
            query = query.limit(limit);
        }
        
        // Field selection ekle
        query = query.select(...fields);
        
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
        }));
    } catch (error) {
        console.error(`Error querying collection ${collectionPath}:`, error);
        return [];
    }
}; 