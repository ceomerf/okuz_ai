import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum, IsArray } from 'class-validator';

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

export enum Subject {
  MATHEMATICS = 'mathematics',
  PHYSICS = 'physics',
  CHEMISTRY = 'chemistry',
  BIOLOGY = 'biology',
  TURKISH = 'turkish',
  HISTORY = 'history',
  GEOGRAPHY = 'geography',
  PHILOSOPHY = 'philosophy',
  LITERATURE = 'literature',
}

export class QuickChatDto {
  @ApiProperty({ 
    description: 'User message',
    example: 'What is the derivative of x^2?'
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ 
    description: 'Chat context',
    example: 'Calculus homework',
    required: false
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiProperty({ 
    description: 'User ID',
    example: 'user-123'
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class SosQuestionDto {
  @ApiProperty({ 
    description: 'Question text',
    example: 'How do I solve this quadratic equation: x^2 + 5x + 6 = 0?'
  })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ 
    description: 'Subject of the question',
    enum: Subject,
    example: Subject.MATHEMATICS
  })
  @IsEnum(Subject)
  subject!: Subject;

  @ApiProperty({ 
    description: 'Grade level',
    example: 11,
    minimum: 9,
    maximum: 12
  })
  @IsNumber()
  @Min(9)
  grade!: number;

  @ApiProperty({ 
    description: 'Question difficulty',
    enum: DifficultyLevel,
    example: DifficultyLevel.MEDIUM
  })
  @IsEnum(DifficultyLevel)
  difficulty!: DifficultyLevel;

  @ApiProperty({ 
    description: 'Additional context',
    example: 'This is for my homework due tomorrow',
    required: false
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiProperty({ 
    description: 'User ID',
    example: 'user-123'
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class SummaryGeneratorDto {
  @ApiProperty({ 
    description: 'Text to summarize',
    example: 'The theory of relativity is a fundamental concept in physics...'
  })
  @IsString()
  @IsNotEmpty()
  sourceText!: string;

  @ApiProperty({ 
    description: 'Summary format',
    example: 'paragraph',
    enum: ['paragraph', 'bullet', 'outline', 'mindmap']
  })
  @IsString()
  @IsNotEmpty()
  format!: string;

  @ApiProperty({ 
    description: 'Summary length',
    example: 'medium',
    enum: ['short', 'medium', 'long'],
    required: false
  })
  @IsOptional()
  @IsString()
  length?: string;

  @ApiProperty({ 
    description: 'User ID',
    example: 'user-123'
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class FlashcardsGeneratorDto {
  @ApiProperty({ 
    description: 'Topic for flashcards',
    example: 'Photosynthesis'
  })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiProperty({ 
    description: 'Number of flashcards to generate',
    example: 10,
    minimum: 1,
    maximum: 50
  })
  @IsNumber()
  @Min(1)
  count!: number;

  @ApiProperty({ 
    description: 'Subject',
    enum: Subject,
    example: Subject.BIOLOGY
  })
  @IsEnum(Subject)
  subject!: Subject;

  @ApiProperty({ 
    description: 'Grade level',
    example: 10
  })
  @IsNumber()
  @Min(9)
  grade!: number;

  @ApiProperty({ 
    description: 'Difficulty level',
    enum: DifficultyLevel,
    example: DifficultyLevel.MEDIUM
  })
  @IsEnum(DifficultyLevel)
  difficulty!: DifficultyLevel;
}

export class ConceptMapDto {
  @ApiProperty({ 
    description: 'Grade level',
    example: '11'
  })
  @IsString()
  @IsNotEmpty()
  grade!: string;

  @ApiProperty({ 
    description: 'Subject',
    enum: Subject,
    example: Subject.PHYSICS
  })
  @IsEnum(Subject)
  subject!: Subject;

  @ApiProperty({ 
    description: 'Topic for concept map',
    example: 'Mechanics'
  })
  @IsString()
  @IsNotEmpty()
  topic!: string;
}

export class FeynmanCycleDto {
  @ApiProperty({ 
    description: 'Topic to explain',
    example: 'Photosynthesis'
  })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiProperty({ 
    description: 'Current explanation',
    example: 'Photosynthesis is the process by which plants convert light energy into chemical energy...'
  })
  @IsString()
  @IsNotEmpty()
  explanation!: string;
}

export class SocraticEvaluationDto {
  @ApiProperty({ 
    description: 'Student answer to evaluate',
    example: 'The mitochondria is the powerhouse of the cell'
  })
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @ApiProperty({ 
    description: 'Original question',
    example: 'What is the function of mitochondria?'
  })
  @IsString()
  @IsNotEmpty()
  question!: string;
}

export class LiveQuizDto {
  @ApiProperty({ 
    description: 'Quiz topic',
    example: 'Algebra'
  })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiProperty({ 
    description: 'Quiz difficulty',
    enum: DifficultyLevel,
    example: DifficultyLevel.MEDIUM
  })
  @IsEnum(DifficultyLevel)
  difficulty!: DifficultyLevel;

  @ApiProperty({ 
    description: 'Number of questions',
    example: 10,
    minimum: 1,
    maximum: 50
  })
  @IsNumber()
  @Min(1)
  count!: number;

  @ApiProperty({ 
    description: 'Subject',
    enum: Subject,
    example: Subject.MATHEMATICS
  })
  @IsEnum(Subject)
  subject!: Subject;

  @ApiProperty({ 
    description: 'Grade level',
    example: 11
  })
  @IsNumber()
  @Min(9)
  grade!: number;
}

export class ExamSimulatorDto {
  @ApiProperty({ 
    description: 'Exam subject',
    enum: Subject,
    example: Subject.MATHEMATICS
  })
  @IsEnum(Subject)
  subject!: Subject;

  @ApiProperty({ 
    description: 'Grade level',
    example: 11
  })
  @IsNumber()
  @Min(9)
  grade!: number;

  @ApiProperty({ 
    description: 'Exam duration in minutes',
    example: 120,
    minimum: 30
  })
  @IsNumber()
  @Min(30)
  duration!: number;
}

export class LearningPathDto {
  @ApiProperty({ 
    description: 'Learning topic',
    example: 'Calculus'
  })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiProperty({ 
    description: 'Current level',
    example: 'beginner',
    enum: ['beginner', 'intermediate', 'advanced']
  })
  @IsString()
  @IsNotEmpty()
  level!: string;

  @ApiProperty({ 
    description: 'Learning goals',
    example: ['Understand derivatives', 'Master integration'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  goals!: string[];

  @ApiProperty({ 
    description: 'Subject',
    enum: Subject,
    example: Subject.MATHEMATICS
  })
  @IsEnum(Subject)
  subject!: Subject;

  @ApiProperty({ 
    description: 'Grade level',
    example: 11
  })
  @IsNumber()
  @Min(9)
  grade!: number;
}

export class TopicConnectionDto {
  @ApiProperty({ 
    description: 'Main topic',
    example: 'Photosynthesis'
  })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiProperty({ 
    description: 'Related subjects',
    example: ['Biology', 'Chemistry'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  subjects!: string[];
}

export class MentalSupportDto {
  @ApiProperty({ 
    description: 'Issue description',
    example: 'I am feeling overwhelmed with my studies'
  })
  @IsString()
  @IsNotEmpty()
  issue!: string;

  @ApiProperty({ 
    description: 'Additional context',
    example: 'I have exams next week and I feel like I am not prepared'
  })
  @IsString()
  @IsNotEmpty()
  context!: string;
}

export class SmartToolResponseDto {
  @ApiProperty({ description: 'Tool response' })
  response!: string;

  @ApiProperty({ description: 'Response type' })
  type!: string;

  @ApiProperty({ description: 'Additional data', required: false })
  data?: any;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTime!: number;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: string;
}
