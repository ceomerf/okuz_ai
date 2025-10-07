import { PromptTemplate } from '../prompt-registry.service';

export const QUESTION_SOLVING_PROMPTS: PromptTemplate[] = [
  {
    id: 'question_solving_basic',
    name: 'Basic Question Solving',
    version: '1.0.0',
    type: 'question_solving',
    template: `Solve the following educational question step by step.

Question: {{question}}
Subject: {{subject}}
Grade Level: {{gradeLevel}}
Question Type: {{questionType}}

Please provide:
1. Step-by-step solution
2. Explanation of each step
3. Key concepts used
4. Alternative approaches (if any)
5. Common mistakes to avoid
6. Practice recommendations

Format the response clearly with numbered steps and explanations.`,
    variables: ['question', 'subject', 'gradeLevel', 'questionType'],
    description: 'Solve educational questions with step-by-step explanations',
    tags: ['solving', 'education', 'explanation'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'question_solving_advanced',
    name: 'Advanced Question Solving',
    version: '1.0.0',
    type: 'question_solving',
    template: `Solve the advanced educational question with comprehensive analysis.

Question: {{question}}
Subject: {{subject}}
Grade Level: {{gradeLevel}}
Question Type: {{questionType}}
Difficulty: {{difficulty}}
Context: {{context}}

Provide comprehensive solution with:
1. Problem analysis and understanding
2. Step-by-step solution process
3. Mathematical reasoning (if applicable)
4. Conceptual explanations
5. Alternative solution methods
6. Common pitfalls and mistakes
7. Related concepts and applications
8. Practice recommendations
9. Extension problems

Format as detailed solution with clear explanations and examples.`,
    variables: ['question', 'subject', 'gradeLevel', 'questionType', 'difficulty', 'context'],
    description: 'Solve advanced questions with comprehensive analysis',
    tags: ['solving', 'advanced', 'education', 'analysis'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'question_solving_math',
    name: 'Mathematics Question Solving',
    version: '1.0.0',
    type: 'question_solving',
    template: `Solve the mathematics question with detailed mathematical reasoning.

Question: {{question}}
Topic: {{topic}}
Grade Level: {{gradeLevel}}
Question Type: {{questionType}}
Mathematical Level: {{mathematicalLevel}}

Provide mathematical solution with:
1. Problem identification and classification
2. Mathematical approach selection
3. Step-by-step mathematical solution
4. Formula applications and derivations
5. Mathematical reasoning and logic
6. Verification of solution
7. Alternative mathematical methods
8. Common mathematical errors
9. Related mathematical concepts
10. Practice problems

Format with clear mathematical notation and explanations.`,
    variables: ['question', 'topic', 'gradeLevel', 'questionType', 'mathematicalLevel'],
    description: 'Solve mathematics questions with detailed mathematical reasoning',
    tags: ['solving', 'mathematics', 'math', 'reasoning'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'question_solving_science',
    name: 'Science Question Solving',
    version: '1.0.0',
    type: 'question_solving',
    template: `Solve the science question with scientific reasoning and explanations.

Question: {{question}}
Subject: {{subject}}
Topic: {{topic}}
Grade Level: {{gradeLevel}}
Question Type: {{questionType}}

Provide scientific solution with:
1. Scientific problem analysis
2. Relevant scientific concepts
3. Step-by-step scientific reasoning
4. Formula applications (if applicable)
5. Scientific explanations
6. Real-world applications
7. Experimental considerations
8. Common scientific misconceptions
9. Related scientific principles
10. Further exploration suggestions

Format with scientific accuracy and clear explanations.`,
    variables: ['question', 'subject', 'topic', 'gradeLevel', 'questionType'],
    description: 'Solve science questions with scientific reasoning',
    tags: ['solving', 'science', 'scientific', 'reasoning'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'question_solving_language',
    name: 'Language Question Solving',
    version: '1.0.0',
    type: 'question_solving',
    template: `Solve the language question with linguistic analysis and explanations.

Question: {{question}}
Language: {{language}}
Topic: {{topic}}
Grade Level: {{gradeLevel}}
Question Type: {{questionType}}

Provide linguistic solution with:
1. Language analysis and understanding
2. Grammatical explanations
3. Vocabulary and usage
4. Reading comprehension strategies
5. Writing techniques
6. Language rules and exceptions
7. Common language mistakes
8. Cultural context (if applicable)
9. Practice exercises
10. Language learning tips

Format with clear linguistic explanations and examples.`,
    variables: ['question', 'language', 'topic', 'gradeLevel', 'questionType'],
    description: 'Solve language questions with linguistic analysis',
    tags: ['solving', 'language', 'linguistic', 'analysis'],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];
