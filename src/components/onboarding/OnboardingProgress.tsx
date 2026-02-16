import { Check } from "lucide-react";

interface OnboardingProgressProps {
    currentStep: number;
    totalSteps: number;
    steps: string[];
}

export function OnboardingProgress({ currentStep, totalSteps, steps }: OnboardingProgressProps) {
    return (
        <div className="mb-8">
            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white/60">
                        Etapa {currentStep} de {totalSteps}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                        {Math.round((currentStep / totalSteps) * 100)}%
                    </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-green-600 transition-all duration-500 ease-out"
                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    />
                </div>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;

                    return (
                        <div key={index} className="flex flex-col items-center flex-1">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${isCompleted
                                        ? "bg-primary text-black"
                                        : isCurrent
                                            ? "bg-primary/20 border-2 border-primary text-primary"
                                            : "bg-white/5 text-white/40"
                                    }`}
                            >
                                {isCompleted ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <span className="text-sm font-bold">{stepNumber}</span>
                                )}
                            </div>
                            <span
                                className={`text-[10px] text-center font-medium transition-colors ${isCurrent ? "text-white" : "text-white/40"
                                    }`}
                            >
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
