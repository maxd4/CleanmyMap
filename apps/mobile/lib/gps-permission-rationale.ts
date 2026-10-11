import { Alert } from 'react-native'

export const GPS_PERMISSION_RATIONALE_TITLE = 'Autoriser le suivi GPS ?'
export const GPS_PERMISSION_RATIONALE_MESSAGE =
  'CleanMyMap collecte les points de localisation pendant votre mission, y compris en arrière-plan lorsque l’écran est éteint. Ils servent à afficher le parcours et à calculer les résultats définitifs côté serveur. Les points sont transmis au backend CleanMyMap avec votre session Clerk quand le réseau est disponible ; en cas de coupure, ils restent temporairement dans le stockage local de cette application pour être rejoués uniquement dans l’espace de votre compte. Vous pouvez refuser ou arrêter le suivi à tout moment.'

export function showGpsPermissionRationale(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      GPS_PERMISSION_RATIONALE_TITLE,
      GPS_PERMISSION_RATIONALE_MESSAGE,
      [
        { text: 'Refuser', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continuer', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    )
  })
}
