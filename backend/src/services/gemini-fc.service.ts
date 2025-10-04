// GEMINI FUNCTION CALLING SERVİSİ DEVRE DIŞI - OPENAI KULLANILIYOR
/*
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { GeminiService } from './gemini.service';

export interface ToolDefinition {
  name: string;
  description?: string;
  schema: any; // JSON Schema benzeri
}

@Injectable()
export class GeminiFunctionCallingService {
  constructor(private readonly gemini: GeminiService) {}

  async callStructured<T>(prompt: string, tool: ToolDefinition, validator?: z.ZodTypeAny): Promise<T> {
    // Basit ilk sürüm: prompt içine tool şemasını gömerek sıkı yönlendirme
    const fcPrompt = `You are a function calling model. Call the tool with valid JSON args only.
TOOL_NAME: ${tool.name}
TOOL_SCHEMA: ${JSON.stringify(tool.schema)}
PROMPT: ${prompt}
Return ONLY JSON matching TOOL_SCHEMA.`;

    const raw = await this.gemini.generateContent(fcPrompt);
    const cleaned = raw?.trim()?.replace(/```json\n?/gi, '').replace(/```/g, '');
    let json: any;
    try {
      json = JSON.parse(cleaned);
    } catch {
      throw new Error('Invalid JSON from model');
    }
    if (validator) {
      const parsed = validator.safeParse(json);
      if (!parsed.success) {
        throw new Error('Validation failed for model output');
      }
      return parsed.data as T;
    }
    return json as T;
  }
}
*/


