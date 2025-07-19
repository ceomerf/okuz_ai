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