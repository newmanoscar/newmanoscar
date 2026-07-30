import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

/** Foto per Kamera oder Galerie aufnehmen – nativ via Capacitor, im Web via Datei-Dialog. */
export async function pickPhoto(source: "camera" | "gallery"): Promise<Blob | null> {
  if (Capacitor.isNativePlatform()) {
    const photo = await Camera.getPhoto({
      quality: 70,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
    });
    if (!photo.webPath) return null;
    return await (await fetch(photo.webPath)).blob();
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.capture = "environment";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
