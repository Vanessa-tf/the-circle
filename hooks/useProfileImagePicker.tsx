import React, { useState } from "react";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import AvatarCropModal from "../components/AvatarCropModal";
import { useAuth, ProfileImageKind } from "../context/AuthContext";

// Native crops via expo-image-picker's built-in editor at pick time. Web has
// no equivalent, so the picked (uncropped) image is staged and handed to
// AvatarCropModal.web.tsx for a real crop step before uploading.
export function useProfileImagePicker(kind: ProfileImageKind) {
  const { uploadProfileImage } = useAuth();
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aspect = kind === "avatar" ? 1 : 3;
  const cropShape = kind === "avatar" ? "round" : "rect";

  const doUpload = async (uri: string, contentType: string) => {
    setUploading(true);
    setError(null);
    try {
      await uploadProfileImage(kind, uri, contentType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload that photo. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const pick = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: Platform.OS !== "web",
      aspect: kind === "avatar" ? [1, 1] : [3, 1],
      quality: 0.9,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    if (Platform.OS === "web") {
      setPendingUri(asset.uri);
    } else {
      await doUpload(asset.uri, asset.mimeType ?? "image/jpeg");
    }
  };

  const cropModal =
    Platform.OS === "web" && pendingUri ? (
      <AvatarCropModal
        imageUri={pendingUri}
        aspect={aspect}
        cropShape={cropShape}
        onCancel={() => setPendingUri(null)}
        onComplete={(uri, contentType) => {
          setPendingUri(null);
          doUpload(uri, contentType);
        }}
      />
    ) : null;

  return { pick, uploading, error, cropModal };
}
