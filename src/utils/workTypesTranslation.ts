/**
 * Work Types Translation Utility
 * Maps Arabic work types and work scopes to English equivalents
 * Used for dynamic translation of database values without changing stored data
 */

export interface WorkTypeTranslation {
  ar: string
  en: string
}

// Work Types (أنواع الأعمال) - Main categories
export const workTypesMap: Record<string, WorkTypeTranslation> = {
  'نجارة': { ar: 'نجارة', en: 'Carpentry' },
  'سباكة': { ar: 'سباكة', en: 'Plumbing' },
  'حدادة': { ar: 'حدادة', en: 'Blacksmithing' },
  'كهرباء': { ar: 'كهرباء', en: 'Electrical' },
  'دهان': { ar: 'دهان', en: 'Painting' },
  'بلاط': { ar: 'بلاط', en: 'Tiling' },
  'جبس': { ar: 'جبس', en: 'Gypsum' },
  'مقاولات عامة': { ar: 'مقاولات عامة', en: 'General Contracting' },
  'إنهاءات': { ar: 'إنهاءات', en: 'Finishing' },
  'MEP': { ar: 'MEP', en: 'MEP' },
  'تيار منخفض': { ar: 'تيار منخفض', en: 'Low Current' },
  'بنية تحتية': { ar: 'بنية تحتية', en: 'Infrastructure' },
  'خاص': { ar: 'خاص', en: 'Special' },
  'civil_works': { ar: 'مقاولات عامة', en: 'General Contracting' },
  'finishing': { ar: 'إنهاءات', en: 'Finishing' },
  'mep': { ar: 'MEP', en: 'MEP' },
  'low_current': { ar: 'تيار منخفض', en: 'Low Current' },
  'infrastructure': { ar: 'بنية تحتية', en: 'Infrastructure' },
  'special': { ar: 'خاص', en: 'Special' }
}

