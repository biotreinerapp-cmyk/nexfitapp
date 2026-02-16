// Professional specialties for the fitness/health industry
export const PROFESSIONAL_SPECIALTIES = [
    // Fitness & Training
    { value: "personal_trainer", label: "Personal Trainer" },
    { value: "crossfit_trainer", label: "Treinador de CrossFit" },
    { value: "functional_trainer", label: "Treinador Funcional" },
    { value: "pilates_instructor", label: "Instrutor de Pilates" },
    { value: "yoga_instructor", label: "Instrutor de Yoga" },
    { value: "dance_instructor", label: "Instrutor de Dança" },
    { value: "martial_arts_instructor", label: "Instrutor de Artes Marciais" },
    { value: "swimming_instructor", label: "Instrutor de Natação" },
    { value: "running_coach", label: "Treinador de Corrida" },
    { value: "cycling_coach", label: "Treinador de Ciclismo" },

    // Nutrition & Diet
    { value: "nutritionist", label: "Nutricionista" },
    { value: "sports_nutritionist", label: "Nutricionista Esportivo" },
    { value: "clinical_nutritionist", label: "Nutricionista Clínico" },
    { value: "dietitian", label: "Nutricionista Dietista" },

    // Health & Therapy
    { value: "physiotherapist", label: "Fisioterapeuta" },
    { value: "sports_physiotherapist", label: "Fisioterapeuta Esportivo" },
    { value: "occupational_therapist", label: "Terapeuta Ocupacional" },
    { value: "massage_therapist", label: "Massoterapeuta" },
    { value: "chiropractor", label: "Quiropraxista" },
    { value: "osteopath", label: "Osteopata" },

    // Mental Health
    { value: "psychologist", label: "Psicólogo" },
    { value: "sports_psychologist", label: "Psicólogo Esportivo" },
    { value: "life_coach", label: "Coach de Vida" },
    { value: "wellness_coach", label: "Coach de Bem-Estar" },

    // Medical
    { value: "sports_doctor", label: "Médico do Esporte" },
    { value: "orthopedist", label: "Ortopedista" },
    { value: "cardiologist", label: "Cardiologista" },
    { value: "endocrinologist", label: "Endocrinologista" },

    // Other
    { value: "physical_educator", label: "Educador Físico" },
    { value: "kinesiologist", label: "Cinesiologista" },
    { value: "posture_specialist", label: "Especialista em Postura" },
    { value: "rehabilitation_specialist", label: "Especialista em Reabilitação" },
    { value: "other", label: "Outro" },
] as const;

export type ProfessionalSpecialty = typeof PROFESSIONAL_SPECIALTIES[number]["value"];

// Helper to get label from value
export const getSpecialtyLabel = (value: string): string => {
    const specialty = PROFESSIONAL_SPECIALTIES.find(s => s.value === value);
    return specialty?.label || value;
};

// Group specialties by category for better UX
export const SPECIALTY_CATEGORIES = {
    fitness: {
        label: "Fitness & Treinamento",
        specialties: PROFESSIONAL_SPECIALTIES.filter(s =>
            ["personal_trainer", "crossfit_trainer", "functional_trainer", "pilates_instructor",
                "yoga_instructor", "dance_instructor", "martial_arts_instructor", "swimming_instructor",
                "running_coach", "cycling_coach"].includes(s.value)
        )
    },
    nutrition: {
        label: "Nutrição",
        specialties: PROFESSIONAL_SPECIALTIES.filter(s =>
            ["nutritionist", "sports_nutritionist", "clinical_nutritionist", "dietitian"].includes(s.value)
        )
    },
    therapy: {
        label: "Terapia & Reabilitação",
        specialties: PROFESSIONAL_SPECIALTIES.filter(s =>
            ["physiotherapist", "sports_physiotherapist", "occupational_therapist",
                "massage_therapist", "chiropractor", "osteopath"].includes(s.value)
        )
    },
    mental: {
        label: "Saúde Mental & Coaching",
        specialties: PROFESSIONAL_SPECIALTIES.filter(s =>
            ["psychologist", "sports_psychologist", "life_coach", "wellness_coach"].includes(s.value)
        )
    },
    medical: {
        label: "Medicina",
        specialties: PROFESSIONAL_SPECIALTIES.filter(s =>
            ["sports_doctor", "orthopedist", "cardiologist", "endocrinologist"].includes(s.value)
        )
    },
    other: {
        label: "Outros",
        specialties: PROFESSIONAL_SPECIALTIES.filter(s =>
            ["physical_educator", "kinesiologist", "posture_specialist",
                "rehabilitation_specialist", "other"].includes(s.value)
        )
    }
};
