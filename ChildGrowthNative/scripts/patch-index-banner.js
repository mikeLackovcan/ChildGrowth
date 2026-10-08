const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', '(tabs)', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const start = content.indexOf('{/* Parent Link Status / Pending Invitation Request Card */}');
const end = content.indexOf('})()}', start) + 5;

if (start === -1 || end === -1) {
  console.error('Banner indices not found');
  process.exit(1);
}

const newBanner = `{/* Parent Link Status / Pending Invitation Request Card */}
        {(() => {
          const currentKidNick = (nickname || '').toLowerCase();
          const matchingChild = children.find(c => (currentKidNick && c.nickname.toLowerCase() === currentKidNick) || children.length === 1);
          
          const validParentTags = Array.from(new Set([
            ...(matchingChild?.linkedParents || []),
            ...(linkedParents || []),
            ...(parentEmail ? [parentEmail] : [])
          ]))
          .filter(Boolean)
          .map(p => p.replace(/^@/, ''))
          .filter(p => p.toLowerCase() !== currentKidNick);

          const allParentTags = validParentTags.map(p => \`@\${p}\`).join(', ');
          
          // Is this kid officially approved?
          const isApproved = approvalStatus === 'approved' || (validParentTags.length > 0 && approvalStatus !== 'pending' && matchingChild?.isApproved === true);

          // If approved, ALWAYS render the green linked parents badge - NEVER show invitation card!
          if (isApproved && validParentTags.length > 0) {
            return (
              <View style={{ backgroundColor: Colors.cardGreen, borderWidth: 1, borderColor: Colors.green, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 16 }}>👨‍👩‍👧</Text>
                  <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.green, fontSize: 12 }}>
                    {t('linked_parents_title', 'Linked Parents: {{parents}} 👨‍👩‍👧', { parents: allParentTags || '@parent_boss' })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSettingsVisible(true)}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.amber, fontSize: 11 }}>⚙️ Manage</Text>
                </TouchableOpacity>
              </View>
            );
          }

          // If NOT approved, check if there is a pending invitation
          const pendingInviteChild = !isApproved ? children.find(c => c.isApproved === false && c.linkedParents && c.linkedParents.length > 0) : null;
          const hasPendingInvitation = !isApproved && (approvalStatus === 'pending' || Boolean(pendingInviteChild));
          const pendingParentTag = pendingInviteChild?.linkedParents[0] || parentEmail || validParentTags[0] || 'parent_boss';

          if (hasPendingInvitation) {
            const isKidInitiated = pendingInviteChild?.initiatedBy === 'kid' || approvalStatus === 'pending' || !pendingInviteChild?.initiatedBy;
            
            return (
              <View style={{ backgroundColor: Colors.cardYellow, borderWidth: 1.5, borderColor: Colors.amber, borderRadius: 16, padding: 14, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Text style={{ fontSize: 20 }}>⏳</Text>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 15 }}>
                    {isKidInitiated ? t('parent_link_req_title', 'Parent Approval Pending ⏳') : t('parent_invite_recv_title', 'Parent Invitation Received 👨‍👩‍👧')}
                  </Text>
                </View>

                <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                  {isKidInitiated 
                    ? t('waiting_parent_approval_sub', 'Sent request to parent @{{parent}}. Waiting for parent to tap "APPROVE LINK ✅" on their dashboard ⏳', { parent: pendingParentTag })
                    : t('parent_invited_you_sub', 'Parent @{{parent}} invited you to link accounts and manage daily quests!', { parent: pendingParentTag })}
                </Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {!isKidInitiated && (
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: Colors.green, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                      onPress={() => {
                        acceptParentInvite(pendingParentTag);
                        alert('🎉 Account linked with parent!');
                      }}
                    >
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#FFF', fontSize: 13 }}>
                        {t('btn_accept_link', 'ACCEPT LINK ✅')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                    onPress={() => {
                      denyParentInvite(pendingParentTag);
                      alert('Request cancelled.');
                    }}
                  >
                    <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.red, fontSize: 13 }}>
                      {isKidInitiated ? t('btn_cancel_request', 'CANCEL REQUEST ❌') : t('btn_deny_link', 'DENY ❌')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={{ backgroundColor: Colors.surface2, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Text style={{ fontSize: 20 }}>👨‍👩‍👧</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 13 }}>
                    {t('link_account_title', 'Link Parent Account')}
                  </Text>
                  <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 11 }}>
                    {t('link_parent_hint', 'Enter parent nickname or email for approvals ⏳')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: Colors.red, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                onPress={() => router.push('/link-account')}
              >
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#FFF', fontSize: 12 }}>
                  {t('btn_send_request', 'Link 🚀')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}`;

content = content.slice(0, start) + newBanner + content.slice(end);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched banner logic in index.tsx');