// Work Scopes (نطاقات العمل) - Detailed work items
export const workScopesMap: Record<string, WorkTypeTranslation> = {
  // Civil Works
  'هيكل خرساني': { ar: 'هيكل خرساني', en: 'Reinforced Concrete' },
  'هيكل معدني': { ar: 'هيكل معدني', en: 'Steel Structure' },
  'أساسات': { ar: 'أساسات', en: 'Foundations' },
  'أعمال حفر': { ar: 'أعمال حفر', en: 'Excavation' },
  'ردم ودفان': { ar: 'ردم ودفان', en: 'Backfilling' },
  'أعمال كونكريت': { ar: 'أعمال كونكريت', en: 'Concrete Works' },
  'تسليح': { ar: 'تسليح', en: 'Reinforcement' },
  'قوالب': { ar: 'قوالب', en: 'Formwork' },
  
  // Finishing
  'تشطيب داخلي': { ar: 'تشطيب داخلي', en: 'Interior Finishing' },
  'تشطيب خارجي': { ar: 'تشطيب خارجي', en: 'Exterior Finishing' },
  'أرضيات': { ar: 'أرضيات', en: 'Flooring' },
  'دهان': { ar: 'دهان', en: 'Painting' },
  'بلاط وسيراميك': { ar: 'بلاط وسيراميك', en: 'Tiles' },
  'جبس بورد': { ar: 'جبس بورد', en: 'Gypsum Board' },
  'ديكور': { ar: 'ديكور', en: 'Decorations' },
  'أبواب ونوافذ': { ar: 'أبواب ونوافذ', en: 'Doors & Windows' },
  
  // MEP
  'HVAC': { ar: 'HVAC', en: 'HVAC' },
  'سباكة': { ar: 'سباكة', en: 'Plumbing' },
  'كهرباء': { ar: 'كهرباء', en: 'Electrical' },
  'مكافحة حريق': { ar: 'مكافحة حريق', en: 'Firefighting' },
  'صرف صحي': { ar: 'صرف صحي', en: 'Sanitary' },
  'غاز طبيعي': { ar: 'غاز طبيعي', en: 'Natural Gas' },
  'تهوية طبيعية': { ar: 'تهوية طبيعية', en: 'Natural Ventilation' },
  
  // Low Current
  'كاميرات مراقبة': { ar: 'كاميرات مراقبة', en: 'CCTV' },
  'شبكات': { ar: 'شبكات', en: 'Networks' },
  'BMS': { ar: 'BMS', en: 'Building Management System' },
  'إنذار حريق': { ar: 'إنذار حريق', en: 'Fire Alarm' },
  'كارت دخول': { ar: 'كارت دخول', en: 'Access Control' },
  'صوتيات': { ar: 'صوتيات', en: 'Audio Systems' },
  'هاتف داخلي': { ar: 'هاتف داخلي', en: 'Intercom' },
  
  // Infrastructure
  'طرق': { ar: 'طرق', en: 'Roads' },
  'مياه': { ar: 'مياه', en: 'Water Supply' },
  'مجاري': { ar: 'مجاري', en: 'Sewerage' },
  'إنارة عامة': { ar: 'إنارة عامة', en: 'Public Lighting' },
  'أرصفة': { ar: 'أرصفة', en: 'Pavements' },
  'جسور': { ar: 'جسور', en: 'Bridges' },
  'استراحات': { ar: 'استراحات', en: 'Rest Areas' },
  
  // Special
  'مصاعد': { ar: 'مصاعد', en: 'Elevators' },
  'طاقة شمسية': { ar: 'طاقة شمسية', en: 'Solar Energy' },
  'عزل': { ar: 'عزل', en: 'Insulation' },
  'عزل مائي': { ar: 'عزل مائي', en: 'Waterproofing' },
  'عزل حراري': { ar: 'عزل حراري', en: 'Thermal Insulation' },
  'سقف متحرك': { ar: 'سقف متحرك', en: 'Retractable Roof' },
  'واجهات': { ar: 'واجهات', en: 'Facades' },
  
  // Additional Engineering Terms (Custom Work Types)
  'لياسة': { ar: 'لياسة', en: 'Plastering' },
  'لياسة خارجية': { ar: 'لياسة خارجية', en: 'External Plastering' },
  'لياسة داخلية': { ar: 'لياسة داخلية', en: 'Internal Plastering' },
  'دهانات': { ar: 'دهانات', en: 'Paintings' },
  'دهان خارجي': { ar: 'دهان خارجي', en: 'External Painting' },
  'دهان داخلي': { ar: 'دهان داخلي', en: 'Internal Painting' },
  'تأسيس كهرباء': { ar: 'تأسيس كهرباء', en: 'Electrical Foundation' },
  'تأسيس سباكة': { ar: 'تأسيس سباكة', en: 'Plumbing Foundation' },
  'تأسيس تكييف': { ar: 'تأسيس تكييف', en: 'AC Foundation' },
  'أعمال الحديد': { ar: 'أعمال الحديد', en: 'Steel Works' },
  'أعمال الخرسانة': { ar: 'أعمال الخرسانة', en: 'Concrete Works' },
  'أعمال القرميد': { ar: 'أعمال القرميد', en: 'Tiling Works' },
  'أعمال السيراميك': { ar: 'أعمال السيراميك', en: 'Ceramic Works' },
  'أعمال الرخام': { ar: 'أعمال الرخام', en: 'Marble Works' },
  'أعمال الجبس': { ar: 'أعمال الجبس', en: 'Gypsum Works' },
  'أعمال الألمنيوم': { ar: 'أعمال الألمنيوم', en: 'Aluminum Works' },
  'أعمال النجارة': { ar: 'أعمال النجارة', en: 'Carpentry Works' },
  'أعمال الحدادة': { ar: 'أعمال الحدادة', en: 'Blacksmithing Works' },
  'أعمال الدهان': { ar: 'أعمال الدهان', en: 'Painting Works' },
  'أعمال العزل': { ar: 'أعمال العزل', en: 'Insulation Works' },
  'أعمال اللياسة': { ar: 'أعمال اللياسة', en: 'Plastering Works' },
  'أعمال التكييف': { ar: 'أعمال التكييف', en: 'AC Works' },
  'أعمال الكهرباء': { ar: 'أعمال الكهرباء', en: 'Electrical Works' },
  'أعمال السباكة': { ar: 'أعمال السباكة', en: 'Plumbing Works' },
  'أعمال الحفر': { ar: 'أعمال الحفر', en: 'Excavation Works' },
  'أعمال الردم': { ar: 'أعمال الردم', en: 'Backfilling Works' },
  'أعمال الأساسات': { ar: 'أعمال الأساسات', en: 'Foundation Works' },
  'أعمال الهيكل': { ar: 'أعمال الهيكل', en: 'Structure Works' },
  'أعمال التشطيب': { ar: 'أعمال التشطيب', en: 'Finishing Works' },
  'أعمال الديكور': { ar: 'أعمال الديكور', en: 'Decoration Works' },
  'أعمال الأرضيات': { ar: 'أعمال الأرضيات', en: 'Flooring Works' },
  'أعمال الأسقف': { ar: 'أعمال الأسقف', en: 'Ceiling Works' },
  'أعمال الجدران': { ar: 'أعمال الجدران', en: 'Wall Works' },
  'أعمال الواجهات': { ar: 'أعمال الواجهات', en: 'Facade Works' },
  'أعمال المطابخ': { ar: 'أعمال المطابخ', en: 'Kitchen Works' },
  'أعمال الحمامات': { ar: 'أعمال الحمامات', en: 'Bathroom Works' },
  'أعمال الحدائق': { ar: 'أعمال الحدائق', en: 'Landscaping Works' },
  'أعمال الطرق': { ar: 'أعمال الطرق', en: 'Road Works' },
  'أعمال الصرف': { ar: 'أعمال الصرف', en: 'Drainage Works' },
  'أعمال المياه': { ar: 'أعمال المياه', en: 'Water Works' },
  'أعمال المجاري': { ar: 'أعمال المجاري', en: 'Sewerage Works' },
  'أعمال الإنارة': { ar: 'أعمال الإنارة', en: 'Lighting Works' },
  'أعمال الأمان': { ar: 'أعمال الأمان', en: 'Security Works' },
  'أعمال المراقبة': { ar: 'أعمال المراقبة', en: 'Surveillance Works' },
  'أعمال الشبكات': { ar: 'أعمال الشبكات', en: 'Network Works' },
  'أعمال الاتصالات': { ar: 'أعمال الاتصالات', en: 'Telecommunications Works' },
  'أعمال الطاقة الشمسية': { ar: 'أعمال الطاقة الشمسية', en: 'Solar Energy Works' },
  'أعمال المصاعد': { ar: 'أعمال المصاعد', en: 'Elevator Works' },
  'أعمال السلالم': { ar: 'أعمال السلالم', en: 'Staircase Works' },
  'أعمال الأسوار': { ar: 'أعمال الأسوار', en: 'Fencing Works' },
  'أعمال البوابات': { ar: 'أعمال البوابات', en: 'Gate Works' },
  'أعمال المظلات': { ar: 'أعمال المظلات', en: 'Canopy Works' },
  'أعمال الخزانات': { ar: 'أعمال الخزانات', en: 'Tank Works' },
  'أعمال الصيانة': { ar: 'أعمال الصيانة', en: 'Maintenance Works' },
  'أعمال الترميم': { ar: 'أعمال الترميم', en: 'Restoration Works' },
  'أعمال الهدم': { ar: 'أعمال الهدم', en: 'Demolition Works' },
  'أعمال التنظيف': { ar: 'أعمال التنظيف', en: 'Cleaning Works' },
  'أعمال النقل': { ar: 'أعمال النقل', en: 'Transportation Works' },
  'أعمال التخزين': { ar: 'أعمال التخزين', en: 'Storage Works' },
  'أعمال التغليف': { ar: 'أعمال التغليف', en: 'Packaging Works' },
  'أعمال التركيب': { ar: 'أعمال التركيب', en: 'Installation Works' },
  'أعمال الفك': { ar: 'أعمال الفك', en: 'Dismantling Works' },
  'أعمال الإصلاح': { ar: 'أعمال الإصلاح', en: 'Repair Works' },
  'أعمال التعديل': { ar: 'أعمال التعديل', en: 'Modification Works' },
  'أعمال التوسعة': { ar: 'أعمال التوسعة', en: 'Expansion Works' },
  'أعمال البناء': { ar: 'أعمال البناء', en: 'Construction Works' },
  'أعمال الهيكلة': { ar: 'أعمال الهيكلة', en: 'Structural Works' },
  'أعمال التأسيس': { ar: 'أعمال التأسيس', en: 'Foundation Works' },
  'أعمال التشييد': { ar: 'أعمال التشييد', en: 'Construction Works' },
  'أعمال البنية التحتية': { ar: 'أعمال البنية التحتية', en: 'Infrastructure Works' }
}

