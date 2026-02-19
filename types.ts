
export enum GradeLevel {
  VI = "VI",
  VII = "VII"
}

export interface CurriculumTheme {
  id: string;
  title: string;
  grade: GradeLevel;
}

export interface CurriculumTopic {
  id: string;
  themeId: string;
  name: string;
  grade: GradeLevel;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: 'Лесно' | 'Средно' | 'Тешко';
}

export interface GeneratedLesson {
  title: string;
  content: string; // Markdown supported
  objectives: string[];
}

export interface GeneratedScenario {
  topic: string;
  standards: string; // Стандарди за оценување
  content: string; // Содржина и поими
  introActivity: string; // Воведна активност
  mainActivity: string; // Главни активности
  finalActivity: string; // Завршна активност
  resources: string; // Средства
  assessment: string; // Следење на напредокот
}

export enum AppMode {
  LESSON = 'LESSON',
  QUIZ = 'QUIZ',
  VISUALIZER = 'VISUALIZER',
  SCENARIO = 'SCENARIO',
  WORKSHEET = 'WORKSHEET',
  PROJECT = 'PROJECT',
  BOARD_PLAN = 'BOARD_PLAN',
  ADVANCED_PRACTICE = 'ADVANCED_PRACTICE',
  TEACHER_PANEL = 'TEACHER_PANEL'
}
