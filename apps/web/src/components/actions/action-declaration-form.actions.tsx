import type { SubmissionState } from"./action-declaration-form.model";

type ActionDeclarationFormActionsProps = {
 submissionState: SubmissionState;
};

export function ActionDeclarationFormActions({
 submissionState,
}: ActionDeclarationFormActionsProps) {
 const isPending = submissionState ==="pending";

 return (
 <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
 <button
 type="submit"
 disabled={isPending}
 className="rounded-full flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-emerald-600 px-8 py-3 font-bold text-white shadow-lg transition hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
 >
 {isPending ?"Envoi..." :"Déclarer l'action"}
 </button>
 </div>
 );
}
