import type { Task } from '../store/useAppStore';

const visuals: Record<string, { icon: string; label: string; cs: string; color: string }> = {
  habit_brush_teeth: { icon: '🪥', label: 'Brush teeth', cs: 'Vyčistit zuby', color: '#72d8f3' },
  habit_cleaning: { icon: '🧹', label: 'Tidy up', cs: 'Uklidit', color: '#fbc56b' },
  habit_reading: { icon: '📚', label: 'Read', cs: 'Číst', color: '#b5a2fa' },
  habit_eating: { icon: '🥦', label: 'Eat well', cs: 'Zdravě jíst', color: '#88e4bb' },
  habit_sleep: { icon: '🌙', label: 'Bedtime', cs: 'Spát', color: '#b5a2fa' },
  habit_sports: { icon: '⚽', label: 'Get moving', cs: 'Hýbat se', color: '#88e4bb' },
  habit_homework: { icon: '🧠', label: 'Homework', cs: 'Domácí úkoly', color: '#f4a7c7' },
  habit_music: { icon: '🎹', label: 'Make music', cs: 'Hrát hudbu', color: '#b5a2fa' },
  habit_pet: { icon: '🐶', label: 'Pet care', cs: 'Péče o zvířátko', color: '#fbc56b' },
  habit_kindness: { icon: '💖', label: 'Help out', cs: 'Pomáhat', color: '#f4a7c7' },
  habit_bath: { icon: '🛁', label: 'Wash up', cs: 'Umýt se', color: '#72d8f3' },
  habit_water: { icon: '💧', label: 'Drink water', cs: 'Napít se', color: '#72d8f3' },
};

export function questVisual(task: Pick<Task, 'name' | 'icon' | 'shortName'>, translatedName: string, language: string) {
  const known = visuals[task.name];
  // Custom instructions stay intact in the expanded view. Never shorten a sentence
  // to its first two words, which could change what the child is asked to do.
  const cleanName = translatedName.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim();
  const label = task.shortName || (known ? language === 'cs' ? known.cs : language === 'en' ? known.label : cleanName
    : cleanName);
  return { icon: task.icon || known?.icon || '⭐', label, color: known?.color || '#ffc857' };
}
