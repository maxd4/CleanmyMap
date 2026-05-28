type ActionDeclarationFormHeaderProps = {
  linkedEventId?: string;
};

export function ActionDeclarationFormHeader({
  linkedEventId,
}: ActionDeclarationFormHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-bold cmm-text-primary">Déclaration d&apos;action</h2>
      {linkedEventId && (
        <p className="cmm-text-caption text-emerald-700">
          Événement: <span className="font-mono">{linkedEventId}</span>
        </p>
      )}
    </div>
  );
}
