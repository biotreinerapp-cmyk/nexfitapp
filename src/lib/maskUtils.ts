
export const maskCPF = (value: string) => {
    return value
        .replace(/\D/g, "")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
};

export const maskCNPJ = (value: string) => {
    return value
        .replace(/\D/g, "")
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
};

export const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 10) {
        return digits
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .replace(/(-\d{4})\d+?$/, "$1");
    }
    return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .replace(/(-\d{4})\d+?$/, "$1");
};

export const maskCEP = (value: string) => {
    return value
        .replace(/\D/g, "")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .replace(/(-\d{3})\d+?$/, "$1");
};

export const maskCurrency = (value: string | number) => {
    if (value === undefined || value === null) return "";
    const stringValue = typeof value === "number" ? value.toFixed(2) : value;
    const digits = stringValue.replace(/\D/g, "");
    const numberValue = Number(digits) / 100;

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(numberValue);
};

export const unmaskCurrency = (value: string | number) => {
    if (typeof value === "number") return value;
    const digits = value.replace(/\D/g, "");
    if (!digits) return 0;
    // Se a string contiver vírgula ou ponto e for curta, pode não ser o formato da máscara.
    // Mas no nosso sistema, a máscara sempre garante centavos.
    return Number(digits) / 100;
};

export const unmask = (value: string) => value.replace(/\D/g, "");

/**
 * Sanitiza a chave PIX para o padrão do Banco Central antes de salvar no banco.
 * - CPF/CNPJ: Somente números
 * - Telefone: +55 + DDD + Número
 * - Email: Lowercase e trim
 * - Aleatória: Trim
 */
export const sanitizePixKey = (key: string): string => {
    if (!key) return "";
    const cleanKey = key.trim();

    // 1. Email: Contém @
    if (cleanKey.includes("@")) {
        return cleanKey.toLowerCase();
    }

    const digits = cleanKey.replace(/\D/g, "");

    // 2. CPF: 11 dígitos
    if (digits.length === 11) {
        return digits;
    }

    // 3. CNPJ: 14 dígitos
    if (digits.length === 14) {
        return digits;
    }

    // 4. Telefone: 10 ou 11 dígitos originais (sem o +55)
    // Se o usuário digitou ex: 86981318181 ou (86) 98131-8181
    if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
    }

    // 5. Telefone já com 55: Ex 5586981318181
    if (digits.length === 12 || digits.length === 13) {
        if (digits.startsWith("55")) {
            return `+${digits}`;
        }
    }

    // 6. Chave Aleatória ou já formatada corretamente
    return cleanKey;
};
