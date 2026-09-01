import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
// @ts-ignore - no bundled types, this file only ever runs on web
import Cropper from "react-easy-crop";
import { colors, radii } from "../constants/theme";

type Area = { x: number; y: number; width: number; height: number };

type Props = {
  imageUri: string;
  aspect: number;
  cropShape: "round" | "rect";
  onCancel: () => void;
  onComplete: (blobUrl: string, contentType: string) => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser doesn't support image cropping.");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process that image."))),
      "image/jpeg",
      0.9
    );
  });
}

export default function AvatarCropModal({ imageUri, aspect, cropShape, onCancel, onComplete }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const onSave = async () => {
    if (!croppedAreaPixels) return;
    setError(null);
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageUri, croppedAreaPixels);
      onComplete(URL.createObjectURL(blob), "image/jpeg");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't crop that image. Try again.");
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Text style={styles.title}>Adjust photo</Text>

        <View style={styles.cropArea}>
          <Cropper
            image={imageUri}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.controls}>
          <Pressable style={styles.cancelButton} onPress={onCancel} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, (saving || !croppedAreaPixels) && styles.saveButtonDisabled]}
            onPress={onSave}
            disabled={saving || !croppedAreaPixels}
          >
            <Text style={styles.saveText}>{saving ? "Saving…" : "Save"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  cropArea: {
    flex: 1,
    position: "relative",
    borderRadius: radii.md,
    overflow: "hidden",
  },
  error: {
    fontSize: 13,
    color: "#FF8A80",
    textAlign: "center",
    marginTop: 12,
  },
  controls: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: "center",
    backgroundColor: colors.accentDark,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
