import { PromptTemplate } from '../prompt-registry.service';

export const CONTENT_GENERATION_PROMPTS: PromptTemplate[] = [
  {
    id: 'content_generation_flashcards',
    name: 'Flashcard Generation',
    version: '1.0.0',
    type: 'content_generation',
    template: `Generate educational flashcards for the following topic.

Topic: {{topic}}
Subject: {{subject}}
Grade Level: {{gradeLevel}}
Difficulty: {{difficulty}}
Number of Cards: {{count}}

Please create flashcards with:
- Clear, concise questions
- Accurate, detailed answers
- Appropriate difficulty level
- Educational value

Format as JSON array:
[
  {
    "question": "What is...?",
    "answer": "The answer is...",
    "difficulty": "easy|medium|hard",
    "tags": ["tag1", "tag2"]
  }
]`,
    variables: ['topic', 'subject', 'gradeLevel', 'difficulty', 'count'],
    description: 'Generate educational flashcards for any topic',
    tags: ['content', 'education', 'flashcards'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'content_generation_quiz',
    name: 'Quiz Generation',
    version: '1.0.0',
    type: 'content_generation',
    template: `Generate a comprehensive quiz for the specified topic.

Topic: {{topic}}
Subject: {{subject}}
Grade Level: {{gradeLevel}}
Difficulty: {{difficulty}}
Question Count: {{questionCount}}
Question Types: {{questionTypes}}

Create a quiz with:
- Multiple choice questions
- True/false questions
- Short answer questions
- Problem-solving questions
- Appropriate difficulty progression

Format as JSON:
{
  "quiz": {
    "title": "Quiz Title",
    "description": "Quiz Description",
    "timeLimit": 30,
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": "A",
        "explanation": "Explanation text",
        "difficulty": "medium",
        "points": 10
      }
    ]
  }
}`,
    variables: ['topic', 'subject', 'gradeLevel', 'difficulty', 'questionCount', 'questionTypes'],
    description: 'Generate comprehensive quizzes for any topic',
    tags: ['content', 'education', 'quiz', 'assessment'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'content_generation_summary',
    name: 'Content Summary Generation',
    version: '1.0.0',
    type: 'content_generation',
    template: `Generate a comprehensive summary of the provided content.

Content: {{content}}
Subject: {{subject}}
Grade Level: {{gradeLevel}}
Summary Type: {{summaryType}}
Key Points: {{keyPoints}}

Create a summary with:
- Main concepts and ideas
- Key points and details
- Important examples
- Learning objectives
- Study recommendations

Format as structured text with clear sections and bullet points.`,
    variables: ['content', 'subject', 'gradeLevel', 'summaryType', 'keyPoints'],
    description: 'Generate comprehensive content summaries',
    tags: ['content', 'education', 'summary', 'learning'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'content_generation_exercises',
    name: 'Exercise Generation',
    version: '1.0.0',
    type: 'content_generation',
    template: `Generate practice exercises for the specified topic.

Topic: {{topic}}
Subject: {{subject}}
Grade Level: {{gradeLevel}}
Difficulty: {{difficulty}}
Exercise Count: {{exerciseCount}}
Exercise Types: {{exerciseTypes}}

Create exercises with:
- Step-by-step problems
- Varied difficulty levels
- Clear instructions
- Answer keys
- Hints and tips

Format as JSON:
{
  "exercises": [
    {
      "id": 1,
      "type": "problem_solving",
      "title": "Exercise Title",
      "description": "Exercise description",
      "problem": "Problem statement",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "solution": "Final answer",
      "hints": ["Hint 1", "Hint 2"],
      "difficulty": "medium",
      "timeEstimate": 15
    }
  ]
}`,
    variables: ['topic', 'subject', 'gradeLevel', 'difficulty', 'exerciseCount', 'exerciseTypes'],
    description: 'Generate practice exercises for any topic',
    tags: ['content', 'education', 'exercises', 'practice'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'content_generation_notes',
    name: 'Study Notes Generation',
    version: '1.0.0',
    type: 'content_generation',
    template: `Generate comprehensive study notes for the specified topic.

Topic: {{topic}}
Subject: {{subject}}
Grade Level: {{gradeLevel}}
Note Type: {{noteType}}
Key Concepts: {{keyConcepts}}

Create study notes with:
- Clear explanations
- Important definitions
- Key formulas and equations
- Examples and illustrations
- Study tips and tricks
- Common mistakes to avoid

Format as structured study notes with clear headings and bullet points.`,
    variables: ['topic', 'subject', 'gradeLevel', 'noteType', 'keyConcepts'],
    description: 'Generate comprehensive study notes',
    tags: ['content', 'education', 'notes', 'study'],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];