/**
 * Translate a work type or work scope from Arabic to English
 * @param value - The Arabic or English value to translate
 * @param language - Current language ('en' or 'ar')
 * @returns Translated value if found, otherwise returns original value
 */
export const translateWorkType = (value: string | null | undefined, language: 'en' | 'ar'): string => {
  if (!value) return ''
  
  const normalizedValue = String(value).trim()
  
  // If language is Arabic, return as-is
  if (language === 'ar') {
    return normalizedValue
  }
  
  // Try to find in work types map first
  const workTypeEntry = workTypesMap[normalizedValue]
  if (workTypeEntry) {
    return workTypeEntry.en
  }
  
  // Try to find in work scopes map
  const workScopeEntry = workScopesMap[normalizedValue]
  if (workScopeEntry) {
    return workScopeEntry.en
  }
  
  // If not found, return original value (might be already in English or unknown)
  return normalizedValue
}

/**
 * Translate an array of work scopes
 * @param values - Array of work scope values
 * @param language - Current language ('en' or 'ar')
 * @returns Array of translated values
 */
export const translateWorkScopes = (values: string[] | null | undefined, language: 'en' | 'ar'): string[] => {
  if (!values || !Array.isArray(values)) {
    return []
  }
  
  return values.map(value => translateWorkType(value, language))
}

export default {
  translateWorkType,
  translateWorkScopes,
  workTypesMap,
  workScopesMap
}
