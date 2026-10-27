// Shared by the app and server. Keep lock-screen content generic: no child names,
// quest descriptions, email addresses or reward details.
export const pushMessages = {
  push_title: ['Questblox', 'Questblox', 'Questblox', 'Questblox'],
  push_quest_review: ['A quest is ready for your review.', 'Úkol čeká na tvoje schválení.', 'Hay una misión lista para revisar.', 'Eine Aufgabe wartet auf deine Bestätigung.'],
  push_quest_help: ['Your child asked for a little help.', 'Tvoje dítě požádalo o pomoc.', 'Tu peque ha pedido un poco de ayuda.', 'Dein Kind hat um Hilfe gebeten.'],
  push_quest_approved: ['Quest approved. Great effort!', 'Úkol schválen. Skvělá práce!', 'Misión aprobada. ¡Buen trabajo!', 'Aufgabe bestätigt. Gut gemacht!'],
  push_quest_retry: ['Check your quest together with your parent.', 'Projděte úkol společně s rodičem.', 'Revisa la misión con tu familia.', 'Schau dir die Aufgabe zusammen mit deinen Eltern an.'],
  push_prize_review: ['A reward request is ready to review.', 'Žádost o odměnu čeká na schválení.', 'Hay una solicitud de premio para revisar.', 'Ein Belohnungswunsch wartet auf Bestätigung.'],
  push_prize_approved: ['Your reward is ready. Ask your parent!', 'Odměna je připravená. Zeptej se rodiče!', 'Tu premio está listo. ¡Pregunta a tu familia!', 'Deine Belohnung ist bereit. Frag deine Eltern!'],
  push_battle_invite: ['A family challenge is waiting!', 'Čeká na tebe rodinná výzva!', '¡Te espera un desafío familiar!', 'Eine Familienherausforderung wartet!'],
  push_battle_turn: ['Your turn in the family arena!', 'Jsi na tahu v rodinné aréně!', '¡Tu turno en la arena familiar!', 'Du bist in der Familienarena dran!'],
  push_battle_declined: ['Maybe next time. Your fighters are ready for practice.', 'Třeba příště. Bojovníci jsou připraveni na trénink.', 'Quizá la próxima vez. Tus luchadores están listos para entrenar.', 'Vielleicht nächstes Mal. Deine Kämpfer sind bereit fürs Training.'],
  push_battle_result: ['Your family battle has finished.', 'Rodinný souboj skončil.', 'Tu combate familiar ha terminado.', 'Dein Familienkampf ist beendet.'],
  push_family_pending: ['You have a family invitation to review.', 'Čeká na tebe rodinná pozvánka.', 'Tienes una invitación familiar para revisar.', 'Du hast eine neue Familieneinladung.'],
  push_family_accepted: ['Your family is connected!', 'Rodina je propojena!', '¡Tu familia está conectada!', 'Deine Familie ist verbunden!'],
  push_family_declined: ['Your family invitation was declined.', 'Rodinná pozvánka byla odmítnuta.', 'Tu invitación familiar fue rechazada.', 'Deine Familieneinladung wurde abgelehnt.'],
  push_family_unlinked: ['A family connection has ended.', 'Rodinné propojení bylo ukončeno.', 'Una conexión familiar ha terminado.', 'Eine Familienverbindung wurde beendet.'],
} as const;
export type PushKind = Exclude<keyof typeof pushMessages, 'push_title'> extends `push_${infer K}` ? K : never;
export const pushLanguages = ['en', 'cs', 'es', 'de'] as const;
export const pushResources = Object.fromEntries(pushLanguages.map((language, index) => [language,
  Object.fromEntries(Object.entries(pushMessages).map(([key, values]) => [key, values[index]]))]));
export function pushText(kind: string, language: string) {
  const values = pushMessages[`push_${kind}` as keyof typeof pushMessages];
  if (!values || kind === 'title') return null;
  const index = Math.max(0, pushLanguages.indexOf(language as typeof pushLanguages[number]));
  return { title: pushMessages.push_title[index], body: values[index] };
}
