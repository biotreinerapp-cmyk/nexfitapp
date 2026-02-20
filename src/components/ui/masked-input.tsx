
import * as React from "react";
import { Input } from "@/components/ui/input";
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskCurrency, unmaskCurrency } from "@/lib/maskUtils";

export interface MaskedInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    mask: "cpf" | "cnpj" | "phone" | "cep" | "currency";
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
    ({ className, mask, onChange, value, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            let rawValue = e.target.value;
            let formattedValue = rawValue;

            switch (mask) {
                case "cpf":
                    formattedValue = maskCPF(rawValue);
                    break;
                case "cnpj":
                    formattedValue = maskCNPJ(rawValue);
                    break;
                case "phone":
                    formattedValue = maskPhone(rawValue);
                    break;
                case "cep":
                    formattedValue = maskCEP(rawValue);
                    break;
                case "currency":
                    formattedValue = maskCurrency(rawValue);
                    break;
            }

            // Create a fake event to pass to the original onChange
            if (onChange) {
                const event = {
                    ...e,
                    target: {
                        ...e.target,
                        value: formattedValue,
                    },
                } as React.ChangeEvent<HTMLInputElement>;
                onChange(event);
            }
        };

        // Ensure we display formatted value even if the parent passes a raw one
        const displayValue = React.useMemo(() => {
            if (value === undefined || value === null) return "";
            const stringValue = String(value);
            switch (mask) {
                case "cpf": return maskCPF(stringValue);
                case "cnpj": return maskCNPJ(stringValue);
                case "phone": return maskPhone(stringValue);
                case "cep": return maskCEP(stringValue);
                case "currency": return maskCurrency(stringValue);
                default: return stringValue;
            }
        }, [value, mask]);

        return (
            <Input
                ref={ref}
                className={className}
                onChange={handleChange}
                value={displayValue}
                {...props}
            />
        );
    }
);
MaskedInput.displayName = "MaskedInput";

export { MaskedInput };
