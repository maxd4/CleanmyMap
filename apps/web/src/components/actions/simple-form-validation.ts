export interface SimpleActionFormData {
 title: string
 description: string
 location: string
 date: string
 participantCount: number
 wasteAmount: number
 photos: File[]
 organizerName: string
 organizerEmail: string
 isPublic: boolean
}

export interface FormErrors {
 title?: string
 location?: string
 date?: string
 participantCount?: string
 organizerName?: string
 organizerEmail?: string
}

export function validateSimpleForm(data: SimpleActionFormData): FormErrors {
 const errors: FormErrors = {}

 if (!data.title.trim()) {
 errors.title = 'Le titre est requis'
 }

 if (!data.location.trim()) {
 errors.location = 'Le lieu est requis'
 }

 if (!data.date) {
 errors.date = 'La date est requise'
 }

 if (data.participantCount < 1) {
 errors.participantCount = 'Au moins 1 participant requis'
 }

 if (!data.organizerName.trim()) {
 errors.organizerName = 'Le nom de l\'organisateur est requis'
 }

 if (!data.organizerEmail.trim()) {
 errors.organizerEmail = 'L\'email est requis'
 } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.organizerEmail)) {
 errors.organizerEmail = 'Format d\'email invalide'
 }

 return errors
}

export function hasErrors(errors: FormErrors): boolean {
 return Object.keys(errors).length > 0
}