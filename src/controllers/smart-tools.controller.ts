import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { SmartToolsService } from '../services/smart-tools.service';

export class QuickChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  grade?: string;
}

@ApiTags('Smart Tools')
@Controller('smart-tools')
export class SmartToolsController {
  constructor(private readonly smartToolsService: SmartToolsService) {}

  @Post('quick-chat-stream')
  @ApiOperation({ summary: 'Quick chat with AI using Server-Sent Events' })
  @ApiResponse({ status: 200, description: 'Stream started successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async quickChatStream(@Body() body: QuickChatDto, @Res() res: Response) {
    console.log('📡 SSE Request received:', body);
    
    const { message, subject, grade } = body;
    
    // Set SSE headers
    res.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    try {
      // Send initial status
      res.write(`data: ${JSON.stringify({
        type: 'STATUS',
        content: 'AI yanıtı hazırlanıyor...'
      })}\n\n`);

      // Start streaming response
      await this.smartToolsService.streamResponse(message, subject, grade, res);

    } catch (error) {
      console.error('❌ SSE Stream Error:', error);
      
      // Send error event
      res.write(`data: ${JSON.stringify({
        type: 'ERROR_CHUNK',
        content: 'AI yanıtı oluşturulurken hata oluştu'
      })}\n\n`);
      
      res.end();
    }
  }

  @Post('quick-chat')
  @ApiOperation({ summary: 'Quick chat with AI (non-streaming)' })
  @ApiResponse({ status: 200, description: 'Response received' })
  async quickChat(@Body() body: QuickChatDto) {
    const { message, subject, grade } = body;
    return this.smartToolsService.generateResponse(message, subject, grade);
  }
} 