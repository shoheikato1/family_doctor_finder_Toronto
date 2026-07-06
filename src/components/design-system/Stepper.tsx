import { Check } from 'lucide-react';

type Step = {
  id: string;
  label: string;
};

type StepperProps = {
  steps: Step[];
  currentStepId: string;
  completedStepIds: string[];
};

export function Stepper({ steps, currentStepId, completedStepIds }: StepperProps) {
  return (
    <div className="flex items-start justify-center gap-0 max-w-xl mx-auto mt-6 mb-8">
      {steps.map((step, index) => {
        const isCompleted = completedStepIds.includes(step.id);
        const isCurrent = step.id === currentStepId;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-start flex-1 min-w-0">
            {/* Step + label */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              {/* Circle */}
              <div
                className={[
                  'w-4 h-4 rounded-pill flex items-center justify-center transition-colors duration-200',
                  isCompleted
                    ? 'bg-status-accepted'
                    : isCurrent
                    ? 'bg-primary'
                    : 'bg-surface border-2 border-border-soft',
                ].join(' ')}
                aria-label={`Step ${index + 1}: ${step.label}${isCompleted ? ', completed' : isCurrent ? ', current' : ''}`}
              >
                {isCompleted && (
                  <Check size={10} strokeWidth={2.5} className="text-surface" />
                )}
              </div>
              {/* Label */}
              <span
                className={[
                  'font-sans text-xs text-center leading-tight max-w-16',
                  isCurrent ? 'text-text-primary font-medium' : 'text-text-secondary',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {!isLast && (
              <div className="flex-1 mt-2 mx-1">
                <div
                  className={[
                    'h-0.5 w-full transition-colors duration-200',
                    isCompleted ? 'bg-status-accepted' : 'bg-border-soft',
                  ].join(' ')}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
