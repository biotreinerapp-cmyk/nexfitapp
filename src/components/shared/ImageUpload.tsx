import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
    value?: string | null;
    onChange: (url: string | null) => void;
    bucket: string;
    pathPrefix: string;
    label?: string;
    description?: string;
    aspectRatio?: "video" | "square" | "portrait" | "any";
    className?: string;
    maxWidth?: string;
}

export function ImageUpload({
    value,
    onChange,
    bucket,
    pathPrefix,
    label,
    description,
    aspectRatio = "video",
    className,
    maxWidth = "max-w-md"
}: ImageUploadProps) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setPreview(value || null);
    }, [value]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (!file.type.startsWith("image/")) {
            toast({ title: "Formato inválido", description: "Selecione uma imagem (JPG, PNG, WebP).", variant: "destructive" });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 5MB.", variant: "destructive" });
            return;
        }

        setUploading(true);
        const objectPreviewUrl = URL.createObjectURL(file);
        setPreview(objectPreviewUrl);

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${pathPrefix}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            onChange(publicUrl);
            toast({ title: "Imagem enviada com sucesso!" });
        } catch (error: any) {
            console.error("Upload error:", error);
            setPreview(value || null); // Revert preview on error
            toast({
                title: "Erro no upload",
                description: error.message || "Não foi possível enviar a imagem.",
                variant: "destructive"
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        onChange(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const aspectRatioClasses = {
        video: "aspect-video",
        square: "aspect-square",
        portrait: "aspect-[3/4]",
        any: "aspect-auto min-h-[150px]"
    };

    return (
        <div className={cn("space-y-2", maxWidth, className)}>
            {label && (
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                    {label}
                </Label>
            )}

            <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={cn(
                    "relative group overflow-hidden rounded-[24px] border-2 border-dashed transition-all cursor-pointer",
                    "bg-white/[0.02] border-white/10 hover:border-primary/40 hover:bg-white/[0.04]",
                    aspectRatioClasses[aspectRatio],
                    uploading && "opacity-70 cursor-wait"
                )}
            >
                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Preview"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="rounded-full h-10 w-10 p-0"
                                >
                                    <Camera className="h-5 w-5" />
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-full h-10 w-10 p-0"
                                    onClick={handleRemove}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <ImagePlus className="h-6 w-6" />
                        </div>
                        <p className="text-xs font-bold text-zinc-400">
                            {uploading ? "Enviando..." : "Clique para enviar imagem"}
                        </p>
                        {description && !uploading && (
                            <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-tight font-medium">
                                {description}
                            </p>
                        )}
                    </div>
                )}

                {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
            />
        </div>
    );
}
