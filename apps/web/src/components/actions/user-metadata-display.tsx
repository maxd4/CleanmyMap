type UserMetadataDisplayProps = {
 userMetadata?: {
 userId: string;
 username?: string;
 displayName?: string;
 email?: string;
 };
};

export function UserMetadataDisplay({ userMetadata }: UserMetadataDisplayProps) {
if (!userMetadata) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 cmm-text-small">
      <p className="cmm-text-muted flex items-center gap-2">
        <span className="text-lg">📋</span>
        Aucune donnée utilisateur disponible
      </p>
    </div>
  );
}

 return (
 <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-emerald-700 mb-2">
 Données utilisateur automatiques
 </p>
 <div className="space-y-1 cmm-text-small">
 <div className="flex justify-between">
 <span className="cmm-text-secondary">ID utilisateur :</span>
 <span className="font-mono cmm-text-primary">{userMetadata.userId}</span>
 </div>
 {userMetadata.displayName && (
 <div className="flex justify-between">
 <span className="cmm-text-secondary">Nom d&apos;affichage :</span>
 <span className="cmm-text-primary">{userMetadata.displayName}</span>
 </div>
 )}
 {userMetadata.username && (
 <div className="flex justify-between">
 <span className="cmm-text-secondary">Nom d&apos;utilisateur :</span>
 <span className="cmm-text-primary">{userMetadata.username}</span>
 </div>
 )}
 {userMetadata.email && (
 <div className="flex justify-between">
 <span className="cmm-text-secondary">Email :</span>
 <span className="cmm-text-primary">{userMetadata.email}</span>
 </div>
 )}
 </div>
 </div>
 );
}