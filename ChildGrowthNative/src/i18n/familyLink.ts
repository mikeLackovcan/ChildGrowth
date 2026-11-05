// Every row contains English, Czech, Spanish and German, in that order.
export const familyLinkMessages = {
  family_code_parent_title: ['Connect your child', 'Propojit dítě', 'Conectar a tu hijo', 'Kind verbinden'],
  family_code_parent_intro: ['Scan the QR on your child’s phone or type their code.', 'Naskenuj QR z telefonu dítěte nebo zadej jeho kód.', 'Escanea el QR del móvil de tu hijo o escribe su código.', 'Scanne den QR-Code auf dem Handy deines Kindes oder gib seinen Code ein.'],
  family_code_child_title: ['My family code', 'Můj rodinný kód', 'Mi código familiar', 'Mein Familiencode'],
  family_code_child_intro: ['Show this to your parent. You choose whether to accept.', 'Ukaž ho rodiči. Ty rozhodneš, zda pozvánku přijmeš.', 'Enséñaselo a tu familia. Tú decides si aceptas.', 'Zeige ihn deinen Eltern. Du entscheidest, ob du annimmst.'],
  family_code_label: ['Child code', 'Kód dítěte', 'Código infantil', 'Kinder-Code'],
  family_code_placeholder: ['ABCD-EFGH', 'ABCD-EFGH', 'ABCD-EFGH', 'ABCD-EFGH'],
  family_code_type_hint: ['Type the 8-character code', 'Zadej 8místný kód', 'Escribe el código de 8 caracteres', 'Gib den 8-stelligen Code ein'],
  family_code_send: ['Send invite', 'Poslat pozvánku', 'Enviar invitación', 'Einladung senden'],
  family_code_loading: ['Making your code…', 'Vytvářím tvůj kód…', 'Creando tu código…', 'Dein Code wird erstellt…'],
  family_code_load_error: ['Could not load your code. Check the internet and try again.', 'Kód se nepodařilo načíst. Zkontroluj internet a zkus to znovu.', 'No se pudo cargar tu código. Revisa internet e inténtalo de nuevo.', 'Dein Code konnte nicht geladen werden. Prüfe das Internet und versuche es erneut.'],
  family_code_invalid: ['Check the 8-character child code.', 'Zkontroluj 8místný kód dítěte.', 'Revisa el código infantil de 8 caracteres.', 'Prüfe den 8-stelligen Kinder-Code.'],
  family_code_scanned: ['Code scanned', 'Kód načten', 'Código escaneado', 'Code gescannt'],
  family_code_sent: ['Invite sent. Your child must accept it.', 'Pozvánka odeslána. Dítě ji musí přijmout.', 'Invitación enviada. Tu hijo debe aceptarla.', 'Einladung gesendet. Dein Kind muss sie annehmen.'],
  family_code_accept_note: ['Nothing is shared until your child accepts.', 'Dokud dítě pozvánku nepřijme, nic se nesdílí.', 'No se comparte nada hasta que tu hijo acepte.', 'Es wird nichts geteilt, bevor dein Kind annimmt.'],
  family_connect_methods_code: ['QR or child code', 'QR nebo kód dítěte', 'QR o código infantil', 'QR- oder Kinder-Code'],
  family_start_connect_code: ['Scan your child’s QR or enter their code. They accept on their phone.', 'Naskenuj QR dítěte nebo zadej jeho kód. Pozvánku přijme na svém telefonu.', 'Escanea el QR de tu hijo o escribe su código. Aceptará en su móvil.', 'Scanne den QR-Code deines Kindes oder gib seinen Code ein. Es nimmt am eigenen Handy an.'],
} as const;

export const familyLinkResources = Object.fromEntries(['en', 'cs', 'es', 'de'].map((language, index) => [language,
  Object.fromEntries(Object.entries(familyLinkMessages).map(([key, values]) => [key, values[index]]))]));
