import React from "react";

type Props = {
  imageUri: string;
  aspect: number;
  cropShape: "round" | "rect";
  onCancel: () => void;
  onComplete: (uri: string, contentType: string) => void;
};

// Native platforms crop via expo-image-picker's built-in editor
// (allowsEditing: true) before this would ever be reached — this file only
// exists so Metro has a non-web module to resolve; react-easy-crop is a DOM
// library and only ships in AvatarCropModal.web.tsx.
export default function AvatarCropModal(_props: Props) {
  return null;
}
