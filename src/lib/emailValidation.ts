import { supabase } from "@/integrations/supabase/client";

/**
 * Check if an email already exists in the system
 * This prevents duplicate registrations across different user roles
 * @param email Email address to check
 * @returns Promise<boolean> True if email exists, false otherwise
 */
export async function checkEmailExists(email: string): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('check_email_exists', {
            email_to_check: email.toLowerCase().trim()
        });

        if (error) {
            console.error('Error checking email:', error);
            throw new Error('Erro ao verificar email');
        }

        return data || false;
    } catch (error) {
        console.error('Email validation error:', error);
        throw error;
    }
}

/**
 * Validate email format
 * @param email Email address to validate
 * @returns boolean True if valid format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param password Password to validate
 * @returns object Validation result with isValid and message
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 6) {
        return { isValid: false, message: 'A senha deve ter no mínimo 6 caracteres' };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'A senha deve conter pelo menos uma letra maiúscula' };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'A senha deve conter pelo menos uma letra minúscula' };
    }
    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'A senha deve conter pelo menos um número' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
        return { isValid: false, message: 'A senha deve conter pelo menos um caractere especial (!@#$%)' };
    }
    return { isValid: true };
}
