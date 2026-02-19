import { CurriculumTheme, CurriculumTopic, GradeLevel } from "./types";

export const PROJECT_THEMES: CurriculumTheme[] = [
  { id: "steam-1", title: "Архитектура и Дизајн", grade: GradeLevel.VII },
  { id: "steam-2", title: "Финансиска Писменост", grade: GradeLevel.VII },
  { id: "steam-3", title: "Спорт и Здравје", grade: GradeLevel.VII },
  { id: "steam-4", title: "Уметност и Природа", grade: GradeLevel.VII },
];

export const PROJECT_TOPICS: CurriculumTopic[] = [
  // Architecture & Design
  { id: "p-1.1", themeId: "steam-1", name: "Дизајн на мојата соба (Плоштина и Периметар)", grade: GradeLevel.VII },
  { id: "p-1.2", themeId: "steam-1", name: "Изградба на мостови (Геометриски форми)", grade: GradeLevel.VII },
  { id: "p-1.3", themeId: "steam-1", name: "Макети во размер", grade: GradeLevel.VII },
  
  // Financial Literacy
  { id: "p-2.1", themeId: "steam-2", name: "Планирање на буџет за екскурзија", grade: GradeLevel.VII },
  { id: "p-2.2", themeId: "steam-2", name: "Проценти и попусти во мол", grade: GradeLevel.VII },
  { id: "p-2.3", themeId: "steam-2", name: "Штедење и камата", grade: GradeLevel.VII },

  // Sport & Health
  { id: "p-3.1", themeId: "steam-3", name: "Статистика на спортски натпревар", grade: GradeLevel.VII },
  { id: "p-3.2", themeId: "steam-3", name: "Мерење на пулс и графикони", grade: GradeLevel.VII },

  // Art & Nature
  { id: "p-4.1", themeId: "steam-4", name: "Златен пресек во природата", grade: GradeLevel.VII },
  { id: "p-4.2", themeId: "steam-4", name: "Симетрија во инсектите и лисјата", grade: GradeLevel.VII },
  { id: "p-4.3", themeId: "steam-4", name: "Теселација (Мозаици)", grade: GradeLevel.VII },
];