
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

export const unmaskCurrency = (value: string) => {
    return value.replace(/\D/g, "") ? Number(value.replace(/\D/g, "")) / 100 : 0;
};

export const unmask = (value: string) => value.replace(/\D/g, "");
