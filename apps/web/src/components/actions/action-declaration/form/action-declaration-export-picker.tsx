"use client";

import {
  useActionDeclarationExportPickerController,
  type ActionDeclarationExportPickerControllerProps,
} from "./action-declaration-export-picker.controller";
import { ActionDeclarationExportPickerView } from "./action-declaration-export-picker.view";

type ActionDeclarationExportPickerProps = ActionDeclarationExportPickerControllerProps;

export function ActionDeclarationExportPicker({
  isOpen,
  onClose,
  form,
  actorName,
}: ActionDeclarationExportPickerProps) {
  const controller = useActionDeclarationExportPickerController({
    isOpen,
    onClose,
    form,
    actorName,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <ActionDeclarationExportPickerView
      isOpen={isOpen}
      onClose={onClose}
      form={form}
      controller={controller}
    />
  );
}
