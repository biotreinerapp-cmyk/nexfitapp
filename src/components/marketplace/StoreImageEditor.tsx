import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Camera, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StoreImageEditorProps {
  storeId: string;
  currentProfileUrl: string | null;
  currentBannerUrl: string | null;
  onImagesUpdated: (profile: string | null, banner: string | null) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const StoreImageEditor = ({
  storeId,
  currentProfileUrl,
  currentBannerUrl,
  onImagesUpdated,
}: StoreImageEditorProps) => {
  const { toast } = useToast();
  const profileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [profilePreview, setProfilePreview] = useState<string | null>(currentProfileUrl);
  const [bannerPreview, setBannerPreview] = useState<string | null>(currentBannerUrl);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (
    file: File | undefined,
    setPreview: (v: string | null) => void,
    setFile: (v: File | null) => void,
  ) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Envie uma imagem.", variant: "destructive" });
      return;
    }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!profileFile && !bannerFile) return;
    setUploading(true);

    try {
      let newProfileUrl = currentProfileUrl;
      let newBannerUrl = currentBannerUrl;

      if (profileFile) {
        const ext = profileFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `stores/${storeId}/profile-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("marketplace_store_images")
          .upload(path, profileFile, { upsert: true });
        if (error) throw error;
        newProfileUrl = supabase.storage.from("marketplace_store_images").getPublicUrl(path).data.publicUrl;
      }

      if (bannerFile) {
        const ext = bannerFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `stores/${storeId}/banner-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("marketplace_store_images")
          .upload(path, bannerFile, { upsert: true });
        if (error) throw error;
        newBannerUrl = supabase.storage.from("marketplace_store_images").getPublicUrl(path).data.publicUrl;
      }

      // Update marketplace_stores
      const { error: dbErr } = await supabase
        .from("marketplace_stores")
        .update({
          profile_image_url: newProfileUrl,
          banner_image_url: newBannerUrl,
        })
        .eq("id", storeId);

      if (dbErr) throw dbErr;

      setProfileFile(null);
      setBannerFile(null);
      onImagesUpdated(newProfileUrl, newBannerUrl);
      toast({ title: "Imagens atualizadas" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar imagens", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const hasChanges = !!profileFile || !!bannerFile;

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Banner (16:6)</Label>
        <div
          className="relative cursor-pointer overflow-hidden rounded-lg border border-border/40 bg-muted/30"
          onClick={() => bannerRef.current?.click()}
        >
          <AspectRatio ratio={16 / 6}>
            {bannerPreview ? (
              <img src={bannerPreview} alt="Banner" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </AspectRatio>
        </div>
        <input
          ref={bannerRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0], setBannerPreview, setBannerFile)}
        />
      </div>

      {/* Profile */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Imagem de Perfil</Label>
        <div className="flex items-center gap-4">
          <div
            className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-border/40 bg-muted/30"
            onClick={() => profileRef.current?.click()}
          >
            {profilePreview ? (
              <img src={profilePreview} alt="Perfil" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Clique para trocar</p>
        </div>
        <input
          ref={profileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0], setProfilePreview, setProfileFile)}
        />
      </div>

      {hasChanges && (
        <Button onClick={handleSave} disabled={uploading} className="w-full">
          {uploading ? "Enviando…" : "Salvar imagens"}
        </Button>
      )}
    </div>
  );
};
