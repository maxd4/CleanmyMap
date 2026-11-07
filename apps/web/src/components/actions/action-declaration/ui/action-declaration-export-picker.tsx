"use client";

import {
  useActionDeclarationExportPickerController,
  type ActionDeclarationExportPickerControllerProps,
} from "./action-declaration-export-picker.controller";
import { ActionDeclarationExportPickerView } from "./action-declaration-export-picker.view";
import { normalizeActionDeclarationExportForm } from "@/lib/actions/exports/export-form-contract";

type ActionDeclarationExportPickerProps = ActionDeclarationExportPickerControllerProps;

export function ActionDeclarationExportPicker({
  isOpen,
  onClose,
  form,
  actorName,
}: ActionDeclarationExportPickerProps) {
  const exportForm = normalizeActionDeclarationExportForm(form);
  const controller = useActionDeclarationExportPickerController({
    isOpen,
    onClose,
    form: exportForm,
    actorName,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <ActionDeclarationExportPickerView
      isOpen={isOpen}
      onClose={controller.onClose}
      form={exportForm}
      controller={controller}
    />
  );
}
